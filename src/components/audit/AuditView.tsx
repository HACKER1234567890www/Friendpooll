import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  ReceiptText, 
  Vote, 
  Crown, 
  UserCheck, 
  UserMinus,
  CheckCircle2,
  Calendar,
  Hash
} from 'lucide-react';
import { AuditLogItem, AuditEventType } from '../../types';
import { formatDateTime } from '../../utils/formatters';

interface AuditViewProps {
  logs: AuditLogItem[];
}

export const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchType = filterType === 'all' || log.type === filterType;
    const matchSearch =
      log.actorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.hash.toLowerCase().includes(searchQuery.toLowerCase());
    return matchType && matchSearch;
  });

  const getEventIcon = (type: AuditEventType) => {
    switch (type) {
      case 'contribution_submitted':
        return <ReceiptText className="w-4 h-4 text-amber-400" />;
      case 'contribution_approved':
        return <CheckCircle2 className="w-4 h-4 text-[#00f090]" />;
      case 'contribution_rejected':
        return <UserMinus className="w-4 h-4 text-rose-400" />;
      case 'proposal_created':
      case 'vote_cast':
        return <Vote className="w-4 h-4 text-sky-400" />;
      case 'admin_rotated':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'proposal_executed':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'member_added':
      case 'member_updated':
        return <UserCheck className="w-4 h-4 text-purple-400" />;
      case 'member_removed':
        return <UserMinus className="w-4 h-4 text-rose-400" />;
    }
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `friendpool_audit_ledger_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">Audit & Activity History</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable transparency log: every micro-deposit, proposal, ballot, and admin handover
          </p>
        </div>

        <button
          onClick={exportJSON}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-white/10 bg-[#07241a] text-xs font-semibold text-white hover:border-[#00f090]/40 transition cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#00f090]" />
          <span>Export Audit Ledger (.JSON)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search audit trail by actor, summary, or hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#07241a] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#07241a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00f090] cursor-pointer"
          >
            <option value="all">All Events ({logs.length})</option>
            <option value="contribution_submitted">Deposits Submitted</option>
            <option value="contribution_approved">Deposits Approved</option>
            <option value="contribution_rejected">Deposits Rejected</option>
            <option value="vote_cast">Ballots Cast</option>
            <option value="proposal_created">New Proposals</option>
            <option value="admin_rotated">Admin Rotations</option>
            <option value="proposal_executed">Allocations Executed</option>
          </select>
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="rounded-2xl bg-[#07241a] border border-white/10 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Chronological Trail ({filteredLogs.length} Records)
          </span>
          <span className="text-[11px] text-[#00f090] font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cryptographically Verified</span>
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No audit records match your query.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {getEventIcon(log.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{log.actorName}</span>
                      <span className="text-xs text-slate-300">{log.summary}</span>
                    </div>

                    {log.details && (
                      <p className="text-xs text-slate-400">{log.details}</p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hash Badge */}
                <div className="sm:text-right shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#041a12] border border-white/10 font-mono text-[10px] text-slate-400">
                    <Hash className="w-3 h-3 text-[#00f090]" />
                    <span>{log.hash}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
