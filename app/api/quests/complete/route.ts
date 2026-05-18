import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { kid_id, quest_id, passcode, staff_initials, check_pin_only, powerup_claimed } = await request.json()

  if (!kid_id || !quest_id || !passcode) {
    return NextResponse.json({ error: 'kid_id, quest_id, and passcode required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: config, error: configError } = await supabase
    .from('staff_config')
    .select('passcode_hash')
    .eq('id', 1)
    .single()

  if (configError || !config) {
    return NextResponse.json({ error: 'Staff config not found' }, { status: 500 })
  }

  const validPin = await bcrypt.compare(passcode, config.passcode_hash)
  if (!validPin) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  }

  if (check_pin_only) {
    return NextResponse.json({ pin_valid: true })
  }

  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('*')
    .eq('id', quest_id)
    .eq('is_active', true)
    .single()

  if (questError || !quest) {
    return NextResponse.json({ error: 'Quest not found' }, { status: 404 })
  }

  if (!quest.repeatable) {
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

  const { data: totalAwarded, error: rpcError } = await supabase.rpc('award_quest_points', {
    p_kid_id: kid_id,
    p_quest_id: quest_id,
    p_points: quest.point_value,
    p_initials: staff_initials || '',
    p_powerup_claimed: !!powerup_claimed,
  })

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  return NextResponse.json({ points_awarded: totalAwarded ?? quest.point_value })
}
