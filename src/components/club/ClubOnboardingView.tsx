import React, { useState } from 'react';
import { 
  Shield, 
  PlusCircle, 
  UserPlus, 
  Sparkles, 
  KeyRound, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface ClubOnboardingViewProps {
  userEmail?: string;
  userDisplayName?: string;
  initialInviteCode?: string;
  onCreateClub: (clubName: string) => Promise<boolean>;
  onJoinClub: (inviteCode: string) => Promise<boolean>;
  onSwitchToDemo: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export const ClubOnboardingView: React.FC<ClubOnboardingViewProps> = ({
  userEmail,
  userDisplayName,
  initialInviteCode = '',
  onCreateClub,
  onJoinClub,
  onSwitchToDemo,
  isLoading = false,
  errorMessage = null,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    initialInviteCode ? 'join' : 'create'
  );
  const [clubName, setClubName] = useState('Friendpool Alpha');
  const [inviteToken, setInviteToken] = useState(initialInviteCode);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubName.trim()) {
      setLocalError('Please enter a name for your club simulation.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    const success = await onCreateClub(clubName.trim());
    setIsSubmitting(false);
    if (!success) {
      setLocalError('Failed to create club. Please try again.');
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = inviteToken.trim();
    if (!cleanToken) {
      setLocalError('Please enter a valid 32-character invitation token.');
      return;
    }
    setLocalError(null);
    setIsSubmitting(true);
    const success = await onJoinClub(cleanToken);
    setIsSubmitting(false);
    if (!success) {
      setLocalError('Invalid or expired invitation token, or club has reached its 5-member limit.');
    }
  };

  const busy = isLoading || isSubmitting;
  const currentError = localError || errorMessage;

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Welcome & Identity Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#072d21] via-[#052218] to-[#041810] border border-[#00f090]/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#00f090]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#00f090]/15 border border-[#00f090]/30 text-[#00f090] flex items-center justify-center shrink-0 shadow-lg">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] border border-[#00f090]/30 font-bold uppercase tracking-wider">
                  Verified Real Account
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {userEmail || 'Active Session'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                Welcome, {userDisplayName || 'Member'}!
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Your Supabase account is confirmed. You are not currently assigned to any private club simulation. Start your own club as founding Administrator, or redeem an invitation code.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Tabs */}
      <div className="bg-[#07241a] border border-white/10 rounded-2xl p-1.5 flex gap-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => {
            setActiveTab('create');
            setLocalError(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'create'
              ? 'bg-[#00f090] text-[#041a12] shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Club (Founding Admin)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('join');
            setLocalError(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'join'
              ? 'bg-[#00f090] text-[#041a12] shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Join via Invite Code</span>
        </button>
      </div>

      {/* Error Banner */}
      {currentError && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{currentError}</span>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'create' && (
        <div className="rounded-3xl bg-[#07241a] border border-[#00f090]/25 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#00f090]" />
              <span>Create Your Private Club Simulation</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              As the club founder, you will be initialized as the <strong>Administrator</strong>. You can invite up to 4 trusted friends (max 5 members total) and rotate stewardship every 30 days.
            </p>
          </div>

          <form onSubmit={handleCreateSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Club Name *
              </label>
              <input
                type="text"
                required
                disabled={busy}
                value={clubName}
                onChange={(e) => {
                  setClubName(e.target.value);
                  setLocalError(null);
                }}
                placeholder="e.g. Bangalore Friends Syndicate"
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Choose a memorable name for your circle of 3 to 5 members.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-[#041a12] border border-white/10 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Users className="w-3.5 h-3.5 text-[#00f090]" />
                  <span>Capacity: 5 Max</span>
                </span>
                <p className="text-slate-400 text-[10px]">Close-knit governance with democratic quorum.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#041a12] border border-white/10 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>30-Day Rotation</span>
                </span>
                <p className="text-slate-400 text-[10px]">Admin baton rotates evenly among active members.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#041a12] border border-white/10 text-xs space-y-1">
                <span className="font-bold text-white flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#00f090]" />
                  <span>1 Member = 1 Vote</span>
                </span>
                <p className="text-slate-400 text-[10px]">Strict majority required for all proposals.</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-extrabold text-sm shadow-xl hover:brightness-110 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Club & Registering Admin...</span>
                </>
              ) : (
                <>
                  <span>Create Club & Become Founding Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'join' && (
        <div className="rounded-3xl bg-[#07241a] border border-[#00f090]/25 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#00f090]" />
              <span>Join an Existing Private Club</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              If an administrator from a Friendpool club has shared an invitation code with you, paste it below to register your democratic membership.
            </p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Invitation Code (32-character Token) *
              </label>
              <input
                type="text"
                required
                disabled={busy}
                value={inviteToken}
                onChange={(e) => {
                  setInviteToken(e.target.value);
                  setLocalError(null);
                }}
                placeholder="e.g. 9b7e412a8f094c3d821a..."
                className="w-full bg-[#041a12] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#00f090] transition disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Tokens expire 7 days after generation and can only be redeemed once.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#041a12] border border-white/10 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#00f090]" />
                <span>What happens after joining?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                <li>You gain immediate democratic voting rights on all club simulation proposals.</li>
                <li>You can record simulated contributions in the club ledger.</li>
                <li>You enter the administrator rotation queue for future stewardship.</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-extrabold text-sm shadow-xl hover:brightness-110 active:scale-[0.99] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating Token & Joining Club...</span>
                </>
              ) : (
                <>
                  <span>Redeem Invitation & Join Club</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Alternative: Demo Mode Sandbox */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-400">
          Want to test Friendpool's interface with sample members first?{' '}
          <button
            type="button"
            onClick={onSwitchToDemo}
            className="text-[#00f090] hover:underline font-semibold cursor-pointer"
          >
            Launch Simulated Demo Sandbox
          </button>
        </p>
      </div>
    </div>
  );
};
