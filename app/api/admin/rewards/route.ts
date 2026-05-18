import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

async function auth(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('x-admin-token') ?? ''
  return verifyAdminToken(token)
}

export async function GET(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'drop'
  const table = type === 'adventure' ? 'adventures' : 'drops'

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (type === 'adventure') {
    const enriched = await Promise.all(
      (data ?? []).map(async (adv) => {
        const { data: redemptions } = await supabase
          .from('redemptions')
          .select('points_spent, kid_id, kids(name_handle)')
          .eq('reward_id', adv.id)
          .eq('reward_type', 'adventure')
        const points_contributed = redemptions?.reduce((s, r) => s + r.points_spent, 0) ?? 0
        const contributors = redemptions?.map(r => ({
          kid_id: r.kid_id,
          name_handle: (r.kids as unknown as { name_handle: string } | null)?.name_handle ?? 'Unknown',
          points_spent: r.points_spent,
        })) ?? []
        return { ...adv, points_contributed, contributors }
      })
    )
    return NextResponse.json(enriched)
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'drop'
  const table = type === 'adventure' ? 'adventures' : 'drops'

  const body = await request.json()
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from(table)
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'drop'
  const table = type === 'adventure' ? 'adventures' : 'drops'

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getServiceSupabase()

  // When featuring a reward, clear the featured flag on all other rewards of both types
  if (updates.is_featured === true) {
    await supabase.from('drops').update({ is_featured: false }).neq('id', id)
    await supabase.from('adventures').update({ is_featured: false }).neq('id', id)
  }

  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
