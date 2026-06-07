'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DomainProgressBar } from '@/components/ui/DomainProgressBar'
import { supabase } from '@/lib/supabase'
import type { Kid } from '@/lib/types'

// No auth, no nav. Landscape TV ambient display.

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScrollKid extends Pick<Kid,
  'id' | 'name_handle' | 'total_points_earned' | 'available_points' | 'avatar_url' |
  'body_points' | 'brain_points' | 'heart_points' | 'hands_points' | 'team_points'
> {
  long_term_goal: { title: string; cost: number } | null
  daily_points_today: number
}

interface ScrollReward {
  id: string
  type: 'drop' | 'adventure'
  title: string
  description: string | null
  cost: number
  image_url: string | null
  // adventure-specific
  kids_working_toward?: number
  collective_progress_percent?: number
  kids_threshold?: number
  // drop-specific
  quantity_available?: number | null
}

interface ScrollQuest {
  id: string
  title: string
  domain_tags: string[]
  point_value: number
  is_grit_quest: boolean
  image_url: string | null
  is_featured: boolean
}

interface Completion {
  id: string
  points_awarded: number
  kids: { name_handle: string } | null
  quests: { title: string } | null
}

interface AdventureProgress {
  title: string
  contributed: number
  target: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  body: '#ff9933', brain: '#ffcc33', heart: '#993399', hands: '#33cc00', team: '#3399cc',
}
const DOMAIN_EMOJI: Record<string, string> = {
  body: '💪', brain: '🧠', heart: '❤️', hands: '🙌', team: '🤝',
}

// Timer fires after this many ms → triggers key change → exit then enter animation
// Visible hold ≈ MOMENT_HOLD_MS − enter_animation_duration (~900ms)
const MOMENT_HOLD_MS = 7200

// ── Moment types ──────────────────────────────────────────────────────────────

type Moment =
  | { type: 'kids'; kids: ScrollKid[] }
  | { type: 'quest'; quest: ScrollQuest }
  | { type: 'adventure'; adventure: ScrollReward }
  | { type: 'drop'; drop: ScrollReward }

function buildMoments(
  kids: ScrollKid[],
  featuredQuests: ScrollQuest[],
  adventures: ScrollReward[],
  drops: ScrollReward[],
): Moment[] {
  const out: Moment[] = []
  for (let i = 0; i < kids.length; i += 3)
    out.push({ type: 'kids', kids: kids.slice(i, i + 3) })
  featuredQuests.forEach(q => out.push({ type: 'quest', quest: q }))
  adventures.forEach(a => out.push({ type: 'adventure', adventure: a }))
  drops.forEach(d => out.push({ type: 'drop', drop: d }))
  return out
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ScrollPage() {
  const [kids, setKids] = useState<ScrollKid[]>([])
  const [rewards, setRewards] = useState<ScrollReward[]>([])
  const [quests, setQuests] = useState<ScrollQuest[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [momentIdx, setMomentIdx] = useState(0)

  // Data fetching — preserve all existing logic
  useEffect(() => {
    function fetchAll() {
      fetch('/api/scroll')
        .then(r => r.json())
        .then(({ kids: k, recentCompletions: c, adventureProgress: ap, rewards: rw, quests: qs }) => {
          setKids(k ?? [])
          setRewards(rw ?? [])
          setQuests(qs ?? [])
          setCompletions(c ?? [])
          setAdventureProgress(ap)
          setLoading(false)
        })
    }

    fetchAll()
    const refreshInterval = setInterval(fetchAll, 5 * 60 * 1000)

    const channel = supabase
      .channel('scroll-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kids' }, (payload) => {
        setKids(prev => prev.map(k => k.id === payload.new.id ? { ...k, ...payload.new } : k))
      })
      .subscribe()

    return () => {
      clearInterval(refreshInterval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Split rewards into sections
  const featuredQuests = useMemo(() => quests.filter(q => q.is_featured), [quests])
  const adventures = useMemo(() => rewards.filter(r => r.type === 'adventure'), [rewards])
  const drops = useMemo(() => rewards.filter(r => r.type === 'drop'), [rewards])

  const moments = useMemo(
    () => buildMoments(kids, featuredQuests, adventures, drops),
    [kids, featuredQuests, adventures, drops]
  )

  // Advance presentation on a fixed timer
  useEffect(() => {
    if (moments.length === 0) return
    const t = setTimeout(() => setMomentIdx(p => (p + 1) % moments.length), MOMENT_HOLD_MS)
    return () => clearTimeout(t)
  }, [momentIdx, moments.length])

  // Ticker
  const tickerItems = completions.map(c =>
    `⚡ ${c.kids?.name_handle ?? '?'} completed "${c.quests?.title ?? '?'}" +${c.points_awarded}pts`
  )
  const tickerText = tickerItems.join('   ·   ')
  const doubledTicker = tickerText + '   ·   ' + tickerText
  const tickerDuration = Math.max(30, tickerItems.length * 6)

  if (loading) {
    return (
      <div style={{ background: '#0a1929', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#3399cc', fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-barlow)' }}>Loading…</span>
      </div>
    )
  }

  const currentMoment = moments.length > 0 ? moments[momentIdx % moments.length] : null

  return (
    <div style={{
      background: '#f0f4f8',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      color: '#111111',
    }}>

      {/* ── Status bar ── */}
      <StatusBar kids={kids} adventureProgress={adventureProgress} />

      {/* ── Main presentation area ── */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {currentMoment ? (
            <PresentationSlide key={`moment-${momentIdx}`} moment={currentMoment} />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <p style={{ fontSize: 24, color: '#888', fontFamily: 'var(--font-barlow)', fontWeight: 700 }}>
                No content to display yet.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── Bottom ticker ── */}
      <div style={{
        height: 80, flexShrink: 0,
        background: '#0a1929', borderTop: '2px solid #152840',
        overflow: 'hidden', display: 'flex', alignItems: 'center',
      }}>
        {tickerText ? (
          <div className="ticker-scroll-infinite" style={{ '--ticker-duration': `${tickerDuration}s` } as React.CSSProperties}>
            <span style={{
              fontSize: 38, fontFamily: 'var(--font-barlow)', fontWeight: 700,
              color: '#c8e8ff', paddingLeft: '100vw', whiteSpace: 'nowrap',
            }}>
              {doubledTicker}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: 34, fontFamily: 'var(--font-barlow)', fontWeight: 700, color: '#2a4a6a', paddingLeft: 24 }}>
            No recent activity yet.
          </span>
        )}
      </div>
    </div>
  )
}

// ── Status bar ────────────────────────────────────────────────────────────────

function StatusBar({ kids, adventureProgress }: { kids: ScrollKid[]; adventureProgress: AdventureProgress | null }) {
  const activeToday = kids.filter(k => k.daily_points_today > 0).length
  const pct = adventureProgress
    ? Math.min(100, Math.round((adventureProgress.contributed / adventureProgress.target) * 100))
    : 0

  return (
    <div style={{
      height: 80, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 40px',
      background: '#0a1929', borderBottom: '2px solid #152840',
    }}>
      {/* Wordmark */}
      <span style={{
        fontSize: 30, fontFamily: 'var(--font-barlow)', fontWeight: 900,
        letterSpacing: '0.04em', color: '#3399cc', textTransform: 'uppercase',
      }}>
        ⚡ SPARK QUEST
      </span>

      {/* Member count */}
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <p style={{ fontSize: 30, fontFamily: 'var(--font-barlow)', fontWeight: 900, color: '#ffffff', margin: 0 }}>
          {kids.length}
        </p>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#3a6a9a', margin: 0 }}>
          {activeToday > 0 ? `${activeToday} active today` : 'members'}
        </p>
      </div>

      {/* Featured adventure progress */}
      <div style={{ textAlign: 'right', minWidth: 300 }}>
        {adventureProgress ? (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', margin: '0 0 6px' }}>
              🗺 {adventureProgress.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#152840', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999,
                  background: '#3399cc', width: `${pct}%`, transition: 'width 1.2s ease',
                }} />
              </div>
              <span style={{ fontSize: 13, color: '#6aaad0', whiteSpace: 'nowrap', fontWeight: 700 }}>{pct}%</span>
            </div>
          </>
        ) : (
          <p style={{ fontSize: 13, color: '#2a4a6a', margin: 0 }}>No featured adventure</p>
        )}
      </div>
    </div>
  )
}

// ── Slide dispatcher ──────────────────────────────────────────────────────────

function PresentationSlide({ moment }: { moment: Moment }) {
  if (moment.type === 'kids')      return <KidsMoment kids={moment.kids} />
  if (moment.type === 'quest')     return <QuestMoment quest={moment.quest} />
  if (moment.type === 'adventure') return <AdventureMoment adventure={moment.adventure} />
  return <DropMoment drop={moment.drop} />
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontFamily: 'var(--font-barlow)', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.35em', color: '#8899aa',
      }}>
        {label}
      </span>
    </div>
  )
}

// ── Kids moment ───────────────────────────────────────────────────────────────

function KidsMoment({ kids }: { kids: ScrollKid[] }) {
  const cols = Math.min(kids.length, 3)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5 }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 36px 28px' }}
    >
      <SectionLabel icon="👥" label="Our Members" />
      <div style={{
        flex: 1, minHeight: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 24,
      }}>
        {kids.map((kid, i) => (
          <motion.div
            key={kid.id}
            initial={{ opacity: 0, y: 64 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.1 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
            style={{ minHeight: 0 }}
          >
            <KidCard kid={kid} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Quest moment ──────────────────────────────────────────────────────────────

function QuestMoment({ quest }: { quest: ScrollQuest }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px' }}
    >
      <SectionLabel icon="⭐" label="Featured Quest" />
      <div style={{ flex: 1, minHeight: 0 }}><QuestCard quest={quest} /></div>
    </motion.div>
  )
}

// ── Adventure moment ──────────────────────────────────────────────────────────

function AdventureMoment({ adventure }: { adventure: ScrollReward }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -48 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px' }}
    >
      <SectionLabel icon="🗺" label="Group Adventure" />
      <div style={{ flex: 1, minHeight: 0 }}><AdventureCard adventure={adventure} /></div>
    </motion.div>
  )
}

// ── Drop moment ───────────────────────────────────────────────────────────────

function DropMoment({ drop }: { drop: ScrollReward }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 48 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px' }}
    >
      <SectionLabel icon="🎁" label="Reward Drop" />
      <div style={{ flex: 1, minHeight: 0 }}><DropCard drop={drop} /></div>
    </motion.div>
  )
}

// ── Kid card ──────────────────────────────────────────────────────────────────

function KidCard({ kid }: { kid: ScrollKid }) {
  const kp = {
    body: kid.body_points ?? 0, brain: kid.brain_points ?? 0, heart: kid.heart_points ?? 0,
    hands: kid.hands_points ?? 0, team: kid.team_points ?? 0,
  }
  const hasGoal    = !!kid.long_term_goal
  const scoredToday = kid.daily_points_today > 0

  return (
    <div style={{
      background: '#e6f4ff',
      border: scoredToday ? '2px solid #ffcc33' : '2px solid #3399cc',
      borderRadius: 24,
      padding: '24px 20px 20px',
      height: '100%',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
      animation: scoredToday ? 'yellow-pulse 2s ease-in-out infinite' : 'card-glow 3s ease-in-out infinite',
    }}>
      {/* Decorative orb */}
      <div style={{ position: 'absolute', bottom: -48, right: -48, width: 160, height: 160, borderRadius: '50%', background: '#3399cc', opacity: 0.07, pointerEvents: 'none' }} />

      {/* Today badge */}
      {scoredToday && (
        <div style={{
          position: 'absolute', top: 14, right: 14,
          background: '#ffcc33', borderRadius: 999, padding: '3px 10px',
          fontSize: 12, fontWeight: 800, color: '#111',
        }}>
          +{kid.daily_points_today} today ⚡
        </div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: 150, height: 150, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          border: scoredToday ? '4px solid #ffcc33' : '4px solid #3399cc',
          background: '#c8e4f4', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {kid.avatar_url ? (
            <img src={kid.avatar_url} alt={kid.name_handle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 52, color: '#3399cc', textTransform: 'uppercase' }}>
              {kid.name_handle.slice(0, 2)}
            </span>
          )}
        </div>
      </div>

      {/* Name + XP */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 32,
          textTransform: 'uppercase', letterSpacing: '-0.01em',
          color: '#111', lineHeight: 1, margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {kid.name_handle}
        </p>
        <p style={{ fontSize: 15, color: '#444', margin: '4px 0 0' }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 28, color: '#3399cc' }}>
            {kid.total_points_earned}
          </span>
          {' '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12 }}>xp earned</span>
        </p>
      </div>

      {/* Goal */}
      {hasGoal && (
        <div style={{ textAlign: 'center', padding: '0 4px' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', margin: '0 0 2px', fontWeight: 700 }}>
            Working toward
          </p>
          <p style={{ fontSize: 14, color: '#1a5c8a', fontWeight: 700, lineHeight: 1.25, margin: 0 }}>
            {kid.long_term_goal!.title}
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: 'auto' }}>
        {hasGoal ? (
          <DomainProgressBar
            kidPoints={kp}
            totalEarned={kid.total_points_earned}
            targetCost={kid.long_term_goal!.cost}
            availablePoints={kid.available_points}
            height="lg"
            showLabel
          />
        ) : (
          <div style={{ height: 14, borderRadius: 999, background: '#c8e4f4' }}>
            <div style={{ height: '100%', borderRadius: 999, background: '#3399cc', width: `${Math.min(100, (kid.total_points_earned / 200) * 100)}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Quest card ────────────────────────────────────────────────────────────────

function QuestCard({ quest }: { quest: ScrollQuest }) {
  const domain   = quest.domain_tags[0] ?? 'team'
  const accent   = DOMAIN_COLORS[domain] ?? '#3399cc'
  const emoji    = DOMAIN_EMOJI[domain] ?? '⚡'
  const hasImage = !!quest.image_url

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#ffffff',
      border: `2px solid ${accent}44`,
      borderLeft: `8px solid ${accent}`,
      borderRadius: 28,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {hasImage ? (
        <>
          <img src={quest.image_url!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.93) 48%, rgba(0,0,0,0.15) 100%)' }} />
        </>
      ) : (
        <>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 420, height: 420, borderRadius: '50%', background: accent, opacity: 0.05, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: accent, opacity: 0.04, pointerEvents: 'none' }} />
        </>
      )}

      <div style={{ position: 'relative', padding: '40px 64px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 48 }}>{emoji}</span>
          {quest.is_grit_quest && (
            <span style={{
              background: '#cc3333', color: '#fff', borderRadius: 999,
              fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em',
              padding: '4px 14px',
            }}>🔥 Grit Quest</span>
          )}
        </div>

        <h2 style={{
          fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 76,
          lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em',
          color: hasImage ? '#ffffff' : '#111', margin: 0, maxWidth: '80%',
        }}>
          {quest.title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 72, color: hasImage ? '#ffcc33' : accent, lineHeight: 1 }}>
            +{quest.point_value}
          </span>
          <span style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: hasImage ? 'rgba(255,255,255,0.6)' : '#666' }}>
            points
          </span>
        </div>

        <p style={{ fontSize: 15, color: hasImage ? 'rgba(255,255,255,0.45)' : '#999', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
          Complete with a SPARK mentor
        </p>
      </div>
    </div>
  )
}

// ── Adventure card ────────────────────────────────────────────────────────────

function AdventureCard({ adventure }: { adventure: ScrollReward }) {
  const hasImage      = !!adventure.image_url
  const pct           = adventure.collective_progress_percent ?? 0
  const kidsWorking   = adventure.kids_working_toward ?? 0
  const threshold     = adventure.kids_threshold ?? 0
  const descExcerpt   = adventure.description
    ? adventure.description.length > 130
      ? adventure.description.slice(0, 130) + '…'
      : adventure.description
    : null

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#eef6ff',
      border: '2px solid #3399cc33',
      borderLeft: '8px solid #3399cc',
      borderRadius: 28,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {hasImage ? (
        <>
          <img src={adventure.image_url!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,10,0.92) 55%, rgba(0,0,10,0.25) 100%)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', top: -80, right: -80, width: 420, height: 420, borderRadius: '50%', background: '#3399cc', opacity: 0.06, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'relative', padding: '40px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Header label + kids count */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 32 }}>🗺</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.55)' : '#3399cc' }}>
              Group Adventure
            </span>
          </div>
          {kidsWorking > 0 && (
            <span style={{
              background: hasImage ? 'rgba(51,153,204,0.25)' : '#d0e8f8',
              color: hasImage ? '#7ac8ef' : '#1a6a9a',
              borderRadius: 999, padding: '5px 18px',
              fontSize: 15, fontWeight: 700,
            }}>
              {kidsWorking} kid{kidsWorking !== 1 ? 's' : ''} working toward this
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 70,
          lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em',
          color: hasImage ? '#ffffff' : '#111', margin: 0,
        }}>
          {adventure.title}
        </h2>

        {/* Description */}
        {descExcerpt && (
          <p style={{ fontSize: 22, color: hasImage ? 'rgba(255,255,255,0.7)' : '#444', lineHeight: 1.4, margin: 0, maxWidth: '75%' }}>
            {descExcerpt}
          </p>
        )}

        {/* Cost */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 54, color: hasImage ? '#ffcc33' : '#3399cc', lineHeight: 1 }}>
            {adventure.cost} pts
          </span>
          <span style={{ fontSize: 17, color: hasImage ? 'rgba(255,255,255,0.5)' : '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            per kid · {threshold} kids needed
          </span>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: hasImage ? 'rgba(255,255,255,0.8)' : '#333' }}>
              We're working toward this together
            </p>
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 40, color: hasImage ? '#ffcc33' : '#3399cc' }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 18, borderRadius: 999, background: hasImage ? 'rgba(255,255,255,0.12)' : '#c8dff0', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.4, delay: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: '#3399cc' }}
            />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: hasImage ? 'rgba(255,255,255,0.4)' : '#888', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            of the way there
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Drop card ─────────────────────────────────────────────────────────────────

function DropCard({ drop }: { drop: ScrollReward }) {
  const hasImage    = !!drop.image_url
  const hasQty      = drop.quantity_available != null && drop.quantity_available > 0
  const descExcerpt = drop.description
    ? drop.description.length > 130
      ? drop.description.slice(0, 130) + '…'
      : drop.description
    : null

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#fff8f0',
      border: '2px solid #ff993333',
      borderLeft: '8px solid #ff9933',
      borderRadius: 28,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {hasImage ? (
        <>
          <img src={drop.image_url!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.93) 50%, rgba(0,0,0,0.15) 100%)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: '#ff9933', opacity: 0.07, pointerEvents: 'none' }} />
      )}

      <div style={{ position: 'relative', padding: '40px 64px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Header label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }}>🎁</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.55)' : '#ff9933' }}>
            Reward Drop
          </span>
          {hasQty && (
            <span style={{
              background: '#ff9933', color: '#111', borderRadius: 999,
              fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '3px 14px', marginLeft: 4,
            }}>
              {drop.quantity_available} left
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 76,
          lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em',
          color: hasImage ? '#ffffff' : '#111', margin: 0,
        }}>
          {drop.title}
        </h2>

        {/* Description */}
        {descExcerpt && (
          <p style={{ fontSize: 22, color: hasImage ? 'rgba(255,255,255,0.7)' : '#444', lineHeight: 1.4, margin: 0, maxWidth: '75%' }}>
            {descExcerpt}
          </p>
        )}

        {/* Cost */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 72, color: hasImage ? '#ffcc33' : '#ff9933', lineHeight: 1 }}>
            {drop.cost} pts
          </span>
          <span style={{ fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: hasImage ? 'rgba(255,255,255,0.5)' : '#666' }}>
            — spend in the app
          </span>
        </div>
      </div>
    </div>
  )
}
