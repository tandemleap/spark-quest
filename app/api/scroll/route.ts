import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const [kidsResult, completionsResult, featuredResult] = await Promise.all([
    supabase
      .from('kids')
      .select('id, name_handle, total_points_earned, available_points, avatar_url, body_points, brain_points, heart_points, hands_points, team_points, long_term_goal_id, long_term_goal_type')
      .order('name_handle', { ascending: true }),

    supabase
      .from('quest_completions')
      .select('id, points_awarded, completed_at, kids(name_handle), quests(title)')
      .order('completed_at', { ascending: false })
      .limit(20),

    supabase
      .from('adventures')
      .select('id, title, point_cost_per_kid, kids_threshold')
      .eq('is_active', true)
      .eq('is_featured', true)
      .maybeSingle(),
  ])

  const kids = kidsResult.data ?? []

  // Bulk-fetch goal reward details
  const dropIds = kids.filter(k => k.long_term_goal_type === 'drop' && k.long_term_goal_id).map(k => k.long_term_goal_id as string)
  const adventureIds = kids.filter(k => k.long_term_goal_type === 'adventure' && k.long_term_goal_id).map(k => k.long_term_goal_id as string)

  const [{ data: goalDrops }, { data: goalAdventures }] = await Promise.all([
    dropIds.length > 0
      ? supabase.from('drops').select('id, title, point_cost').in('id', dropIds)
      : Promise.resolve({ data: [] }),
    adventureIds.length > 0
      ? supabase.from('adventures').select('id, title, point_cost_per_kid').in('id', adventureIds)
      : Promise.resolve({ data: [] }),
  ])

  const dropMap = Object.fromEntries((goalDrops ?? []).map(d => [d.id, { title: d.title, cost: d.point_cost }]))
  const advMap  = Object.fromEntries((goalAdventures ?? []).map(a => [a.id, { title: a.title, cost: a.point_cost_per_kid }]))

  const enrichedKids = kids.map(k => ({
    ...k,
    long_term_goal: k.long_term_goal_id
      ? (k.long_term_goal_type === 'drop' ? dropMap[k.long_term_goal_id] : advMap[k.long_term_goal_id]) ?? null
      : null,
  }))

  // Featured adventure progress for header
  let adventureProgress = null
  if (featuredResult.data) {
    const adv = featuredResult.data
    const { data: redemptions } = await supabase
      .from('redemptions')
      .select('points_spent')
      .eq('reward_id', adv.id)
      .eq('reward_type', 'adventure')
    const contributed = redemptions?.reduce((s, r) => s + r.points_spent, 0) ?? 0
    adventureProgress = {
      title: adv.title,
      contributed,
      target: adv.point_cost_per_kid * adv.kids_threshold,
    }
  }

  // Active rewards for highlight cards
  const [{ data: drops }, { data: adventures }] = await Promise.all([
    supabase.from('drops').select('id, title, description, point_cost').eq('is_active', true).order('point_cost'),
    supabase.from('adventures').select('id, title, description, point_cost_per_kid, kids_threshold').eq('is_active', true).order('point_cost_per_kid'),
  ])

  const rewards = [
    ...(drops ?? []).map(d => ({ id: d.id, type: 'drop' as const, title: d.title, description: d.description, cost: d.point_cost })),
    ...(adventures ?? []).map(a => ({ id: a.id, type: 'adventure' as const, title: a.title, description: a.description, cost: a.point_cost_per_kid })),
  ]

  return NextResponse.json({
    kids: enrichedKids,
    recentCompletions: completionsResult.data ?? [],
    adventureProgress,
    rewards,
  })
}
