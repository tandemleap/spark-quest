import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getServiceSupabase()

  // today = start of current day in Central Time
  const todayStart = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })
  )
  todayStart.setHours(0, 0, 0, 0)

  const [{ data, error }, { data: todayCompletions }] = await Promise.all([
    supabase.from('kids').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('quest_completions')
      .select('points_awarded')
      .eq('kid_id', id)
      .gte('completed_at', todayStart.toISOString()),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const daily_points_today = (todayCompletions ?? []).reduce(
    (sum, c) => sum + (c.points_awarded ?? 0), 0
  )

  return NextResponse.json({ ...data, daily_points_today })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const supabase = getServiceSupabase()

  const allowed = [
    'avatar_url', 'available_points',
    'short_term_goal_id', 'short_term_goal_type',
    'long_term_goal_id', 'long_term_goal_type',
    'show_avatar_in_scroll',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('kids')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
