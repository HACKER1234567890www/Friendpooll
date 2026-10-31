import React, { useState } from 'react';
import { X, Check, ThumbsDown, MinusCircle, ShieldCheck, Lock } from 'lucide-react';
import { Proposal, Member, VoteDecision } from '../../types';
import { formatINR, formatDateTime } from '../../utils/formatters';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  currentMember: Member;
  onCastVote: (proposalId: string, decision: VoteDecision, comment?: string) => void;
}

export const VoteModal: React.FC<VoteModalProps> = ({
  isOpen,
  onClose,
  proposal,
  currentMember,
  onCastVote,
}) => {
  if (!isOpen || !proposal) return null;

  const existingVote = proposal.votes[currentMember.id];
  const [decision, setDecision] = useState<VoteDecision>(existingVote?.decision || 'approve');
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (existingVote) return; // Enforce: vote only once per member!
    onCastVote(proposal.id, decision, comment.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Democratic Ballot</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Strict Rule: 1 Member = 1 Single Vote</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Proposal Summary Box */}
          <div className="p-3.5 rounded-xl bg-[#041a12] border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider text-[#00f090] uppercase">
                {proposal.category}
              </span>
              <span className="text-[11px] font-semibold text-slate-300">
                {proposal.riskLevel} Risk
              </span>
            </div>
            <h4 className="text-sm font-bold text-white leading-snug">{proposal.title}</h4>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>Target Allocation: <strong className="text-white">{formatINR(proposal.requestedAmount)}</strong></span>
              <span>Horizon: <strong className="text-white">{proposal.durationMonths} Mos</strong></span>
            </div>
          </div>

          {/* Voter Identity Info */}
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: currentMember.color || '#00f090' }}
            >
              {currentMember.avatar}
            </div>
            <div className="text-xs">
              <span className="text-slate-400">Voter: </span>
              <strong className="text-white">{currentMember.name}</strong>
              <span className="text-slate-400 text-[11px] ml-1">({currentMember.role})</span>
            </div>
          </div>

          {/* If already voted: Enforce One Vote Per Member */}
          {existingVote ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-400/40 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300">
                <Lock className="w-4 h-4" />
                <span>Ballot Already Recorded (Vote Locked)</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                You have already cast your official single ballot on this proposal as <strong>{existingVote.decision.toUpperCase()}</strong> on {formatDateTime(existingVote.timestamp)}.
              </p>
              {existingVote.comment && (
                <p className="text-slate-400 italic">
                  Rationale provided: "{existingVote.comment}"
                </p>
              )}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 rounded-lg bg-[#0d3b2c] text-white font-semibold hover:bg-[#145339] transition cursor-pointer"
                >
                  Close Ballot
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Vote Choices */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Cast Your Decision (Irreversible once cast)
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDecision('approve')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'approve'
                        ? 'border-[#00f090] bg-[#00f090]/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'approve' ? 'bg-[#00f090] text-[#041a12]' : 'bg-white/10 text-slate-300'}`}>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <span className="text-xs font-bold">Approve</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('reject')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'reject'
                        ? 'border-rose-500 bg-rose-500/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'reject' ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                      <ThumbsDown className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision('abstain')}
                    className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      decision === 'abstain'
                        ? 'border-amber-400 bg-amber-400/20 text-white shadow-sm'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${decision === 'abstain' ? 'bg-amber-400 text-[#041a12]' : 'bg-white/10 text-slate-300'}`}>
                      <MinusCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">Abstain</span>
                  </button>
                </div>
              </div>

              {/* Comment Rationale */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Comment / Rationale (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain your ballot rationale for other club members..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
                />
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
                >
                  Cast Official Ballot (Final)
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
