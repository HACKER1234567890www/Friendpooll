import React from 'react';
import { X, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#07241a] border border-amber-400/40 p-6 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reset Sandbox to ₹0</h3>
              <p className="text-[11px] text-slate-400">Restore clean initial demonstration state</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3 rounded-xl bg-[#041a12] border border-amber-400/20 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              This will clear all pending and approved simulated deposits, resetting the club balance back to <strong>₹0</strong> and archiving voting ballots.
            </p>
          </div>
          <p className="text-slate-400">
            Use this anytime you want to re-test the contribution sandbox, administrator approvals, or democratic voting from a fresh starting point.
          </p>
        </div>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmReset();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
          >
            Confirm Reset (₹0)
          </button>
        </div>
      </div>
    </div>
  );
};
