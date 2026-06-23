import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  if (!await verifyAdminToken(request.headers.get('x-admin-token') ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('quest_completions')
    .select(`
      id,
      completed_at,
      verified_by_initials,
      points_awarded,
      powerup_claimed,
      kids ( id, name_handle, avatar_url ),
      quests ( id, title, domain_tags, point_value )
    `)
    .order('completed_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
