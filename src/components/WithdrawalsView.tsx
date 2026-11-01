import React, { useState } from 'react';
import { AlertTriangle, Clock, ShieldCheck, Wallet, XCircle, CheckCircle2, Send } from 'lucide-react';
import { Member, WithdrawalRequest } from '../types';
import { formatINR, formatDateTime } from '../utils/formatters';

interface WithdrawalsViewProps {
  requests: WithdrawalRequest[];
  members: Member[];
  currentMember: Member;
  isAdmin: boolean;
  isLoading?: boolean;
  onSubmit: (amount: number, reason: string) => Promise<boolean>;
  onCancel: (requestId: string) => Promise<boolean>;
  onFreeze: (requestId: string, reason: string) => Promise<boolean>;
  onVote: (requestId: string, choice: 'allow' | 'uphold_freeze', comment: string) => Promise<boolean>;
  onRespond: (requestId: string, response: string) => Promise<boolean>;
}

const statusLabel: Record<WithdrawalRequest['status'], string> = {
  pending: 'Awaiting review', frozen: 'Emergency freeze · voting', approved: 'Approved',
  rejected: 'Deferred by vote', expired: 'Freeze expired · released', cancelled: 'Cancelled',
};

export const WithdrawalsView: React.FC<WithdrawalsViewProps> = ({ requests, members, currentMember, isAdmin, isLoading = false, onSubmit, onCancel, onFreeze, onVote, onRespond }) => {
  const [amount, setAmount] = useState('250');
  const [reason, setReason] = useState('');
  const [freezeReasons, setFreezeReasons] = useState<Record<string,string>>({});
  const [responses, setResponses] = useState<Record<string,string>>({});
  const [comments, setComments] = useState<Record<string,string>>({});
  const [busyId, setBusyId] = useState<string|null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const run = async (id: string, action: () => Promise<boolean>, message: string) => {
    setBusyId(id); setError(''); setSuccess('');
    try { if (await action()) setSuccess(message); }
    catch (e: any) { setError(e?.message || 'Action failed.'); }
    finally { setBusyId(null); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter a positive simulated amount.'); return; }
    setError(''); setSuccess('');
    if (await onSubmit(value, reason.trim())) { setAmount('250'); setReason(''); setSuccess('Simulated withdrawal request submitted.'); }
  };

  return <div className="space-y-5 pb-6">
    <div className="rounded-2xl border border-amber-400/25 bg-[#082b20] p-4">
      <div className="flex items-center gap-2 font-bold text-amber-300"><ShieldCheck className="h-5 w-5"/> Withdrawal Protection & Review</div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">Simulation only. An emergency freeze applies to one specific withdrawal request, never to the member's account or any other request. Maximum freeze: 42 hours. The affected member cannot vote on their own request.</p>
    </div>
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[#00f090]/25 bg-[#07241a] p-4">
      <div className="flex items-center gap-2 font-bold text-white"><Wallet className="h-4 w-4 text-[#00f090]"/> Request a simulated withdrawal</div>
      <label className="block text-xs text-slate-300">Amount (₹)<input type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-white/15 bg-[#041a12] px-3 py-2.5 text-sm text-white"/></label>
      <label className="block text-xs text-slate-300">Reason<textarea required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Explain your simulated withdrawal request" className="mt-1 min-h-20 w-full rounded-xl border border-white/15 bg-[#041a12] px-3 py-2.5 text-sm text-white"/></label>
      <button type="submit" disabled={busyId!==null} className="w-full rounded-xl bg-[#00f090] px-4 py-3 text-sm font-bold text-[#041a12] disabled:opacity-50">Submit withdrawal request</button>
    </form>
    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-200">{error}</div>}
    {success && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">{success}</div>}
    <div className="flex items-center justify-between"><h3 className="text-lg font-extrabold text-white">Withdrawal requests</h3><span className="text-xs text-slate-400">{requests.length} records</span></div>
    {isLoading && <p className="text-xs text-slate-400">Refreshing requests…</p>}
    {requests.length===0 && <div className="rounded-xl border border-white/10 bg-[#07241a] p-8 text-center text-xs text-slate-400">No withdrawal requests yet.</div>}
    {requests.map(req=>{
      const isTarget=req.memberId===currentMember.id;
      const hasVoted=req.votes.some(v=>v.voterId===currentMember.id);
      const eligible=Math.max(0,members.length-1);
      const threshold=Math.floor(eligible/2)+1;
      const allow=req.votes.filter(v=>v.choice==='allow').length;
      const uphold=req.votes.filter(v=>v.choice==='uphold_freeze').length;
      const ms=req.freezeExpiresAt?Math.max(0,new Date(req.freezeExpiresAt).getTime()-Date.now()):0;
      return <article key={req.id} className="space-y-3 rounded-2xl border border-white/10 bg-[#07241a] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-bold text-white">{req.memberName} · {formatINR(req.amount)}</p><p className="mt-1 text-[11px] text-slate-500">Submitted {formatDateTime(req.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${req.status==='frozen'?'bg-amber-400/15 text-amber-300':req.status==='approved'?'bg-emerald-400/15 text-emerald-300':req.status==='rejected'?'bg-rose-400/15 text-rose-300':'bg-white/10 text-slate-300'}`}>{statusLabel[req.status]}</span></div>
        <p className="text-xs text-slate-300">{req.reason}</p>
        {req.status==='frozen' && <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-950/25 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-200"><AlertTriangle className="h-4 w-4"/> Temporary freeze on this request only</div>
          <p className="text-xs text-slate-300">{req.freezeReason}</p>
          <p className="text-[11px] text-amber-200"><Clock className="mr-1 inline h-3 w-3"/>{Math.floor(ms/3600000)}h {Math.floor((ms%3600000)/60000)}m remaining · 42-hour maximum</p>
          <p className="text-[11px] text-slate-400">Simple majority: {threshold} of {eligible} eligible members. Affected member excluded.</p>
          <div className="grid grid-cols-2 gap-2 text-xs"><div className="rounded-lg bg-[#041a12] p-2 text-emerald-300">Allow: {allow}</div><div className="rounded-lg bg-[#041a12] p-2 text-amber-200">Uphold: {uphold}</div></div>
          {req.votes.map(v=><p key={v.voterId} className="text-[11px] text-slate-400">{v.voterName}: {v.choice==='allow'?'Allow withdrawal':'Uphold freeze'}{v.comment?` — ${v.comment}`:''}</p>)}
          {!isTarget&&!hasVoted&&<div className="space-y-2 pt-1"><textarea value={comments[req.id]||''} onChange={e=>setComments(p=>({...p,[req.id]:e.target.value}))} placeholder="Optional voting comment" className="w-full rounded-lg border border-white/10 bg-[#041a12] p-2 text-xs text-white"/><div className="grid grid-cols-2 gap-2"><button type="button" disabled={busyId===req.id} onClick={()=>run(req.id,()=>onVote(req.id,'allow',comments[req.id]||''),'Vote recorded.')} className="rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-[#041a12]">Allow withdrawal</button><button type="button" disabled={busyId===req.id} onClick={()=>run(req.id,()=>onVote(req.id,'uphold_freeze',comments[req.id]||''),'Vote recorded.')} className="rounded-lg border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-200">Uphold freeze</button></div></div>}
          {isTarget&&<div className="space-y-2 pt-1"><p className="text-xs text-amber-100">You are the affected member. You cannot vote, but you can respond.</p><textarea value={responses[req.id]??req.memberResponse??''} onChange={e=>setResponses(p=>({...p,[req.id]:e.target.value}))} maxLength={500} placeholder="Your response to the freeze" className="w-full rounded-lg border border-white/10 bg-[#041a12] p-2 text-xs text-white"/><button type="button" disabled={busyId===req.id||!(responses[req.id]||'').trim()} onClick={()=>run(req.id,()=>onRespond(req.id,responses[req.id]),'Response recorded.')} className="rounded-lg border border-sky-400/30 px-3 py-2 text-xs font-bold text-sky-200"><Send className="mr-1 inline h-3 w-3"/>Submit response</button></div>}
        </div>}
        {req.status==='pending'&&isAdmin&&!isTarget&&<div className="space-y-2 rounded-xl border border-rose-400/20 bg-rose-950/15 p-3"><label className="block text-xs text-slate-300">Documented emergency reason<textarea minLength={10} maxLength={500} value={freezeReasons[req.id]||''} onChange={e=>setFreezeReasons(p=>({...p,[req.id]:e.target.value}))} placeholder="Describe the specific risk" className="mt-1 w-full rounded-lg border border-white/10 bg-[#041a12] p-2 text-xs text-white"/></label><button type="button" disabled={busyId===req.id||(freezeReasons[req.id]||'').trim().length<10} onClick={()=>run(req.id,()=>onFreeze(req.id,freezeReasons[req.id]),'This request is frozen and voting is open.')} className="rounded-lg border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200"><AlertTriangle className="mr-1 inline h-3 w-3"/>Freeze this request & open vote</button></div>}
        {req.status==='pending'&&isTarget&&<p className="text-xs text-slate-400">Your request is awaiting review. No freeze is active.</p>}
        {req.status==='approved'&&<p className="text-xs text-emerald-300"><CheckCircle2 className="mr-1 inline h-3 w-3"/>Approved by simple majority. Simulated only.</p>}
        {req.status==='rejected'&&<p className="text-xs text-rose-300"><XCircle className="mr-1 inline h-3 w-3"/>Majority upheld the freeze. The request was deferred, not confiscated.</p>}
        {req.status==='expired'&&<p className="text-xs text-slate-300">The 42-hour freeze expired; this request is released for normal review.</p>}
        {isTarget&&['pending','frozen','expired'].includes(req.status)&&<button type="button" disabled={busyId===req.id} onClick={()=>run(req.id,()=>onCancel(req.id),'Request cancelled.')} className="text-xs font-semibold text-slate-400 underline">Cancel my request</button>}
      </article>;
    })}
  </div>;
};
