export type Domain = 'body' | 'brain' | 'heart' | 'hands' | 'team'

export const ALL_DOMAINS: Domain[] = ['body', 'brain', 'heart', 'hands', 'team']

export const DOMAIN_COLORS: Record<Domain, string> = {
  body:  '#ff9933',  // orange
  brain: '#ffcc33',  // yellow
  heart: '#993399',  // purple
  hands: '#33cc00',  // green
  team:  '#3399cc',  // blue
}

// Light tinted card backgrounds keyed by domain
const DOMAIN_CARD_COLORS: Record<Domain, string> = {
  body:  '#fff4e6',
  brain: '#fffde6',
  heart: '#f8e6f8',
  hands: '#eefee6',
  team:  '#e6f4ff',
}

export const DOMAIN_TEXT_COLORS: Record<Domain, string> = {
  body:  '#111111',
  brain: '#111111',
  heart: '#111111',
  hands: '#111111',
  team:  '#111111',
}

export const DOMAIN_LABELS: Record<Domain, string> = {
  body:  'Body',
  brain: 'Brain',
  heart: 'Heart',
  hands: 'Hands',
  team:  'Team',
}

export const DOMAIN_EMOJIS: Record<Domain, string> = {
  body:  '💪',
  brain: '🧠',
  heart: '❤️',
  hands: '🙌',
  team:  '🤝',
}

export type DomainRequirements = Partial<Record<Domain, number>>

export function getDomainCardColor(tags: Domain[]): string {
  return tags.length > 0 ? DOMAIN_CARD_COLORS[tags[0]] : 'var(--color-surface)'
}

export function getDomainCardTextColor(_tags: Domain[]): string {
  return '#111111'
}

export interface Kid {
  id: string
  name_handle: string
  total_points_earned: number
  available_points: number
  avatar_url: string | null
  created_at: string
  body_points: number
  brain_points: number
  heart_points: number
  hands_points: number
  team_points: number
  short_term_goal_id: string | null
  short_term_goal_type: 'drop' | 'adventure' | null
  long_term_goal_id: string | null
  long_term_goal_type: 'drop' | 'adventure' | null
  avatar_generation_count: number
  show_avatar_in_scroll: boolean
}

export interface Quest {
  id: string
  title: string
  description: string | null
  domain_tags: Domain[]
  point_value: number
  repeatable: boolean
  expires_at: string | null
  is_active: boolean
  is_grit_quest: boolean
  grit_powerup_description: string | null
  grit_powerup_points: number | null
  created_by: string | null
  created_at: string
  image_url: string | null
  quest_type: 'standard' | 'record_chase'
  score_unit: string | null
  score_direction: 'higher' | 'lower'
  record_set_points: number
}

export interface QuestCompletion {
  id: string
  kid_id: string
  quest_id: string
  completed_at: string
  verified_by_initials: string | null
  points_awarded: number
  powerup_claimed: boolean
  score_value: number | null
}

export interface Drop {
  id: string
  title: string
  description: string | null
  point_cost: number
  quantity_available: number | null
  is_active: boolean
  is_featured: boolean
  domain_requirements: DomainRequirements
  created_at: string
  image_url: string | null
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
  is_featured: boolean
  domain_requirements: DomainRequirements
  unlocked_at: string | null
  created_at: string
  image_url: string | null
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

export type FeaturedReward =
  | ({ type: 'adventure' } & Adventure & { points_contributed: number; contributors_count: number })
  | ({ type: 'drop' } & Drop)

export function kidDomainPoints(kid: Kid): Record<Domain, number> {
  return {
    body:  kid.body_points,
    brain: kid.brain_points,
    heart: kid.heart_points,
    hands: kid.hands_points,
    team:  kid.team_points,
  }
}

export function checkDomainEligibility(
  kidPoints: Record<Domain, number>,
  requirements: DomainRequirements
): { eligible: boolean; unmet: { domain: Domain; needed: number; current: number }[] } {
  const unmet = (Object.entries(requirements) as [Domain, number][])
    .filter(([domain, needed]) => needed > 0 && (kidPoints[domain] ?? 0) < needed)
    .map(([domain, needed]) => ({ domain, needed, current: kidPoints[domain] ?? 0 }))
  return { eligible: unmet.length === 0, unmet }
}
