import { Member, Contribution, Proposal, Vote, AuditLogItem } from '../types';

export function mapProfileAndMembershipToMember(
  profile: { user_id: string; display_name: string },
  membership: { id: string; club_id: string; user_id: string; role: string; joined_at: string },
  approvedContributions: { amount_paise: number; member_id: string }[] = [],
  colorIndex: number = 0,
  isRealAccount: boolean = true
): Member {
  const name = profile.display_name || 'Club Member';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'MB';

  const memberContributions = approvedContributions.filter(
    (c) => c.member_id === profile.user_id || c.member_id === membership.id
  );
  const totalPaise = memberContributions.reduce((sum, c) => sum + (c.amount_paise || 0), 0);
  const totalContributed = Math.round(totalPaise / 100);

  const colors = ['#00f090', '#38bdf8', '#fbbf24', '#f472b6', '#a78bfa'];
  const assignedColor = colors[colorIndex % colors.length];

  return {
    id: profile.user_id,
    name,
    role: membership.role === 'admin' ? 'Admin' : 'Member',
    avatar: initials,
    email: `${profile.display_name.toLowerCase().replace(/\s+/g, '.')}@member.club`,
    phone: '',
    joinedDate: membership.joined_at ? membership.joined_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
    totalContributed,
    contributionCount: memberContributions.length,
    status: 'active',
    color: assignedColor,
    isSimulated: !isRealAccount,
  };
}

export function mapContributionRowToContribution(
  row: {
    id: string;
    club_id: string;
    member_id: string;
    amount_paise: number;
    status: string;
    reference_note: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string;
  },
  memberNameMap: Record<string, string>
): Contribution {
  const memberName = memberNameMap[row.member_id] || 'Club Member';
  const amount = Math.round((row.amount_paise || 0) / 100);
  const refCodeMatch = row.reference_note?.match(/FP-SIM-\d+/);
  const referenceCode = refCodeMatch ? refCodeMatch[0] : `FP-SIM-${row.id.slice(0, 4).toUpperCase()}`;

  let method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit' = 'Simulated UPI';
  if (row.reference_note?.includes('IMPS')) method = 'Simulated IMPS';
  if (row.reference_note?.includes('Quick')) method = 'Club Quick-Deposit';

  return {
    id: row.id,
    memberId: row.member_id,
    memberName,
    amount,
    timestamp: row.created_at,
    note: row.reference_note || 'Simulated pool contribution',
    method,
    status: (row.status as 'pending' | 'approved' | 'rejected') || 'pending',
    referenceCode,
    reviewedBy: row.reviewed_by ? memberNameMap[row.reviewed_by] || 'Administrator' : undefined,
    reviewedAt: row.reviewed_at || undefined,
    reviewNote: row.reference_note?.includes('[Rejected:') 
      ? row.reference_note.split('[Rejected:')[1]?.replace(']', '').trim() 
      : undefined,
  };
}

export function mapProposalRowToProposal(
  row: {
    id: string;
    club_id: string;
    created_by: string;
    title: string;
    description: string;
    status: string;
    closes_at: string;
    created_at: string;
  },
  proposerName: string,
  votes: Record<string, Vote>
): Proposal {
  // Parse structured metadata if saved in description JSON, or fallback to defaults
  let category: any = 'Sovereign Green Bonds';
  let requestedAmount = 1000;
  let durationMonths = 12;
  let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low';
  let cleanDesc = row.description || '';
  let thesis = row.description || '';

  try {
    if (row.description && row.description.startsWith('{') && row.description.endsWith('}')) {
      const parsed = JSON.parse(row.description);
      category = parsed.category || category;
      requestedAmount = parsed.requestedAmount || requestedAmount;
      durationMonths = parsed.durationMonths || durationMonths;
      riskLevel = parsed.riskLevel || riskLevel;
      cleanDesc = parsed.description || cleanDesc;
      thesis = parsed.thesis || thesis;
    }
  } catch {
    // Plain description string
  }

  // Map DB status 'open' | 'approved' | 'rejected' | 'closed' to UI ProposalStatus
  let uiStatus: 'voting' | 'approved' | 'rejected' | 'executed' = 'voting';
  if (row.status === 'open') uiStatus = 'voting';
  else if (row.status === 'approved') uiStatus = 'approved';
  else if (row.status === 'rejected') uiStatus = 'rejected';
  else if (row.status === 'closed') uiStatus = 'executed';

  return {
    id: row.id,
    title: row.title,
    category,
    requestedAmount,
    proposerId: row.created_by,
    proposerName,
    durationMonths,
    riskLevel,
    description: cleanDesc,
    thesis,
    status: uiStatus,
    createdAt: row.created_at,
    votingDeadline: row.closes_at,
    votes,
    executedAt: row.status === 'closed' ? row.closes_at : undefined,
  };
}

export function mapVoteRowToVote(
  row: {
    id: string;
    proposal_id: string;
    voter_id: string;
    choice: string;
    created_at: string;
  },
  memberNameMap: Record<string, string>
): Vote {
  let decision: 'approve' | 'reject' | 'abstain' = 'abstain';
  if (row.choice === 'yes') decision = 'approve';
  else if (row.choice === 'no') decision = 'reject';

  return {
    memberId: row.voter_id,
    memberName: memberNameMap[row.voter_id] || 'Club Member',
    decision,
    timestamp: row.created_at,
    comment: undefined,
  };
}

export function mapAuditLogRowToAuditLogItem(
  row: {
    id: number | string;
    club_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: any;
    created_at: string;
  }
): AuditLogItem {
  const details = row.details || {};
  return {
    id: `audit_${row.id}`,
    type: (row.action as any) || 'member_updated',
    timestamp: row.created_at,
    actorId: details.admin_user_id || details.voter_user_id || details.user_id || details.founder_user_id || row.entity_id || 'system',
    actorName: details.admin_name || details.voter_name || details.user_name || 'Club Governance',
    summary: details.summary || `${row.action.replace(/_/g, ' ').toUpperCase()} on ${row.entity_type}`,
    details: details.handover_note || details.rejection_reason || details.comment || (typeof details === 'object' ? JSON.stringify(details) : undefined),
    hash: `fp_hash_${row.id}_${row.created_at.slice(0, 10)}`,
  };
}
