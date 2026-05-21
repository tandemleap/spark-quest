import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('kids')
    .select('id, name_handle, total_points_earned, available_points, avatar_url, body_points, brain_points, heart_points, hands_points, team_points, long_term_goal_id, long_term_goal_type')
    .order('name_handle', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
