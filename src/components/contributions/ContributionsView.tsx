import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ReceiptText, 
  Sparkles, 
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Crown,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Member, Contribution, ContributionStatus } from '../../types';
import { formatINR, formatDateTime } from '../../utils/formatters';

interface ContributionsViewProps {
  members: Member[];
  contributions: Contribution[];
  currentMember: Member;
  isAdmin: boolean;
  adminName: string;
  onOpenContributeModal: () => void;
  onSimulateQuickDeposit: (amount: number) => void;
  onApproveDeposit: (depositId: string) => void;
  onRejectDeposit: (depositId: string, reason?: string) => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const ContributionsView: React.FC<ContributionsViewProps> = ({
  members,
  contributions,
  currentMember,
  isAdmin,
  adminName,
  onOpenContributeModal,
  onSimulateQuickDeposit,
  onApproveDeposit,
  onRejectDeposit,
  onRefreshData,
  isRefreshing = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [filterMemberId, setFilterMemberId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const approvedContributions = contributions.filter((c) => c.status === 'approved');
  const pendingContributions = contributions.filter((c) => c.status === 'pending');
  const rejectedContributions = contributions.filter((c) => c.status === 'rejected');

  const totalApprovedPool = approvedContributions.reduce((acc, c) => acc + c.amount, 0);
  const totalPendingAmount = pendingContributions.reduce((acc, c) => acc + c.amount, 0);

  const filteredContributions = contributions.filter((c) => {
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchMember = filterMemberId === 'all' || c.memberId === filterMemberId;
    const matchSearch =
      c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.referenceCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchMember && matchSearch;
  });

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Deposit Sandbox & Ledger</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulated micro-deposits (<strong className="text-[#00f090]">₹100–₹500</strong>) with Administrator verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshData && (
            <button
              onClick={onRefreshData}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-[#07241a] text-slate-300 hover:text-white text-xs font-semibold hover:border-[#00f090]/40 transition cursor-pointer"
              title="Refresh ledger entries"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#00f090] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}

          <button
            onClick={onOpenContributeModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Submit Deposit</span>
          </button>
        </div>
      </div>

      {/* Financial Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#07241a] border border-[#00f090]/30 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved Club Balance</span>
          <span className="text-xl font-extrabold text-[#00f090]">{formatINR(totalApprovedPool)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{approvedContributions.length} verified deposits</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#07241a] border border-amber-400/30 shadow-md">
          <span className="text-[10px] uppercase font-bold text-amber-300 block">Pending Admin Review</span>
          <span className="text-xl font-extrabold text-amber-300">{formatINR(totalPendingAmount)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{pendingContributions.length} awaiting review</span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-[#07241a] border border-white/10 shadow-md">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Rejected / Cancelled</span>
          <span className="text-xl font-extrabold text-slate-300">{rejectedContributions.length}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Zero impact on pool</span>
        </div>
      </div>

      {/* Quick 1-Click Simulation Toolbar for Active Member */}
      <div className="rounded-2xl bg-[#07241a] border border-[#00f090]/25 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ backgroundColor: currentMember.color || '#00f090' }}
          >
            {currentMember.avatar}
          </div>
          <div>
            <span className="text-xs font-semibold text-white block">
              Quick Test Deposit as <span className="text-[#00f090]">{currentMember.name}</span>
            </span>
            <span className="text-[11px] text-slate-400">Submits sandbox micro-deposit into Pending state</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[100, 250, 500].map((amt) => (
            <button
              key={amt}
              onClick={() => onSimulateQuickDeposit(amt)}
              className="px-3 py-1.5 rounded-xl bg-[#041a12] hover:bg-[#00f090] hover:text-[#041a12] text-[#00f090] border border-[#00f090]/30 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              +₹{amt} (Test)
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All Deposits', count: contributions.length },
            { id: 'pending', label: 'Pending Review', count: pendingContributions.length, highlight: true },
            { id: 'approved', label: 'Approved (Settled)', count: approvedContributions.length },
            { id: 'rejected', label: 'Rejected', count: rejectedContributions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                  : 'bg-[#07241a] text-slate-300 hover:text-white border border-white/10'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.id
                    ? 'bg-[#041a12] text-[#00f090]'
                    : tab.highlight && tab.count > 0
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'bg-white/10 text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by member, note, or reference code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#07241a] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <select
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
            className="bg-[#07241a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00f090] cursor-pointer"
          >
            <option value="all">All Members ({members.length})</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger Table / List */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Ledger Entries ({filteredContributions.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Deposit Sandbox
          </span>
        </div>

        {filteredContributions.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <ReceiptText className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-white">No simulated deposits yet</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Initial club balance is ₹0. Submit a simulated deposit (₹100–₹500) to test the sandbox workflow.
            </p>
            <button
              onClick={onOpenContributeModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Record First Deposit</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredContributions.map((entry) => {
              const member = members.find((m) => m.id === entry.memberId);
              const isPending = entry.status === 'pending';
              const isApproved = entry.status === 'approved';
              const isRejected = entry.status === 'rejected';

              return (
                <div
                  key={entry.id}
                  className="p-4 hover:bg-white/[0.02] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                      style={{ backgroundColor: member?.color || '#00f090' }}
                    >
                      {member?.avatar || 'MB'}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{entry.memberName}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({entry.referenceCode})
                        </span>
                        
                        {/* Status Badge */}
                        {isApproved && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00f090]/15 text-[#00f090] border border-[#00f090]/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approved & Settled</span>
                          </span>
                        )}
                        {isPending && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            <Clock className="w-3 h-3" />
                            <span>Pending Review</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{entry.note}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDateTime(entry.timestamp)}
                        </span>
                        <span className="text-slate-500 font-mono">via {entry.method}</span>
                        {entry.reviewedBy && (
                          <span className="text-[#00f090] text-[10px]">
                            Reviewed by {entry.reviewedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Amount and Admin Actions */}
                  <div className="flex sm:flex-row md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-white/5">
                    <span
                      className={`text-base font-extrabold ${
                        isApproved
                          ? 'text-[#00f090]'
                          : isPending
                          ? 'text-amber-300'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      +{formatINR(entry.amount)}
                    </span>

                    {/* Admin Approval Permissions */}
                    {isPending && (
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <>
                            <button
                              onClick={() => onApproveDeposit(entry.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#00f090] text-[#041a12] text-xs font-bold hover:bg-[#10b981] transition cursor-pointer flex items-center gap-1 shadow"
                              title="Approve deposit and update club balance immediately"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => onRejectDeposit(entry.id)}
                              className="px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/15 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Reject simulated deposit"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-amber-300/90 italic flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>Requires Admin ({adminName})</span>
                          </span>
                        )}
                      </div>
                    )}
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
