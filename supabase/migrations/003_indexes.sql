-- Migration 003: Indexes for performance
-- Run this in Supabase SQL editor after 002_rls.sql

create index idx_quest_completions_kid_id on quest_completions(kid_id);
create index idx_quest_completions_quest_id on quest_completions(quest_id);
create index idx_quest_completions_kid_quest on quest_completions(kid_id, quest_id);
create index idx_redemptions_kid_id on redemptions(kid_id);
create index idx_kids_total_points on kids(total_points_earned desc);
