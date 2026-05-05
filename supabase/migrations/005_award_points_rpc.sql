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
