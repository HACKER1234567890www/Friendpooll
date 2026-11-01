import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Mail,
  User,
  PlusCircle,
  UserPlus,
  X,
  AlertCircle,
  Loader2,
  Settings,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  getSupabaseStateSnapshot,
  subscribeSupabaseState,
  verifySupabaseConnection,
  saveCustomSupabaseCredentials,
  clearCustomSupabaseCredentials,
  sanitizeSupabaseUrl,
  sanitizeSupabaseAnonKey,
  SupabaseConfigState,
  getAuthRedirectUrl,
} from '../../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  onAuthSuccess: (user: any) => void;
  onClubJoinedOrCreated: (clubId: string) => void;
  userClubId?: string | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onAuthSuccess,
  onClubJoinedOrCreated,
  userClubId,
}) => {
  const [cfgState, setCfgState] = useState<SupabaseConfigState>(getSupabaseStateSnapshot());
  const [tab, setTab] = useState<'signin' | 'signup' | 'club'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [clubName, setClubName] = useState('Friendpool Alpha');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [customKeyInput, setCustomKeyInput] = useState('');

  // Subscribe to reactive Supabase state
  useEffect(() => {
    const unsubscribe = subscribeSupabaseState((state) => {
      setCfgState(state);
      if (state.projectUrl) {
        setCustomUrlInput(state.projectUrl);
      } else {
        setCustomUrlInput('');
      }
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const handleManualVerify = async () => {
    setIsVerifying(true);
    setError(null);
    setSuccessMsg(null);
    const res = await verifySupabaseConnection();
    setIsVerifying(false);
    if (res.ok) {
      setSuccessMsg('Supabase connection verified successfully.');
    } else {
      setError(res.message);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgState.client || !cfgState.isVerified) {
      setError('Active verified Supabase connection required to sign in.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const { data, error: authError } = await cfgState.client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) throw authError;
      if (data.user) {
        onAuthSuccess(data.user);
        setSuccessMsg('Successfully signed in.');
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgState.client || !cfgState.isVerified) {
      setError('Active verified Supabase connection required to create accounts.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const redirectUrl = getAuthRedirectUrl();

      const { data, error: authError } = await cfgState.client.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName.trim() || 'Friendpool Member',
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        if (data.session) {
          // Immediate session established (email confirmation turned off)
          try {
            await cfgState.client.from('profiles').upsert(
              {
                user_id: data.user.id,
                display_name: displayName.trim() || 'Friendpool Member',
              },
              { onConflict: 'user_id' }
            );
          } catch (profileErr) {
            console.warn('Profile upsert deferred to session callback:', profileErr);
          }

          onAuthSuccess(data.user);
          setSuccessMsg('Account created and signed in successfully.');
          onClose();
        } else {
          // Email confirmation is required by project policy
          setSuccessMsg(
            `Account created! A confirmation link has been sent to ${email.trim()}. Please click the link in your email to verify your account and sign in.`
          );
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgState.client) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await cfgState.client.rpc('create_club_with_admin', {
        p_club_name: clubName.trim(),
      });

      if (rpcError) throw rpcError;
      if (data?.club_id) {
        onClubJoinedOrCreated(data.club_id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create club. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgState.client) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await cfgState.client.rpc('join_club_by_invite', {
        p_invite_token: inviteToken.trim(),
      });

      if (rpcError) throw rpcError;
      if (data?.club_id) {
        onClubJoinedOrCreated(data.club_id);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invitation token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomConfig = () => {
    setError(null);
    setSuccessMsg(null);

    const validUrl = sanitizeSupabaseUrl(customUrlInput);
    if (!validUrl) {
      setError('Please provide a valid Supabase URL (e.g. https://your-project.supabase.co).');
      return;
    }

    const validKey = sanitizeSupabaseAnonKey(customKeyInput);
    if (!validKey) {
      setError('Please enter a valid Supabase anon public key (JWT).');
      return;
    }

    const saved = saveCustomSupabaseCredentials(validUrl, validKey);
    if (saved) {
      setSuccessMsg('Custom credentials saved. Verifying connection...');
      setCustomKeyInput('');
      setShowConfig(false);
    } else {
      setError('Failed to save credentials.');
    }
  };

  const handleResetToEnv = () => {
    clearCustomSupabaseCredentials();
    setCustomKeyInput('');
    setError(null);
    setSuccessMsg('Cleared manual overrides. Reloaded environment secrets.');
    setShowConfig(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#041810] border border-white/10 rounded-2xl p-6 text-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#00f090]/10 border border-[#00f090]/20 flex items-center justify-center text-[#00f090]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Supabase Authentication</h2>
            <p className="text-xs text-white/60">Connect to your private club simulation</p>
          </div>
        </div>

        {/* 1. Verified Connected State */}
        {cfgState.status === 'connected' && (
          <div className="mb-4 p-3 bg-[#00f090]/10 border border-[#00f090]/20 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#00f090] min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div className="truncate">
                <span className="font-semibold block">Connected (Verified)</span>
                <span className="text-[11px] opacity-80 truncate block">{cfgState.projectUrl}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={isVerifying}
                className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                title="Re-verify Connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              </button>
              {import.meta.env.DEV && (
                <button
                  type="button"
                  onClick={() => setShowConfig(!showConfig)}
                  className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/5"
                  title="Developer connection settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. Connecting State */}
        {cfgState.status === 'connecting' && (
          <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Verifying Supabase Cloud connection...</span>
            </div>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-cyan-300/60 hover:text-cyan-200 p-1"
                title="Developer connection settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 3. Connection Error State */}
        {cfgState.status === 'connection_error' && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Supabase Connection Failed</strong>
                <span className="text-[11px] opacity-80 block">{cfgState.statusMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleManualVerify}
                className="underline text-red-200 hover:text-white text-[11px] px-1"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="underline text-red-200 hover:text-white text-[11px] px-1"
              >
                Config
              </button>
            </div>
          </div>
        )}

        {/* 4. Unconfigured / Local Simulation State */}
        {(cfgState.status === 'unconfigured' || cfgState.status === 'invalid_format') && !showConfig && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong className="block">Local Simulation Mode Active</strong>
                  <span className="text-[11px] opacity-80">
                    No active Supabase connection. Data is saved to your browser session.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="underline text-amber-200 hover:text-white shrink-0 text-[11px]"
              >
                Configure
              </button>
            </div>

            {cfgState.rawEnvUrlIsPlaceholder && (
              <div className="flex items-start gap-1.5 p-2 bg-black/40 rounded-lg text-[11px] text-amber-200/90 border border-amber-500/20">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  Notice: VITE_SUPABASE_URL contains placeholder text. Replace it in AI Studio Secrets with your actual project URL or configure below.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Configuration Drawer */}
        {import.meta.env.DEV && showConfig && (
          <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between text-white font-medium mb-1">
              <span className="flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-[#00f090]" />
                <span>Supabase Connection Settings</span>
              </span>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-white/50 hover:text-white text-[11px]"
              >
                Close
              </button>
            </div>

            <div>
              <label className="block text-white/60 text-[11px] mb-1">
                Project URL or Reference ID
              </label>
              <input
                type="text"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co or xyzcompany"
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00f090]"
              />
            </div>

            <div>
              <label className="block text-white/60 text-[11px] mb-1">
                Anon Public Key (JWT)
              </label>
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#00f090]"
              />
              <p className="text-[10px] text-white/40 mt-1">
                Keys are never logged or transmitted except directly to Supabase client auth.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveCustomConfig}
                className="px-3 py-1.5 bg-[#00f090] text-[#041810] font-bold rounded-lg text-xs hover:bg-[#00f090]/90 transition"
              >
                Save & Connect
              </button>
              <button
                type="button"
                onClick={handleResetToEnv}
                className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs hover:bg-white/20 transition"
              >
                Reset to Env
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-[#00f090]/10 border border-[#00f090]/20 rounded-xl text-[#00f090] text-xs">
            {successMsg}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 rounded-xl mb-6 text-xs">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`py-2 rounded-lg font-medium transition ${
              tab === 'signin' ? 'bg-[#00f090] text-[#041810]' : 'text-white/60 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`py-2 rounded-lg font-medium transition ${
              tab === 'signup' ? 'bg-[#00f090] text-[#041810]' : 'text-white/60 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('club');
              setError(null);
            }}
            className={`py-2 rounded-lg font-medium transition ${
              tab === 'club' ? 'bg-[#00f090] text-[#041810]' : 'text-white/60 hover:text-white'
            }`}
          >
            Club Onboarding
          </button>
        </div>

        {/* Sign In Form */}
        {tab === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cfgState.status !== 'connected'}
              className="w-full py-3 bg-[#00f090] text-[#041810] rounded-xl font-bold text-sm hover:bg-[#00f090]/90 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In to Friendpool</span>
            </button>
            {cfgState.status !== 'connected' && (
              <p className="text-[11px] text-white/40 text-center">
                Supabase Cloud connection required for real account authentication. Use member switcher on top bar for simulation.
              </p>
            )}
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cfgState.status !== 'connected'}
              className="w-full py-3 bg-[#00f090] text-[#041810] rounded-xl font-bold text-sm hover:bg-[#00f090]/90 transition flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Personal Profile</span>
            </button>
            {cfgState.status !== 'connected' && (
              <p className="text-[11px] text-white/40 text-center">
                Supabase Cloud connection required for real account creation.
              </p>
            )}
          </form>
        )}

        {/* Club Onboarding (Create or Join) */}
        {tab === 'club' && (
          <div className="space-y-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#00f090]">
                <PlusCircle className="w-4 h-4" />
                <span>Initialize New Club (Become Admin)</span>
              </div>
              <p className="text-xs text-white/60">
                Create a private club simulation and receive the initial 30-day administrator role.
              </p>
              <form onSubmit={handleCreateClub} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Club Name"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#00f090]"
                />
                <button
                  type="submit"
                  disabled={loading || cfgState.status !== 'connected'}
                  className="px-4 py-2 bg-[#00f090] text-[#041810] font-bold text-xs rounded-lg hover:bg-[#00f090]/90 transition disabled:opacity-40"
                >
                  Create
                </button>
              </form>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#38bdf8]">
                <UserPlus className="w-4 h-4" />
                <span>Join with Invitation Token</span>
              </div>
              <p className="text-xs text-white/60">
                Enter a single-use invitation token provided by your club administrator (max 5 members).
              </p>
              <form onSubmit={handleJoinClub} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder="32-char token"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8]"
                />
                <button
                  type="submit"
                  disabled={loading || cfgState.status !== 'connected'}
                  className="px-4 py-2 bg-[#38bdf8] text-[#041810] font-bold text-xs rounded-lg hover:bg-[#38bdf8]/90 transition disabled:opacity-40"
                >
                  Join
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
