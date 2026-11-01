import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, ShieldCheck, Wallet, XCircle, CheckCircle2 } from 'lucide-react';
import { Member } from '../../types';
import { formatINR } from '../../utils/formatters';

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

interface WithdrawalsViewProps {
  members: Member[];
  currentMember: Member;
  isAdmin: boolean;
  requests: WithdrawalRequest[];
  votes: WithdrawalVote[];
  onSubmit: (amount: number, reason: string) => Promise<boolean>;
  onFreeze: (requestId: string, reason: string) => Promise<boolean>;
  onVote: (requestId: string, choice: WithdrawalChoice, comment: string) => Promise<boolean>;
  onRespond: (requestId: string, response: string) => Promise<boolean>;
  onCancel: (requestId: string) => Promise<boolean>;
  onExpire: (requestId: string) => Promise<boolean>;
}

const dateLabel = (value?: string | null) => value
  ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : '—';

export const WithdrawalsView: React.FC<WithdrawalsViewProps> = ({
  members, currentMember, isAdmin, requests, votes,
  onSubmit, onFreeze, onVote, onRespond, onCancel, onExpire,
}) => {
  const [amount, setAmount] = useState('250');
  const [reason, setReason] = useState('');
  const [freezeReasons, setFreezeReasons] = useState<Record<string, string>>({});
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sorted = useMemo(() => [...requests].sort((a,b) => b.createdAt.localeCompare(a.createdAt)), [requests]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !reason.trim()) {
      setNotice('Enter a positive simulated amount and a reason.');
      return;
    }
    setBusyId('new');
    setNotice(null);
    try {
      if (await onSubmit(value, reason.trim())) {
        setReason('');
        setNotice('Simulated withdrawal request submitted.');
      }
    } finally { setBusyId(null); }
  };

  const act = async (id: string, action: () => Promise<boolean>, success: string) => {
    setBusyId(id);
    setNotice(null);
    try { if (await action()) setNotice(success); }
    finally { setBusyId(null); }
  };

  const eligibleVotes = (requestId: string) => votes.filter(v => v.requestId === requestId);
  const now = Date.now();

  return (
    <div className="space-y-5 pb-8">
      <div className="rounded-2xl border border-[#00f090]/25 bg-gradient-to-r from-[#072d21] to-[#0a3a2a] p-4 flex gap-3">
        <ShieldCheck className="w-6 h-6 text-[#00f090] shrink-0" />
        <div className="text-sm">
          <h2 className="font-bold text-white">Withdrawal Protection — Simulation</h2>
          <p className="text-slate-300 text-xs mt-1 leading-relaxed">
            Every freeze applies only to one named withdrawal request. It never locks the member's account, other requests, or the club's pool. Emergency freezes last at most 42 hours and require a simple-majority vote by the other members.
          </p>
          <p className="text-amber-200 text-xs mt-2 font-semibold">No real money is held, transferred, or withdrawn in this sandbox.</p>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#07241a] p-4 space-y-3">
        <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-[#00f090]" /><h3 className="font-bold text-white">Request a simulated withdrawal</h3></div>
        <label className="block text-xs text-slate-300">Amount (₹)
          <input type="number" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 w-full rounded-xl bg-[#041a12] border border-white/15 p-3 text-white" />
        </label>
        <label className="block text-xs text-slate-300">Reason
          <textarea minLength={5} maxLength={500} required value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why you are requesting this simulated withdrawal" className="mt-1 w-full min-h-20 rounded-xl bg-[#041a12] border border-white/15 p-3 text-white placeholder:text-slate-500" />
        </label>
        <button disabled={busyId === 'new'} className="w-full rounded-xl bg-[#00f090] text-[#041a12] font-bold p-3 disabled:opacity-50">{busyId === 'new' ? 'Submitting…' : 'Submit withdrawal request'}</button>
      </form>

      {notice && <div role="status" className="rounded-xl border border-[#00f090]/30 bg-[#00f090]/10 p-3 text-sm text-[#8fffc9]">{notice}</div>}

      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Withdrawal requests</h3>
        <span className="text-xs text-slate-400">{requests.length} total</span>
      </div>

      {sorted.length === 0 && <div className="rounded-xl border border-white/10 p-5 text-center text-sm text-slate-400">No withdrawal requests yet.</div>}

      {sorted.map(request => {
        const target = request.memberId === currentMember.id;
        const requestVotes = eligibleVotes(request.id);
        const myVote = requestVotes.find(v => v.voterId === currentMember.id);
        const expired = request.status === 'frozen' && request.freezeExpiresAt && new Date(request.freezeExpiresAt).getTime() <= now;
        const eligibleCount = Math.max(0, members.length - 1);
        const threshold = Math.floor(eligibleCount / 2) + 1;
        const allowCount = requestVotes.filter(v => v.choice === 'allow').length;
        const upholdCount = requestVotes.filter(v => v.choice === 'uphold_freeze').length;
        const canVote = request.status === 'frozen' && !target && !myVote && !expired;
        const statusColor = request.status === 'frozen' ? 'text-amber-300' : request.status === 'approved' ? 'text-[#00f090]' : request.status === 'rejected' ? 'text-rose-300' : 'text-slate-300';
        return (
          <article key={request.id} className="rounded-2xl border border-white/10 bg-[#07241a] p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">{request.memberName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{dateLabel(request.createdAt)}</p>
              </div>
              <span className={`text-xs font-bold uppercase ${statusColor}`}>{request.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Requested amount</span>
              <strong className="text-xl text-white">{formatINR(request.amount)}</strong>
            </div>
            <p className="text-sm text-slate-300">{request.reason}</p>

            {request.status === 'frozen' && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-950/25 p-3 space-y-2">
                <div className="flex items-center gap-2 text-amber-200 text-sm font-semibold"><AlertTriangle className="w-4 h-4" /> Temporary freeze — this request only</div>
                <p className="text-xs text-slate-300">{request.freezeReason}</p>
                <p className="text-xs text-amber-200">Expires: {dateLabel(request.freezeExpiresAt)}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <span>Allow withdrawal: {allowCount}</span><span>Uphold freeze: {upholdCount}</span>
                  <span>Majority needed: {threshold}</span><span>Votes cast: {requestVotes.length}/{eligibleCount}</span>
                </div>
                {request.memberResponse && <p className="text-xs text-white border-t border-white/10 pt-2">Member response: {request.memberResponse}</p>}
                {target && !expired && (
                  <div className="space-y-2">
                    <textarea value={responses[request.id] || ''} onChange={e => setResponses(p => ({...p,[request.id]:e.target.value}))} maxLength={500} placeholder="Your response to the temporary freeze (5–500 characters)" className="w-full rounded-lg bg-[#041a12] border border-white/15 p-2 text-white text-xs" />
                    <button disabled={busyId === request.id || (responses[request.id] || '').trim().length < 5} onClick={() => act(request.id, () => onRespond(request.id, responses[request.id].trim()), 'Your response was recorded.')} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Submit response</button>
                  </div>
                )}
                {canVote && (
                  <div className="space-y-2 border-t border-white/10 pt-2">
                    <p className="text-xs text-slate-300">You are eligible to vote. The affected member cannot vote on their own request.</p>
                    <textarea value={comments[request.id] || ''} onChange={e => setComments(p => ({...p,[request.id]:e.target.value}))} maxLength={500} placeholder="Optional comment" className="w-full rounded-lg bg-[#041a12] border border-white/15 p-2 text-white text-xs" />
                    <div className="grid grid-cols-2 gap-2">
                      <button disabled={busyId === request.id} onClick={() => act(request.id, () => onVote(request.id, 'allow', comments[request.id] || ''), 'Your vote to allow the request was recorded.')} className="rounded-lg bg-[#00f090] p-2 text-xs font-bold text-[#041a12]">Allow request</button>
                      <button disabled={busyId === request.id} onClick={() => act(request.id, () => onVote(request.id, 'uphold_freeze', comments[request.id] || ''), 'Your vote to uphold the freeze was recorded.')} className="rounded-lg bg-amber-400 p-2 text-xs font-bold text-[#041a12]">Uphold freeze</button>
                    </div>
                  </div>
                )}
                {myVote && <p className="text-xs text-[#00f090]">Your vote: {myVote.choice === 'allow' ? 'Allow request' : 'Uphold freeze'}</p>}
                {expired && <button onClick={() => act(request.id, () => onExpire(request.id), 'The 42-hour freeze expired. This request is released for review.')} className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-[#041a12]">Release expired freeze</button>}
              </div>
            )}

            {isAdmin && request.status === 'pending' && !target && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <label className="block text-xs text-slate-300">Emergency freeze reason (10–500 characters)
                  <textarea value={freezeReasons[request.id] || ''} onChange={e => setFreezeReasons(p => ({...p,[request.id]:e.target.value}))} maxLength={500} placeholder="Explain the specific risk to the club or other members" className="mt-1 w-full rounded-lg bg-[#041a12] border border-white/15 p-2 text-white text-xs" />
                </label>
                <button disabled={busyId === request.id || (freezeReasons[request.id] || '').trim().length < 10} onClick={() => act(request.id, () => onFreeze(request.id, freezeReasons[request.id].trim()), 'Only this withdrawal request has been temporarily frozen for a vote.')} className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">Emergency freeze this request</button>
              </div>
            )}

            {target && ['pending','frozen','expired'].includes(request.status) && (
              <button disabled={busyId === request.id} onClick={() => act(request.id, () => onCancel(request.id), 'Your withdrawal request was cancelled.')} className="flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-300"><XCircle className="w-3.5 h-3.5" /> Cancel my request</button>
            )}
            {request.status === 'approved' && <p className="flex items-center gap-2 text-xs text-[#00f090]"><CheckCircle2 className="w-4 h-4" /> Approved for simulated withdrawal review. No payment has been made.</p>}
            {request.status === 'rejected' && <p className="text-xs text-rose-300">The other members upheld the freeze by simple majority. No simulated withdrawal was executed.</p>}
            {request.status === 'expired' && <p className="text-xs text-slate-300"><Clock3 className="inline w-3.5 h-3.5 mr-1" />The temporary freeze expired without a majority decision. The request is released for review.</p>}
          </article>
        );
      })}
    </div>
  );
};
