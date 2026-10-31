import React, { useState } from 'react';
import { X, TrendingUp, AlertCircle, Sparkles, ShieldAlert } from 'lucide-react';
import { Member, ProposalCategory } from '../../types';
import { formatINR } from '../../utils/formatters';

interface NewProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentMemberId: string;
  clubBalance: number;
  onCreateProposal: (data: {
    title: string;
    category: ProposalCategory;
    requestedAmount: number;
    proposerId: string;
    durationMonths: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    description: string;
    thesis: string;
  }) => Promise<boolean>;
}

const CATEGORIES: ProposalCategory[] = [
  'Index Fund',
  'Sovereign Green Bonds',
  'Tech ETF',
  'Fixed Deposit',
  'Solar Infrastructure',
  'Blue Chip Dividend',
];

export const NewProposalModal: React.FC<NewProposalModalProps> = ({
  isOpen,
  onClose,
  members,
  currentMemberId,
  clubBalance,
  onCreateProposal,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ProposalCategory>('Index Fund');
  const [requestedAmount, setRequestedAmount] = useState<number>(1000);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [riskLevel, setRiskLevel] = useState<'Low' | 'Moderate' | 'High'>('Moderate');
  const [description, setDescription] = useState('');
  const [thesis, setThesis] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMember = members.find((m) => m.id === currentMemberId) || members[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a descriptive proposal title.');
      return;
    }
    if (requestedAmount < 100) {
      setError('Minimum simulated allocation amount is ₹100.');
      return;
    }
    if (!description.trim() || !thesis.trim()) {
      setError('Please outline both the description and the investment thesis.');
      return;
    }

    const created = await onCreateProposal({
      title: title.trim(),
      category,
      requestedAmount,
      proposerId: currentMember.id,
      durationMonths,
      riskLevel,
      description: description.trim(),
      thesis: thesis.trim(),
    });

    if (!created) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Create Investment Proposal</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Drafted by <span className="text-[#00f090] font-medium">{currentMember.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Regulatory & Realism Notice */}
        <div className="mx-6 mt-4 p-3 rounded-xl bg-[#041a12] border border-amber-400/30 text-xs text-amber-200/90 flex items-start gap-2 shrink-0">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            <strong className="text-white">Prudent Investment Policy:</strong> Unsupported or guaranteed target returns are prohibited. Investment proposals must evaluate risk, time horizon, and allocation rationale realistically.
          </p>
        </div>

        {/* Form Body - scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Proposal Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nifty 50 Index Accumulation SIP or Liquid Fixed Deposit"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {/* Category & Risk */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Asset Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProposalCategory)}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Risk Classification
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['Low', 'Moderate', 'High'] as const).map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRiskLevel(r)}
                    className={`py-2 text-xs font-medium rounded-lg border text-center transition cursor-pointer ${
                      riskLevel === r
                        ? r === 'Low'
                          ? 'border-[#00f090] bg-[#00f090]/15 text-[#00f090]'
                          : r === 'Moderate'
                          ? 'border-amber-400 bg-amber-400/15 text-amber-300'
                          : 'border-rose-400 bg-rose-400/15 text-rose-300'
                        : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Requested Amount & Horizon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Target Allocation Amount (₹)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={requestedAmount}
                onChange={(e) => setRequestedAmount(Number(e.target.value))}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm font-semibold text-[#00f090] focus:outline-none focus:border-[#00f090] transition"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Current club unallocated pool: {formatINR(clubBalance)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Holding Horizon
              </label>
              <select
                value={durationMonths}
                onChange={(e) => setDurationMonths(Number(e.target.value))}
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00f090] transition"
              >
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 yr)</option>
                <option value={24}>24 Months (2 yr)</option>
                <option value={36}>36 Months (3 yr)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Asset Description
            </label>
            <textarea
              rows={2}
              required
              placeholder="Explain the vehicle, fund structure, or asset..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
            />
          </div>

          {/* Investment Thesis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Investment Thesis & Rationale
            </label>
            <textarea
              rows={3}
              required
              placeholder="Outline risk mitigation, liquidity terms, and why this allocation suits our collective club goals..."
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition resize-none"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action buttons */}
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
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
            >
              Submit Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
