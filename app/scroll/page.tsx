'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
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
  kids_working_toward?: number
  collective_progress_percent?: number
  kids_threshold?: number
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

// ── Animation variant library ─────────────────────────────────────────────────

type VariantKey =
  | 'fadeIn' | 'slideFromLeft' | 'slideFromRight' | 'slideFromBottom' | 'slideFromTop'
  | 'scaleUp' | 'scaleDown' | 'bounceIn' | 'blurIn' | 'rotateIn'
  | 'cardFlip' | 'perspectiveZoom' | 'tiltLeft' | 'tiltRight' | 'tumbleIn' | 'cubeRotate'

type MomentType = 'kids' | 'quest' | 'adventure' | 'drop'

interface VariantDef {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initial: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  animate: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exit: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transition: any
  /** Max ms until enter animation is visually settled — used to time the hold. */
  durationMs: number
}

const ease = [0.22, 1, 0.36, 1] as const

const VARIANTS: Record<VariantKey, VariantDef> = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit:    { opacity: 0 },
    transition: { duration: 0.55, ease: 'easeOut' },
    durationMs: 550,
  },
  slideFromLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit:    { x: '100%', transition: { duration: 0.5, ease: 'easeIn' } },
    transition: { duration: 0.65, ease },
    durationMs: 650,
  },
  slideFromRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit:    { x: '-100%', transition: { duration: 0.5, ease: 'easeIn' } },
    transition: { duration: 0.65, ease },
    durationMs: 650,
  },
  slideFromBottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit:    { y: '-100%', transition: { duration: 0.5, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  slideFromTop: {
    initial: { y: '-100%' },
    animate: { y: 0 },
    exit:    { y: '100%', transition: { duration: 0.5, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  scaleUp: {
    initial: { scale: 0.3, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit:    { scale: 0.3, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  scaleDown: {
    initial: { scale: 1.6, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit:    { scale: 1.6, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  bounceIn: {
    initial: { scale: 0.15, opacity: 0 },
    animate: { scale: 1,    opacity: 1 },
    exit:    { scale: 0.7,  opacity: 0, transition: { type: 'tween', duration: 0.35, ease: 'easeIn' } },
    transition: { type: 'spring', stiffness: 200, damping: 15 },
    durationMs: 1400,
  },
  blurIn: {
    initial: { filter: 'blur(24px)', opacity: 0 },
    animate: { filter: 'blur(0px)',  opacity: 1 },
    exit:    { filter: 'blur(24px)', opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.8, ease: 'easeOut' },
    durationMs: 800,
  },
  rotateIn: {
    initial: { rotate: -180, scale: 0.5, opacity: 0 },
    animate: { rotate: 0,    scale: 1,   opacity: 1 },
    exit:    { rotate: 180,  scale: 0.5, opacity: 0, transition: { duration: 0.45, ease: 'easeIn' } },
    transition: { duration: 0.9, ease },
    durationMs: 900,
  },
  // ── CSS 3D variants (perspective: 1200px on <main>) ──
  cardFlip: {
    initial: { rotateY: 90,  opacity: 0.2 },
    animate: { rotateY: 0,   opacity: 1   },
    exit:    { rotateY: -90, opacity: 0.2, transition: { duration: 0.45, ease: 'easeIn' } },
    transition: { duration: 0.65, ease },
    durationMs: 650,
  },
  perspectiveZoom: {
    initial: { z: -2000, opacity: 0 },
    animate: { z: 0,     opacity: 1 },
    exit:    { z: -2000, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } },
    transition: { duration: 0.9, ease },
    durationMs: 900,
  },
  tiltLeft: {
    initial: { rotateY: -45, opacity: 0 },
    animate: { rotateY: 0,   opacity: 1 },
    exit:    { rotateY: 45,  opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  tiltRight: {
    initial: { rotateY: 45,  opacity: 0 },
    animate: { rotateY: 0,   opacity: 1 },
    exit:    { rotateY: -45, opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
  tumbleIn: {
    initial: { rotateX: -90, opacity: 0 },
    animate: { rotateX: 0,   opacity: 1 },
    exit:    { rotateX: 90,  opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
    transition: { duration: 0.75, ease },
    durationMs: 750,
  },
  cubeRotate: {
    initial: { rotateY: -90, opacity: 0.1 },
    animate: { rotateY: 0,   opacity: 1   },
    exit:    { rotateY: 90,  opacity: 0.1, transition: { duration: 0.45, ease: 'easeIn' } },
    transition: { duration: 0.7, ease },
    durationMs: 700,
  },
}

// ── Content-to-animation pools ────────────────────────────────────────────────

interface WeightedVariant { key: VariantKey; weight: number }

const POOLS: Record<MomentType, WeightedVariant[]> = {
  kids: [
    { key: 'scaleUp',        weight: 3 },
    { key: 'fadeIn',         weight: 3 },
    { key: 'slideFromBottom',weight: 3 },
    { key: 'bounceIn',       weight: 3 },
    { key: 'blurIn',         weight: 1 },
    { key: 'slideFromLeft',  weight: 1 },
    { key: 'slideFromRight', weight: 1 },
  ],
  quest: [
    { key: 'slideFromRight', weight: 3 },
    { key: 'slideFromLeft',  weight: 3 },
    { key: 'tiltLeft',       weight: 3 },
    { key: 'tiltRight',      weight: 3 },
    { key: 'scaleDown',      weight: 1 },
    { key: 'cardFlip',       weight: 1 },
  ],
  adventure: [
    { key: 'cardFlip',       weight: 3 },
    { key: 'cubeRotate',     weight: 3 },
    { key: 'perspectiveZoom',weight: 3 },
    { key: 'rotateIn',       weight: 3 },
    { key: 'slideFromBottom',weight: 1 },
    { key: 'scaleUp',        weight: 1 },
  ],
  drop: [
    { key: 'fadeIn',         weight: 3 },
    { key: 'scaleUp',        weight: 3 },
    { key: 'slideFromLeft',  weight: 3 },
    { key: 'slideFromRight', weight: 3 },
    { key: 'blurIn',         weight: 1 },
    { key: 'tiltLeft',       weight: 1 },
    { key: 'tiltRight',      weight: 1 },
  ],
}

function pickVariant(type: MomentType, lastUsed: VariantKey): VariantKey {
  const pool = POOLS[type].filter(v => v.key !== lastUsed)
  const candidates = pool.length > 0 ? pool : POOLS[type]
  const total = candidates.reduce((s, v) => s + v.weight, 0)
  let r = Math.random() * total
  for (const v of candidates) {
    r -= v.weight
    if (r <= 0) return v.key
  }
  return candidates[candidates.length - 1].key
}

/** Max ms until enter animation is visually settled for a given variant + content type. */
function getEnterDuration(variantKey: VariantKey, type: MomentType): number {
  const base = VARIANTS[variantKey].durationMs
  // Kid stagger: delay 300+120*2 ms + 350ms duration = ~990ms
  return type === 'kids' ? Math.max(base, 990) : base
}

// ── Domain constants ──────────────────────────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  body: '#ff9933', brain: '#ffcc33', heart: '#993399', hands: '#33cc00', team: '#3399cc',
}
const DOMAIN_EMOJI: Record<string, string> = {
  body: '💪', brain: '🧠', heart: '❤️', hands: '🙌', team: '🤝',
}

const HOLD_MS = 6000

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

interface MomentData { idx: number; variantKey: VariantKey }

export default function ScrollPage() {
  const [kids, setKids] = useState<ScrollKid[]>([])
  const [rewards, setRewards] = useState<ScrollReward[]>([])
  const [quests, setQuests] = useState<ScrollQuest[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [momentData, setMomentData] = useState<MomentData>({ idx: 0, variantKey: 'fadeIn' })

  const prefersReducedMotion = useReducedMotion()

  // Data fetching — all existing logic preserved
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

    return () => { clearInterval(refreshInterval); supabase.removeChannel(channel) }
  }, [])

  const featuredQuests = useMemo(() => quests.filter(q => q.is_featured), [quests])
  const adventures     = useMemo(() => rewards.filter(r => r.type === 'adventure'), [rewards])
  const drops          = useMemo(() => rewards.filter(r => r.type === 'drop'), [rewards])
  const moments        = useMemo(
    () => buildMoments(kids, featuredQuests, adventures, drops),
    [kids, featuredQuests, adventures, drops]
  )

  // Advance timer: fires after enter animation settles + hard 6000ms hold
  useEffect(() => {
    if (moments.length === 0) return
    const currentMomentType = (moments[momentData.idx % moments.length]?.type ?? 'kids') as MomentType
    const enterMs = getEnterDuration(momentData.variantKey, currentMomentType)

    const t = setTimeout(() => {
      const nextIdx = (momentData.idx + 1) % moments.length
      const nextType = moments[nextIdx].type as MomentType
      const nextKey: VariantKey = prefersReducedMotion
        ? 'fadeIn'
        : pickVariant(nextType, momentData.variantKey)
      setMomentData({ idx: nextIdx, variantKey: nextKey })
    }, enterMs + HOLD_MS)

    return () => clearTimeout(t)
  }, [momentData, moments, prefersReducedMotion])

  // Ticker
  const tickerItems = completions.map(c =>
    `⚡ ${c.kids?.name_handle ?? '?'} completed "${c.quests?.title ?? '?'}" +${c.points_awarded}pts`
  )
  const tickerText    = tickerItems.join('   ·   ')
  const doubledTicker = tickerText + '   ·   ' + tickerText
  const tickerDuration = Math.max(30, tickerItems.length * 6)

  if (loading) {
    return (
      <div style={{ background: '#0a1929', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#3399cc', fontSize: 32, fontWeight: 900, fontFamily: 'var(--font-barlow)' }}>Loading…</span>
      </div>
    )
  }

  const currentMoment = moments.length > 0 ? moments[momentData.idx % moments.length] : null

  return (
    <div style={{
      background: '#f0f4f8', height: '100vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: '"Space Grotesk", system-ui, sans-serif', color: '#111111',
    }}>
      <StatusBar kids={kids} adventureProgress={adventureProgress} />

      {/*
        perspective on <main> creates the 3D context for cardFlip / cubeRotate /
        tiltLeft / tiltRight / tumbleIn / perspectiveZoom variants.
        2D variants (x, y, scale, opacity, filter) are unaffected.
      */}
      <main style={{
        flex: 1, overflow: 'hidden', position: 'relative',
        perspective: '1200px',
      }}>
        <AnimatePresence mode="wait">
          {currentMoment ? (
            <PresentationSlide
              key={`m-${momentData.idx}`}
              moment={currentMoment}
              variantKey={momentData.variantKey}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <p style={{ fontSize: 24, color: '#888', fontFamily: 'var(--font-barlow)', fontWeight: 700 }}>
                No content to display yet.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
      <span style={{ fontSize: 30, fontFamily: 'var(--font-barlow)', fontWeight: 900, letterSpacing: '0.04em', color: '#3399cc', textTransform: 'uppercase' }}>
        ⚡ SPARK QUEST
      </span>

      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <p style={{ fontSize: 30, fontFamily: 'var(--font-barlow)', fontWeight: 900, color: '#ffffff', margin: 0 }}>{kids.length}</p>
        <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.22em', color: '#3a6a9a', margin: 0 }}>
          {activeToday > 0 ? `${activeToday} active today` : 'members'}
        </p>
      </div>

      <div style={{ textAlign: 'right', minWidth: 300 }}>
        {adventureProgress ? (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', margin: '0 0 6px' }}>
              🗺 {adventureProgress.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#152840', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999, background: '#3399cc', width: `${pct}%`, transition: 'width 1.2s ease' }} />
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

function PresentationSlide({ moment, variantKey }: { moment: Moment; variantKey: VariantKey }) {
  // Capture variant at mount time so parent re-renders can't change the exit animation
  // of a slide that is already in its exit phase.
  const v = VARIANTS[useRef(variantKey).current]

  if (moment.type === 'kids')      return <KidsMoment      kids={moment.kids}           v={v} />
  if (moment.type === 'quest')     return <QuestMoment     quest={moment.quest}         v={v} />
  if (moment.type === 'adventure') return <AdventureMoment adventure={moment.adventure} v={v} />
  return                                  <DropMoment      drop={moment.drop}           v={v} />
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-barlow)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.35em', color: '#8899aa' }}>
        {label}
      </span>
    </div>
  )
}

// ── Moment wrappers ───────────────────────────────────────────────────────────

function KidsMoment({ kids, v }: { kids: ScrollKid[]; v: VariantDef }) {
  const cols = Math.min(kids.length, 3)
  return (
    <motion.div
      initial={v.initial} animate={v.animate} exit={v.exit} transition={v.transition}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 36px 28px', willChange: 'transform' }}
    >
      <SectionLabel icon="👥" label="Our Members" />
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 24 }}>
        {kids.map((kid, i) => (
          // Opacity-only stagger — spatial motion comes from the wrapper variant
          <motion.div
            key={kid.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.3 + i * 0.12 }}
            style={{ minHeight: 0 }}
          >
            <KidCard kid={kid} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function QuestMoment({ quest, v }: { quest: ScrollQuest; v: VariantDef }) {
  return (
    <motion.div
      initial={v.initial} animate={v.animate} exit={v.exit} transition={v.transition}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px', willChange: 'transform' }}
    >
      <SectionLabel icon="⭐" label="Featured Quest" />
      <div style={{ flex: 1, minHeight: 0 }}><QuestCard quest={quest} /></div>
    </motion.div>
  )
}

function AdventureMoment({ adventure, v }: { adventure: ScrollReward; v: VariantDef }) {
  return (
    <motion.div
      initial={v.initial} animate={v.animate} exit={v.exit} transition={v.transition}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px', willChange: 'transform' }}
    >
      <SectionLabel icon="🗺" label="Group Adventure" />
      <div style={{ flex: 1, minHeight: 0 }}><AdventureCard adventure={adventure} /></div>
    </motion.div>
  )
}

function DropMoment({ drop, v }: { drop: ScrollReward; v: VariantDef }) {
  return (
    <motion.div
      initial={v.initial} animate={v.animate} exit={v.exit} transition={v.transition}
      style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 80px 28px', willChange: 'transform' }}
    >
      <SectionLabel icon="🎁" label="Reward Drop" />
      <div style={{ flex: 1, minHeight: 0 }}><DropCard drop={drop} /></div>
    </motion.div>
  )
}

// ── Card components ───────────────────────────────────────────────────────────

function KidCard({ kid }: { kid: ScrollKid }) {
  const kp = {
    body: kid.body_points ?? 0, brain: kid.brain_points ?? 0, heart: kid.heart_points ?? 0,
    hands: kid.hands_points ?? 0, team: kid.team_points ?? 0,
  }
  const hasGoal     = !!kid.long_term_goal
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
      <div style={{ position: 'absolute', bottom: -48, right: -48, width: 160, height: 160, borderRadius: '50%', background: '#3399cc', opacity: 0.07, pointerEvents: 'none' }} />

      {scoredToday && (
        <div style={{ position: 'absolute', top: 14, right: 14, background: '#ffcc33', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800, color: '#111' }}>
          +{kid.daily_points_today} today ⚡
        </div>
      )}

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

      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 32, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#111', lineHeight: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {kid.name_handle}
        </p>
        <p style={{ fontSize: 15, color: '#444', margin: '4px 0 0' }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 28, color: '#3399cc' }}>{kid.total_points_earned}</span>
          {' '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12 }}>xp earned</span>
        </p>
      </div>

      {hasGoal && (
        <div style={{ textAlign: 'center', padding: '0 4px' }}>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', margin: '0 0 2px', fontWeight: 700 }}>Working toward</p>
          <p style={{ fontSize: 14, color: '#1a5c8a', fontWeight: 700, lineHeight: 1.25, margin: 0 }}>{kid.long_term_goal!.title}</p>
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        {hasGoal ? (
          <DomainProgressBar
            kidPoints={kp} totalEarned={kid.total_points_earned}
            targetCost={kid.long_term_goal!.cost} availablePoints={kid.available_points}
            height="lg" showLabel
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

function QuestCard({ quest }: { quest: ScrollQuest }) {
  const domain   = quest.domain_tags[0] ?? 'team'
  const accent   = DOMAIN_COLORS[domain] ?? '#3399cc'
  const emoji    = DOMAIN_EMOJI[domain] ?? '⚡'
  const hasImage = !!quest.image_url

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#ffffff',
      border: `2px solid ${accent}44`, borderLeft: `8px solid ${accent}`,
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
            <span style={{ background: '#cc3333', color: '#fff', borderRadius: 999, fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', padding: '4px 14px' }}>
              🔥 Grit Quest
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 76, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em', color: hasImage ? '#ffffff' : '#111', margin: 0, maxWidth: '80%' }}>
          {quest.title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 72, color: hasImage ? '#ffcc33' : accent, lineHeight: 1 }}>+{quest.point_value}</span>
          <span style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: hasImage ? 'rgba(255,255,255,0.6)' : '#666' }}>points</span>
        </div>
        <p style={{ fontSize: 15, color: hasImage ? 'rgba(255,255,255,0.45)' : '#999', textTransform: 'uppercase', letterSpacing: '0.12em', margin: 0 }}>
          Complete with a SPARK mentor
        </p>
      </div>
    </div>
  )
}

function AdventureCard({ adventure }: { adventure: ScrollReward }) {
  const hasImage    = !!adventure.image_url
  const pct         = adventure.collective_progress_percent ?? 0
  const kidsWorking = adventure.kids_working_toward ?? 0
  const threshold   = adventure.kids_threshold ?? 0
  const descExcerpt = adventure.description
    ? adventure.description.length > 130 ? adventure.description.slice(0, 130) + '…' : adventure.description
    : null

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#eef6ff',
      border: '2px solid #3399cc33', borderLeft: '8px solid #3399cc',
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 32 }}>🗺</span>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.55)' : '#3399cc' }}>Group Adventure</span>
          </div>
          {kidsWorking > 0 && (
            <span style={{ background: hasImage ? 'rgba(51,153,204,0.25)' : '#d0e8f8', color: hasImage ? '#7ac8ef' : '#1a6a9a', borderRadius: 999, padding: '5px 18px', fontSize: 15, fontWeight: 700 }}>
              {kidsWorking} kid{kidsWorking !== 1 ? 's' : ''} working toward this
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 70, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em', color: hasImage ? '#ffffff' : '#111', margin: 0 }}>
          {adventure.title}
        </h2>
        {descExcerpt && (
          <p style={{ fontSize: 22, color: hasImage ? 'rgba(255,255,255,0.7)' : '#444', lineHeight: 1.4, margin: 0, maxWidth: '75%' }}>{descExcerpt}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 54, color: hasImage ? '#ffcc33' : '#3399cc', lineHeight: 1 }}>{adventure.cost} pts</span>
          <span style={{ fontSize: 17, color: hasImage ? 'rgba(255,255,255,0.5)' : '#666', textTransform: 'uppercase', letterSpacing: '0.1em' }}>per kid · {threshold} kids needed</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 600, color: hasImage ? 'rgba(255,255,255,0.8)' : '#333' }}>We're working toward this together</p>
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 40, color: hasImage ? '#ffcc33' : '#3399cc' }}>{pct}%</span>
          </div>
          <div style={{ height: 18, borderRadius: 999, background: hasImage ? 'rgba(255,255,255,0.12)' : '#c8dff0', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.4, delay: 0.5, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 999, background: '#3399cc' }}
            />
          </div>
          <p style={{ margin: 0, fontSize: 12, color: hasImage ? 'rgba(255,255,255,0.4)' : '#888', textTransform: 'uppercase', letterSpacing: '0.12em' }}>of the way there</p>
        </div>
      </div>
    </div>
  )
}

function DropCard({ drop }: { drop: ScrollReward }) {
  const hasImage    = !!drop.image_url
  const hasQty      = drop.quantity_available != null && drop.quantity_available > 0
  const descExcerpt = drop.description
    ? drop.description.length > 130 ? drop.description.slice(0, 130) + '…' : drop.description
    : null

  return (
    <div style={{
      height: '100%',
      background: hasImage ? '#111' : '#fff8f0',
      border: '2px solid #ff993333', borderLeft: '8px solid #ff9933',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }}>🎁</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.55)' : '#ff9933' }}>Reward Drop</span>
          {hasQty && (
            <span style={{ background: '#ff9933', color: '#111', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 14px', marginLeft: 4 }}>
              {drop.quantity_available} left
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 76, lineHeight: 0.95, textTransform: 'uppercase', letterSpacing: '-0.02em', color: hasImage ? '#ffffff' : '#111', margin: 0 }}>
          {drop.title}
        </h2>
        {descExcerpt && (
          <p style={{ fontSize: 22, color: hasImage ? 'rgba(255,255,255,0.7)' : '#444', lineHeight: 1.4, margin: 0, maxWidth: '75%' }}>{descExcerpt}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 72, color: hasImage ? '#ffcc33' : '#ff9933', lineHeight: 1 }}>{drop.cost} pts</span>
          <span style={{ fontSize: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: hasImage ? 'rgba(255,255,255,0.5)' : '#666' }}>— spend in the app</span>
        </div>
      </div>
    </div>
  )
}
