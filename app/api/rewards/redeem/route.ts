import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { kid_id, reward_type, reward_id, points } = await request.json()

  if (!kid_id || !reward_type || !reward_id || !points) {
    return NextResponse.json({ error: 'kid_id, reward_type, reward_id, and points required' }, { status: 400 })
  }

  if (!['drop', 'adventure'].includes(reward_type)) {
    return NextResponse.json({ error: 'reward_type must be drop or adventure' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase.rpc('redeem_reward', {
    p_kid_id: kid_id,
    p_reward_type: reward_type,
    p_reward_id: reward_id,
    p_points: points,
  })

  if (error) {
    if (error.message.includes('insufficient_points')) {
      return NextResponse.json({ error: 'Not enough points' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
