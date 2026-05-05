-- Migration 004: Storage bucket policies
-- NOTE: First create the bucket manually in Supabase Dashboard > Storage > New Bucket
--   Name: avatars
--   Public: true
--   File size limit: 5MB
--   Allowed MIME types: image/jpeg, image/png, image/webp
-- Then run this SQL:

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_service_insert" on storage.objects
  for insert with check (bucket_id = 'avatars');
