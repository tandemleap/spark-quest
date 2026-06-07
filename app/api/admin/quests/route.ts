import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { verifyAdminToken } from '@/lib/adminAuth'

async function auth(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('x-admin-token') ?? ''
  return verifyAdminToken(token)
}

export async function GET(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    title, description, domain_tags, point_value, repeatable,
    expires_at, created_by, is_grit_quest, grit_powerup_description, grit_powerup_points,
    quest_type, score_unit, score_direction, record_set_points,
  } = body

  if (!title || !point_value) {
    return NextResponse.json({ error: 'title and point_value required' }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('quests')
    .insert({
      title,
      description: description || null,
      domain_tags: domain_tags ?? [],
      point_value,
      repeatable: !!repeatable,
      expires_at: expires_at || null,
      created_by: created_by || null,
      is_grit_quest: !!is_grit_quest,
      grit_powerup_description: is_grit_quest ? (grit_powerup_description || null) : null,
      grit_powerup_points: is_grit_quest ? (grit_powerup_points || null) : null,
      quest_type: quest_type ?? 'standard',
      score_unit: score_unit || null,
      score_direction: score_direction ?? 'higher',
      record_set_points: record_set_points ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  if (!await auth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // Clear powerup fields if turning off grit
  if (updates.is_grit_quest === false) {
    updates.grit_powerup_description = null
    updates.grit_powerup_points = null
  }

  const supabase = getServiceSupabase()

  // Enforce max 4 featured quests at a time
  if (updates.is_featured === true) {
    const { count } = await supabase
      .from('quests')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)
      .neq('id', id)
    if ((count ?? 0) >= 4) {
      return NextResponse.json(
        { error: 'featured_quest_limit', message: 'You already have 4 featured quests this week. Remove one before adding another.' },
        { status: 400 }
      )
    }
  }
  const { data, error } = await supabase
    .from('quests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
