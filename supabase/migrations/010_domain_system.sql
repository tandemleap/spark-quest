-- Migration 010: Domain System + Grit Mechanic
-- Run in Supabase SQL editor after 009_quest_created_by.sql

-- ── Kids: add domain point buckets ───────────────────────────────────────────
ALTER TABLE kids
  ADD COLUMN IF NOT EXISTS body_points  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS brain_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heart_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hands_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS team_points  integer NOT NULL DEFAULT 0;

-- ── Quests: add domain tags and grit fields ───────────────────────────────────
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS domain_tags              text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_grit_quest            boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grit_powerup_description text,
  ADD COLUMN IF NOT EXISTS grit_powerup_points      integer;

-- ── Quest Completions: track whether powerup was claimed ─────────────────────
ALTER TABLE quest_completions
  ADD COLUMN IF NOT EXISTS powerup_claimed boolean NOT NULL DEFAULT false;

-- ── Drops: add domain requirements and featured flag ─────────────────────────
ALTER TABLE drops
  ADD COLUMN IF NOT EXISTS domain_requirements jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured         boolean NOT NULL DEFAULT false;

-- ── Adventures: add domain requirements and featured flag ────────────────────
ALTER TABLE adventures
  ADD COLUMN IF NOT EXISTS domain_requirements jsonb   NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_featured         boolean NOT NULL DEFAULT false;

-- ── Updated award_quest_points RPC ───────────────────────────────────────────
-- Now handles domain bucket updates and optional grit powerup bonus.
-- Returns total points awarded (base + powerup if claimed).
CREATE OR REPLACE FUNCTION award_quest_points(
  p_kid_id         uuid,
  p_quest_id       uuid,
  p_points         integer,
  p_initials       text,
  p_powerup_claimed boolean DEFAULT false
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_tags        text[];
  v_powerup_pts integer;
  v_total       integer;
BEGIN
  -- Fetch domain tags and powerup points for this quest
  SELECT domain_tags, grit_powerup_points
  INTO   v_tags, v_powerup_pts
  FROM   quests WHERE id = p_quest_id;

  -- Base points + optional powerup bonus
  v_total := p_points;
  IF p_powerup_claimed AND v_powerup_pts IS NOT NULL THEN
    v_total := v_total + v_powerup_pts;
  END IF;

  -- Record the completion
  INSERT INTO quest_completions
    (kid_id, quest_id, points_awarded, verified_by_initials, powerup_claimed)
  VALUES
    (p_kid_id, p_quest_id, v_total, p_initials, p_powerup_claimed);

  -- Update kid totals and domain buckets atomically
  UPDATE kids
  SET
    total_points_earned = total_points_earned + v_total,
    available_points    = available_points    + v_total,
    body_points  = body_points  + CASE WHEN 'body'  = ANY(v_tags) THEN v_total ELSE 0 END,
    brain_points = brain_points + CASE WHEN 'brain' = ANY(v_tags) THEN v_total ELSE 0 END,
    heart_points = heart_points + CASE WHEN 'heart' = ANY(v_tags) THEN v_total ELSE 0 END,
    hands_points = hands_points + CASE WHEN 'hands' = ANY(v_tags) THEN v_total ELSE 0 END,
    team_points  = team_points  + CASE WHEN 'team'  = ANY(v_tags) THEN v_total ELSE 0 END
  WHERE id = p_kid_id;

  RETURN v_total;
END;
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
