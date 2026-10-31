import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Users } from 'lucide-react';
import { Member } from '../../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  onAddMember: (memberData: {
    name: string;
    email: string;
    phone: string;
  }) => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  currentCount,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (currentCount >= 5) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-500/40 p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Club Capacity Reached</h3>
          <p className="text-xs text-slate-300 mb-5">
            Friendpool is optimized for close-knit groups of <strong>3 to 5 people</strong> to maintain intimacy, high trust, and 100% democratic consensus.
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide the member full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    setError(null);
    onAddMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '+91 98' + Math.floor(10000000 + Math.random() * 90000000),
    });
    setName('');
    setEmail('');
    setPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Invite Club Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Current members: {currentCount} of 5 max
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Deshmukh"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. maya@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mobile Number (Optional)
            </label>
            <input
              type="text"
              placeholder="+91 98200 11223"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-[#041a12] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              Add to Club
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
