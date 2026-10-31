import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Wallet, 
  Crown, 
  ShieldCheck, 
  ArrowUpRight, 
  Plus, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Lock,
  ReceiptText,
  RefreshCw
} from 'lucide-react';
import { Member, Contribution, Proposal, AdminRotation } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';

interface DashboardViewProps {
  members: Member[];
  contributions: Contribution[];
  proposals: Proposal[];
  rotation: AdminRotation;
  currentMember: Member;
  isAdmin: boolean;
  onOpenContributeModal: () => void;
  onOpenProposalModal: () => void;
  onOpenRotateModal: () => void;
  onSelectProposalForVote: (proposal: Proposal) => void;
  onNavigateToTab: (tab: 'contributions' | 'proposals' | 'members' | 'audit') => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  members,
  contributions,
  proposals,
  rotation,
  currentMember,
  isAdmin,
  onOpenContributeModal,
  onOpenProposalModal,
  onOpenRotateModal,
  onSelectProposalForVote,
  onNavigateToTab,
  onRefreshData,
  isRefreshing = false,
}) => {
  // Financial calculations: only APPROVED deposits count toward club balance!
  const approvedContributions = contributions.filter((c) => c.status === 'approved');
  const pendingContributions = contributions.filter((c) => c.status === 'pending');

  const totalBalance = approvedContributions.reduce((sum, c) => sum + c.amount, 0);
  
  // Executed proposals amount
  const executedAmount = proposals
    .filter((p) => p.status === 'executed')
    .reduce((sum, p) => sum + p.requestedAmount, 0);

  // Unallocated liquid cash available for proposals
  const unallocatedBalance = Math.max(0, totalBalance - executedAmount);

  const activeProposals = proposals.filter((p) => p.status === 'voting');
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0] || currentMember;
  
  // Calculate days remaining in admin term
  const today = new Date('2026-10-30');
  const termEnd = new Date(rotation?.termEndDate || Date.now());
  const diffDays = Math.max(1, Math.ceil((termEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const queueLength = rotation.rotationQueue?.length || 0;
  const currentQueueIdx = queueLength > 0 ? rotation.rotationQueue.indexOf(rotation.currentAdminId) : -1;
  const nextQueueIdx = queueLength > 1 ? (currentQueueIdx + 1) % queueLength : -1;
  const nextAdminId = nextQueueIdx >= 0 ? rotation.rotationQueue[nextQueueIdx] : null;
  const nextAdmin = nextAdminId ? members.find((m) => m.id === nextAdminId) || null : null;

  return (
    <div className="space-y-5 pb-6">
      {/* Simulation Disclaimer Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#072d21] via-[#0a3a2a] to-[#072d21] border border-[#00f090]/25 p-3.5 sm:p-4 shadow-lg flex items-start gap-3">
        <div className="p-2 rounded-xl bg-[#00f090]/15 text-[#00f090] shrink-0 mt-0.5">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-white text-sm">Simulated Investment Club Sandbox</span>
            <span className="px-2 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] font-mono text-[10px] font-bold">
              Clean Initial Balance: ₹0
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            All member profiles, deposits (₹100–₹500), and investment proposals are strictly simulated for demonstration. No real bank accounts, real fiat deposits, guaranteed returns, or stock market trading are connected.
          </p>
        </div>
      </div>

      {/* Pending Deposit Review Notice (if any) */}
      {pendingContributions.length > 0 && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-400/40 p-3.5 flex items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{pendingContributions.length} simulated deposit(s)</strong> awaiting Administrator verification.
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('contributions')}
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-[#041a12] font-bold hover:bg-amber-300 transition cursor-pointer text-xs shrink-0"
          >
            {isAdmin ? 'Review & Approve' : 'View Sandbox Ledger'}
          </button>
        </div>
      )}

      {/* Main Stats Header */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Club Balance */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#07241a] border border-[#00f090]/30 p-4 sm:p-5 relative overflow-hidden shadow-lg glow-mint-sm">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#00f090]/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Approved Pool Balance</span>
            <div className="flex items-center gap-1.5">
              {onRefreshData && (
                <button
                  onClick={onRefreshData}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#00f090] hover:bg-white/5 active:scale-90 transition cursor-pointer"
                  title="Refresh pool balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#00f090]' : ''}`} />
                </button>
              )}
              <div className="p-1.5 rounded-lg bg-[#00f090]/15 text-[#00f090]">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatINR(totalBalance)}
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-[#00f090] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{approvedContributions.length} approved deposits</span>
          </div>
        </div>

        {/* Members Count */}
        <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Configured Members</span>
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {members.length} <span className="text-xs font-normal text-slate-400">/ 5 max</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
            <span>5 simulated profiles</span>
            <button
              onClick={() => onNavigateToTab('members')}
              className="text-[#00f090] hover:underline font-medium text-[11px] cursor-pointer"
            >
              Configure →
            </button>
          </div>
        </div>

        {/* Liquid vs Allocated */}
        <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Unallocated Cash</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#00f090] tracking-tight">
              {formatINR(unallocatedBalance)}
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            <span>{formatINR(executedAmount)} in executed allocations</span>
          </div>
        </div>

        {/* Active Proposals Count */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Active Ballots</span>
              <div className="p-1.5 rounded-lg bg-amber-400/15 text-amber-300">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeProposals.length} <span className="text-xs font-normal text-slate-400">open</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-amber-300 font-medium">1 member = 1 vote</span>
            <button
              onClick={() => onNavigateToTab('proposals')}
              className="text-[#00f090] hover:underline font-medium text-[11px] cursor-pointer"
            >
              Vote →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          onClick={onOpenContributeModal}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-md hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Deposit (₹100–₹500)</span>
        </button>

        <button
          onClick={onOpenProposalModal}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-[#00f090]/40 bg-[#07241a] text-[#00f090] font-bold text-xs sm:text-sm hover:bg-[#0c3829] active:scale-[0.98] transition cursor-pointer"
        >
          <TrendingUp className="w-4 h-4" />
          <span>+ New Proposal</span>
        </button>

        <button
          onClick={onOpenRotateModal}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-amber-400/40 bg-[#07241a] text-amber-300 font-bold text-xs sm:text-sm hover:bg-[#1a2c1d] active:scale-[0.98] transition cursor-pointer"
        >
          <Crown className="w-4 h-4 text-amber-400" />
          <span>Rotate Admin Baton</span>
        </button>
      </div>

      {/* Rotating Administrator Spotlight Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#07261c] to-[#041810] border border-[#00f090]/25 p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold text-white shadow-md border-2 border-amber-400"
                style={{ backgroundColor: currentAdmin?.color || '#00f090' }}
              >
                {currentAdmin?.avatar || 'MB'}
              </div>
              <Crown className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400 drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{currentAdmin?.name || 'Club Administrator'}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold border border-amber-400/30">
                  Active Administrator
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Stewardship term ends {formatDate(rotation?.termEndDate || new Date().toISOString())} ({diffDays} days remaining)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right sm:block hidden">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Next in Line</span>
              <span className="text-xs font-semibold text-white">
                {nextAdmin?.name || (members.length <= 1 ? 'Awaiting 2nd Member' : 'Democratic Rotation')}
              </span>
            </div>
            <button
              onClick={onOpenRotateModal}
              disabled={members.length < 2}
              className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 text-xs font-semibold border border-amber-400/30 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Pass Baton</span>
            </button>
          </div>
        </div>

        {/* Rotation Queue visual ribbon */}
        <div className="pt-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Democratic Leadership Cycle (Sequential 30-Day Rotations)
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {rotation.rotationQueue.map((mId, index) => {
              const mem = members.find((m) => m.id === mId);
              if (!mem) return null;
              const isCurrent = mId === rotation.currentAdminId;
              const isNext = Boolean(nextAdmin && mId === nextAdmin.id && members.length > 1);

              return (
                <div
                  key={mId}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0 text-xs transition ${
                    isCurrent
                      ? 'bg-amber-400/20 border border-amber-400 text-amber-300 font-bold'
                      : isNext
                      ? 'bg-[#00f090]/15 border border-[#00f090]/40 text-[#00f090]'
                      : 'bg-[#041a12] border border-white/10 text-slate-400'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75">#{index + 1}</span>
                  <span>{mem.name}</span>
                  {isCurrent && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                  {isNext && <span className="text-[10px] bg-[#00f090]/30 px-1 rounded font-bold">Next</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Investment Proposals Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Democratic Ballots</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#00f090]/15 text-[#00f090] font-bold">
              {activeProposals.length}
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('proposals')}
            className="text-xs text-[#00f090] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>All Proposals</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeProposals.length === 0 ? (
          <div className="rounded-2xl bg-[#07241a] border border-white/10 p-8 text-center space-y-3">
            <FileText className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No active proposals right now</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Any member can submit an investment proposal for democratic voting.
            </p>
            <button
              onClick={onOpenProposalModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Proposal</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {activeProposals.map((proposal) => {
              const votesList = Object.values(proposal.votes);
              const approvals = votesList.filter((v) => v.decision === 'approve').length;
              const rejects = votesList.filter((v) => v.decision === 'reject').length;
              const abstains = votesList.filter((v) => v.decision === 'abstain').length;
              const totalVotes = votesList.length;
              const quorumNeeded = Math.floor(members.length / 2) + 1; // e.g. 3 of 5
              const hasVoted = Boolean(proposal.votes[currentMember.id]);
              const memberVote = proposal.votes[currentMember.id];

              return (
                <div
                  key={proposal.id}
                  className="rounded-2xl bg-[#07241a] border border-[#00f090]/25 p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-4 hover:border-[#00f090]/50 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#00f090] uppercase tracking-wider">
                        {proposal.category}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                        {proposal.riskLevel} Risk
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white line-clamp-1">{proposal.title}</h4>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {proposal.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>
                        Target: <strong className="text-white">{formatINR(proposal.requestedAmount)}</strong>
                      </span>
                      <span>
                        Horizon: <strong className="text-white">{proposal.durationMonths} Mos</strong>
                      </span>
                    </div>
                  </div>

                  {/* Quorum Progress Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        Quorum: <strong className="text-[#00f090]">{approvals}/{members.length}</strong> (need {quorumNeeded})
                      </span>
                      <span>{members.length - totalVotes} pending</span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[#041810] overflow-hidden flex">
                      <div
                        className="h-full bg-[#00f090] transition-all"
                        style={{ width: `${(approvals / members.length) * 100}%` }}
                        title={`${approvals} Approvals`}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all"
                        style={{ width: `${(rejects / members.length) * 100}%` }}
                        title={`${rejects} Rejections`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all"
                        style={{ width: `${(abstains / members.length) * 100}%` }}
                        title={`${abstains} Abstains`}
                      />
                    </div>
                  </div>

                  {/* Vote Action */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      {hasVoted ? (
                        <span className="text-[#00f090] flex items-center gap-1 font-semibold text-[11px]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Voted: {memberVote?.decision.toUpperCase()} (Recorded)</span>
                        </span>
                      ) : (
                        <span className="text-amber-300 font-medium text-[11px] flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Ballot awaiting your vote</span>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onSelectProposalForVote(proposal)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        hasVoted
                          ? 'border border-white/10 text-slate-400 hover:text-white'
                          : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981] shadow-md'
                      }`}
                    >
                      {hasVoted ? 'View Your Ballot' : 'Cast Vote (1x)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Ledger Activity */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Simulated Deposits</h3>
          <button
            onClick={() => onNavigateToTab('contributions')}
            className="text-xs text-[#00f090] hover:underline font-semibold cursor-pointer"
          >
            Open Sandbox Ledger →
          </button>
        </div>

        {contributions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No simulated deposits recorded yet. Club pool starts at ₹0.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {contributions.slice(0, 4).map((contrib) => {
              const member = members.find((m) => m.id === contrib.memberId);
              return (
                <div key={contrib.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: member?.color || '#00f090' }}
                    >
                      {member?.avatar || 'MB'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-semibold text-white">{contrib.memberName}</h5>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            contrib.status === 'approved'
                              ? 'bg-[#00f090]/15 text-[#00f090]'
                              : contrib.status === 'pending'
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {contrib.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{contrib.note}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-sm font-bold block ${
                        contrib.status === 'approved'
                          ? 'text-[#00f090]'
                          : contrib.status === 'pending'
                          ? 'text-amber-300'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      +{formatINR(contrib.amount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {contrib.referenceCode}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
