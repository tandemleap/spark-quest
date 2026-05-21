import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'
import { getServiceSupabase } from '@/lib/supabase'

export const maxDuration = 60

const MAX_GENERATIONS = 10

const MODEL = 'fofr/face-to-sticker:764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef'

const GENDER_PROMPTS: Record<string, string> = {
  neutral: 'a person',
  boy:     'a teenage boy',
  girl:    'a teenage girl',
}

const VIBE_PROMPTS: Record<string, string> = {
  bold:   'bold colors, vibrant, energetic',
  cool:   'cool, dark tones, edgy',
  cute:   'cute, soft colors, friendly',
  fierce: 'fierce, dramatic, intense',
}

export async function POST(request: NextRequest) {
  const { kid_id, image, gender = 'neutral', vibe = 'bold' } = await request.json()

  if (!kid_id || !image) {
    return NextResponse.json({ error: 'kid_id and image required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: kid } = await supabase
    .from('kids')
    .select('avatar_url, avatar_generation_count')
    .eq('id', kid_id)
    .single()

  const currentCount = kid?.avatar_generation_count ?? 0
  const previousAvatarUrl = kid?.avatar_url ?? null

  if (currentCount >= MAX_GENERATIONS) {
    return NextResponse.json(
      { error: 'limit_reached', generation_count: currentCount },
      { status: 403 }
    )
  }

  const genderStr = GENDER_PROMPTS[gender] ?? GENDER_PROMPTS.neutral
  const vibeStr = VIBE_PROMPTS[vibe] ?? VIBE_PROMPTS.bold
  const prompt = `${genderStr}, ${vibeStr}, sticker art style, cartoon character, bold outlines`

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! })

    const output = await replicate.run(MODEL, {
      input: {
        image: `data:image/jpeg;base64,${image}`,
        prompt,
        negative_prompt: 'ugly, blurry, text, watermark, extra limbs, deformed, realistic photo',
        prompt_strength: 8,
        instant_id_strength: 1,
        ip_adapter_noise: 0.5,
        ip_adapter_weight: 0.3,
        steps: 20,
        upscale: false,
      },
    }) as string[]

    const imageUrl = Array.isArray(output) ? output[0] : output as string
    if (!imageUrl) throw new Error('No output from Replicate')

    const imgRes = await fetch(imageUrl)
    const imgBuffer = await imgRes.arrayBuffer()

    const newCount = currentCount + 1
    const filename = `${kid_id}_v${newCount}.webp`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filename, imgBuffer, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filename)

    await supabase.from('kids').update({
      avatar_url: publicUrl,
      avatar_generation_count: newCount,
    }).eq('id', kid_id)

    return NextResponse.json({
      avatar_url: publicUrl,
      generation_count: newCount,
      previous_avatar_url: previousAvatarUrl,
    })
  } catch (err) {
    console.error('Avatar generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
