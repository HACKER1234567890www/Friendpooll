export type Role = 'Admin' | 'Member';

export interface Member {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  phone: string;
  joinedDate: string;
  totalContributed: number;
  contributionCount: number;
  status: 'active' | 'away';
  color: string;
  isSimulated: boolean;
}

export type ContributionStatus = 'pending' | 'approved' | 'rejected';

export interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number; // simulated ₹100 to ₹500
  timestamp: string;
  note: string;
  method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  status: ContributionStatus;
  referenceCode: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
}

export type VoteDecision = 'approve' | 'reject' | 'abstain';

export interface Vote {
  memberId: string;
  memberName: string;
  decision: VoteDecision;
  timestamp: string;
  comment?: string;
}

export type ProposalCategory = 
  | 'Index Fund' 
  | 'Sovereign Green Bonds' 
  | 'Tech ETF' 
  | 'Fixed Deposit' 
  | 'Solar Infrastructure' 
  | 'Blue Chip Dividend';

export type ProposalStatus = 'voting' | 'approved' | 'rejected' | 'executed';

export interface Proposal {
  id: string;
  title: string;
  category: ProposalCategory;
  requestedAmount: number;
  proposerId: string;
  proposerName: string;
  durationMonths: number;
  riskLevel: 'Low' | 'Moderate' | 'High';
  description: string;
  thesis: string;
  status: ProposalStatus;
  createdAt: string;
  votingDeadline: string;
  votes: Record<string, Vote>;
  executedAt?: string;
  executedBy?: string;
}

export interface AdminRotation {
  currentAdminId: string;
  termStartDate: string;
  termEndDate: string;
  cycleDurationDays: number;
  rotationQueue: string[]; // member IDs in scheduled sequence
  history: {
    memberId: string;
    memberName: string;
    term: string;
    completedAt: string;
  }[];
}

export type AuditEventType = 
  | 'contribution_submitted'
  | 'contribution_approved'
  | 'contribution_rejected'
  | 'proposal_created' 
  | 'vote_cast' 
  | 'admin_rotated' 
  | 'proposal_executed' 
  | 'member_added' 
  | 'member_removed' 
  | 'member_updated';

export interface AuditLogItem {
  id: string;
  type: AuditEventType;
  timestamp: string;
  actorId: string;
  actorName: string;
  summary: string;
  details?: string;
  hash: string;
}

export type WithdrawalStatus = 'pending' | 'frozen' | 'approved' | 'rejected' | 'expired' | 'cancelled';
export type WithdrawalChoice = 'allow' | 'uphold_freeze';
export interface WithdrawalRequest {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  reason: string;
  status: WithdrawalStatus;
  freezeReason?: string | null;
  freezeExpiresAt?: string | null;
  memberResponse?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}
export interface WithdrawalVote {
  requestId: string;
  voterId: string;
  choice: WithdrawalChoice;
  comment?: string | null;
  createdAt: string;
}
