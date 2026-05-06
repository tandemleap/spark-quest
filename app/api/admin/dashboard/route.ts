import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  if (!await verifyAdminToken(request.headers.get('x-admin-token') ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  const [
    { count: totalKids },
    { count: totalCompletions },
    { count: totalRedemptions },
    { data: kids },
    { data: recentCompletions },
  ] = await Promise.all([
    supabase.from('kids').select('*', { count: 'exact', head: true }),
    supabase.from('quest_completions').select('*', { count: 'exact', head: true }),
    supabase.from('redemptions').select('*', { count: 'exact', head: true }),
    supabase.from('kids').select('total_points_earned, available_points'),
    supabase.from('quest_completions')
      .select('points_awarded, completed_at')
      .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const totalPointsAwarded = kids?.reduce((s, k) => s + k.total_points_earned, 0) ?? 0
  const totalPointsAvailable = kids?.reduce((s, k) => s + k.available_points, 0) ?? 0
  const pointsThisWeek = recentCompletions?.reduce((s, c) => s + c.points_awarded, 0) ?? 0

  return NextResponse.json({
    totalKids,
    totalCompletions,
    totalRedemptions,
    totalPointsAwarded,
    totalPointsAvailable,
    pointsThisWeek,
    completionsThisWeek: recentCompletions?.length ?? 0,
  })
}
