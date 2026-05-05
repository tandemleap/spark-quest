import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('kids')
    .select('id, name_handle, total_points_earned, available_points, avatar_url')
    .order('total_points_earned', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
