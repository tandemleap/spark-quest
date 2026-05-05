export type QuestCategory = 'creativity' | 'movement' | 'learning' | 'community'

export const CATEGORY_COLORS: Record<QuestCategory, string> = {
  creativity: 'var(--color-creativity)',
  movement: 'var(--color-movement)',
  learning: 'var(--color-learning)',
  community: 'var(--color-community)',
}

export const CATEGORY_TEXT_COLORS: Record<QuestCategory, string> = {
  creativity: 'var(--color-creativity-text)',
  movement: 'var(--color-movement-text)',
  learning: 'var(--color-learning-text)',
  community: 'var(--color-community-text)',
}

export const CATEGORY_LABELS: Record<QuestCategory, string> = {
  creativity: 'Creativity',
  movement: 'Movement',
  learning: 'Learning',
  community: 'Community',
}

export interface Kid {
  id: string
  name_handle: string
  total_points_earned: number
  available_points: number
  avatar_url: string | null
  created_at: string
}

export interface Quest {
  id: string
  title: string
  description: string | null
  category: QuestCategory
  point_value: number
  repeatable: boolean
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface QuestCompletion {
  id: string
  kid_id: string
  quest_id: string
  completed_at: string
  verified_by_initials: string | null
  points_awarded: number
}

export interface Drop {
  id: string
  title: string
  description: string | null
  point_cost: number
  quantity_available: number | null
  is_active: boolean
  created_at: string
}

export interface Adventure {
  id: string
  title: string
  description: string | null
  point_cost_per_kid: number
  kids_threshold: number
  stays_open_after_unlock: boolean
  is_active: boolean
  is_unlocked: boolean
  unlocked_at: string | null
  created_at: string
  points_contributed?: number
  contributors_count?: number
}

export interface Redemption {
  id: string
  kid_id: string
  reward_type: 'drop' | 'adventure'
  reward_id: string
  points_spent: number
  redeemed_at: string
}
