import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { kid_id, image } = await request.json()

  if (!kid_id || !image) {
    return NextResponse.json({ error: 'kid_id and image required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Don't re-generate if already has avatar
  const { data: kid } = await supabase
    .from('kids')
    .select('avatar_url')
    .eq('id', kid_id)
    .single()

  if (kid?.avatar_url) {
    return NextResponse.json({ avatar_url: kid.avatar_url })
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

    const output = await replicate.run(
      'fofr/face-to-sticker:764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef',
      {
        input: {
          image: `data:image/jpeg;base64,${image}`,
          prompt: 'a person, sticker art style, cartoon, vibrant colors',
          negative_prompt: 'ugly, blurry, text, watermark',
          upscale: false,
          upscale_steps: 10,
          prompt_strength: 4.5,
          ip_adapter_noise: 0.5,
          ip_adapter_weight: 0.2,
          steps: 20,
        },
      }
    ) as string[]

    const imageUrl = Array.isArray(output) ? output[0] : output as string
    if (!imageUrl) throw new Error('No output from Replicate')

    // Fetch the generated image and upload to Supabase Storage
    const imgRes = await fetch(imageUrl)
    const imgBuffer = await imgRes.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(`${kid_id}.webp`, imgBuffer, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(`${kid_id}.webp`)

    await supabase
      .from('kids')
      .update({ avatar_url: publicUrl })
      .eq('id', kid_id)

    return NextResponse.json({ avatar_url: publicUrl })
  } catch (err) {
    console.error('Avatar generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
