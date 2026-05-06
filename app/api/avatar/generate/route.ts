import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

// fofr/face-to-many — supports explicit style enum that actually changes the output
const MODEL = 'fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf'

const STYLE_MAP: Record<string, string> = {
  '3d':       '3D',
  'emoji':    'Emoji',
  'videogame': 'Video game',
  'pixels':   'Pixels',
  'clay':     'Clay',
  'toy':      'Toy',
}

const GENDER_PROMPTS: Record<string, string> = {
  neutral: 'a person',
  boy:     'a boy',
  girl:    'a girl',
}

export async function POST(request: NextRequest) {
  const { kid_id, image, style = '3d', gender = 'neutral', force = false } = await request.json()

  if (!kid_id || !image) {
    return NextResponse.json({ error: 'kid_id and image required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

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

  const modelStyle = STYLE_MAP[style] ?? '3D'
  const genderStr = GENDER_PROMPTS[gender] ?? 'a person'

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

    const output = await replicate.run(MODEL, {
      input: {
        image: `data:image/jpeg;base64,${image}`,
        style: modelStyle,
        prompt: genderStr,
        negative_prompt: 'ugly, blurry, text, watermark, extra limbs, deformed',
        prompt_strength: 4.5,
        denoising_strength: 0.65,
        instant_id_strength: 0.8,
      },
    }) as string[]

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
