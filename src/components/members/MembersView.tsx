import React from 'react';
import { 
  Users, 
  Crown, 
  UserPlus, 
  UserMinus,
  ShieldCheck, 
  Mail, 
  Calendar,
  Sparkles,
  Clock,
  Info,
  Edit3,
  KeyRound,
  CheckCircle2
} from 'lucide-react';
import { Member, AdminRotation } from '../../types';
import { formatINR, formatDate } from '../../utils/formatters';

interface MembersViewProps {
  members: Member[];
  rotation: AdminRotation;
  currentMember: Member;
  isAdmin: boolean;
  onOpenAddMemberModal: () => void;
  onOpenEditMemberModal: (member: Member) => void;
  onOpenRemoveMemberModal: (member: Member) => void;
  onOpenRotateModal: () => void;
  onToggleMemberStatus: (memberId: string) => void;
  isRealMode?: boolean;
  onOpenInviteModal?: () => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  members,
  rotation,
  currentMember,
  isAdmin,
  onOpenAddMemberModal,
  onOpenEditMemberModal,
  onOpenRemoveMemberModal,
  onOpenRotateModal,
  onToggleMemberStatus,
  isRealMode = false,
  onOpenInviteModal,
}) => {
  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0] || currentMember;
  
  const queueLength = rotation.rotationQueue?.length || 0;
  const currentQueueIdx = queueLength > 0 ? rotation.rotationQueue.indexOf(rotation.currentAdminId) : -1;
  const nextQueueIdx = queueLength > 1 ? (currentQueueIdx + 1) % queueLength : -1;
  const nextAdminId = nextQueueIdx >= 0 ? rotation.rotationQueue[nextQueueIdx] : null;
  const nextAdmin = nextAdminId ? members.find((m) => m.id === nextAdminId) : null;

  const canRemoveMember = !isRealMode && members.length > 3;
  const canRotateAdmin = members.length > 1;

  // Open invite handler
  const handleInviteClick = () => {
    if (isRealMode && onOpenInviteModal) {
      onOpenInviteModal();
    } else {
      onOpenAddMemberModal();
    }
  };

  const emptySlotsCount = Math.max(0, 5 - members.length);

  return (
    <div className="space-y-5 pb-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00f090]" />
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {isRealMode ? 'Club Member Roster & Stewardship' : 'Club Members & Leadership'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRealMode 
              ? `Real database-backed club membership (${members.length} of 5 slots filled)`
              : 'Configure up to 5 member profiles with rotating administrative stewardship'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInviteClick}
            disabled={members.length >= 5}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              members.length >= 5
                ? 'bg-white/10 text-slate-400 cursor-not-allowed'
                : 'bg-[#00f090] text-[#041a12] hover:bg-[#10b981]'
            }`}
          >
            {isRealMode ? <KeyRound className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            <span>{members.length >= 5 ? 'All 5 Slots Filled' : isRealMode ? 'Invite Member (Token)' : 'Add Member Slot'}</span>
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="rounded-xl bg-[#06291d] border border-[#00f090]/25 p-3.5 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-[#00f090] shrink-0 mt-0.5" />
        <div className="space-y-1">
          {isRealMode ? (
            <p className="leading-relaxed">
              <strong className="text-white">Live Democratic Governance:</strong> All records are synchronized with your Supabase database. Each member possesses equal voting authority on all allocations. You can customize your own display name by clicking the edit icon on your card.
            </p>
          ) : (
            <>
              <p className="leading-relaxed">
                <strong className="text-white">Five Profile Configuration:</strong> Click the <strong className="text-[#00f090]">Configure Profile (pencil icon)</strong> on any member card below to customize their name, email, phone, and theme color.
              </p>
              <p className="text-slate-400 text-[11px]">
                All member profiles are simulated for sandbox demonstration. Minimum 3 members are required for democratic quorum.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Rotating Administrator Spotlight Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#072d21] to-[#041810] border border-[#00f090]/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Rotating Administrator System</h3>
              <p className="text-xs text-slate-300">
                Enforced permissions: Only active admin can approve deposits or execute proposals
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={onOpenRotateModal}
              disabled={!canRotateAdmin}
              title={canRotateAdmin ? 'Pass admin baton to another member' : 'Invite another member first to rotate baton'}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                canRotateAdmin
                  ? 'bg-gradient-to-r from-amber-400 to-[#00f090] text-[#041a12] hover:brightness-110 active:scale-95'
                  : 'bg-white/10 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Crown className="w-4 h-4 fill-current" />
              <span>Pass Admin Baton</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Current & Next Admins */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#041a12] border border-amber-400/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white relative shadow"
                  style={{ backgroundColor: currentAdmin?.color || '#00f090' }}
                >
                  {currentAdmin?.avatar || 'AD'}
                  <Crown className="w-3.5 h-3.5 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{currentAdmin?.name || 'Administrator'}</span>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                      Current Admin
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Term: {formatDate(rotation.termStartDate)} – {formatDate(rotation.termEndDate)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#041a12] border border-[#00f090]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white relative shadow"
                  style={{ backgroundColor: nextAdmin?.color || '#38bdf8' }}
                >
                  {nextAdmin?.avatar || 'NX'}
                  <ShieldCheck className="w-3.5 h-3.5 text-[#00f090] absolute -top-1.5 -right-1.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">
                      {nextAdmin ? nextAdmin.name : 'Awaiting Next Member'}
                    </span>
                    <span className="text-[10px] bg-[#00f090]/20 text-[#00f090] px-1.5 py-0.2 rounded font-bold">
                      Next in Line
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {nextAdmin ? 'Scheduled next baton successor' : 'Invite a member to begin rotation queue'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Governance Rules Notice */}
          <div className="p-4 rounded-xl bg-[#0d3b2c]/40 border border-white/5 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs">
              <Sparkles className="w-4 h-4 text-[#00f090]" />
              <span>Enforced Governance Privileges</span>
            </span>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300/90 text-[11px]">
              <li><strong>Deposit Verification:</strong> Only the current active admin ({currentAdmin?.name}) can approve pending deposits.</li>
              <li><strong>Proposal Execution:</strong> When quorum passes (majority approval), only the active admin can execute the allocation.</li>
              <li><strong>Baton Rotation:</strong> Stewardship rotates every 30 days to guarantee decentralized custody and shared responsibility.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Member Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              {isRealMode ? 'Active Club Members' : 'Configurable Member Profiles'} ({members.length})
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-bold">
              {members.length} / 5 slots
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {isRealMode ? 'Strict 5-Member Democratic Cap' : (canRemoveMember ? 'Removable (above min 3)' : 'Quorum Protected (min 3)')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {members.map((member) => {
            const isMemberAdmin = member.role === 'Admin';
            const isCurrentUser = member.id === currentMember?.id;
            const canEditThisProfile = !isRealMode || isCurrentUser;

            return (
              <div
                key={member.id}
                className={`rounded-2xl bg-[#07241a] border p-5 shadow-lg space-y-4 transition ${
                  isMemberAdmin ? 'border-amber-400/40 glow-mint-sm' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white relative shrink-0 shadow"
                      style={{ backgroundColor: member.color || '#00f090' }}
                    >
                      {member.avatar}
                      {isMemberAdmin && (
                        <Crown className="w-4 h-4 text-amber-400 absolute -top-1.5 -right-1.5 fill-amber-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-white">{member.name}</h4>
                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded bg-[#00f090]/20 text-[#00f090] text-[10px] font-bold">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isMemberAdmin
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {member.role === 'Admin' ? '👑 Administrator' : 'Club Member'}
                        </span>
                        <span className="text-[10px] text-slate-400 bg-[#041a12] px-1.5 py-0.5 rounded border border-white/5">
                          {isRealMode ? 'Verified Member' : 'Simulated'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Configure Profile (if allowed) */}
                  <div className="flex items-center gap-1.5">
                    {canEditThisProfile && (
                      <button
                        onClick={() => onOpenEditMemberModal(member)}
                        className="p-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-[#00f090] hover:border-[#00f090]/40 text-xs transition cursor-pointer"
                        title={isRealMode ? 'Update your display name' : 'Configure member profile'}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {!isRealMode && (
                      <button
                        onClick={() => onToggleMemberStatus(member.id)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          member.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                        title="Toggle availability status"
                      >
                        {member.status === 'active' ? '● Active' : '○ Away'}
                      </button>
                    )}

                    {!isRealMode && (
                      <button
                        onClick={() => onOpenRemoveMemberModal(member)}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                          canRemoveMember
                            ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/15'
                            : 'border-white/5 text-slate-600 hover:text-slate-400'
                        }`}
                        title={canRemoveMember ? 'Remove member slot' : 'Cannot remove: Club requires minimum 3 members'}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Member Metrics & Dates */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="p-2 rounded-xl bg-[#041a12] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Deposits</span>
                    <span className="text-sm font-extrabold text-[#00f090] mt-0.5 block">
                      {formatINR(member.totalContributed || 0)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#041a12] border border-white/5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Joined Club</span>
                    <span className="text-xs font-semibold text-slate-300 mt-0.5 block truncate">
                      {formatDate(member.joinedDate)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty Member Slots in Real Mode */}
          {isRealMode && emptySlotsCount > 0 && Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <div
              key={`empty-slot-${idx}`}
              className="rounded-2xl bg-[#051c14]/50 border border-dashed border-white/15 p-5 flex flex-col items-center justify-center text-center space-y-3 min-h-[160px]"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">
                  Member Slot {members.length + idx + 1} Available
                </span>
                <span className="text-[11px] text-slate-400 max-w-xs block mt-0.5">
                  Invite a trusted friend with a single-use token to join this democratic syndicate.
                </span>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleInviteClick}
                  className="px-3.5 py-1.5 rounded-xl bg-[#00f090]/15 border border-[#00f090]/40 text-[#00f090] text-xs font-bold hover:bg-[#00f090]/25 transition cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Generate Invite Code</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
