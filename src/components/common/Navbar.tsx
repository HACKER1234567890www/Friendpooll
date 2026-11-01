import React, { useState } from 'react';
import { Member } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { 
  Crown, 
  UserCheck, 
  RefreshCw, 
  RotateCcw, 
  Cloud, 
  Shield, 
  LogOut, 
  Sparkles,
  ChevronDown,
  UserPlus
} from 'lucide-react';

interface NavbarProps {
  members: Member[];
  currentMemberId: string;
  onSelectMember: (id: string) => void;
  onRefreshData: () => void;
  onOpenResetModal: () => void;
  isRefreshing?: boolean;
  isCloudConnected?: boolean;
  authUserEmail?: string | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
  activeClubName?: string;
  onOpenInviteModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  members,
  currentMemberId,
  onSelectMember,
  onRefreshData,
  onOpenResetModal,
  isRefreshing = false,
  isCloudConnected = false,
  authUserEmail = null,
  onOpenAuthModal,
  onSignOut,
  isDemoMode = false,
  onToggleDemoMode,
  activeClubName = 'Friendpool',
  onOpenInviteModal,
}) => {
  // A signed-in user may not have joined or created a club yet. Keep the
  // account menu available in that state so they can always sign out.
  const currentMember = members.find((m) => m.id === currentMemberId) || members[0] || (
    authUserEmail
      ? ({
          id: currentMemberId || authUserEmail,
          name: authUserEmail.split('@')[0] || 'Member',
          role: 'Member',
          avatar: (authUserEmail.split('@')[0] || 'M').slice(0, 2).toUpperCase(),
          email: authUserEmail,
          phone: '',
          joinedDate: new Date().toISOString().slice(0, 10),
          totalContributed: 0,
          contributionCount: 0,
          status: 'active',
          color: '#00f090',
          isSimulated: false,
        } as Member)
      : undefined
  );
  const isAdmin = currentMember?.role === 'Admin';
  const isRealAccount = Boolean(authUserEmail && !isDemoMode);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#062319]/90 backdrop-blur-md border-b border-[#00f090]/15">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2.5">
        {/* Brand identity & Club Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f090] to-[#041a12] p-0.5 shadow-md flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-[#041a12] rounded-[10px] flex items-center justify-center">
              <span className="text-[#00f090] font-black text-lg leading-none">₹</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="font-extrabold text-base tracking-tight text-white">Friendpool</h1>
              {isRealAccount ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] border border-[#00f090]/30 max-w-[140px] sm:max-w-none truncate">
                  {activeClubName}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Demo Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden xs:block -mt-0.5">
              {isRealAccount ? 'Private Club Simulation' : 'Simulated Sandbox'}
            </p>
          </div>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2">
          {/* Persona Switcher ONLY in Demo Mode */}
          {isDemoMode ? (
            <div className="relative flex items-center">
              <div className="hidden lg:flex items-center gap-1 mr-1.5 text-xs text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Persona:</span>
              </div>
              <div className="flex items-center bg-[#041a12] border border-amber-400/30 rounded-xl px-2 py-1 gap-1.5 hover:border-amber-400/60 transition">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 relative"
                  style={{ backgroundColor: currentMember?.color || '#00f090' }}
                >
                  {currentMember?.avatar}
                  {currentMember?.role === 'Admin' && (
                    <Crown className="w-2.5 h-2.5 text-amber-400 absolute -top-1 -right-1 fill-amber-400" />
                  )}
                </div>
                <select
                  value={currentMemberId}
                  onChange={(e) => onSelectMember(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-1"
                  title="Switch simulated member persona in Demo Mode"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#07241a] text-white">
                      {m.name} {m.role === 'Admin' ? '👑 (Admin)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : isRealAccount ? (
            /* Authenticated Real User Identity Badge (No fake impersonation) */
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAccountMenu((prev) => !prev)}
                className="flex items-center bg-[#041a12] border border-[#00f090]/30 rounded-xl px-2.5 py-1 gap-2 hover:border-[#00f090]/60 transition cursor-pointer"
                title={`Signed in as ${currentMember?.name || authUserEmail} (${authUserEmail})`}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0 relative shadow"
                  style={{ backgroundColor: currentMember?.color || '#00f090' }}
                >
                  {currentMember?.avatar || (authUserEmail?.slice(0, 2).toUpperCase() || 'ME')}
                  {isAdmin && (
                    <Crown className="w-3 h-3 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white leading-tight flex items-center gap-1">
                    <span>{currentMember?.name || authUserEmail?.split('@')[0] || 'My Account'}</span>
                    {isAdmin && <span className="text-[10px] text-amber-300 font-normal">👑</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 block leading-none">
                    {isAdmin ? 'Club Admin' : 'Member'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Account Dropdown Menu */}
              {showAccountMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAccountMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl p-3 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2.5 rounded-xl bg-[#041a12] border border-white/10 space-y-1">
                      <span className="text-xs font-bold text-white block truncate">{currentMember?.name || authUserEmail?.split('@')[0] || 'My Account'}</span>
                      <span className="text-[11px] text-slate-400 font-mono block truncate">{authUserEmail}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00f090]/20 text-[#00f090] font-bold inline-block mt-1">
                        {isAdmin ? '👑 Active Administrator' : activeClubName && activeClubName !== 'Friendpool' ? 'Club Member' : 'Account'}
                      </span>
                    </div>

                    {isAdmin && onOpenInviteModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onOpenInviteModal();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-[#00f090]/15 hover:text-[#00f090] transition flex items-center gap-2 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#00f090]" />
                        <span>Invite Friends (Max 5)</span>
                      </button>
                    )}

                    {onToggleDemoMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onToggleDemoMode();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:bg-white/10 transition flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Preview Demo Sandbox</span>
                      </button>
                    )}

                    <div className="border-t border-white/10 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAccountMenu(false);
                          onSignOut?.();
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Friendpool</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Cloud Auth / Connection Status button */}
          <button
            onClick={onOpenAuthModal}
            title={isCloudConnected ? `Supabase Connected (${authUserEmail || 'Active'})` : 'Connect Supabase Cloud'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer text-xs font-semibold ${
              isCloudConnected
                ? 'border-[#00f090]/40 bg-[#00f090]/10 text-[#00f090] hover:bg-[#00f090]/20'
                : 'border-white/10 bg-[#041a12] text-slate-400 hover:text-white hover:border-[#00f090]/30'
            }`}
          >
            {isCloudConnected ? (
              <>
                <Cloud className="w-3.5 h-3.5 text-[#00f090]" />
                <span className="hidden sm:inline">Cloud Active</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5 text-white/50" />
                <span className="hidden sm:inline">Sign In / Cloud</span>
              </>
            )}
          </button>

          {/* Refresh / Sync Button */}
          <button
            onClick={onRefreshData}
            title="Refresh state and sync ledger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-[#041a12] text-slate-300 hover:text-white hover:border-[#00f090]/40 active:scale-95 transition cursor-pointer text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00f090] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Reset Sandbox State Button - ONLY in Demo Mode */}
          {isDemoMode && (
            <button
              onClick={onOpenResetModal}
              title="Reset Demo Sandbox to ₹0 clean state"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-400/25 bg-[#0a271c] text-amber-300 hover:bg-amber-400/15 hover:border-amber-400/40 active:scale-95 transition cursor-pointer text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Reset Demo ₹0</span>
            </button>
          )}

          {/* In-App PWA Install Button */}
          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
