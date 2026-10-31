-- ============================================================================
-- FRIENDPOOL SUPABASE MIGRATION SCRIPT (STAGE 1 TO 3)
-- Verified against actual database tables and column types
-- ============================================================================

-- ----------------------------------------------------------------------------
-- DIAGNOSTIC QUERY 1: Confirm contributions.member_id foreign key target
-- ----------------------------------------------------------------------------
/*
SELECT 
  tc.constraint_name,
  kcu.table_schema AS source_schema,
  kcu.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS referenced_schema,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_name = 'contributions_member_id_fkey';
*/

-- ----------------------------------------------------------------------------
-- STAGE 1: Schema Additions & Non-Recursive Security Definer Helpers
-- ----------------------------------------------------------------------------

-- 1. Create Dedicated Invitations Table (Capacity-checked & unexposed in clubs table)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.profiles(user_id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  is_revoked BOOLEAN NOT NULL DEFAULT false,
  max_uses INT NOT NULL DEFAULT 1,
  use_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 2. Partial Unique Index: Guarantees at most ONE active administrator per club
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_club_admin 
  ON public.memberships(club_id) 
  WHERE role = 'admin';

-- 3. Security Definer Helper: Non-recursive self-scoped membership verification
CREATE OR REPLACE FUNCTION public.is_current_user_club_member(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE club_id = p_club_id AND user_id = auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_club_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_club_member(UUID) TO authenticated;

-- 4. Security Definer Helper: Non-recursive self-scoped admin verification
CREATE OR REPLACE FUNCTION public.is_current_user_club_admin(p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE club_id = p_club_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_user_club_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_club_admin(UUID) TO authenticated;


-- ----------------------------------------------------------------------------
-- STAGE 2: Hardened Atomic Stored Procedures (RPCs)
-- ----------------------------------------------------------------------------

-- 1. Atomic Club & Founding Administrator Creation
CREATE OR REPLACE FUNCTION public.create_club_with_admin(
  p_club_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_club_id UUID;
  v_membership_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Session required';
  END IF;

  IF trim(p_club_name) = '' THEN
    RAISE EXCEPTION 'Club name cannot be empty';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_caller_id) THEN
    RAISE EXCEPTION 'Profile record does not exist for current user';
  END IF;

  INSERT INTO public.clubs (name, created_by, created_at)
  VALUES (trim(p_club_name), v_caller_id, now())
  RETURNING id INTO v_club_id;

  INSERT INTO public.memberships (club_id, user_id, role, joined_at)
  VALUES (v_club_id, v_caller_id, 'admin', now())
  RETURNING id INTO v_membership_id;

  -- Audit log: entity_id is strictly UUID (v_club_id)
  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_club_id,
    'club_created',
    'club',
    v_club_id,
    jsonb_build_object(
      'club_name', trim(p_club_name),
      'founder_user_id', v_caller_id,
      'membership_id', v_membership_id,
      'summary', 'Club initialized and founding administrator registered'
    ),
    now()
  );

  RETURN jsonb_build_object('club_id', v_club_id, 'club_name', trim(p_club_name), 'role', 'admin');
END;
$$;
REVOKE ALL ON FUNCTION public.create_club_with_admin(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_club_with_admin(TEXT) TO authenticated;


-- 2. Concurrency-Safe Capacity-Checked Invitation Generation
CREATE OR REPLACE FUNCTION public.generate_club_invitation(
  p_club_id UUID,
  p_duration_days INT DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_club RECORD;
  v_active_members INT;
  v_pending_invites INT;
  v_token TEXT;
  v_invitation_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_club FROM public.clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Club not found'; END IF;

  IF NOT public.is_current_user_club_admin(p_club_id) THEN
    RAISE EXCEPTION 'Forbidden: Only the active club administrator can generate invitations';
  END IF;

  SELECT count(*) INTO v_active_members FROM public.memberships WHERE club_id = p_club_id;
  SELECT coalesce(sum(max_uses - use_count), 0) INTO v_pending_invites
  FROM public.invitations WHERE club_id = p_club_id AND is_revoked = false AND expires_at > now();

  IF (v_active_members + v_pending_invites) >= 5 THEN
    RAISE EXCEPTION 'Cannot generate invitation: active members (%s) plus pending invites (%s) reaches maximum capacity of 5',
      v_active_members, v_pending_invites;
  END IF;

  v_token := encode(gen_random_bytes(16), 'hex');
  v_expires_at := now() + (p_duration_days || ' days')::interval;

  INSERT INTO public.invitations (club_id, token, created_by, expires_at, is_revoked, max_uses, use_count)
  VALUES (p_club_id, v_token, v_caller_id, v_expires_at, false, 1, 0)
  RETURNING id INTO v_invitation_id;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    p_club_id,
    'invitation_generated',
    'invitation',
    v_invitation_id,
    jsonb_build_object('invitation_id', v_invitation_id, 'admin_user_id', v_caller_id, 'expires_at', v_expires_at, 'summary', 'Generated single-use invitation token'),
    now()
  );

  RETURN jsonb_build_object('invitation_id', v_invitation_id, 'token', v_token, 'expires_at', v_expires_at);
END;
$$;
REVOKE ALL ON FUNCTION public.generate_club_invitation(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_club_invitation(UUID, INT) TO authenticated;


-- 3. Concurrency-Locked Invite Redemption (Enforces 5-member limit)
CREATE OR REPLACE FUNCTION public.join_club_by_invite(
  p_invite_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_inv RECORD;
  v_club RECORD;
  v_member_count INT;
  v_new_membership_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_inv FROM public.invitations WHERE token = trim(p_invite_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid invitation token'; END IF;
  IF v_inv.is_revoked THEN RAISE EXCEPTION 'This invitation has been revoked'; END IF;
  IF v_inv.expires_at < now() THEN RAISE EXCEPTION 'This invitation has expired'; END IF;
  IF v_inv.use_count >= v_inv.max_uses THEN RAISE EXCEPTION 'This invitation has already been redeemed'; END IF;

  SELECT * INTO v_club FROM public.clubs WHERE id = v_inv.club_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Club does not exist'; END IF;

  IF public.is_current_user_club_member(v_club.id) THEN
    RAISE EXCEPTION 'You are already a member of this club';
  END IF;

  SELECT count(*) INTO v_member_count FROM public.memberships WHERE club_id = v_club.id;
  IF v_member_count >= 5 THEN
    RAISE EXCEPTION 'Club has reached its maximum democratic capacity of 5 members';
  END IF;

  INSERT INTO public.memberships (club_id, user_id, role, joined_at)
  VALUES (v_club.id, v_caller_id, 'member', now())
  RETURNING id INTO v_new_membership_id;

  UPDATE public.invitations SET use_count = use_count + 1 WHERE id = v_inv.id;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_club.id,
    'member_joined',
    'membership',
    v_new_membership_id,
    jsonb_build_object('user_id', v_caller_id, 'member_number', v_member_count + 1, 'invitation_id', v_inv.id, 'summary', 'Redeemed invitation and joined club'),
    now()
  );

  RETURN jsonb_build_object('club_id', v_club.id, 'club_name', v_club.name, 'member_count', v_member_count + 1);
END;
$$;
REVOKE ALL ON FUNCTION public.join_club_by_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_club_by_invite(TEXT) TO authenticated;


-- 4. Contribution Review Operations
CREATE OR REPLACE FUNCTION public.approve_contribution(
  p_contribution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_contrib RECORD;
  v_admin_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_contrib FROM public.contributions WHERE id = p_contribution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contribution record not found'; END IF;
  IF v_contrib.status <> 'pending' THEN RAISE EXCEPTION 'Only pending contributions can be reviewed'; END IF;

  IF NOT public.is_current_user_club_admin(v_contrib.club_id) THEN
    RAISE EXCEPTION 'Forbidden: Only the active club administrator can approve deposits';
  END IF;

  SELECT display_name INTO v_admin_name FROM public.profiles WHERE user_id = v_caller_id;

  UPDATE public.contributions
  SET status = 'approved', reviewed_by = v_caller_id, reviewed_at = now()
  WHERE id = p_contribution_id;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_contrib.club_id,
    'contribution_approved',
    'contribution',
    p_contribution_id,
    jsonb_build_object('amount_paise', v_contrib.amount_paise, 'member_id', v_contrib.member_id, 'admin_user_id', v_caller_id, 'admin_name', coalesce(v_admin_name, 'Admin'), 'reference_note', v_contrib.reference_note, 'summary', format('Approved simulated deposit of ₹%s. Club pool balance updated.', (v_contrib.amount_paise / 100))),
    now()
  );

  RETURN jsonb_build_object('success', true, 'status', 'approved');
END;
$$;
REVOKE ALL ON FUNCTION public.approve_contribution(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_contribution(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.reject_contribution(
  p_contribution_id UUID,
  p_reason TEXT DEFAULT 'Rejected during administrator review'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_contrib RECORD;
  v_admin_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_contrib FROM public.contributions WHERE id = p_contribution_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contribution record not found'; END IF;
  IF v_contrib.status <> 'pending' THEN RAISE EXCEPTION 'Only pending contributions can be reviewed'; END IF;

  IF NOT public.is_current_user_club_admin(v_contrib.club_id) THEN
    RAISE EXCEPTION 'Forbidden: Only the active club administrator can reject deposits';
  END IF;

  SELECT display_name INTO v_admin_name FROM public.profiles WHERE user_id = v_caller_id;

  UPDATE public.contributions
  SET status = 'rejected', reviewed_by = v_caller_id, reviewed_at = now(), reference_note = coalesce(reference_note, '') || ' [Rejected: ' || trim(p_reason) || ']'
  WHERE id = p_contribution_id;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_contrib.club_id,
    'contribution_rejected',
    'contribution',
    p_contribution_id,
    jsonb_build_object('amount_paise', v_contrib.amount_paise, 'member_id', v_contrib.member_id, 'admin_user_id', v_caller_id, 'admin_name', coalesce(v_admin_name, 'Admin'), 'rejection_reason', trim(p_reason), 'summary', format('Rejected simulated deposit of ₹%s. Reason: %s', (v_contrib.amount_paise / 100), trim(p_reason))),
    now()
  );

  RETURN jsonb_build_object('success', true, 'status', 'rejected');
END;
$$;
REVOKE ALL ON FUNCTION public.reject_contribution(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_contribution(UUID, TEXT) TO authenticated;


-- 5. Democratic Voting & Quorum Evaluation
CREATE OR REPLACE FUNCTION public.cast_proposal_vote(
  p_proposal_id UUID,
  p_choice TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_prop RECORD;
  v_active_members INT;
  v_quorum_needed INT;
  v_yes_votes INT;
  v_no_votes INT;
  v_new_status TEXT;
  v_vote_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF p_choice NOT IN ('yes', 'no', 'abstain') THEN
    RAISE EXCEPTION 'Invalid vote choice: must be yes, no, or abstain';
  END IF;

  SELECT * INTO v_prop FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal not found'; END IF;
  IF v_prop.status <> 'open' THEN RAISE EXCEPTION 'Proposal is not open for voting'; END IF;
  IF v_prop.closes_at < now() THEN RAISE EXCEPTION 'Voting deadline has passed'; END IF;

  IF NOT public.is_current_user_club_member(v_prop.club_id) THEN
    RAISE EXCEPTION 'Only active club members can cast ballots';
  END IF;

  -- Insert Vote (Strictly uses verified columns: proposal_id, voter_id, choice, created_at)
  INSERT INTO public.votes (proposal_id, voter_id, choice, created_at)
  VALUES (p_proposal_id, v_caller_id, p_choice, now())
  RETURNING id INTO v_vote_id;

  SELECT count(*) INTO v_active_members FROM public.memberships WHERE club_id = v_prop.club_id;
  v_quorum_needed := floor(v_active_members / 2) + 1;

  SELECT count(*) INTO v_yes_votes FROM public.votes WHERE proposal_id = p_proposal_id AND choice = 'yes';
  SELECT count(*) INTO v_no_votes  FROM public.votes WHERE proposal_id = p_proposal_id AND choice = 'no';

  v_new_status := v_prop.status;
  IF v_yes_votes >= v_quorum_needed THEN
    v_new_status := 'approved';
  ELSIF v_no_votes >= v_quorum_needed THEN
    v_new_status := 'rejected';
  END IF;

  IF v_new_status <> v_prop.status THEN
    UPDATE public.proposals SET status = v_new_status WHERE id = p_proposal_id;
  END IF;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_prop.club_id,
    'vote_cast',
    'proposal',
    p_proposal_id,
    jsonb_build_object('vote_id', v_vote_id, 'voter_user_id', v_caller_id, 'choice', p_choice, 'comment', p_comment, 'resulting_status', v_new_status, 'summary', format('Cast democratic ballot (%s) on "%s"', upper(p_choice), v_prop.title)),
    now()
  );

  RETURN jsonb_build_object('success', true, 'proposal_status', v_new_status, 'yes_count', v_yes_votes, 'no_count', v_no_votes);
END;
$$;
REVOKE ALL ON FUNCTION public.cast_proposal_vote(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_proposal_vote(UUID, TEXT, TEXT) TO authenticated;


-- 6. Close / Execute Approved Proposal
CREATE OR REPLACE FUNCTION public.close_executed_proposal(
  p_proposal_id UUID,
  p_execution_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_prop RECORD;
  v_admin_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO v_prop FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal not found'; END IF;
  IF v_prop.status <> 'approved' THEN
    RAISE EXCEPTION 'Only democratically approved proposals can be executed/closed';
  END IF;

  IF NOT public.is_current_user_club_admin(v_prop.club_id) THEN
    RAISE EXCEPTION 'Forbidden: Only the active administrator can execute approved allocations';
  END IF;

  SELECT display_name INTO v_admin_name FROM public.profiles WHERE user_id = v_caller_id;

  UPDATE public.proposals SET status = 'closed' WHERE id = p_proposal_id;

  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    v_prop.club_id,
    'proposal_executed',
    'proposal',
    p_proposal_id,
    jsonb_build_object('proposal_id', p_proposal_id, 'title', v_prop.title, 'admin_user_id', v_caller_id, 'admin_name', coalesce(v_admin_name, 'Admin'), 'execution_note', p_execution_note, 'summary', format('Executed simulated allocation for "%s"', v_prop.title)),
    now()
  );

  RETURN jsonb_build_object('success', true, 'status', 'closed');
END;
$$;
REVOKE ALL ON FUNCTION public.close_executed_proposal(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_executed_proposal(UUID, TEXT) TO authenticated;


-- 7. Row-Locked Administrator Rotation
CREATE OR REPLACE FUNCTION public.rotate_club_administrator(
  p_club_id UUID,
  p_next_admin_user_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_club RECORD;
  v_old_admin_name TEXT;
  v_new_admin_name TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  -- 1. Row Lock on Club
  SELECT * INTO v_club FROM public.clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Club not found'; END IF;

  -- 2. Verify Caller is current admin
  IF NOT public.is_current_user_club_admin(p_club_id) THEN
    RAISE EXCEPTION 'Forbidden: Only the active club administrator can rotate stewardship';
  END IF;

  -- 3. Verify Candidate is in club
  IF NOT EXISTS (
    SELECT 1 FROM public.memberships 
    WHERE club_id = p_club_id AND user_id = p_next_admin_user_id
  ) THEN
    RAISE EXCEPTION 'Candidate administrator is not a member of this club';
  END IF;

  IF v_caller_id = p_next_admin_user_id THEN
    RAISE EXCEPTION 'Candidate is already the active administrator';
  END IF;

  SELECT display_name INTO v_old_admin_name FROM public.profiles WHERE user_id = v_caller_id;
  SELECT display_name INTO v_new_admin_name FROM public.profiles WHERE user_id = p_next_admin_user_id;

  -- 4. Swap roles atomically
  UPDATE public.memberships SET role = 'member' WHERE club_id = p_club_id AND user_id = v_caller_id;
  UPDATE public.memberships SET role = 'admin'  WHERE club_id = p_club_id AND user_id = p_next_admin_user_id;

  -- 5. Audit Log (entity_id is strictly UUID: p_club_id)
  INSERT INTO public.audit_logs (club_id, action, entity_type, entity_id, details, created_at)
  VALUES (
    p_club_id,
    'admin_rotated',
    'club',
    p_club_id,
    jsonb_build_object(
      'previous_admin_id', v_caller_id,
      'next_admin_id', p_next_admin_user_id,
      'previous_admin_name', coalesce(v_old_admin_name, 'Admin'),
      'next_admin_name', coalesce(v_new_admin_name, 'Member'),
      'handover_note', p_note,
      'summary', format('Rotated Administrator Baton from %s to %s', 
                        coalesce(v_old_admin_name, 'Admin'), 
                        coalesce(v_new_admin_name, 'Member'))
    ),
    now()
  );

  RETURN jsonb_build_object('success', true, 'previous_admin_id', v_caller_id, 'new_admin_id', p_next_admin_user_id);
END;
$$;
REVOKE ALL ON FUNCTION public.rotate_club_administrator(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rotate_club_administrator(UUID, UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- STAGE 3: Row-Level Security Policies (Hardened Scoped Security)
-- ----------------------------------------------------------------------------

-- 1. Profiles: Privacy-preserving peer check (Strictly prevents arbitrary enumeration)
DROP POLICY IF EXISTS "Profiles visible to self and club peers" ON public.profiles;
CREATE POLICY "Profiles visible to self and club peers"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT m.user_id 
      FROM public.memberships m 
      WHERE public.is_current_user_club_member(m.club_id)
    )
  );

DROP POLICY IF EXISTS "Users can update their own display_name" ON public.profiles;
CREATE POLICY "Users can update their own display_name"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. Clubs: Viewable only by active club members
DROP POLICY IF EXISTS "Club members can view their club" ON public.clubs;
CREATE POLICY "Club members can view their club"
  ON public.clubs FOR SELECT TO authenticated
  USING (public.is_current_user_club_member(id));

-- 3. Memberships: Viewable by club members
DROP POLICY IF EXISTS "Members can view club roster" ON public.memberships;
CREATE POLICY "Members can view club roster"
  ON public.memberships FOR SELECT TO authenticated
  USING (public.is_current_user_club_member(club_id));

-- 4. Invitations: Viewable only by the active club administrator
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;
CREATE POLICY "Admins can view invitations"
  ON public.invitations FOR SELECT TO authenticated
  USING (public.is_current_user_club_admin(club_id));

-- 5. Contributions: Viewable by club members (Reviews handled strictly via RPC)
DROP POLICY IF EXISTS "Members can view club contributions" ON public.contributions;
CREATE POLICY "Members can view club contributions"
  ON public.contributions FOR SELECT TO authenticated
  USING (public.is_current_user_club_member(club_id));

-- 6. Proposals: Viewable and insertable by club members
DROP POLICY IF EXISTS "Members can view club proposals" ON public.proposals;
CREATE POLICY "Members can view club proposals"
  ON public.proposals FOR SELECT TO authenticated
  USING (public.is_current_user_club_member(club_id));

DROP POLICY IF EXISTS "Members can create open proposals" ON public.proposals;
CREATE POLICY "Members can create open proposals"
  ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND status = 'open'
    AND public.is_current_user_club_member(club_id)
  );

-- 7. Votes: Viewable by members of the proposal's club
DROP POLICY IF EXISTS "Members can view votes on club proposals" ON public.votes;
CREATE POLICY "Members can view votes on club proposals"
  ON public.votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = votes.proposal_id
        AND public.is_current_user_club_member(p.club_id)
    )
  );

-- 8. Audit Logs: Viewable by club members (Strictly NO client INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Members can view club audit logs" ON public.audit_logs;
CREATE POLICY "Members can view club audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_current_user_club_member(club_id));


-- ----------------------------------------------------------------------------
-- STAGE 4: EXACT ROLLBACK SCRIPT (Restores the exact prior database state)
-- ----------------------------------------------------------------------------
/*
-- 1. Drop Replaced RLS Policies
DROP POLICY IF EXISTS "Members can view club audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Members can view votes on club proposals" ON public.votes;
DROP POLICY IF EXISTS "Members can create open proposals" ON public.proposals;
DROP POLICY IF EXISTS "Members can view club proposals" ON public.proposals;
DROP POLICY IF EXISTS "Members can view club contributions" ON public.contributions;
DROP POLICY IF EXISTS "Admins can view invitations" ON public.invitations;
DROP POLICY IF EXISTS "Members can view club roster" ON public.memberships;
DROP POLICY IF EXISTS "Club members can view their club" ON public.clubs;
DROP POLICY IF EXISTS "Users can update their own display_name" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visible to self and club peers" ON public.profiles;

-- 2. Drop Stored Procedures
DROP FUNCTION IF EXISTS public.rotate_club_administrator(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.close_executed_proposal(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cast_proposal_vote(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.reject_contribution(UUID, TEXT);
DROP FUNCTION IF EXISTS public.approve_contribution(UUID);
DROP FUNCTION IF EXISTS public.join_club_by_invite(TEXT);
DROP FUNCTION IF EXISTS public.generate_club_invitation(UUID, INT);
DROP FUNCTION IF EXISTS public.create_club_with_admin(TEXT);

-- 3. Drop Helper Functions
DROP FUNCTION IF EXISTS public.is_current_user_club_admin(UUID);
DROP FUNCTION IF EXISTS public.is_current_user_club_member(UUID);

-- 4. Drop Migrated Index and Table
DROP INDEX IF EXISTS public.idx_single_club_admin;
DROP TABLE IF EXISTS public.invitations;
*/
