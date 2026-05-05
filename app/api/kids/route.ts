import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { name_handle } = await request.json()

  if (!name_handle || typeof name_handle !== 'string' || name_handle.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 })
  }

  const handle = name_handle.trim()
  const supabase = getServiceSupabase()

  const { data: existing } = await supabase
    .from('kids')
    .select('id, name_handle, avatar_url')
    .eq('name_handle', handle)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(existing, { status: 409 })
  }

  const { data, error } = await supabase
    .from('kids')
    .insert({ name_handle: handle })
    .select('id, name_handle')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
