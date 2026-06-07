-- Add is_featured flag to quests (weekly featured quests, max 4 at a time)
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
