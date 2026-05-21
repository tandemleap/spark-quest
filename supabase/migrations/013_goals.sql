-- Migration 013: Kid goal-setting columns
-- Kids can set one short-term (≤75pts) and one long-term (≥76pts) reward goal.
-- Uses reward_id + reward_type pattern (same as redemptions) — no FK since it
-- can reference either drops or adventures.

ALTER TABLE kids
  ADD COLUMN IF NOT EXISTS short_term_goal_id   uuid,
  ADD COLUMN IF NOT EXISTS short_term_goal_type text,
  ADD COLUMN IF NOT EXISTS long_term_goal_id    uuid,
  ADD COLUMN IF NOT EXISTS long_term_goal_type  text;
