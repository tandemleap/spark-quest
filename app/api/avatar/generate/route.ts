import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

const STYLE_PROMPTS: Record<string, string> = {
  cartoon:    'cartoon sticker art, vibrant colors, bold outlines, clean illustration',
  anime:      'anime character, manga art style, cel shaded, Japanese animation',
  fortnite:   'fortnite game character, 3D stylized, colorful gaming art, epic games style',
  pencil:     'pencil sketch, hand drawn illustration, detailed graphite line art',
  pixel:      'pixel art character, 8-bit retro game sprite, clean pixel illustration',
  watercolor: 'watercolor portrait painting, soft brush strokes, artistic illustration',
}

const GENDER_PROMPTS: Record<string, string> = {
  neutral: 'a person',
  boy:     'a boy, male character',
  girl:    'a girl, female character',
}

export async function POST(request: NextRequest) {
  const { kid_id, image, style = 'cartoon', gender = 'neutral', force = false } = await request.json()

  if (!kid_id || !image) {
    return NextResponse.json({ error: 'kid_id and image required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Only short-circuit if not forced and avatar already exists
  if (!force) {
    const { data: kid } = await supabase
      .from('kids')
      .select('avatar_url')
      .eq('id', kid_id)
      .single()
    if (kid?.avatar_url) {
      return NextResponse.json({ avatar_url: kid.avatar_url })
    }
  }

  const genderStr = GENDER_PROMPTS[gender] ?? GENDER_PROMPTS.neutral
  const styleStr = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.cartoon
  const prompt = `${genderStr}, ${styleStr}`

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

    const output = await replicate.run(
      'fofr/face-to-sticker:764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef',
      {
        input: {
          image: `data:image/jpeg;base64,${image}`,
          prompt,
          negative_prompt: 'ugly, blurry, text, watermark, extra limbs, deformed',
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
