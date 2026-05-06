import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  if (!await verifyAdminToken(request.headers.get('x-admin-token') ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('redemptions')
    .select(`
      id,
      reward_type,
      reward_id,
      points_spent,
      redeemed_at,
      kids ( id, name_handle )
    `)
    .order('redeemed_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with reward titles
  const drops = data?.filter(r => r.reward_type === 'drop').map(r => r.reward_id) ?? []
  const adventures = data?.filter(r => r.reward_type === 'adventure').map(r => r.reward_id) ?? []

  const [{ data: dropsData }, { data: adventuresData }] = await Promise.all([
    drops.length > 0
      ? supabase.from('drops').select('id, title').in('id', drops)
      : Promise.resolve({ data: [] }),
    adventures.length > 0
      ? supabase.from('adventures').select('id, title').in('id', adventures)
      : Promise.resolve({ data: [] }),
  ])

  const rewardTitles: Record<string, string> = {}
  dropsData?.forEach(d => { rewardTitles[d.id] = d.title })
  adventuresData?.forEach(a => { rewardTitles[a.id] = a.title })

  const enriched = data?.map(r => ({ ...r, reward_title: rewardTitles[r.reward_id] ?? 'Unknown' }))

  return NextResponse.json(enriched)
}
