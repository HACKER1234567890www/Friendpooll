import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Share2, 
  AlertCircle, 
  Loader2, 
  Users, 
  RefreshCw 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubId: string;
  clubName: string;
  currentMemberCount: number;
  isAdmin: boolean;
}

interface PendingInvite {
  id: string;
  expires_at: string;
  created_at: string;
  max_uses: number;
  use_count: number;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  clubId,
  clubName,
  currentMemberCount,
  isAdmin,
}) => {
  const [durationDays, setDurationDays] = useState(7);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Load existing active invites
  const fetchPendingInvites = async () => {
    if (!supabase || !clubId || !isAdmin) return;
    setLoadingInvites(true);
    try {
      const { data, error: fetchErr } = await supabase.rpc('list_club_invitations', {
        p_club_id: clubId,
      });

      if (fetchErr) throw fetchErr;
      setPendingInvites((data || []).filter((invite: PendingInvite) =>
        invite.use_count < invite.max_uses && new Date(invite.expires_at).getTime() > Date.now()
      ));
    } catch (err: any) {
      console.warn('Could not fetch invitations:', err);
      setError(err.message || 'Could not load pending invitations.');
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setGeneratedToken(null);
      setError(null);
      setCopiedToken(false);
      setCopiedLink(false);
      fetchPendingInvites();
    }
  }, [isOpen, clubId]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!supabase || !clubId) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc('generate_club_invitation', {
        p_club_id: clubId,
        p_duration_days: durationDays,
      });

      if (rpcErr) throw rpcErr;

      if (data?.token) {
        setGeneratedToken(data.token);
        fetchPendingInvites();
      } else {
        setError('The invitation service did not return a token. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate invitation.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getInviteUrl = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://friendpool-612854878146.asia-south1.run.app';
    return `${origin}/?invite=${token}`;
  };

  const copyToClipboard = async (text: string, type: 'token' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2500);
      } else {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } catch {
      // fallback
    }
  };

  const isFull = currentMemberCount >= 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#07241a] border border-[#00f090]/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00f090]" />
              <h3 className="text-lg font-bold text-white tracking-tight">Invite Club Member</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {clubName} • Democratic Capacity: {currentMemberCount} of 5 members
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Capacity warning if 5 members */}
          {isFull ? (
            <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-400/40 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Club Capacity Reached (5 Members)</span>
              </div>
              <p className="leading-relaxed text-amber-300/90">
                Friendpool enforces a strict limit of 5 members per club to maintain high-trust, 100% democratic consensus and seamless 30-day administrator rotation.
              </p>
            </div>
          ) : !isAdmin ? (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-300 text-xs">
              Only the active Administrator can generate invitation codes. Please contact the current club administrator.
            </div>
          ) : (
            <>
              {/* Generation Controls */}
              <div className="p-4 rounded-2xl bg-[#041a12] border border-white/10 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-white block">Token Expiration</span>
                    <span className="text-[11px] text-slate-400">Single-use token lifetime</span>
                  </div>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    disabled={isGenerating}
                    className="bg-[#07241a] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#00f090]"
                  >
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (Recommended)</option>
                    <option value={14}>14 Days</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || isFull}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f090] to-[#10b981] text-[#041a12] font-bold text-xs shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Cryptographic Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Generate Single-Use Invitation Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Notice */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Newly Generated Token Display */}
              {generatedToken && (
                <div className="p-5 rounded-2xl bg-[#032015] border border-[#00f090]/40 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#00f090] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Invitation Ready to Share</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Valid for {durationDays} days</span>
                  </div>

                  {/* Token Box */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                      32-Character Invite Code
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#041a12] border border-white/20 rounded-xl px-3 py-2 font-mono text-xs text-white truncate select-all">
                        {generatedToken}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedToken, 'token')}
                        className="px-3 py-2 rounded-xl bg-[#00f090] text-[#041a12] text-xs font-bold hover:brightness-110 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Direct Link */}
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                      Direct Join Link
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#041a12] border border-white/20 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-300 truncate select-all">
                        {getInviteUrl(generatedToken)}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(getInviteUrl(generatedToken), 'link')}
                        className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00f090]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Active / Pending Invitations list */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#00f090]" />
                    <span>Pending Invitations ({pendingInvites.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={fetchPendingInvites}
                    disabled={loadingInvites}
                    className="text-[11px] text-[#00f090] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingInvites ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {pendingInvites.length === 0 ? (
                  <p className="text-xs text-slate-400 p-3 rounded-xl bg-[#041a12] border border-white/5 text-center">
                    No pending invitations. Click generate above to invite a member.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3 rounded-xl bg-[#041a12] border border-white/10 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="truncate">
                          <span className="font-mono text-white text-xs block truncate">
                            Single-use invitation issued
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Expires {new Date(inv.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          Code shown only once
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#041a12] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
