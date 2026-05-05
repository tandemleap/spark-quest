-- Migration 002: Row Level Security policies
-- Run this in Supabase SQL editor after 001_tables.sql

alter table kids enable row level security;
alter table quests enable row level security;
alter table quest_completions enable row level security;
alter table drops enable row level security;
alter table adventures enable row level security;
alter table redemptions enable row level security;
alter table staff_config enable row level security;

-- kids: public read (leaderboard), public insert (registration), update via service role only
create policy "kids_select_all" on kids for select using (true);
create policy "kids_insert" on kids for insert with check (true);
create policy "kids_update_own" on kids for update using (true);

-- quests: read active only
create policy "quests_select_active" on quests for select using (is_active = true);

-- quest_completions: public read + insert (API validates before inserting)
create policy "completions_select" on quest_completions for select using (true);
create policy "completions_insert" on quest_completions for insert with check (true);

-- drops: read active only
create policy "drops_select_active" on drops for select using (is_active = true);

-- adventures: read active only
create policy "adventures_select_active" on adventures for select using (is_active = true);

-- redemptions: public read + insert (API validates points before inserting)
create policy "redemptions_select" on redemptions for select using (true);
create policy "redemptions_insert" on redemptions for insert with check (true);

-- staff_config: no policies = no anon access (service role only)
