import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { passcode, kid_id, quest_id } = await request.json()

  if (!passcode) {
    return NextResponse.json({ error: 'passcode required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: config } = await supabase
    .from('staff_config')
    .select('passcode_hash')
    .eq('id', 1)
    .single()

  if (!config) {
    return NextResponse.json({ error: 'Staff config not found' }, { status: 500 })
  }

  const valid = await bcrypt.compare(passcode, config.passcode_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  }

  // If kid + quest provided, check for already-completed non-repeatable
  if (kid_id && quest_id) {
    const { data: quest } = await supabase
      .from('quests')
      .select('repeatable')
      .eq('id', quest_id)
      .single()

    if (quest && !quest.repeatable) {
      const { data: existing } = await supabase
        .from('quest_completions')
        .select('id')
        .eq('kid_id', kid_id)
        .eq('quest_id', quest_id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ error: 'Quest already completed' }, { status: 409 })
      }
    }
  }

  return NextResponse.json({ valid: true })
}
