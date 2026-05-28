-- Add image_url to quests, drops, and adventures for scroll display cards

ALTER TABLE quests     ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE drops      ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE adventures ADD COLUMN IF NOT EXISTS image_url text;

-- Storage bucket for card images (run in Supabase Dashboard > Storage if not already created)
-- Bucket name: card-images, Public: true
