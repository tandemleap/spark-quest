import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  async function enrichAdventure(adv: Record<string, unknown>) {
    const { data: redemptions } = await supabase
      .from('redemptions')
      .select('points_spent, kid_id')
      .eq('reward_id', adv.id)
      .eq('reward_type', 'adventure')
    const points_contributed = redemptions?.reduce((s, r) => s + r.points_spent, 0) ?? 0
    const contributors_count = new Set(redemptions?.map(r => r.kid_id) ?? []).size
    return { type: 'adventure' as const, ...adv, points_contributed, contributors_count }
  }

  // 1. Explicitly featured adventure
  const { data: featAdv } = await supabase
    .from('adventures')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .maybeSingle()
  if (featAdv) return NextResponse.json(await enrichAdventure(featAdv))

  // 2. Explicitly featured drop
  const { data: featDrop } = await supabase
    .from('drops')
    .select('*')
    .eq('is_active', true)
    .eq('is_featured', true)
    .maybeSingle()
  if (featDrop) return NextResponse.json({ type: 'drop' as const, ...featDrop })

  // 3. Default: highest-tier active unlocked adventure
  const { data: defaultAdv } = await supabase
    .from('adventures')
    .select('*')
    .eq('is_active', true)
    .eq('is_unlocked', false)
    .order('point_cost_per_kid', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (defaultAdv) return NextResponse.json(await enrichAdventure(defaultAdv))

  return NextResponse.json(null)
}
