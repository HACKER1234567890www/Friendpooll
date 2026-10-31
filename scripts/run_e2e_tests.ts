import { sanitizeSupabaseUrl, sanitizeSupabaseAnonKey, isPlaceholderValue } from '../src/lib/supabase';
import { formatINR, formatDate, formatDateTime, generateAuditHash } from '../src/utils/formatters';
import {
  mapProfileAndMembershipToMember,
  mapContributionRowToContribution,
  mapProposalRowToProposal,
  mapVoteRowToVote,
  mapAuditLogRowToAuditLogItem,
} from '../src/lib/supabaseAdapter';
import { createClient } from '@supabase/supabase-js';

const results: Array<{ name: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

function assert(condition: boolean, name: string, details = '') {
  if (condition) {
    results.push({ name, status: 'PASS', details });
  } else {
    results.push({ name, status: 'FAIL', details });
  }
}

async function runTests() {
  console.log('--- STARTING COMPLETE FUNCTIONAL TEST SUITE ---');

  // TEST 1: Formatters
  assert(formatINR(0) === '₹0', 'Format INR (zero)');
  assert(formatINR(250) === '₹250', 'Format INR (small)');
  assert(formatINR(10000) === '₹10,000', 'Format INR (thousands)');
  assert(typeof generateAuditHash() === 'string' && generateAuditHash().length === 64, 'Generate Audit Hash (64 chars hex)');
  assert(formatDate('2026-10-30T12:00:00Z').includes('2026'), 'Format Date');

  // TEST 2: URL & Key Sanitization
  assert(sanitizeSupabaseUrl('https://rleskxfwftxy.supabase.co') === 'https://rleskxfwftxy.supabase.co', 'Sanitize Valid Supabase URL');
  assert(sanitizeSupabaseUrl('project url above') === null, 'Reject Placeholder URL');
  assert(sanitizeSupabaseUrl('https://project%20url%20above') === null, 'Reject Escaped Placeholder URL');
  assert(sanitizeSupabaseUrl('') === null, 'Reject Empty URL');
  assert(isPlaceholderValue('your-project') === true, 'Detect Placeholder');
  assert(sanitizeSupabaseAnonKey('anon key above') === null, 'Reject Placeholder Anon Key');

  // TEST 3: Adapter Mappings
  const mockProfile = { user_id: 'u-123', display_name: 'Aarav Sharma' };
  const mockMembership = { id: 'm-123', club_id: 'c-123', user_id: 'u-123', role: 'admin', joined_at: '2026-10-30T00:00:00Z' };
  const mockApproved = [{ amount_paise: 25000, member_id: 'u-123' }];
  const member = mapProfileAndMembershipToMember(mockProfile, mockMembership, mockApproved, 0, true);
  assert(member.id === 'u-123', 'Adapter Member ID matches profile user_id');
  assert(member.name === 'Aarav Sharma', 'Adapter Member Name matches display_name');
  assert(member.role === 'Admin', 'Adapter Member Role maps to Admin');
  assert(member.totalContributed === 250, 'Adapter Total Contributed calculates correctly from paise (25000 -> 250)');

  // TEST 4: Proposal Row Mapping
  const mockPropRow = {
    id: 'p-1',
    club_id: 'c-1',
    created_by: 'u-123',
    title: 'Nifty 50 ETF Allocation',
    description: JSON.stringify({
      category: 'Index Fund',
      requestedAmount: 500,
      durationMonths: 12,
      riskLevel: 'Low',
      description: 'Long-term index fund allocation',
      thesis: 'Broad market compounding',
    }),
    status: 'open',
    closes_at: '2026-11-06T00:00:00Z',
    created_at: '2026-10-30T00:00:00Z',
  };
  const prop = mapProposalRowToProposal(mockPropRow, 'Aarav Sharma', {});
  assert(prop.id === 'p-1', 'Adapter Proposal ID matches');
  assert(prop.title === 'Nifty 50 ETF Allocation', 'Adapter Proposal Title matches');
  assert(prop.requestedAmount === 500, 'Adapter Proposal Amount parsed from description payload');
  assert(prop.riskLevel === 'Low', 'Adapter Proposal Risk parsed correctly');
  assert(prop.status === 'voting', 'Adapter Proposal Status open -> voting');

  // TEST 5: Database Connection & RLS Security
  const url = process.env.VITE_SUPABASE_URL || 'https://rleskxfwftxytwsvqnjy.supabase.co';
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  console.log(`Testing with Supabase URL: ${url ? 'Configured' : 'Missing'}, Anon Key: ${key ? 'Configured' : 'Missing'}`);
  
  if (url && key) {
    const client = createClient(url, key);

    // 5.1 Tables existence
    const tables = ['clubs', 'profiles', 'memberships', 'contributions', 'proposals', 'votes', 'audit_logs'];
    for (const t of tables) {
      const { data, error } = await client.from(t).select('*').limit(1);
      assert(!error, `Database Table "${t}" accessible via API`, error ? error.message : `OK (${data?.length || 0} rows)`);
    }

    // 5.2 RLS enforcement on unauthenticated inserts
    const { error: insertError } = await client.from('clubs').insert({ name: 'Unauthorized Club' });
    assert(Boolean(insertError && insertError.code === '42501'), 'RLS blocks unauthenticated INSERT into clubs', insertError ? insertError.message : 'FAILED - not blocked!');

    const { error: voteError } = await client.from('votes').insert({ proposal_id: '00000000-0000-0000-0000-000000000000', voter_id: '00000000-0000-0000-0000-000000000000', choice: 'yes' });
    assert(Boolean(voteError && voteError.code === '42501'), 'RLS blocks unauthenticated INSERT into votes', voteError ? voteError.message : 'FAILED - not blocked!');

    const { error: contribError } = await client.from('contributions').insert({ club_id: '00000000-0000-0000-0000-000000000000', member_id: '00000000-0000-0000-0000-000000000000', amount_paise: 10000 });
    assert(Boolean(contribError && contribError.code === '42501'), 'RLS blocks unauthenticated INSERT into contributions', contribError ? contribError.message : 'FAILED - not blocked!');

    // 5.3 RPC function existence & authentication check
    const { error: rpcError } = await client.rpc('create_club_with_admin', { p_club_name: 'Test' });
    assert(Boolean(rpcError && rpcError.code === '42501'), 'RPC create_club_with_admin enforces authenticated session', rpcError ? rpcError.message : 'OK');
  } else {
    console.log('Running client-side offline assertions only');
  }

  // Print Summary
  console.log('\n--- TEST SUMMARY ---');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    const symbol = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${symbol} [${r.status}] ${r.name}${r.details ? ` (${r.details})` : ''}`);
    if (r.status === 'PASS') passCount++;
    else failCount++;
  }
  console.log(`\nTOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  if (failCount > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Test execution error:', e);
  process.exit(1);
});
