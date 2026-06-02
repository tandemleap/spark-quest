import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const kid_id = searchParams.get('kid_id')
  const quest_id = searchParams.get('quest_id')

  if (!kid_id || !quest_id) {
    return NextResponse.json({ error: 'kid_id and quest_id required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: quest } = await supabase
    .from('quests')
    .select('score_direction, score_unit')
    .eq('id', quest_id)
    .single()

  if (!quest) return NextResponse.json({ best_score: null, attempts: 0 })

  const { data: completions } = await supabase
    .from('quest_completions')
    .select('score_value')
    .eq('kid_id', kid_id)
    .eq('quest_id', quest_id)
    .not('score_value', 'is', null)

  const scores = (completions ?? []).map(c => c.score_value as number)
  const attempts = (completions ?? []).length

  let best_score: number | null = null
  if (scores.length > 0) {
    best_score = quest.score_direction === 'lower'
      ? Math.min(...scores)
      : Math.max(...scores)
  }

  return NextResponse.json({ best_score, attempts })
}
