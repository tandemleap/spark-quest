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
