-- Migration 017: Record Chase quest type
-- Lets kids set a personal best on day 1, then earn points each time they beat it.

ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS quest_type        text    NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS score_unit        text,
  ADD COLUMN IF NOT EXISTS score_direction   text    NOT NULL DEFAULT 'higher',
  ADD COLUMN IF NOT EXISTS record_set_points integer NOT NULL DEFAULT 0;

ALTER TABLE quest_completions
  ADD COLUMN IF NOT EXISTS score_value numeric;

-- Update RPC to accept optional score_value.
-- Also bypasses daily-cap raise for 0-point record-setting attempts.
CREATE OR REPLACE FUNCTION award_quest_points(
  p_kid_id          uuid,
  p_quest_id        uuid,
  p_points          integer,
  p_initials        text,
  p_powerup_claimed boolean DEFAULT false,
  p_score_value     numeric DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_tags         text[];
  v_powerup_pts  integer;
  v_total        integer;
  v_today_pts    integer;
  v_remaining    integer;
  v_actual       integer;
  c_daily_limit  constant integer := 40;
BEGIN
  SELECT domain_tags, grit_powerup_points
  INTO   v_tags, v_powerup_pts
  FROM   quests WHERE id = p_quest_id;

  v_total := p_points;
  IF p_powerup_claimed AND v_powerup_pts IS NOT NULL THEN
    v_total := v_total + v_powerup_pts;
  END IF;

  -- 0-point record-setting: record the score but skip cap logic
  IF v_total = 0 THEN
    INSERT INTO quest_completions
      (kid_id, quest_id, points_awarded, verified_by_initials, powerup_claimed, score_value)
    VALUES
      (p_kid_id, p_quest_id, 0, p_initials, p_powerup_claimed, p_score_value);
    RETURN 0;
  END IF;

  SELECT COALESCE(SUM(points_awarded), 0) INTO v_today_pts
  FROM quest_completions
  WHERE kid_id = p_kid_id
    AND (completed_at AT TIME ZONE 'America/Chicago')::date
        = (NOW() AT TIME ZONE 'America/Chicago')::date;

  v_remaining := c_daily_limit - v_today_pts;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  v_actual := LEAST(v_total, v_remaining);

  INSERT INTO quest_completions
    (kid_id, quest_id, points_awarded, verified_by_initials, powerup_claimed, score_value)
  VALUES
    (p_kid_id, p_quest_id, v_actual, p_initials, p_powerup_claimed, p_score_value);

  UPDATE kids
  SET
    total_points_earned = total_points_earned + v_actual,
    available_points    = available_points    + v_actual,
    body_points  = body_points  + CASE WHEN 'body'  = ANY(v_tags) THEN v_actual ELSE 0 END,
    brain_points = brain_points + CASE WHEN 'brain' = ANY(v_tags) THEN v_actual ELSE 0 END,
    heart_points = heart_points + CASE WHEN 'heart' = ANY(v_tags) THEN v_actual ELSE 0 END,
    hands_points = hands_points + CASE WHEN 'hands' = ANY(v_tags) THEN v_actual ELSE 0 END,
    team_points  = team_points  + CASE WHEN 'team'  = ANY(v_tags) THEN v_actual ELSE 0 END
  WHERE id = p_kid_id;

  RETURN v_actual;
END;
$$;

NOTIFY pgrst, 'reload schema';
