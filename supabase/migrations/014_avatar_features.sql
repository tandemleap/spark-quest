-- Avatar generation count (lifetime limit: 10 per kid)
-- Avatar scroll visibility toggle
ALTER TABLE kids
  ADD COLUMN IF NOT EXISTS avatar_generation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS show_avatar_in_scroll boolean NOT NULL DEFAULT true;
