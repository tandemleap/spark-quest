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
