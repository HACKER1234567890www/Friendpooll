import React, { useEffect, useState } from 'react';
import { X, Crown, ArrowRight, Shield, CheckCircle2 } from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatDate } from '../../utils/formatters';

interface RotateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  rotation: AdminRotation;
  members: Member[];
  onRotateAdmin: (nextAdminId: string, note?: string) => Promise<boolean>;
}

export const RotateAdminModal: React.FC<RotateAdminModalProps> = ({
  isOpen,
  onClose,
  rotation,
  members,
  onRotateAdmin,
}) => {
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0];

  // Prefer the scheduled next member, but safely fall back to another active member.
  const eligibleNextMembers = members.filter((m) => m.id !== currentAdmin?.id);
  const currentQueueIndex = rotation.rotationQueue.indexOf(rotation.currentAdminId);
  const queuedNextId = rotation.rotationQueue.length > 0
    ? rotation.rotationQueue[(currentQueueIndex + 1 + rotation.rotationQueue.length) % rotation.rotationQueue.length]
    : undefined;
  const defaultNextId = eligibleNextMembers.some((m) => m.id === queuedNextId)
    ? (queuedNextId || '')
    : eligibleNextMembers[0]?.id || '';

  const [selectedNextId, setSelectedNextId] = useState<string>(defaultNextId);
  const [rotationNote, setRotationNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedNextId(defaultNextId);
      setRotationNote('');
    }
  }, [isOpen, defaultNextId]);

  const nextAdmin = eligibleNextMembers.find((m) => m.id === selectedNextId);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextAdmin) return;
    const rotated = await onRotateAdmin(nextAdmin.id, rotationNote.trim() || 'Scheduled democratic leadership baton transfer');
    if (!rotated) return;
    onClose();
  };

  if (!isOpen || !currentAdmin || !nextAdmin) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">Rotate Administrator Baton</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Democratic leadership rotation system</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          {/* Visual Baton Transfer Graphic */}
          <div className="p-4 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-between gap-3">
            {/* Outgoing */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white border-2 border-amber-400 relative"
                style={{ backgroundColor: currentAdmin.color || '#00f090' }}
              >
                {currentAdmin.avatar}
                <Crown className="w-4 h-4 text-amber-400 absolute -top-2 -right-2 fill-amber-400" />
              </div>
              <span className="text-xs font-bold text-white mt-1.5 line-clamp-1">{currentAdmin.name}</span>
              <span className="text-[10px] text-amber-300">Outgoing Admin</span>
            </div>

            <div className="flex flex-col items-center px-2">
              <span className="text-[10px] text-slate-400 mb-1">Pass Baton</span>
              <div className="w-10 h-0.5 bg-gradient-to-r from-amber-400 to-[#00f090] relative flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-[#00f090] absolute" />
              </div>
            </div>

            {/* Incoming */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white border-2 border-[#00f090] relative"
                style={{ backgroundColor: nextAdmin.color || '#38bdf8' }}
              >
                {nextAdmin.avatar}
                <Shield className="w-3.5 h-3.5 text-[#00f090] absolute -top-1.5 -right-1.5" />
              </div>
              <span className="text-xs font-bold text-white mt-1.5 line-clamp-1">{nextAdmin.name}</span>
              <span className="text-[10px] text-[#00f090]">Incoming Admin</span>
            </div>
          </div>

          {/* Select Next Administrator */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Assign Next Administrator
            </label>
            <select
              value={selectedNextId}
              onChange={(e) => setSelectedNextId(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            >
              {members
                .filter((m) => m.id !== currentAdmin.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.id === defaultNextId ? '(Scheduled Next in Queue)' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Handover note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Handover Remarks (Logged to Audit)
            </label>
            <input
              type="text"
              placeholder="e.g. Regular 30-day rotation, all allocations audited"
              value={rotationNote}
              onChange={(e) => setRotationNote(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#0d3b2c]/60 border border-[#00f090]/20 text-xs text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-[#00f090] font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Decentralized Governance Rule</span>
            </div>
            <p>
              Friendpool rotates administrative stewardship every 30 days. The active admin is entrusted to execute passed proposals and audit pool deposits.
            </p>
          </div>

          {/* Submit */}
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Pass Baton Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
