import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-admin-token') ?? ''
  if (!await verifyAdminToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { base64, entity_type, entity_id } = body as {
    base64: string
    entity_type: 'quest' | 'drop' | 'adventure'
    entity_id: string
  }

  if (!base64 || !entity_type || !entity_id) {
    return NextResponse.json({ error: 'base64, entity_type, entity_id required' }, { status: 400 })
  }

  const table = entity_type === 'quest' ? 'quests' : entity_type === 'drop' ? 'drops' : 'adventures'
  const path  = `${entity_type}/${entity_id}.webp`

  const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64')

  const supabase = getServiceSupabase()
  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(path, buffer, { contentType: 'image/webp', upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(path)

  const { error: updateError } = await supabase
    .from(table)
    .update({ image_url: publicUrl })
    .eq('id', entity_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ image_url: publicUrl })
}
