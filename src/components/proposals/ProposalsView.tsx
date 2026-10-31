import React, { useState } from 'react';
import { 
  Vote, 
  Plus, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  Check, 
  ThumbsDown, 
  MinusCircle,
  Crown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';
import { Member, Proposal, ProposalStatus, VoteDecision } from '../../types';
import { formatINR, formatDate, formatDateTime } from '../../utils/formatters';

interface ProposalsViewProps {
  proposals: Proposal[];
  members: Member[];
  currentMember: Member;
  isAdmin: boolean;
  adminName: string;
  onOpenNewProposalModal: () => void;
  onOpenVoteModal: (proposal: Proposal) => void;
  onExecuteProposal: (proposalId: string) => void;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({
  proposals,
  members,
  currentMember,
  isAdmin,
  adminName,
  onOpenNewProposalModal,
  onOpenVoteModal,
  onExecuteProposal,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedTheses, setExpandedTheses] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedTheses((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProposals = proposals.filter((p) => {
    if (filterStatus === 'all') return true;
    return p.status === filterStatus;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Investment Proposals & Ballots</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Democratic Governance: <strong>Strict 1 Member = 1 Vote Limit</strong>. Quorum required for approval.
          </p>
        </div>

        <button
          onClick={onOpenNewProposalModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Investment Proposal</span>
        </button>
      </div>

      {/* Disclaimers & Rules Banner */}
      <div className="rounded-xl bg-[#06281c] border border-amber-400/25 p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-white">Democratic & Prudent Standards:</strong> Guaranteed or speculative returns are strictly prohibited. Each member may vote <strong>only once per proposal</strong> (votes are permanently locked upon casting).
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Proposals', count: proposals.length },
          { id: 'voting', label: 'Voting Open', count: proposals.filter((p) => p.status === 'voting').length },
          { id: 'approved', label: 'Approved (Pending Exec)', count: proposals.filter((p) => p.status === 'approved').length },
          { id: 'executed', label: 'Executed', count: proposals.filter((p) => p.status === 'executed').length },
          { id: 'rejected', label: 'Rejected', count: proposals.filter((p) => p.status === 'rejected').length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
              filterStatus === tab.id
                ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                : 'bg-[#07241a] text-slate-300 hover:text-white border border-white/10'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                filterStatus === tab.id ? 'bg-[#041a12] text-[#00f090]' : 'bg-white/10 text-slate-300'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="rounded-2xl bg-[#07241a] border border-white/10 p-10 text-center space-y-3">
            <Vote className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No proposals in this category</h4>
            <p className="text-xs text-slate-400">
              Create an investment proposal to initiate a democratic ballot for the club.
            </p>
          </div>
        ) : (
          filteredProposals.map((proposal) => {
            const votesList = Object.values(proposal.votes);
            const approvals = votesList.filter((v) => v.decision === 'approve').length;
            const rejections = votesList.filter((v) => v.decision === 'reject').length;
            const abstains = votesList.filter((v) => v.decision === 'abstain').length;
            const quorumThreshold = Math.floor(members.length / 2) + 1; // e.g. 3 of 5
            const hasPassedQuorum = approvals >= quorumThreshold;
            const isVotingOpen = proposal.status === 'voting';
            const userVote = proposal.votes[currentMember.id];
            const isExpanded = expandedTheses[proposal.id];

            // Status Badge styling
            const getStatusBadge = (status: ProposalStatus) => {
              switch (status) {
                case 'voting':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Voting Open</span>
                    </span>
                  );
                case 'approved':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Quorum Approved</span>
                    </span>
                  );
                case 'executed':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Executed & Allocated</span>
                    </span>
                  );
                case 'rejected':
                  return (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejected</span>
                    </span>
                  );
              }
            };

            return (
              <div
                key={proposal.id}
                className="rounded-2xl bg-[#07241a] border border-[#00f090]/20 p-5 shadow-xl space-y-4 hover:border-[#00f090]/40 transition"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#00f090]/15 text-[#00f090] uppercase tracking-wider">
                      {proposal.category}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${
                        proposal.riskLevel === 'Low'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : proposal.riskLevel === 'Moderate'
                          ? 'bg-amber-400/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {proposal.riskLevel} Risk
                    </span>
                    <span className="text-xs text-slate-400">
                      Proposed by <strong className="text-white">{proposal.proposerName}</strong>
                    </span>
                  </div>

                  {getStatusBadge(proposal.status)}
                </div>

                {/* Title & Description */}
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white tracking-tight">{proposal.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{proposal.description}</p>
                </div>

                {/* Metric pill bar (Strictly allocation amount, risk and horizon - NO fictional ROI) */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#041a12] border border-white/5 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Target Allocation</span>
                    <span className="text-sm sm:text-base font-extrabold text-[#00f090]">
                      {formatINR(proposal.requestedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Holding Horizon</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {proposal.durationMonths} Mos
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Risk Tier</span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {proposal.riskLevel}
                    </span>
                  </div>
                </div>

                {/* Investment Thesis Accordion */}
                <div className="rounded-xl bg-[#0d3b2c]/40 border border-[#00f090]/15 p-3 space-y-1.5">
                  <div
                    onClick={() => toggleExpand(proposal.id)}
                    className="flex items-center justify-between text-xs font-semibold text-[#00f090] cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>Investment Thesis & Risk Analysis</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {isExpanded && (
                    <div className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-white/5 space-y-2 animate-in fade-in duration-150">
                      <p>{proposal.thesis}</p>
                      <p className="text-[10px] text-slate-400 italic">
                        * Note: Simulated club modeling. Returns depend on actual fund NAV and macro factors. Past returns do not guarantee future performance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Democratic Voting Quorum Section */}
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Ballot Quorum:</span>
                      <span className="text-[#00f090] font-semibold">
                        {approvals} of {members.length} Approved
                      </span>
                      {hasPassedQuorum ? (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Threshold Met (≥{quorumThreshold})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          (Need {quorumThreshold - approvals} more for majority)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3 h-3" /> {approvals} Yes
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <ThumbsDown className="w-3 h-3" /> {rejections} No
                      </span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <MinusCircle className="w-3 h-3" /> {abstains} Abstain
                      </span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-[#041810] overflow-hidden flex">
                    <div
                      className="h-full bg-[#00f090] transition-all"
                      style={{ width: `${(approvals / members.length) * 100}%` }}
                    />
                    <div
                      className="h-full bg-rose-500 transition-all"
                      style={{ width: `${(rejections / members.length) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${(abstains / members.length) * 100}%` }}
                    />
                  </div>

                  {/* Member Votes Roster (Transparent 1 Member = 1 Vote) */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                      Ballots Cast (1 Vote Per Member Rule)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((m) => {
                        const v = proposal.votes[m.id];
                        return (
                          <div
                            key={m.id}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                              v
                                ? v.decision === 'approve'
                                  ? 'bg-[#00f090]/10 border-[#00f090]/30 text-white'
                                  : v.decision === 'reject'
                                  ? 'bg-rose-500/10 border-rose-500/30 text-white'
                                  : 'bg-amber-400/10 border-amber-400/30 text-white'
                                : 'bg-[#041a12] border-white/5 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: m.color || '#00f090' }}
                              >
                                {m.avatar}
                              </div>
                              <div className="line-clamp-1">
                                <span className="font-semibold">{m.name}</span>
                                {v?.comment && (
                                  <p className="text-[10px] text-slate-300 italic line-clamp-1">
                                    "{v.comment}"
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {v ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase flex items-center gap-1 ${
                                    v.decision === 'approve'
                                      ? 'text-[#00f090]'
                                      : v.decision === 'reject'
                                      ? 'text-rose-400'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>{v.decision}</span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 italic">Pending</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-slate-400">
                    {proposal.status === 'executed' ? (
                      <span className="text-sky-300 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Simulated allocation executed by {proposal.executedBy}</span>
                      </span>
                    ) : (
                      <span>Voting closes on {formatDate(proposal.votingDeadline)}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Voting Action: STRICT 1 VOTE PER MEMBER */}
                    {isVotingOpen && (
                      <button
                        onClick={() => onOpenVoteModal(proposal)}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          userVote
                            ? 'border border-white/15 text-slate-300 hover:border-white/30 hover:text-white bg-[#041a12]'
                            : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981] shadow-md'
                        }`}
                      >
                        {userVote ? (
                          <>
                            <Lock className="w-3.5 h-3.5 text-[#00f090]" />
                            <span>Your Vote Locked ({userVote.decision.toUpperCase()})</span>
                          </>
                        ) : (
                          <>
                            <Vote className="w-3.5 h-3.5" />
                            <span>Cast Ballot (1x)</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Admin Execution Action if Approved */}
                    {proposal.status === 'approved' && (
                      <button
                        onClick={() => onExecuteProposal(proposal.id)}
                        disabled={!isAdmin}
                        className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          isAdmin
                            ? 'bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] hover:brightness-110 shadow-md'
                            : 'bg-white/10 text-slate-400 cursor-not-allowed'
                        }`}
                        title={isAdmin ? 'Simulate executing allocation' : `Only active administrator (${adminName}) can execute`}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{isAdmin ? 'Execute Allocation' : `Awaiting Admin (${adminName})`}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
