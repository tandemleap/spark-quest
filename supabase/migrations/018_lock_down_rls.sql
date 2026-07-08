-- Migration 018: Lock down write access to service role only
--
-- 002_rls.sql created insert/update policies with `using (true)` / `with check (true)`
-- and no `to` clause, which applies them to PUBLIC (i.e. the anon key, not just the
-- app's service role). That let anyone holding the public NEXT_PUBLIC_SUPABASE_ANON_KEY
-- write directly to these tables via the Supabase REST API, bypassing the Next.js app's
-- auth checks and point-mutation RPCs entirely (e.g. PATCH kids.available_points to any
-- value). Public SELECT policies are left untouched — they're relied on by the public
-- /scroll and /leaderboard pages.

drop policy if exists "kids_insert" on kids;
create policy "kids_insert" on kids for insert to service_role with check (true);

drop policy if exists "kids_update_own" on kids;
create policy "kids_update" on kids for update to service_role using (true);

drop policy if exists "completions_insert" on quest_completions;
create policy "completions_insert" on quest_completions for insert to service_role with check (true);

drop policy if exists "redemptions_insert" on redemptions;
create policy "redemptions_insert" on redemptions for insert to service_role with check (true);

-- Storage: avatars_service_insert was also missing a `to` clause, open to anon writes.
drop policy if exists "avatars_service_insert" on storage.objects;
create policy "avatars_service_insert" on storage.objects
  for insert to service_role with check (bucket_id = 'avatars');
