import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('quest_completions')
    .select('id, points_awarded, powerup_claimed, completed_at, quests(title, domain_tags, point_value)')
    .eq('kid_id', id)
    .order('completed_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
