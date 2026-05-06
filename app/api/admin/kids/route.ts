import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

async function auth(request: NextRequest) {
  return verifyAdminToken(request.headers.get('x-admin-token') ?? '')
}

export async function GET(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('kids')
    .select('*')
    .order('total_points_earned', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, available_points, total_points_earned } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = getServiceSupabase()
  const updates: Record<string, number> = {}
  if (available_points !== undefined) updates.available_points = available_points
  if (total_points_earned !== undefined) updates.total_points_earned = total_points_earned

  const { data, error } = await supabase
    .from('kids')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
