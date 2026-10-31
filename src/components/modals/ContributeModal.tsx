import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Member } from '../../types';
import { formatINR } from '../../utils/formatters';

interface ContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  onSimulateContribution: (data: {
    memberId: string;
    amount: number;
    note: string;
    method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  }) => Promise<boolean>;
}

export const ContributeModal: React.FC<ContributeModalProps> = ({
  isOpen,
  onClose,
  members,
  currentMemberId,
  onSimulateContribution,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState(currentMemberId);
  const [amount, setAmount] = useState<number>(250);
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit'>('Simulated UPI');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [100, 200, 250, 350, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100 || amount > 500) {
      setError('Simulated deposit must be strictly between ₹100 and ₹500.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const submitted = await onSimulateContribution({
        memberId: selectedMemberId,
        amount,
        note: note.trim() || 'Simulated micro-deposit tranche',
        method,
      });
      if (!submitted) {
        setError('The simulated deposit could not be saved. Please retry.');
        return;
      }
      setNote('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00f090] animate-pulse" />
              <h3 className="text-lg font-bold text-white tracking-tight">Deposit Sandbox (Simulated)</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">₹100–₹500 micro-pool testing rail</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sandbox Warning Notice */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-[#0d3b2c]/80 border border-[#00f090]/20 flex items-start gap-2.5 text-xs text-slate-300">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Approval Workflow:</strong> Submitted deposits enter the <strong>Pending</strong> state. The active Club Administrator must review and approve them before the club balance is incremented. No real money is transferred.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Contributing Member (Simulated Profile)
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role === 'Admin' ? '👑 Admin' : 'Member'}) — Approved: {formatINR(m.totalContributed)}
                </option>
              ))}
            </select>
          </div>

          {/* Amount selector with ₹100 - ₹500 rule */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Simulated Amount (₹100 to ₹500)
              </label>
              <span className="text-sm font-bold text-[#00f090]">{formatINR(amount)}</span>
            </div>

            {/* Quick preset chips */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {presets.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setError(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    amount === preset
                      ? 'bg-[#00f090] text-[#041a12] shadow-sm'
                      : 'bg-[#041a12] text-slate-300 hover:text-white border border-white/10 hover:border-[#00f090]/40'
                  }`}
                >
                  ₹{preset}
                </button>
              ))}
            </div>

            {/* Slider */}
            <input
              type="range"
              min={100}
              max={500}
              step={25}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setError(null);
              }}
              className="w-full accent-[#00f090] cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Min ₹100</span>
              <span>Default ₹250</span>
              <span>Max ₹500</span>
            </div>
          </div>

          {/* Simulated Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Simulated Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Simulated UPI', 'Simulated IMPS', 'Club Quick-Deposit'] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`py-2 px-1 text-[11px] font-medium rounded-xl border text-center transition cursor-pointer ${
                    method === m
                      ? 'border-[#00f090] bg-[#00f090]/15 text-[#00f090]'
                      : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.replace('Simulated ', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Deposit Note / Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly sandbox contribution, Test pool tranche"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={60}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Submit Simulated Deposit for Approval'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
