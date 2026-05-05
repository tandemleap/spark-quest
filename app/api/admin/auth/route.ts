import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getServiceSupabase } from '@/lib/supabase'
import { signAdminToken } from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  const { passcode } = await request.json()

  if (!passcode || typeof passcode !== 'string') {
    return NextResponse.json({ error: 'Passcode required' }, { status: 400 })
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

  const valid = await bcrypt.compare(passcode, data.passcode_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
  }

  const token = await signAdminToken()
  return NextResponse.json({ token })
}
