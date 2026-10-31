import { Member, Contribution, Proposal, AdminRotation, AuditLogItem } from '../types';

// Five configurable member profiles with zero financial bias (₹0 balance)
export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'm1',
    name: 'Aarav Sharma',
    role: 'Admin',
    avatar: 'AS',
    email: 'aarav.sharma@example.com',
    phone: '+91 98201 44521',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#00f090',
    isSimulated: true,
  },
  {
    id: 'm2',
    name: 'Priya Nair',
    role: 'Member',
    avatar: 'PN',
    email: 'priya.nair@example.com',
    phone: '+91 98450 78219',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#38bdf8',
    isSimulated: true,
  },
  {
    id: 'm3',
    name: 'Rohan Patel',
    role: 'Member',
    avatar: 'RP',
    email: 'rohan.patel@example.com',
    phone: '+91 97123 90312',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#fbbf24',
    isSimulated: true,
  },
  {
    id: 'm4',
    name: 'Ananya Iyer',
    role: 'Member',
    avatar: 'AI',
    email: 'ananya.iyer@example.com',
    phone: '+91 98840 12904',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#f472b6',
    isSimulated: true,
  },
  {
    id: 'm5',
    name: 'Vikram Sen',
    role: 'Member',
    avatar: 'VS',
    email: 'vikram.sen@example.com',
    phone: '+91 99030 55182',
    joinedDate: '2026-10-01',
    totalContributed: 0,
    contributionCount: 0,
    status: 'active',
    color: '#a78bfa',
    isSimulated: true,
  },
];

export const INITIAL_ADMIN_ROTATION: AdminRotation = {
  currentAdminId: 'm1',
  termStartDate: '2026-10-15',
  termEndDate: '2026-11-15',
  cycleDurationDays: 30,
  rotationQueue: ['m1', 'm2', 'm3', 'm4', 'm5'],
  history: [],
};

// Initial club balance starts cleanly at ₹0. No fictional deposits.
export const INITIAL_CONTRIBUTIONS: Contribution[] = [];

// Clean initial proposal template without unsupported or guaranteed target returns
export const INITIAL_PROPOSALS: Proposal[] = [
  {
    id: 'p1',
    title: 'Sovereign Green Bond Sandbox Allocation',
    category: 'Sovereign Green Bonds',
    requestedAmount: 1000,
    proposerId: 'm2',
    proposerName: 'Priya Nair',
    durationMonths: 12,
    riskLevel: 'Low',
    description: 'Government-backed green initiative proposal to evaluate low-volatility fixed-income instruments for club pool capital.',
    thesis: 'Focuses on capital preservation and ESG alignment. Subject to official sovereign auction yields and market conditions. No returns are guaranteed.',
    status: 'voting',
    createdAt: '2026-10-29T10:00:00Z',
    votingDeadline: '2026-11-05T23:59:59Z',
    votes: {
      m2: { 
        memberId: 'm2', 
        memberName: 'Priya Nair', 
        decision: 'approve', 
        timestamp: '2026-10-29T10:05:00Z', 
        comment: 'Author ballot: Low-risk baseline allocation for testing.' 
      },
    },
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'a1',
    type: 'member_updated',
    timestamp: '2026-10-30T06:00:00Z',
    actorId: 'm1',
    actorName: 'Aarav Sharma',
    summary: 'Friendpool Club initialized with 5 configurable member profiles',
    details: 'Initial club balance set to ₹0. Simulated sandbox mode active. No fictional deposits or guaranteed yields.',
    hash: '0e4a9d02c114e5b3',
  },
  {
    id: 'a2',
    type: 'proposal_created',
    timestamp: '2026-10-29T10:00:00Z',
    actorId: 'm2',
    actorName: 'Priya Nair',
    summary: 'Created proposal "Sovereign Green Bond Sandbox Allocation"',
    details: 'Draft proposal submitted for democratic review. 1 vote per member.',
    hash: '5b8c3d911b22fa40',
  },
];
