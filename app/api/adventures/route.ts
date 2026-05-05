import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const { data: adventures, error } = await supabase
    .from('adventures')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich each adventure with points_contributed and contributors_count
  const enriched = await Promise.all(
    adventures.map(async (adv) => {
      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('points_spent, kid_id')
        .eq('reward_id', adv.id)
        .eq('reward_type', 'adventure')

      const points_contributed = redemptions?.reduce((sum, r) => sum + r.points_spent, 0) ?? 0
      const contributors_count = new Set(redemptions?.map(r => r.kid_id) ?? []).size

      return { ...adv, points_contributed, contributors_count }
    })
  )

  return NextResponse.json(enriched)
}
