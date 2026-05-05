-- Migration 001: Core tables
-- Run this in Supabase SQL editor

create extension if not exists "pgcrypto";

create table kids (
  id uuid primary key default gen_random_uuid(),
  name_handle text unique not null,
  total_points_earned integer not null default 0,
  available_points integer not null default 0,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  point_value integer not null default 10,
  repeatable boolean not null default false,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table quest_completions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  quest_id uuid not null references quests(id) on delete cascade,
  completed_at timestamptz not null default now(),
  verified_by_initials text,
  points_awarded integer not null
);

create table drops (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  point_cost integer not null,
  quantity_available integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table adventures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  point_cost_per_kid integer not null,
  kids_threshold integer not null,
  stays_open_after_unlock boolean not null default false,
  is_active boolean not null default true,
  is_unlocked boolean not null default false,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  reward_type text not null,
  reward_id uuid not null,
  points_spent integer not null,
  redeemed_at timestamptz not null default now()
);

create table staff_config (
  id integer primary key default 1,
  passcode_hash text not null,
  updated_at timestamptz not null default now()
);
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
-- Migration 003: Indexes for performance
-- Run this in Supabase SQL editor after 002_rls.sql

create index idx_quest_completions_kid_id on quest_completions(kid_id);
create index idx_quest_completions_quest_id on quest_completions(quest_id);
create index idx_quest_completions_kid_quest on quest_completions(kid_id, quest_id);
create index idx_redemptions_kid_id on redemptions(kid_id);
create index idx_kids_total_points on kids(total_points_earned desc);
-- Migration 005: award_quest_points RPC (atomic point award)
-- Run this in Supabase SQL editor

create or replace function award_quest_points(
  p_kid_id uuid,
  p_quest_id uuid,
  p_points integer,
  p_initials text
) returns void language plpgsql as $$
begin
  insert into quest_completions (kid_id, quest_id, points_awarded, verified_by_initials)
  values (p_kid_id, p_quest_id, p_points, p_initials);

  update kids
  set total_points_earned = total_points_earned + p_points,
      available_points = available_points + p_points
  where id = p_kid_id;
end;
$$;
-- Migration 006: redeem_reward RPC (atomic reward redemption)
-- Run this in Supabase SQL editor

create or replace function redeem_reward(
  p_kid_id uuid,
  p_reward_type text,
  p_reward_id uuid,
  p_points integer
) returns void language plpgsql as $$
begin
  -- Deduct points atomically (fails if insufficient)
  update kids
  set available_points = available_points - p_points
  where id = p_kid_id and available_points >= p_points;

  if not found then
    raise exception 'insufficient_points';
  end if;

  -- Decrement quantity if this is a drop with limited stock
  if p_reward_type = 'drop' then
    update drops
    set quantity_available = quantity_available - 1
    where id = p_reward_id and (quantity_available is null or quantity_available > 0);
  end if;

  -- Record the redemption
  insert into redemptions (kid_id, reward_type, reward_id, points_spent)
  values (p_kid_id, p_reward_type, p_reward_id, p_points);

  -- Check if adventure unlock threshold is now met
  if p_reward_type = 'adventure' then
    update adventures
    set is_unlocked = true, unlocked_at = now()
    where id = p_reward_id
      and not is_unlocked
      and (
        select count(*) from redemptions
        where reward_id = p_reward_id and reward_type = 'adventure'
      ) >= kids_threshold;
  end if;
end;
$$;
