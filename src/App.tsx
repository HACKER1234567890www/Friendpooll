/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Member, 
  Contribution, 
  Proposal, 
  AdminRotation, 
  AuditLogItem, 
  VoteDecision 
} from './types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_CONTRIBUTIONS, 
  INITIAL_PROPOSALS, 
  INITIAL_ADMIN_ROTATION, 
  INITIAL_AUDIT_LOGS 
} from './data/mockData';
import { Navbar } from './components/common/Navbar';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { ContributionsView } from './components/contributions/ContributionsView';
import { ProposalsView } from './components/proposals/ProposalsView';
import { MembersView } from './components/members/MembersView';
import { AuditView } from './components/audit/AuditView';
import { ClubOnboardingView } from './components/club/ClubOnboardingView';
import { ContributeModal } from './components/modals/ContributeModal';
import { NewProposalModal } from './components/modals/NewProposalModal';
import { VoteModal } from './components/modals/VoteModal';
import { RotateAdminModal } from './components/modals/RotateAdminModal';
import { InviteModal } from './components/modals/InviteModal';
import { AddMemberModal } from './components/modals/AddMemberModal';
import { EditMemberModal } from './components/modals/EditMemberModal';
import { RemoveMemberModal } from './components/modals/RemoveMemberModal';
import { ResetConfirmModal } from './components/modals/ResetConfirmModal';
import { AuthModal } from './components/auth/AuthModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { generateAuditHash, formatINR } from './utils/formatters';
import {
  supabase,
  getSupabaseStateSnapshot,
  subscribeSupabaseState,
  SupabaseConfigState,
} from './lib/supabase';
import {
  mapProfileAndMembershipToMember,
  mapContributionRowToContribution,
  mapProposalRowToProposal,
  mapVoteRowToVote,
  mapAuditLogRowToAuditLogItem,
} from './lib/supabaseAdapter';
import { Sparkles, Shield, UserCheck, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'friendpool_pwa_state_v1_2';

export default function App() {
  // Supabase State & Auth Session
  const [authSession, setAuthSession] = useState<any>(null);
  const authSessionRef = useRef<any>(null);
  const cloudLoadSequenceRef = useRef(0);
  const authResolutionSequenceRef = useRef(0);
  useEffect(() => {
    authSessionRef.current = authSession;
  }, [authSession]);
  const [activeClubId, setActiveClubId] = useState<string | null>(null);
  const [activeClubName, setActiveClubName] = useState<string>('Friendpool');
  const [userProfile, setUserProfile] = useState<{ user_id: string; display_name: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [pendingInviteToken, setPendingInviteToken] = useState<string>('');
  const [authNotice, setAuthNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [supabaseCfg, setSupabaseCfg] = useState<SupabaseConfigState>(() => getSupabaseStateSnapshot());

  // Mode: explicit distinction between Real Cloud Account and Demo Simulation
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Fallback / Demo state for Sandbox Mode
  const [demoMembers, setDemoMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_demo_members`);
      return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
    } catch {
      return INITIAL_MEMBERS;
    }
  });

  const [demoContributions, setDemoContributions] = useState<Contribution[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_demo_contributions`);
      return saved ? JSON.parse(saved) : INITIAL_CONTRIBUTIONS;
    } catch {
      return INITIAL_CONTRIBUTIONS;
    }
  });

  const [demoProposals, setDemoProposals] = useState<Proposal[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_demo_proposals`);
      return saved ? JSON.parse(saved) : INITIAL_PROPOSALS;
    } catch {
      return INITIAL_PROPOSALS;
    }
  });

  const [demoRotation, setDemoRotation] = useState<AdminRotation>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_demo_rotation`);
      return saved ? JSON.parse(saved) : INITIAL_ADMIN_ROTATION;
    } catch {
      return INITIAL_ADMIN_ROTATION;
    }
  });

  const [demoAuditLogs, setDemoAuditLogs] = useState<AuditLogItem[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_demo_audit`);
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  const [demoCurrentMemberId, setDemoCurrentMemberId] = useState<string>('m1');

  // Real Database State (Strictly empty until loaded from Supabase)
  const [realMembers, setRealMembers] = useState<Member[]>([]);
  const [realContributions, setRealContributions] = useState<Contribution[]>([]);
  const [realProposals, setRealProposals] = useState<Proposal[]>([]);
  const [realRotation, setRealRotation] = useState<AdminRotation>({
    currentAdminId: '',
    termStartDate: new Date().toISOString().slice(0, 10),
    termEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    cycleDurationDays: 30,
    rotationQueue: [],
    history: [],
  });
  const [realAuditLogs, setRealAuditLogs] = useState<AuditLogItem[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Reset window scroll position when switching tabs
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [activeTab]);

  // Modals state
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isRotateModalOpen, setIsRotateModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<Member | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [proposalToVote, setProposalToVote] = useState<Proposal | null>(null);

  // Determine active mode
  const isAuthenticated = Boolean(authSession?.user);
  const isRealMode = isAuthenticated && !isDemoMode;

  // Active dataset depending on mode
  const members = isRealMode ? realMembers : demoMembers;
  const contributions = isRealMode ? realContributions : demoContributions;
  const proposals = isRealMode ? realProposals : demoProposals;
  const rotation = isRealMode ? realRotation : demoRotation;
  const auditLogs = isRealMode ? realAuditLogs : demoAuditLogs;
  const currentMemberId = isRealMode 
    ? (authSession?.user?.id || '') 
    : demoCurrentMemberId;

  const currentMember = isRealMode
    ? (realMembers.find((m) => m.id === currentMemberId) || {
        id: currentMemberId,
        name: userProfile?.display_name || authSession?.user?.email?.split('@')[0] || 'Member',
        role: (realMembers.find((m) => m.id === currentMemberId)?.role || 'Member') as 'Admin' | 'Member',
        avatar: (userProfile?.display_name || 'MB').slice(0, 2).toUpperCase(),
        email: authSession?.user?.email || '',
        phone: '',
        joinedDate: new Date().toISOString().slice(0, 10),
        totalContributed: 0,
        contributionCount: 0,
        status: 'active',
        color: '#00f090',
        isSimulated: false,
      })
    : (demoMembers.find((m) => m.id === currentMemberId) || demoMembers[0]);

  const currentAdmin = members.find((m) => m.id === rotation.currentAdminId) || members[0] || currentMember;
  const isAdmin = currentMember?.id === rotation.currentAdminId || currentMember?.role === 'Admin';

  // Subscribe to reactive Supabase state
  useEffect(() => {
    return subscribeSupabaseState((state) => {
      setSupabaseCfg(state);
    });
  }, []);

  // Save demo state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_demo_members`, JSON.stringify(demoMembers));
      localStorage.setItem(`${STORAGE_KEY}_demo_contributions`, JSON.stringify(demoContributions));
      localStorage.setItem(`${STORAGE_KEY}_demo_proposals`, JSON.stringify(demoProposals));
      localStorage.setItem(`${STORAGE_KEY}_demo_rotation`, JSON.stringify(demoRotation));
      localStorage.setItem(`${STORAGE_KEY}_demo_audit`, JSON.stringify(demoAuditLogs));
    } catch {
      // storage quota
    }
  }, [demoMembers, demoContributions, demoProposals, demoRotation, demoAuditLogs]);

  // Load Real Cloud State from Supabase
  const loadCloudClubData = useCallback(async (clubId: string) => {
    const client = supabase;
    if (!client) return;
    const loadSequence = ++cloudLoadSequenceRef.current;
    setIsCloudSyncing(true);

    try {
      // Fetch the complete club snapshot before replacing visible state. A failed
      // query must not make a healthy screen look like an empty club.
      const { data: clubData, error: clubErr } = await client
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single();
      if (clubErr) throw new Error(`Could not load club details: ${clubErr.message}`);

      const { data: rawMemberships, error: memErr } = await client
        .from('memberships')
        .select('*')
        .eq('club_id', clubId);
      if (memErr) throw new Error(`Could not load club members: ${memErr.message}`);
      const membershipRows = rawMemberships || [];

      const userIds = membershipRows.map((m: any) => m.user_id).filter(Boolean);
      const profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await client
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        if (profilesErr) throw new Error(`Could not load member profiles: ${profilesErr.message}`);
        (profilesData || []).forEach((p: any) => {
          profileMap[p.user_id] = p;
        });
      }

      const { data: contribRows, error: contribErr } = await client
        .from('contributions')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });
      if (contribErr) throw new Error(`Could not load the contribution ledger: ${contribErr.message}`);

      const { data: propRows, error: propErr } = await client
        .from('proposals')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false });
      if (propErr) throw new Error(`Could not load club proposals: ${propErr.message}`);

      const propIds = (propRows || []).map((p: any) => p.id);
      let voteRows: any[] = [];
      if (propIds.length > 0) {
        const { data: votes, error: votesErr } = await client
          .from('votes')
          .select('*')
          .in('proposal_id', propIds);
        if (votesErr) throw new Error(`Could not load proposal votes: ${votesErr.message}`);
        voteRows = votes || [];
      }

      const { data: auditRows, error: auditErr } = await client
        .from('audit_logs')
        .select('*')
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (auditErr) console.warn('Audit logs query note:', auditErr);

      // Ignore stale responses when a user switches clubs or refreshes quickly.
      if (loadSequence !== cloudLoadSequenceRef.current) return;

      const memberNameMap: Record<string, string> = {};
      membershipRows.forEach((m: any) => {
        const name = profileMap[m.user_id]?.display_name || 'Member';
        memberNameMap[m.user_id] = name;
        memberNameMap[m.id] = name;
      });

      const approvedContribs = (contribRows || []).filter((c: any) => c.status === 'approved');
      const loadedMembers: Member[] = membershipRows.map((m: any, idx: number) => {
        const uProfile = profileMap[m.user_id] || {
          user_id: m.user_id,
          display_name: memberNameMap[m.user_id] || 'Club Member',
        };
        return mapProfileAndMembershipToMember(uProfile, m, approvedContribs, idx, true);
      });

      const adminMember = loadedMembers.find((m) => m.role === 'Admin');
      const loadedContribs: Contribution[] = (contribRows || []).map((row: any) =>
        mapContributionRowToContribution(row, memberNameMap)
      );

      const loadedProposals: Proposal[] = (propRows || []).map((p: any) => {
        const matchingVotes = voteRows.filter((v: any) => v.proposal_id === p.id);
        const votesObj: Record<string, any> = {};
        matchingVotes.forEach((v: any) => {
          votesObj[v.voter_id] = mapVoteRowToVote(v, memberNameMap);
        });
        return mapProposalRowToProposal(p, memberNameMap[p.created_by] || 'Member', votesObj);
      });

      const loadedAudits: AuditLogItem[] = (auditRows || []).map((a: any) =>
        mapAuditLogRowToAuditLogItem(a)
      );

      setActiveClubName(clubData.name || 'Friendpool');
      setRealMembers(loadedMembers);
      setRealRotation({
        currentAdminId: adminMember?.id || '',
        termStartDate: clubData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        termEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        cycleDurationDays: 30,
        rotationQueue: loadedMembers.map((m) => m.id),
        history: [],
      });
      setRealContributions(loadedContribs);
      setRealProposals(loadedProposals);
      setRealAuditLogs(loadedAudits);
    } catch (err: any) {
      if (loadSequence === cloudLoadSequenceRef.current) {
        console.warn('Error loading Supabase cloud club data:', err);
        setAuthNotice({
          type: 'error',
          message: err?.message || 'Could not refresh club data. Your last successful view has been kept.',
        });
      }
    } finally {
      if (loadSequence === cloudLoadSequenceRef.current) setIsCloudSyncing(false);
    }
  }, []);

  // Auth Session Initialization, Email Confirmation Callback & Membership Resolution
  useEffect(() => {
    const client = supabaseCfg.client;
    if (!client || !supabaseCfg.isConfigured) {
      setAuthSession(null);
      return;
    }

    let isSubscribed = true;

    const handleAuthCallbackAndSession = async () => {
      if (typeof window === 'undefined') return;
      const resolutionSequence = ++authResolutionSequenceRef.current;

      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
      const searchParams = new URLSearchParams(search.startsWith('?') ? search.substring(1) : search);
      const error = hashParams.get('error') || searchParams.get('error');
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      const authType = hashParams.get('type') || searchParams.get('type');
      const code = searchParams.get('code');
      const inviteParam = searchParams.get('invite') || hashParams.get('invite');
      const hasAccessToken = hashParams.has('access_token');

      if (inviteParam) setPendingInviteToken(inviteParam);

      if (error || errorDescription) {
        const decodedMsg = errorDescription
          ? decodeURIComponent(errorDescription.replace(/\+/g, ' '))
          : 'Email verification link was invalid or has expired.';
        setAuthNotice({
          type: 'error',
          message: `${decodedMsg}${errorCode ? ` (${errorCode})` : ''}`,
        });
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch {
          // ignore
        }
        return;
      }

      try {
        let session = null;
        if (code) {
          const { data, error: exchangeErr } = await client.auth.exchangeCodeForSession(code);
          if (exchangeErr) throw exchangeErr;
          session = data.session;
        } else {
          const { data, error: sessionErr } = await client.auth.getSession();
          if (sessionErr) throw sessionErr;
          session = data.session;
        }
        if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;

        if (session?.user) {
          setAuthSession(session);
          setIsDemoMode(false);
          setIsAuthModalOpen(false);
          setActiveClubId(null);
          setUserProfile(null);

          const defaultName =
            session.user.user_metadata?.display_name ||
            session.user.email?.split('@')[0] ||
            'Friendpool Member';

          const { data: existingProfile } = await client
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
          if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;

          let profile = existingProfile;
          if (!profile) {
            const { data: newProfile, error: profileError } = await client
              .from('profiles')
              .upsert({ user_id: session.user.id, display_name: defaultName })
              .select('*')
              .single();
            if (profileError) throw new Error(`Could not prepare your member profile: ${profileError.message}`);
            profile = newProfile;
          }
          if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;
          setUserProfile(profile);

          if (authType === 'signup' || authType === 'email_change' || hasAccessToken || code) {
            setAuthNotice({
              type: 'success',
              message: authType === 'signup'
                ? 'Email confirmed successfully! You are now signed in to Friendpool.'
                : 'Email authentication confirmed successfully. Welcome back!',
            });
          }

          const { data: memberRows, error: memErr } = await client
            .from('memberships')
            .select('id, club_id, role')
            .eq('user_id', session.user.id)
            .limit(1);
          if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;
          if (memErr) throw new Error(`Could not resolve your club membership: ${memErr.message}`);

          if (memberRows?.[0]?.club_id) {
            setActiveClubId(memberRows[0].club_id);
            await loadCloudClubData(memberRows[0].club_id);
          }
        } else if (isSubscribed && resolutionSequence === authResolutionSequenceRef.current) {
          cloudLoadSequenceRef.current += 1;
          setIsCloudSyncing(false);
          setAuthSession(null);
          setActiveClubId(null);
          setUserProfile(null);
          setRealMembers([]);
          setRealContributions([]);
          setRealProposals([]);
          setRealAuditLogs([]);
          setRealRotation({
            currentAdminId: '',
            termStartDate: new Date().toISOString().slice(0, 10),
            termEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
            cycleDurationDays: 30,
            rotationQueue: [],
            history: [],
          });
        }
      } catch (err: any) {
        if (isSubscribed && resolutionSequence === authResolutionSequenceRef.current) {
          console.warn('Auth callback handling notice:', err);
          setAuthNotice({
            type: 'error',
            message: err.message || 'Failed to complete authentication.',
          });
        }
      } finally {
        if (code || hasAccessToken || hashParams.has('type') || hashParams.has('error')) {
          try {
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch {
            // ignore
          }
        }
      }
    };

    handleAuthCallbackAndSession();

    const { data: authListener } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!isSubscribed) return;
      const resolutionSequence = ++authResolutionSequenceRef.current;
      const sameUser = Boolean(
        session?.user?.id && authSessionRef.current?.user?.id === session.user.id
      );

      setAuthSession(session);
      if (!sameUser) {
        cloudLoadSequenceRef.current += 1;
        setIsCloudSyncing(false);
        setActiveClubId(null);
        setUserProfile(null);
        setRealMembers([]);
        setRealContributions([]);
        setRealProposals([]);
        setRealAuditLogs([]);
        setRealRotation({
          currentAdminId: '',
          termStartDate: new Date().toISOString().slice(0, 10),
          termEndDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          cycleDurationDays: 30,
          rotationQueue: [],
          history: [],
        });
      }

      if (!session?.user) return;
      setIsDemoMode(false);
      setIsAuthModalOpen(false);

      try {
        const defaultName =
          session.user.user_metadata?.display_name ||
          session.user.email?.split('@')[0] ||
          'Friendpool Member';
        const { data: existingProfile } = await client
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;

        let profile = existingProfile;
        if (!profile) {
          const { data: newProfile, error: profileError } = await client
            .from('profiles')
            .upsert({ user_id: session.user.id, display_name: defaultName })
            .select('*')
            .single();
          if (profileError) throw profileError;
          profile = newProfile;
        }
        if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;
        setUserProfile(profile);

        const { data: memberRows, error: membershipError } = await client
          .from('memberships')
          .select('id, club_id, role')
          .eq('user_id', session.user.id)
          .limit(1);
        if (!isSubscribed || resolutionSequence !== authResolutionSequenceRef.current) return;
        if (membershipError) throw membershipError;

        if (memberRows?.[0]?.club_id) {
          setActiveClubId(memberRows[0].club_id);
          await loadCloudClubData(memberRows[0].club_id);
        } else {
          setActiveClubId(null);
        }
      } catch (err: any) {
        if (isSubscribed && resolutionSequence === authResolutionSequenceRef.current) {
          setAuthNotice({
            type: 'error',
            message: err?.message || 'Could not finish loading your account.',
          });
        }
      }
    });

    return () => {
      isSubscribed = false;
      authResolutionSequenceRef.current += 1;
      authListener.subscription.unsubscribe();
    };
  }, [loadCloudClubData, supabaseCfg.client, supabaseCfg.isConfigured]);

  // Real-time State Synchronization when Club ID is active
  useEffect(() => {
    const client = supabase;
    if (!client || !activeClubId || !isRealMode) return;

    const channel = client
      .channel(`club-${activeClubId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contributions', filter: `club_id=eq.${activeClubId}` },
        () => loadCloudClubData(activeClubId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposals', filter: `club_id=eq.${activeClubId}` },
        () => loadCloudClubData(activeClubId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'memberships', filter: `club_id=eq.${activeClubId}` },
        () => loadCloudClubData(activeClubId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => loadCloudClubData(activeClubId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audit_logs', filter: `club_id=eq.${activeClubId}` },
        () => loadCloudClubData(activeClubId)
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [activeClubId, isRealMode, loadCloudClubData]);

  // Club balance is calculated strictly from APPROVED contributions
  const approvedTotalBalance = contributions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  // Create Club Handler (Called by Onboarding or Modal)
  const handleCreateClub = async (clubName: string): Promise<boolean> => {
    const client = supabase;
    if (!client || !authSession?.user) {
      setAuthNotice({ type: 'error', message: 'You must be signed in to create a club.' });
      return false;
    }

    try {
      const { data, error } = await client.rpc('create_club_with_admin', {
        p_club_name: clubName.trim(),
      });

      if (error) {
        console.error('Create club RPC error:', error);
        setAuthNotice({ type: 'error', message: `Failed to create club: ${error.message}` });
        return false;
      }

      if (data?.club_id) {
        setActiveClubId(data.club_id);
        setActiveClubName(clubName.trim());
        setAuthNotice({
          type: 'success',
          message: `Club "${clubName.trim()}" created successfully! You are the founding Administrator.`,
        });
        await loadCloudClubData(data.club_id);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Create club exception:', err);
      setAuthNotice({ type: 'error', message: err.message || 'An error occurred while creating the club.' });
      return false;
    }
  };

  // Join Club Handler via Invitation Token
  const handleJoinClub = async (inviteToken: string): Promise<boolean> => {
    const client = supabase;
    if (!client || !authSession?.user) {
      setAuthNotice({ type: 'error', message: 'You must be signed in to join a club.' });
      return false;
    }

    try {
      const { data, error } = await client.rpc('join_club_by_invite', {
        p_invite_token: inviteToken.trim(),
      });

      if (error) {
        console.error('Join club RPC error:', error);
        setAuthNotice({
          type: 'error',
          message: error.message || 'Invalid, expired, or already-used invitation code.',
        });
        return false;
      }

      if (data?.club_id) {
        setActiveClubId(data.club_id);
        setActiveClubName(data.club_name || 'Friendpool');
        setPendingInviteToken('');
        setAuthNotice({
          type: 'success',
          message: `Joined "${data.club_name}" successfully! You are now a democratic voting member.`,
        });
        await loadCloudClubData(data.club_id);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Join club exception:', err);
      setAuthNotice({ type: 'error', message: err.message || 'Invalid or expired invitation token.' });
      return false;
    }
  };

  // Contribution Submission (Pending Review)
  const handleSimulateContribution = async ({
    memberId,
    amount,
    note,
    method,
  }: {
    memberId: string;
    amount: number;
    note: string;
    method: 'Simulated UPI' | 'Simulated IMPS' | 'Club Quick-Deposit';
  }): Promise<boolean> => {
    const refNum = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `FP-SIM-${refNum}`;
    const amountPaise = amount * 100;

    // Real cloud insertion
    const client = supabase;
    if (isRealMode && client && activeClubId && authSession?.user) {
      try {
        // The database contribution policy binds every submission to auth.uid().
        // Never accept a member identity supplied by the client for a real account.
        const { error: insertErr } = await client.from('contributions').insert({
          club_id: activeClubId,
          member_id: authSession.user.id,
          amount_paise: amountPaise,
          status: 'pending',
          reference_note: `${referenceCode} via ${method}. ${note}`,
        });

        if (insertErr) throw insertErr;

        await loadCloudClubData(activeClubId);
        return true;
      } catch (err: any) {
        console.error('Cloud contribution error:', err);
        setAuthNotice({ type: 'error', message: `Deposit submission failed: ${err.message}` });
        return false;
      }
    }

    // Demo Mode Sandbox fallback
    const member = demoMembers.find((m) => m.id === memberId) || currentMember;
    const newContribution: Contribution = {
      id: `c_${Date.now()}`,
      memberId: member.id,
      memberName: member.name,
      amount,
      timestamp: new Date().toISOString(),
      note,
      method,
      status: 'pending',
      referenceCode,
    };

    setDemoContributions((prev) => [newContribution, ...prev]);

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_submitted',
      timestamp: new Date().toISOString(),
      actorId: member.id,
      actorName: member.name,
      summary: `Submitted simulated deposit of ${formatINR(amount)} (Pending Review)`,
      details: `Reference: ${referenceCode} submitted via ${method}. Awaiting Administrator approval. "${note}"`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
    return true;
  };

  const handleSimulateQuickDeposit = (amount: number) => {
    handleSimulateContribution({
      memberId: currentMember.id,
      amount,
      note: 'Quick micro-deposit test',
      method: 'Club Quick-Deposit',
    });
  };

  // Administrator Approval: Approve pending deposit via RPC
  const handleApproveDeposit = async (depositId: string) => {
    if (!isAdmin) {
      setAuthNotice({
        type: 'error',
        message: `Only the active administrator (${currentAdmin.name}) can approve sandbox deposits.`,
      });
      return;
    }

    const client = supabase;
    if (isRealMode && client && activeClubId) {
      try {
        const { error } = await client.rpc('approve_contribution', {
          p_contribution_id: depositId,
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Approval failed: ${error.message}` });
          return;
        }

        loadCloudClubData(activeClubId);
        return;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to approve deposit.' });
        return;
      }
    }

    // Demo Mode fallback
    const target = demoContributions.find((c) => c.id === depositId);
    if (!target || target.status !== 'pending') return;

    setDemoContributions((prev) =>
      prev.map((c) =>
        c.id === depositId
          ? {
              ...c,
              status: 'approved',
              reviewedBy: currentMember.name,
              reviewedAt: new Date().toISOString(),
            }
          : c
      )
    );

    setDemoMembers((prev) =>
      prev.map((m) =>
        m.id === target.memberId
          ? {
              ...m,
              totalContributed: m.totalContributed + target.amount,
              contributionCount: m.contributionCount + 1,
            }
          : m
      )
    );

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_approved',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Approved simulated deposit of ${formatINR(target.amount)} from ${target.memberName}`,
      details: `Reference ${target.referenceCode} validated by Administrator. Pool balance increased.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Rejection: Reject pending deposit via RPC
  const handleRejectDeposit = async (depositId: string, reason?: string) => {
    if (!isAdmin) {
      setAuthNotice({
        type: 'error',
        message: `Only the active administrator (${currentAdmin.name}) can review sandbox deposits.`,
      });
      return;
    }

    const client = supabase;
    if (isRealMode && client && activeClubId) {
      try {
        const { error } = await client.rpc('reject_contribution', {
          p_contribution_id: depositId,
          p_reason: reason || 'Rejected during administrator review',
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Rejection failed: ${error.message}` });
          return;
        }

        loadCloudClubData(activeClubId);
        return;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to reject deposit.' });
        return;
      }
    }

    // Demo Mode fallback
    const target = demoContributions.find((c) => c.id === depositId);
    if (!target || target.status !== 'pending') return;

    setDemoContributions((prev) =>
      prev.map((c) =>
        c.id === depositId
          ? {
              ...c,
              status: 'rejected',
              reviewedBy: currentMember.name,
              reviewedAt: new Date().toISOString(),
              reviewNote: reason || 'Deposit reference could not be verified.',
            }
          : c
      )
    );

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'contribution_rejected',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Rejected simulated deposit of ${formatINR(target.amount)} from ${target.memberName}`,
      details: `Reason: ${reason || 'Reference mismatch'}. Funds not added to pool.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Proposal Creation
  const handleCreateProposal = async (data: {
    title: string;
    category: any;
    requestedAmount: number;
    proposerId: string;
    durationMonths: number;
    riskLevel: 'Low' | 'Moderate' | 'High';
    description: string;
    thesis: string;
  }): Promise<boolean> => {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);

    // Real cloud insertion
    const client = supabase;
    if (isRealMode && client && activeClubId && authSession?.user) {
      try {
        const metadataPayload = JSON.stringify({
          category: data.category,
          requestedAmount: data.requestedAmount,
          durationMonths: data.durationMonths,
          riskLevel: data.riskLevel,
          description: data.description,
          thesis: data.thesis,
        });

        const { error } = await client.from('proposals').insert({
          club_id: activeClubId,
          created_by: authSession.user.id,
          title: data.title,
          description: metadataPayload,
          status: 'open',
          closes_at: deadline.toISOString(),
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Proposal creation failed: ${error.message}` });
          return false;
        }

        await loadCloudClubData(activeClubId);
        return true;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to submit proposal.' });
        return false;
      }
    }

    // Demo Mode fallback
    const proposer = demoMembers.find((m) => m.id === data.proposerId) || currentMember;
    const newProposal: Proposal = {
      id: `p_${Date.now()}`,
      title: data.title,
      category: data.category,
      requestedAmount: data.requestedAmount,
      proposerId: proposer.id,
      proposerName: proposer.name,
      durationMonths: data.durationMonths,
      riskLevel: data.riskLevel,
      description: data.description,
      thesis: data.thesis,
      status: 'voting',
      createdAt: new Date().toISOString(),
      votingDeadline: deadline.toISOString(),
      votes: {
        [proposer.id]: {
          memberId: proposer.id,
          memberName: proposer.name,
          decision: 'approve',
          timestamp: new Date().toISOString(),
          comment: 'Author ballot: Proposal submitted for democratic vote',
        },
      },
    };

    setDemoProposals((prev) => [newProposal, ...prev]);

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'proposal_created',
      timestamp: new Date().toISOString(),
      actorId: proposer.id,
      actorName: proposer.name,
      summary: `Created investment proposal "${data.title}"`,
      details: `Category: ${data.category}, Target: ${formatINR(data.requestedAmount)}, Risk: ${data.riskLevel}.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
    return true;
  };

  // Democratic Balloting: STRICT 1 VOTE PER MEMBER
  const handleCastVote = async (proposalId: string, decision: VoteDecision, comment?: string) => {
    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal) return;

    if (targetProposal.votes[currentMember.id]) {
      setAuthNotice({
        type: 'info',
        message: `${currentMember.name} has already cast their single vote on this proposal.`,
      });
      return;
    }

    // Real cloud vote via RPC
    const client = supabase;
    if (isRealMode && client && activeClubId) {
      try {
        const choice = decision === 'approve' ? 'yes' : decision === 'reject' ? 'no' : 'abstain';
        const { error } = await client.rpc('cast_proposal_vote', {
          p_proposal_id: proposalId,
          p_choice: choice,
          p_comment: comment || null,
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Voting failed: ${error.message}` });
          return;
        }

        loadCloudClubData(activeClubId);
        return;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to record ballot.' });
        return;
      }
    }

    // Demo Mode fallback
    setDemoProposals((prev) =>
      prev.map((prop) => {
        if (prop.id !== proposalId) return prop;

        const updatedVotes = {
          ...prop.votes,
          [currentMember.id]: {
            memberId: currentMember.id,
            memberName: currentMember.name,
            decision,
            timestamp: new Date().toISOString(),
            comment,
          },
        };

        const approvals = Object.values(updatedVotes).filter((v: any) => v.decision === 'approve').length;
        const rejections = Object.values(updatedVotes).filter((v: any) => v.decision === 'reject').length;
        const quorumNeeded = Math.floor(demoMembers.length / 2) + 1;

        let nextStatus = prop.status;
        if (approvals >= quorumNeeded) {
          nextStatus = 'approved';
        } else if (rejections >= quorumNeeded) {
          nextStatus = 'rejected';
        }

        return {
          ...prop,
          votes: updatedVotes,
          status: nextStatus,
        };
      })
    );

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'vote_cast',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Cast democratic vote "${decision.toUpperCase()}" on "${targetProposal.title}"`,
      details: comment ? `Rationale: "${comment}"` : 'Single official ballot recorded.',
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Permission: Execute approved proposal
  const handleExecuteProposal = async (proposalId: string) => {
    if (!isAdmin) {
      setAuthNotice({
        type: 'error',
        message: `Only the active administrator (${currentAdmin.name}) can execute approved allocations.`,
      });
      return;
    }

    const targetProposal = proposals.find((p) => p.id === proposalId);
    if (!targetProposal || targetProposal.status !== 'approved') return;

    // Real cloud execution via RPC
    const client = supabase;
    if (isRealMode && client && activeClubId) {
      try {
        const { error } = await client.rpc('close_executed_proposal', {
          p_proposal_id: proposalId,
          p_execution_note: `Executed by administrator ${currentMember.name}`,
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Execution failed: ${error.message}` });
          return;
        }

        loadCloudClubData(activeClubId);
        return;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to execute proposal.' });
        return;
      }
    }

    // Demo Mode fallback
    setDemoProposals((prev) =>
      prev.map((prop) =>
        prop.id === proposalId
          ? {
              ...prop,
              status: 'executed',
              executedAt: new Date().toISOString(),
              executedBy: currentMember.name,
            }
          : prop
      )
    );

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'proposal_executed',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Executed simulated allocation of ${formatINR(targetProposal.requestedAmount)} for "${targetProposal.title}"`,
      details: `Executed by Club Administrator ${currentMember.name}. Approved by democratic majority quorum.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Administrator Rotation & Permission Handover
  const handleRotateAdmin = async (nextAdminId: string, note?: string): Promise<boolean> => {
    const client = supabase;
    if (isRealMode && client && activeClubId) {
      try {
        const { error } = await client.rpc('rotate_club_administrator', {
          p_club_id: activeClubId,
          p_next_admin_user_id: nextAdminId,
          p_note: note || 'Scheduled democratic leadership baton transfer',
        });

        if (error) {
          setAuthNotice({ type: 'error', message: `Rotation failed: ${error.message}` });
          return false;
        }

        setAuthNotice({
          type: 'success',
          message: 'Administrator baton rotated successfully in the database!',
        });
        await loadCloudClubData(activeClubId);
        return true;
      } catch (err: any) {
        setAuthNotice({ type: 'error', message: err.message || 'Failed to rotate administrator.' });
        return false;
      }
    }

    // Demo Mode fallback
    const oldAdmin = demoMembers.find((m) => m.id === demoRotation.currentAdminId) || currentAdmin;
    const newAdmin = demoMembers.find((m) => m.id === nextAdminId);
    if (!newAdmin || !oldAdmin) return false;

    setDemoMembers((prev) =>
      prev.map((m) => {
        if (m.id === nextAdminId) return { ...m, role: 'Admin' };
        if (m.id === oldAdmin.id) return { ...m, role: 'Member' };
        return m;
      })
    );

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 30);

    const updatedHistory = [
      {
        memberId: oldAdmin.id,
        memberName: oldAdmin.name,
        term: `${oldAdmin.name}'s Stewardship (${oldAdmin.joinedDate.slice(0, 7)})`,
        completedAt: new Date().toISOString(),
      },
      ...(demoRotation.history || []),
    ];

    setDemoRotation((prev) => ({
      ...prev,
      currentAdminId: nextAdminId,
      termStartDate: startDate.toISOString().slice(0, 10),
      termEndDate: endDate.toISOString().slice(0, 10),
      history: updatedHistory,
    }));

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'admin_rotated',
      timestamp: new Date().toISOString(),
      actorId: oldAdmin.id,
      actorName: oldAdmin.name,
      summary: `Rotated Administrator Baton from ${oldAdmin.name} to ${newAdmin.name}`,
      details: note || 'Scheduled 30-day democratic leadership baton transfer.',
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
    return true;
  };

  // Add Member in Demo Mode
  const handleAddMemberDemo = (memberData: { name: string; email: string; phone: string }) => {
    if (demoMembers.length >= 5) return;

    const initials = memberData.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const colors = ['#f472b6', '#38bdf8', '#fbbf24', '#a78bfa', '#34d399'];
    const assignedColor = colors[demoMembers.length % colors.length];

    const newMember: Member = {
      id: `m_${Date.now()}`,
      name: memberData.name,
      role: 'Member',
      avatar: initials || 'MB',
      email: memberData.email,
      phone: memberData.phone,
      joinedDate: new Date().toISOString().slice(0, 10),
      totalContributed: 0,
      contributionCount: 0,
      status: 'active',
      color: assignedColor,
      isSimulated: true,
    };

    setDemoMembers((prev) => [...prev, newMember]);
    setDemoRotation((prev) => ({
      ...prev,
      rotationQueue: [...prev.rotationQueue, newMember.id],
    }));

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'member_added',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Added new club member ${memberData.name}`,
      details: `Capacity now at ${demoMembers.length + 1} of 5 people.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  // Profile Save / Update
  const handleSaveMember = async (updatedMember: Member) => {
    const client = supabase;
    if (isRealMode && client && authSession?.user && updatedMember.id === authSession.user.id) {
      try {
        const { error } = await client
          .from('profiles')
          .update({ display_name: updatedMember.name })
          .eq('user_id', authSession.user.id);

        if (error) {
          setAuthNotice({ type: 'error', message: `Failed to update display name: ${error.message}` });
          return;
        }

        setUserProfile((prev) => (prev ? { ...prev, display_name: updatedMember.name } : null));
        if (activeClubId) loadCloudClubData(activeClubId);
        return;
      } catch (err: any) {
        console.warn('Profile update notice:', err);
      }
    }

    // Demo Mode update
    setDemoMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
  };

  // Remove Member (Demo Mode only)
  const handleRemoveMember = (memberId: string, reason: string) => {
    if (isRealMode || demoMembers.length <= 3) return;

    const targetMember = demoMembers.find((m) => m.id === memberId);
    if (!targetMember) return;

    const remainingMembers = demoMembers.filter((m) => m.id !== memberId);
    let nextAdminId = demoRotation.currentAdminId;

    if (demoRotation.currentAdminId === memberId) {
      const nextId = demoRotation.rotationQueue.find((id) => id !== memberId) || remainingMembers[0].id;
      nextAdminId = nextId;
      setDemoMembers(
        remainingMembers.map((m) => (m.id === nextId ? { ...m, role: 'Admin' } : { ...m, role: 'Member' }))
      );
    } else {
      setDemoMembers(remainingMembers);
    }

    setDemoRotation((prev) => ({
      ...prev,
      currentAdminId: nextAdminId,
      rotationQueue: prev.rotationQueue.filter((id) => id !== memberId),
    }));

    const auditItem: AuditLogItem = {
      id: `a_${Date.now()}`,
      type: 'member_removed',
      timestamp: new Date().toISOString(),
      actorId: currentMember.id,
      actorName: currentMember.name,
      summary: `Removed member ${targetMember.name} from club`,
      details: `Reason: ${reason}. Club capacity updated to ${remainingMembers.length} members.`,
      hash: generateAuditHash(),
    };
    setDemoAuditLogs((prev) => [auditItem, ...prev]);
  };

  const handleToggleMemberStatus = (memberId: string) => {
    if (isRealMode) return;
    setDemoMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, status: m.status === 'active' ? 'away' : 'active' } : m
      )
    );
  };

  // Reset Demo Sandbox State to ₹0
  const handleResetSandbox = () => {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_demo_members`);
      localStorage.removeItem(`${STORAGE_KEY}_demo_contributions`);
      localStorage.removeItem(`${STORAGE_KEY}_demo_proposals`);
      localStorage.removeItem(`${STORAGE_KEY}_demo_rotation`);
      localStorage.removeItem(`${STORAGE_KEY}_demo_audit`);
    } catch {
      // ignore
    }

    setDemoMembers(INITIAL_MEMBERS);
    setDemoContributions(INITIAL_CONTRIBUTIONS);
    setDemoProposals(INITIAL_PROPOSALS);
    setDemoRotation(INITIAL_ADMIN_ROTATION);
    setDemoAuditLogs(INITIAL_AUDIT_LOGS);
    setDemoCurrentMemberId('m1');
    setIsResetModalOpen(false);
  };

  // Refresh data trigger
  const handleRefreshData = () => {
    setIsRefreshing(true);
    if (activeClubId && isRealMode) {
      loadCloudClubData(activeClubId).then(() => {
        setTimeout(() => setIsRefreshing(false), 500);
      });
    } else {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-[#041810] text-slate-100 font-sans flex flex-col selection:bg-[#00f090]/30 selection:text-white pb-20 md:pb-6">
      {/* Offline Status Banner */}
      <OfflineIndicator />

      {/* Primary Navigation Bar */}
      <Navbar
        members={members}
        currentMemberId={currentMemberId}
        onSelectMember={(id) => {
          if (!isRealMode) {
            setDemoCurrentMemberId(id);
          }
        }}
        onRefreshData={handleRefreshData}
        onOpenResetModal={() => setIsResetModalOpen(true)}
        isRefreshing={isRefreshing || isCloudSyncing}
        isCloudConnected={Boolean(authSession?.user && supabaseCfg.isVerified)}
        authUserEmail={authSession?.user?.email}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={() => {
          supabase?.auth.signOut();
          setAuthSession(null);
          setActiveClubId(null);
          setUserProfile(null);
          setRealMembers([]);
          setIsDemoMode(false);
          setAuthNotice({
            type: 'info',
            message: 'Signed out of Friendpool successfully.',
          });
        }}
        isDemoMode={!isRealMode}
        onToggleDemoMode={() => setIsDemoMode((prev) => !prev)}
        activeClubName={activeClubName}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
      />

      {/* Demo Mode Notice Banner */}
      {!isRealMode && (
        <div className="w-full bg-gradient-to-r from-amber-950/80 via-[#0d2a1f] to-amber-950/80 border-b border-amber-400/30 px-4 py-2">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Demo Simulation Mode:</strong> You are exploring Friendpool with simulated profiles (Aarav Sharma & syndicate).
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => setIsDemoMode(false)}
                  className="px-3 py-1 rounded-lg bg-[#00f090] text-[#041a12] font-bold text-xs hover:bg-[#10b981] transition cursor-pointer"
                >
                  Return to Real Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-[#00f090] text-[#041a12] font-bold text-xs hover:bg-[#10b981] transition cursor-pointer"
                >
                  Sign In / Create Real Account
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Callback Notification Banner */}
      {authNotice && (
        <div className="max-w-6xl w-full mx-auto px-4 pt-3">
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all shadow-lg ${
              authNotice.type === 'success'
                ? 'bg-emerald-950/80 border-[#00f090]/50 text-emerald-200 shadow-emerald-950/40'
                : authNotice.type === 'error'
                ? 'bg-rose-950/80 border-rose-500/50 text-rose-200 shadow-rose-950/40'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base select-none">
                {authNotice.type === 'error' ? '⚠️' : '✅'}
              </span>
              <p className="font-medium text-xs sm:text-sm">{authNotice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAuthNotice(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-black/40 hover:bg-black/60 transition-colors shrink-0 text-white/80 cursor-pointer"
              aria-label="Dismiss notification"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        {/* If user is authenticated in Real Mode but has NO club membership yet */}
        {isRealMode && !activeClubId ? (
          <ClubOnboardingView
            userEmail={authSession.user.email}
            userDisplayName={userProfile?.display_name || authSession.user.email?.split('@')[0]}
            initialInviteCode={pendingInviteToken}
            onCreateClub={handleCreateClub}
            onJoinClub={handleJoinClub}
            onSwitchToDemo={() => setIsDemoMode(true)}
            isLoading={isCloudSyncing}
          />
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                members={members}
                contributions={contributions}
                proposals={proposals}
                rotation={rotation}
                currentMember={currentMember}
                isAdmin={isAdmin}
                onOpenContributeModal={() => setIsContributeModalOpen(true)}
                onOpenProposalModal={() => setIsProposalModalOpen(true)}
                onOpenRotateModal={() => setIsRotateModalOpen(true)}
                onSelectProposalForVote={(proposal: Proposal) => setProposalToVote(proposal)}
                onNavigateToTab={(tab: 'contributions' | 'proposals' | 'members' | 'audit') => setActiveTab(tab)}
                onRefreshData={handleRefreshData}
                isRefreshing={isRefreshing || isCloudSyncing}
              />
            )}

            {activeTab === 'contributions' && (
              <ContributionsView
                members={members}
                contributions={contributions}
                currentMember={currentMember}
                isAdmin={isAdmin}
                adminName={currentAdmin.name}
                onOpenContributeModal={() => setIsContributeModalOpen(true)}
                onSimulateQuickDeposit={handleSimulateQuickDeposit}
                onApproveDeposit={handleApproveDeposit}
                onRejectDeposit={handleRejectDeposit}
                onRefreshData={handleRefreshData}
                isRefreshing={isRefreshing || isCloudSyncing}
              />
            )}

            {activeTab === 'proposals' && (
              <ProposalsView
                proposals={proposals}
                members={members}
                currentMember={currentMember}
                isAdmin={isAdmin}
                adminName={currentAdmin.name}
                onOpenNewProposalModal={() => setIsProposalModalOpen(true)}
                onOpenVoteModal={(prop: Proposal) => setProposalToVote(prop)}
                onExecuteProposal={handleExecuteProposal}
              />
            )}

            {activeTab === 'members' && (
              <MembersView
                members={members}
                rotation={rotation}
                currentMember={currentMember}
                isAdmin={isAdmin}
                onOpenAddMemberModal={() => {
                  if (isRealMode) {
                    setIsInviteModalOpen(true);
                  } else {
                    setIsAddMemberModalOpen(true);
                  }
                }}
                onOpenEditMemberModal={(m) => setMemberToEdit(m)}
                onOpenRemoveMemberModal={(m) => setMemberToRemove(m)}
                onOpenRotateModal={() => setIsRotateModalOpen(true)}
                onToggleMemberStatus={handleToggleMemberStatus}
                isRealMode={isRealMode}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}

            {activeTab === 'audit' && (
              <AuditView
                logs={auditLogs}
              />
            )}
          </>
        )}
      </main>

      {/* Navigation is available only after a club is selected */}
      {(!isRealMode || Boolean(activeClubId)) && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab: NavTab) => setActiveTab(tab)}
          openProposalsCount={proposals.filter((p) => p.status === 'voting').length}
        />
      )}

      {/* Contribution Modal */}
      <ContributeModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        members={isRealMode ? [currentMember] : members}
        currentMemberId={currentMemberId}
        onSimulateContribution={handleSimulateContribution}
      />

      {/* New Investment Proposal Modal */}
      <NewProposalModal
        isOpen={isProposalModalOpen}
        onClose={() => setIsProposalModalOpen(false)}
        members={members}
        currentMemberId={currentMemberId}
        clubBalance={approvedTotalBalance}
        onCreateProposal={handleCreateProposal}
      />

      {/* Democratic Ballot Vote Modal */}
      {proposalToVote && (
        <VoteModal
          isOpen={Boolean(proposalToVote)}
          onClose={() => setProposalToVote(null)}
          proposal={proposalToVote}
          currentMember={currentMember}
          onCastVote={handleCastVote}
        />
      )}

      {/* Administrator Rotation Modal */}
      <RotateAdminModal
        isOpen={isRotateModalOpen}
        onClose={() => setIsRotateModalOpen(false)}
        rotation={rotation}
        members={members}
        onRotateAdmin={handleRotateAdmin}
      />

      {/* Real Supabase Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        clubId={activeClubId || ''}
        clubName={activeClubName}
        currentMemberCount={members.length}
        isAdmin={isAdmin}
      />

      {/* Demo Add Member Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        currentCount={members.length}
        onAddMember={handleAddMemberDemo}
      />

      {/* Edit Member Profile Modal */}
      {memberToEdit && (
        <EditMemberModal
          isOpen={Boolean(memberToEdit)}
          onClose={() => setMemberToEdit(null)}
          member={memberToEdit}
          onSaveMember={handleSaveMember}
        />
      )}

      {/* Remove Member Modal */}
      {memberToRemove && (
        <RemoveMemberModal
          isOpen={Boolean(memberToRemove)}
          onClose={() => setMemberToRemove(null)}
          member={memberToRemove}
          currentMemberCount={members.length}
          rotation={rotation}
          members={members}
          onConfirmRemove={(memberId: string, reason: string) => {
            handleRemoveMember(memberId, reason);
            setMemberToRemove(null);
          }}
        />
      )}

      {/* Reset Confirmation Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleResetSandbox}
      />

      {/* Supabase Authentication & Settings Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUserEmail={authSession?.user?.email}
        userClubId={activeClubId}
        onAuthSuccess={(user) => {
          setAuthSession({ user });
          setIsDemoMode(false);
          setIsAuthModalOpen(false);
        }}
        onClubJoinedOrCreated={(clubId) => {
          setActiveClubId(clubId);
          setIsDemoMode(false);
          setIsAuthModalOpen(false);
          loadCloudClubData(clubId);
        }}
      />
    </div>
  );
}
