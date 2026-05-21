-- Migration 015: 40-point daily cap per kid
-- Day boundary uses America/Chicago (Central Time) so midnight resets during
-- the program window, not UTC midnight which falls mid-session in summer.

CREATE OR REPLACE FUNCTION award_quest_points(
  p_kid_id          uuid,
  p_quest_id        uuid,
  p_points          integer,
  p_initials        text,
  p_powerup_claimed boolean DEFAULT false
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
  -- Fetch domain tags and powerup points for this quest
  SELECT domain_tags, grit_powerup_points
  INTO   v_tags, v_powerup_pts
  FROM   quests WHERE id = p_quest_id;

  -- Base points + optional powerup bonus
  v_total := p_points;
  IF p_powerup_claimed AND v_powerup_pts IS NOT NULL THEN
    v_total := v_total + v_powerup_pts;
  END IF;

  -- How many points has this kid already earned today (Central Time)?
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_today_pts
  FROM quest_completions
  WHERE kid_id = p_kid_id
    AND (completed_at AT TIME ZONE 'America/Chicago')::date
        = (NOW() AT TIME ZONE 'America/Chicago')::date;

  v_remaining := c_daily_limit - v_today_pts;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'daily_limit_reached';
  END IF;

  -- Cap at whatever remains for today
  v_actual := LEAST(v_total, v_remaining);

  -- Record the completion with the actual (possibly capped) points
  INSERT INTO quest_completions
    (kid_id, quest_id, points_awarded, verified_by_initials, powerup_claimed)
  VALUES
    (p_kid_id, p_quest_id, v_actual, p_initials, p_powerup_claimed);

  -- Update kid totals and domain buckets atomically
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

-- After replacing a function, reload the schema cache
NOTIFY pgrst, 'reload schema';
