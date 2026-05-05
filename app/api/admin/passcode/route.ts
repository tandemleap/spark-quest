import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-admin-token') ?? ''
  if (!await verifyAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { current_passcode, new_passcode } = await request.json()

  if (!current_passcode || !new_passcode) {
    return NextResponse.json({ error: 'current_passcode and new_passcode required' }, { status: 400 })
  }

  if (new_passcode.length < 4) {
    return NextResponse.json({ error: 'New passcode must be at least 4 characters' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('staff_config')
    .select('passcode_hash')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Staff config not found' }, { status: 500 })
  }

  const valid = await bcrypt.compare(current_passcode, data.passcode_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current passcode is incorrect' }, { status: 401 })
  }

  const newHash = await bcrypt.hash(new_passcode, 12)
  const { error: updateError } = await supabase
    .from('staff_config')
    .update({ passcode_hash: newHash, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
