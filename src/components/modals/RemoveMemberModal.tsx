import React, { useState } from 'react';
import { X, UserMinus, AlertTriangle, ArrowRight, ShieldAlert, Crown } from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatINR } from '../../utils/formatters';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  currentMemberCount: number;
  rotation: AdminRotation;
  members: Member[];
  onConfirmRemove: (memberId: string, reason: string) => void;
}

export const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  currentMemberCount,
  rotation,
  members,
  onConfirmRemove,
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen || !member) return null;

  // Club requires at least 3 members
  if (currentMemberCount <= 3) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-500/40 p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Minimum Quorum Required</h3>
          <p className="text-xs text-slate-300 mb-5 leading-relaxed">
            Friendpool requires a minimum of <strong>3 members</strong> to maintain democratic quorum and rotation rules. You cannot remove any more members unless another member is added first.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0d3b2c] text-white text-sm font-semibold hover:bg-[#145339] transition cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    );
  }

  const isCurrentAdmin = member.id === rotation.currentAdminId;
  const nextInQueueId = rotation.rotationQueue.find((id) => id !== member.id);
  const nextAdminCandidate = members.find((m) => m.id === nextInQueueId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmRemove(member.id, reason.trim() || 'Simulated member departure and pool exit settlement');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-rose-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserMinus className="w-5 h-5 text-rose-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Remove Club Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Offboard member and settle simulated pool equity</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Card Summary */}
          <div className="p-3.5 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ backgroundColor: member.color || '#00f090' }}
              >
                {member.avatar}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{member.name}</h4>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block">Total Contributed</span>
              <span className="text-sm font-extrabold text-[#00f090]">
                {formatINR(member.totalContributed)}
              </span>
            </div>
          </div>

          {/* Admin warning if removing active admin */}
          {isCurrentAdmin && (
            <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-400/40 text-xs text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-300">
                <Crown className="w-4 h-4 fill-amber-300" />
                <span>Active Administrator Notice</span>
              </div>
              <p>
                <strong>{member.name}</strong> is currently holding the Admin Baton. Upon removal, administrative leadership will automatically transfer to <strong>{nextAdminCandidate?.name}</strong>.
              </p>
            </div>
          )}

          {/* Settlement notice */}
          <div className="p-3 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Simulated Exit Settlement</span>
            </div>
            <p>
              Simulates returning the member's accrued pool equity of <strong>{formatINR(member.totalContributed)}</strong>. The member will be removed from all upcoming democratic ballots and the rotation queue.
            </p>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Departure Reason (Logged to Audit Trail)
            </label>
            <input
              type="text"
              placeholder="e.g. Relocated to new city, stepped down mutually"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-400 transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Confirm Offboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
