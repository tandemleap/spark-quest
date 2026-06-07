import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  // Start of today in Central Time (program timezone)
  const todayCtStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date())

  const [kidsResult, completionsResult, featuredResult, todayResult] = await Promise.all([
    supabase
      .from('kids')
      .select('id, name_handle, total_points_earned, available_points, avatar_url, show_avatar_in_scroll, body_points, brain_points, heart_points, hands_points, team_points, long_term_goal_id, long_term_goal_type, short_term_goal_id, short_term_goal_type')
      .not('avatar_url', 'is', null)
      .neq('avatar_url', '')
      .or('short_term_goal_id.not.is.null,long_term_goal_id.not.is.null')
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

    // Fetch today's completions (last 30h covers full CT day regardless of DST)
    supabase
      .from('quest_completions')
      .select('kid_id, points_awarded, completed_at')
      .gte('completed_at', new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()),
  ])

  // Filter to only kids who have at least one quest completion
  const allKids = kidsResult.data ?? []
  const { data: completedKidIds } = await supabase
    .from('quest_completions')
    .select('kid_id')

  const completedSet = new Set((completedKidIds ?? []).map(r => r.kid_id))
  const kids = allKids.filter(k => completedSet.has(k.id))

  // Build per-kid today's points map (filter to exact CT date)
  const todayPtsMap: Record<string, number> = {}
  for (const c of todayResult.data ?? []) {
    const cCtDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(c.completed_at))
    if (cCtDate === todayCtStr) {
      todayPtsMap[c.kid_id] = (todayPtsMap[c.kid_id] ?? 0) + c.points_awarded
    }
  }

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
    // Mask avatar if kid opted out of scroll visibility
    avatar_url: k.show_avatar_in_scroll ? k.avatar_url : null,
    long_term_goal: k.long_term_goal_id
      ? (k.long_term_goal_type === 'drop' ? dropMap[k.long_term_goal_id] : advMap[k.long_term_goal_id]) ?? null
      : null,
    daily_points_today: todayPtsMap[k.id] ?? 0,
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

  // Active rewards for highlight cards + active quests for challenge cards
  const [{ data: drops }, { data: adventures }, { data: questsData }] = await Promise.all([
    supabase.from('drops').select('id, title, description, point_cost, image_url, quantity_available').eq('is_active', true).order('point_cost'),
    supabase.from('adventures').select('id, title, description, point_cost_per_kid, kids_threshold, image_url').eq('is_active', true).order('point_cost_per_kid'),
    supabase.from('quests').select('id, title, domain_tags, point_value, is_grit_quest, image_url, is_featured').eq('is_active', true).eq('is_featured', true).order('point_value', { ascending: false }).limit(4),
  ])

  // Enrich each adventure with kids_working_toward and collective_progress_percent
  const enrichedAdventures = (adventures ?? []).map(a => {
    const workingKids = kids.filter(k =>
      (k.short_term_goal_id === a.id && k.short_term_goal_type === 'adventure') ||
      (k.long_term_goal_id === a.id && k.long_term_goal_type === 'adventure')
    )
    const kidsWorkingToward = workingKids.length
    const totalPool = a.point_cost_per_kid * a.kids_threshold
    const contributed = workingKids.reduce((sum, k) => sum + Math.min(k.available_points, a.point_cost_per_kid), 0)
    const collectiveProgressPercent = totalPool > 0
      ? Math.min(100, Math.round((contributed / totalPool) * 100))
      : 0

    return {
      id: a.id,
      type: 'adventure' as const,
      title: a.title,
      description: a.description,
      cost: a.point_cost_per_kid,
      kids_threshold: a.kids_threshold,
      image_url: a.image_url ?? null,
      kids_working_toward: kidsWorkingToward,
      collective_progress_percent: collectiveProgressPercent,
    }
  })

  const rewards = [
    ...(drops ?? []).map(d => ({ id: d.id, type: 'drop' as const, title: d.title, description: d.description, cost: d.point_cost, image_url: d.image_url ?? null, quantity_available: d.quantity_available ?? null })),
    ...enrichedAdventures,
  ]

  const quests = (questsData ?? []).map(q => ({
    id: q.id,
    title: q.title,
    domain_tags: q.domain_tags ?? [],
    point_value: q.point_value,
    is_grit_quest: q.is_grit_quest ?? false,
    image_url: q.image_url ?? null,
    is_featured: q.is_featured ?? false,
  }))

  return NextResponse.json({
    kids: enrichedKids,
    recentCompletions: completionsResult.data ?? [],
    adventureProgress,
    rewards,
    quests,
  })
}
