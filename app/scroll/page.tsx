'use client'

import { useState, useEffect, useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { DomainProgressBar } from '@/components/ui/DomainProgressBar'
import { supabase } from '@/lib/supabase'
import type { Kid } from '@/lib/types'

// No auth, no nav. Landscape TV ambient display.

interface ScrollKid extends Pick<Kid,
  'id' | 'name_handle' | 'total_points_earned' | 'available_points' | 'avatar_url' |
  'body_points' | 'brain_points' | 'heart_points' | 'hands_points' | 'team_points'
> {
  long_term_goal: { title: string; cost: number } | null
}

interface ScrollReward {
  id: string
  type: 'drop' | 'adventure'
  title: string
  description: string | null
  cost: number
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

// Estimated px heights used to calculate scroll duration
const SPLASH_EACH_H = 800  // each full-width splash image panel
const KID_ROW_H     = 396  // 380px card + 16px gap (2-column layout)
const REWARD_H      = 560  // tall enough for ~12s on screen at target speed
const TARGET_SPEED  = 46   // px per second
const SPLASH_COUNT  = 3
const COLS          = 2    // grid columns

type ScrollItem =
  | { kind: 'splash'; imageIndex: 0 | 1 | 2 }
  | { kind: 'kid'; data: ScrollKid; uid: string }
  | { kind: 'reward'; data: ScrollReward; uid: string }

export default function ScrollPage() {
  const [kids, setKids] = useState<ScrollKid[]>([])
  const [rewards, setRewards] = useState<ScrollReward[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scroll')
      .then(r => r.json())
      .then(({ kids: k, recentCompletions: c, adventureProgress: ap, rewards: rw }) => {
        setKids(k)
        setRewards(rw ?? [])
        setCompletions(c)
        setAdventureProgress(ap)
        setLoading(false)
      })

    const channel = supabase
      .channel('scroll-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kids' }, (payload) => {
        setKids(prev => prev.map(k => k.id === payload.new.id ? { ...k, ...payload.new } : k))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Build content list: 3 splash panels → groups of 8 kids with a reward card after each group
  const contentItems = useMemo<ScrollItem[]>(() => {
    const splashItems: ScrollItem[] = [
      { kind: 'splash', imageIndex: 0 },
      { kind: 'splash', imageIndex: 1 },
      { kind: 'splash', imageIndex: 2 },
    ]
    if (kids.length === 0) return splashItems
    const items: ScrollItem[] = [...splashItems]
    const KIDS_PER_GROUP = 4  // 2 rows of 2
    for (let i = 0; i < kids.length; i += KIDS_PER_GROUP) {
      const group = kids.slice(i, i + KIDS_PER_GROUP)
      group.forEach(k => items.push({ kind: 'kid', data: k, uid: k.id }))
      if (rewards.length > 0) {
        const rewardIndex = Math.floor(i / KIDS_PER_GROUP) % rewards.length
        items.push({ kind: 'reward', data: rewards[rewardIndex], uid: `reward-${i}` })
      }
    }
    return items
  }, [kids, rewards])

  // Double for seamless loop
  const displayItems = useMemo<ScrollItem[]>(() => [
    ...contentItems,
    // Second copy gets different uids so React keys are unique
    ...contentItems.map(item => {
      if (item.kind === 'kid')    return { ...item, uid: item.uid + '-b' }
      if (item.kind === 'reward') return { ...item, uid: item.uid + '-b' }
      return { ...item }
    }),
  ], [contentItems])

  // Scroll duration based on estimated content height
  const kidRows    = Math.ceil(kids.length / COLS)
  const rewardCount = rewards.length > 0 ? Math.ceil(kidRows / 2) : 0
  const oneLoopH   = SPLASH_COUNT * SPLASH_EACH_H + kidRows * KID_ROW_H + rewardCount * REWARD_H
  const scrollDuration = Math.max(40, Math.round(oneLoopH / TARGET_SPEED))

  // Ticker
  const tickerItems = completions.map(c =>
    `⚡ ${c.kids?.name_handle ?? '?'} completed "${c.quests?.title ?? '?'}" +${c.points_awarded}pts`
  )
  const tickerText    = tickerItems.join('   ·   ')
  const doubledTicker = tickerText + '   ·   ' + tickerText
  const tickerDuration = Math.max(30, tickerItems.length * 6)

  if (loading) {
    return (
      <div style={{ background: '#0D0D0D', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#7C3AED', fontSize: 32, fontWeight: 900 }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#0D0D0D', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Space Grotesk", system-ui, sans-serif', color: '#F5F5F5' }}>

      {/* ── Fixed Header ── */}
      <div style={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: '#141414', borderBottom: '1px solid #303030' }}>
        <span style={{ fontSize: 28, fontFamily: 'var(--font-barlow)', fontWeight: 900, letterSpacing: '-0.01em', color: '#A78BFA' }}>
          ⚡ SPARK QUEST
        </span>

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#777' }}>Progress Board</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{kids.length} members • A–Z</p>
        </div>

        <div style={{ textAlign: 'right', minWidth: 260 }}>
          {adventureProgress ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#A78BFA', marginBottom: 4 }}>
                🗺 {adventureProgress.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#2C2C2A', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999, background: '#7C3AED', width: `${Math.min(100, (adventureProgress.contributed / adventureProgress.target) * 100)}%` }} />
                </div>
                <span style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap' }}>
                  {adventureProgress.contributed.toLocaleString()} / {adventureProgress.target.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#555' }}>No featured adventure</p>
          )}
        </div>
      </div>

      {/* ── Scrolling Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 32px 0' }}>
        <div
          className="scroll-up-infinite"
          style={{ '--scroll-duration': `${scrollDuration}s` } as React.CSSProperties}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {displayItems.map((item, i) => {
              if (item.kind === 'splash') {
                const splashImages = [
                  { src: '/scroll-logo.png', alt: 'SPARK Quest — Are You Ready?', filter: 'drop-shadow(0 0 40px rgba(124,58,237,0.5))' },
                  { src: '/scroll-motivational.png', alt: 'Try new things. Challenge yourself. Win cool prizes and trips!' },
                  { src: '/scroll-qr.png', alt: 'QR code to join SPARK Quest' },
                ]
                const img = splashImages[item.imageIndex]
                const isQr = item.imageIndex === 2
                return (
                  <div
                    key={`splash-${item.imageIndex}-${i}`}
                    style={{
                      gridColumn: '1 / -1',
                      height: SPLASH_EACH_H,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: isQr ? '1px solid #222' : undefined,
                      gap: isQr ? 16 : 0,
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      style={{
                        maxWidth: isQr ? 400 : '100%',
                        maxHeight: SPLASH_EACH_H - 48,
                        objectFit: 'contain',
                        filter: img.filter,
                        ...(isQr ? { background: '#fff', borderRadius: 20, padding: 16 } : {}),
                      }}
                    />
                    {isQr && (
                      <p style={{ fontSize: 20, color: '#A78BFA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                        Scan to join
                      </p>
                    )}
                  </div>
                )
              }

              if (item.kind === 'reward') {
                return <RewardCard key={item.uid} reward={item.data} />
              }

              return <KidCard key={item.uid} kid={item.data} />
            })}
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Ticker ── */}
      <div style={{ height: 72, flexShrink: 0, background: '#141414', borderTop: '1px solid #303030', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {tickerText ? (
          <div className="ticker-scroll-infinite" style={{ '--ticker-duration': `${tickerDuration}s` } as React.CSSProperties}>
            <span style={{ fontSize: 23, color: '#555', paddingLeft: '100vw' }}>{doubledTicker}</span>
          </div>
        ) : (
          <span style={{ fontSize: 21, color: '#444', paddingLeft: 24 }}>No recent activity yet.</span>
        )}
      </div>
    </div>
  )
}

// ── Reward highlight card ─────────────────────────────────────────────────────

function RewardCard({ reward }: { reward: ScrollReward }) {
  const isDrop = reward.type === 'drop'
  const accent  = isDrop ? '#F0A020' : '#8B5CF6'
  const dimAccent = isDrop ? '#2A1900' : '#1A0A32'
  const icon    = isDrop ? '🎁' : '🗺'
  const label   = isDrop ? 'Drop' : 'Group Adventure'
  const costLabel = isDrop ? `${reward.cost} pts` : `${reward.cost} pts / kid`

  return (
    <div style={{
      gridColumn: '1 / -1',
      height: REWARD_H,
      background: dimAccent,
      border: `2px solid ${accent}33`,
      borderLeft: `6px solid ${accent}`,
      borderRadius: 20,
      padding: '40px 56px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 20,
      marginTop: 8,
      marginBottom: 8,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle background glow */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: accent, opacity: 0.06, pointerEvents: 'none' }} />

      {/* Type label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 36 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: accent }}>
          {label}
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-barlow)',
        fontWeight: 900,
        fontSize: 64,
        lineHeight: 1,
        textTransform: 'uppercase',
        letterSpacing: '-0.02em',
        color: '#F5F5F5',
        margin: 0,
      }}>
        {reward.title}
      </h2>

      {/* Description */}
      {reward.description && (
        <p style={{ fontSize: 26, color: '#AAAAAA', lineHeight: 1.4, maxWidth: '80%', margin: 0 }}>
          {reward.description}
        </p>
      )}

      {/* Cost */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
        <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 48, color: accent, lineHeight: 1 }}>
          {costLabel}
        </span>
        <span style={{ fontSize: 18, color: '#666', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {isDrop ? '— spend in the app' : '— contribute together'}
        </span>
      </div>
    </div>
  )
}

// ── Kid card ─────────────────────────────────────────────────────────────────

function KidCard({ kid }: { kid: ScrollKid }) {
  const kp = { body: kid.body_points ?? 0, brain: kid.brain_points ?? 0, heart: kid.heart_points ?? 0, hands: kid.hands_points ?? 0, team: kid.team_points ?? 0 }
  const hasGoal = !!kid.long_term_goal

  return (
    <div style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 24, padding: '32px 36px', minHeight: 380, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <Avatar avatarUrl={kid.avatar_url} handle={kid.name_handle} size="xl" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 36, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kid.name_handle}
          </p>
          <p style={{ fontSize: 22, color: '#777', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 30, color: '#A78BFA' }}>{kid.total_points_earned}</span>
            {' '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 18 }}>xp</span>
          </p>
        </div>
        {hasGoal ? (
          <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 220 }}>
            <p style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 4 }}>Goal</p>
            <p style={{ fontSize: 20, color: '#A78BFA', fontWeight: 700, lineHeight: 1.2, textAlign: 'right' }}>{kid.long_term_goal!.title}</p>
          </div>
        ) : (
          <p style={{ fontSize: 18, color: '#444', fontStyle: 'italic', flexShrink: 0 }}>Setting goals…</p>
        )}
      </div>

      <div style={{ marginTop: 'auto' }}>
        {hasGoal ? (
          <DomainProgressBar kidPoints={kp} totalEarned={kid.total_points_earned} targetCost={kid.long_term_goal!.cost} availablePoints={kid.available_points} height="lg" showLabel />
        ) : (
          <>
            <div style={{ height: 20, borderRadius: 999, background: '#2C2C2A' }}>
              <div style={{ height: '100%', borderRadius: 999, background: '#333', width: `${Math.min(100, (kid.total_points_earned / 200) * 100)}%` }} />
            </div>
            <p style={{ fontSize: 18, color: '#444', marginTop: 8 }}>Choose your goal in the app</p>
          </>
        )}
      </div>
    </div>
  )
}
