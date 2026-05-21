import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const { kid_id, image } = await request.json()

  if (!kid_id || !image) {
    return NextResponse.json({ error: 'kid_id and image required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const buffer = Buffer.from(image, 'base64')
  const filename = `${kid_id}_photo.webp`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filename, buffer, { contentType: 'image/webp', upsert: true })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filename)

  await supabase.from('kids').update({ avatar_url: publicUrl }).eq('id', kid_id)

  return NextResponse.json({ avatar_url: publicUrl })
}
