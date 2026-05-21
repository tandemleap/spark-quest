import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type { Domain, DomainRequirements } from '@/lib/types'

export async function POST(request: NextRequest) {
  const { kid_id, reward_type, reward_id, points } = await request.json()

  if (!kid_id || !reward_type || !reward_id || !points) {
    return NextResponse.json({ error: 'kid_id, reward_type, reward_id, and points required' }, { status: 400 })
  }

  if (!['drop', 'adventure'].includes(reward_type)) {
    return NextResponse.json({ error: 'reward_type must be drop or adventure' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const table = reward_type === 'adventure' ? 'adventures' : 'drops'

  // Fetch reward to get domain requirements
  const { data: reward } = await supabase
    .from(table)
    .select('domain_requirements')
    .eq('id', reward_id)
    .single()

  const requirements = (reward?.domain_requirements ?? {}) as DomainRequirements
  const reqEntries = (Object.entries(requirements) as [Domain, number][]).filter(([, n]) => n > 0)

  // Check domain eligibility
  if (reqEntries.length > 0) {
    const { data: kid } = await supabase
      .from('kids')
      .select('body_points, brain_points, heart_points, hands_points, team_points')
      .eq('id', kid_id)
      .single()

    const kidPoints: Record<string, number> = {
      body:  kid?.body_points  ?? 0,
      brain: kid?.brain_points ?? 0,
      heart: kid?.heart_points ?? 0,
      hands: kid?.hands_points ?? 0,
      team:  kid?.team_points  ?? 0,
    }

    const unmet = reqEntries
      .filter(([domain, needed]) => (kidPoints[domain] ?? 0) < needed)
      .map(([domain, needed]) => ({ domain, needed, current: kidPoints[domain] ?? 0 }))

    if (unmet.length > 0) {
      // Fetch 2-3 suggested quests per unmet domain
      const unmetDomains = unmet.map(u => u.domain)
      const { data: suggested } = await supabase
        .from('quests')
        .select('id, title, point_value, domain_tags')
        .eq('is_active', true)
        .overlaps('domain_tags', unmetDomains)
        .limit(3)

      return NextResponse.json({
        error: `You need more ${unmet.map(u => u.domain).join(', ')} points to unlock this reward.`,
        unmet,
        suggestedQuests: suggested ?? [],
      }, { status: 403 })
    }
  }

  const { error } = await supabase.rpc('redeem_reward', {
    p_kid_id: kid_id,
    p_reward_type: reward_type,
    p_reward_id: reward_id,
    p_points: points,
  })

  if (error) {
    if (error.message.includes('insufficient_points')) {
      return NextResponse.json({ error: 'Not enough points' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Clear any goal slot that matches the just-redeemed reward
  const { data: kidGoals } = await supabase
    .from('kids')
    .select('short_term_goal_id, short_term_goal_type, long_term_goal_id, long_term_goal_type')
    .eq('id', kid_id)
    .single()

  if (kidGoals) {
    const goalClear: Record<string, null> = {}
    if (kidGoals.short_term_goal_id === reward_id && kidGoals.short_term_goal_type === reward_type) {
      goalClear.short_term_goal_id = null
      goalClear.short_term_goal_type = null
    }
    if (kidGoals.long_term_goal_id === reward_id && kidGoals.long_term_goal_type === reward_type) {
      goalClear.long_term_goal_id = null
      goalClear.long_term_goal_type = null
    }
    if (Object.keys(goalClear).length > 0) {
      await supabase.from('kids').update(goalClear).eq('id', kid_id)
    }
  }

  return NextResponse.json({ success: true })
}
