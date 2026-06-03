'use client'

import { useState, useEffect, useMemo } from 'react'
import { DomainProgressBar } from '@/components/ui/DomainProgressBar'
import { supabase } from '@/lib/supabase'
import type { Kid } from '@/lib/types'

// No auth, no nav. Landscape TV ambient display.

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
}

interface ScrollQuest {
  id: string
  title: string
  domain_tags: string[]
  point_value: number
  is_grit_quest: boolean
  image_url: string | null
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

// Pixel heights for scroll-duration calculation
const SPLASH_EACH_H = 800
const KID_H         = 516   // 500px card + 16px gap
const QUEST_H       = 296   // 280px card + 16px gap
const REWARD_H      = 576   // 560px card + 16px gap
// Left column is faster; right column is ~18% slower (longer duration)
const LEFT_SPEED    = 46    // px/s
const RIGHT_SPEED   = 38    // px/s

const DOMAIN_COLORS: Record<string, string> = {
  body:  '#ff9933', brain: '#ffcc33', heart: '#993399', hands: '#33cc00', team: '#3399cc',
}
const DOMAIN_BG: Record<string, string> = {
  body:  '#fff4e6', brain: '#fffde6', heart: '#f8e6f8', hands: '#eefee6', team: '#e6f4ff',
}
const DOMAIN_EMOJI: Record<string, string> = {
  body: '💪', brain: '🧠', heart: '❤️', hands: '🙌', team: '🤝',
}

type ColItem =
  | { kind: 'splash'; imageIndex: 0 | 1 | 2; uid: string }
  | { kind: 'kid';    data: ScrollKid;   uid: string }
  | { kind: 'quest';  data: ScrollQuest; uid: string }
  | { kind: 'reward'; data: ScrollReward; uid: string }

function buildColumn(
  splashIndices: (0 | 1 | 2)[],
  kids: ScrollKid[],
  quests: ScrollQuest[],
  rewards: ScrollReward[],
  suffix: string,
): ColItem[] {
  const items: ColItem[] = []
  splashIndices.forEach(idx => items.push({ kind: 'splash', imageIndex: idx, uid: `splash-${idx}${suffix}` }))

  const GROUP = 3
  let qi = 0, ri = 0
  for (let i = 0; i < kids.length; i += GROUP) {
    kids.slice(i, i + GROUP).forEach(k =>
      items.push({ kind: 'kid', data: k, uid: k.id + suffix })
    )
    const turn = Math.floor(i / GROUP)
    if (turn % 2 === 0 && qi < quests.length) {
      items.push({ kind: 'quest', data: quests[qi], uid: `quest-${quests[qi].id}${suffix}` })
      qi++
    } else if (ri < rewards.length) {
      items.push({ kind: 'reward', data: rewards[ri], uid: `reward-${rewards[ri].id}${suffix}` })
      ri++
    }
  }
  while (qi < quests.length) {
    items.push({ kind: 'quest', data: quests[qi], uid: `quest-${quests[qi].id}${suffix}` })
    qi++
  }
  while (ri < rewards.length) {
    items.push({ kind: 'reward', data: rewards[ri], uid: `reward-${rewards[ri].id}${suffix}` })
    ri++
  }
  return items
}

function colHeight(items: ColItem[]): number {
  return items.reduce((h, item) => {
    if (item.kind === 'splash') return h + SPLASH_EACH_H
    if (item.kind === 'kid')    return h + KID_H
    if (item.kind === 'quest')  return h + QUEST_H
    return h + REWARD_H
  }, 0)
}

function doubleCol(items: ColItem[]): ColItem[] {
  return [
    ...items,
    ...items.map(item => ({ ...item, uid: item.uid + '-b' })),
  ]
}

export default function ScrollPage() {
  const [kids, setKids] = useState<ScrollKid[]>([])
  const [rewards, setRewards] = useState<ScrollReward[]>([])
  const [quests, setQuests] = useState<ScrollQuest[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    function fetchAll() {
      fetch('/api/scroll')
        .then(r => r.json())
        .then(({ kids: k, recentCompletions: c, adventureProgress: ap, rewards: rw, quests: qs }) => {
          setKids(k)
          setRewards(rw ?? [])
          setQuests(qs ?? [])
          setCompletions(c)
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

  const leftKids  = useMemo(() => kids.filter((_, i) => i % 2 === 0), [kids])
  const rightKids = useMemo(() => kids.filter((_, i) => i % 2 !== 0), [kids])

  const leftQuests  = useMemo(() => quests.filter((_, i) => i % 2 === 0), [quests])
  const rightQuests = useMemo(() => quests.filter((_, i) => i % 2 !== 0), [quests])
  const leftRewards  = useMemo(() => rewards.filter((_, i) => i % 2 === 0), [rewards])
  const rightRewards = useMemo(() => rewards.filter((_, i) => i % 2 !== 0), [rewards])

  const leftItems  = useMemo(() => buildColumn([0],    leftKids,  leftQuests,  leftRewards,  '-l'), [leftKids, leftQuests, leftRewards])
  const rightItems = useMemo(() => buildColumn([1, 2], rightKids, rightQuests, rightRewards, '-r'), [rightKids, rightQuests, rightRewards])

  const leftDisplay  = useMemo(() => doubleCol(leftItems),  [leftItems])
  const rightDisplay = useMemo(() => doubleCol(rightItems), [rightItems])

  const leftDuration  = Math.max(40, Math.round(colHeight(leftItems)  / LEFT_SPEED))
  const rightDuration = Math.max(48, Math.round(colHeight(rightItems) / RIGHT_SPEED))

  const tickerItems = completions.map(c =>
    `⚡ ${c.kids?.name_handle ?? '?'} completed "${c.quests?.title ?? '?'}" +${c.points_awarded}pts`
  )
  const tickerText     = tickerItems.join('   ·   ')
  const doubledTicker  = tickerText + '   ·   ' + tickerText
  const tickerDuration = Math.max(30, tickerItems.length * 6)

  if (loading) {
    return (
      <div style={{ background: '#ffffff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#3399cc', fontSize: 32, fontWeight: 900 }}>Loading…</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Space Grotesk", system-ui, sans-serif', color: '#111111' }}>

      {/* ── Fixed Header ── */}
      <div style={{ height: 80, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', background: '#f4f4f4', borderBottom: '2px solid #dddddd' }}>
        <span style={{ fontSize: 28, fontFamily: 'var(--font-barlow)', fontWeight: 900, letterSpacing: '-0.01em', color: '#3399cc' }}>
          ⚡ SPARK QUEST
        </span>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#666666' }}>Progress Board</p>
          <p style={{ fontSize: 11, color: '#888888', marginTop: 2 }}>{kids.length} members • A–Z</p>
        </div>
        <div style={{ textAlign: 'right', minWidth: 260 }}>
          {adventureProgress ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', marginBottom: 4 }}>
                🗺 {adventureProgress.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#e0e0e0', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 999, background: '#3399cc', width: `${Math.min(100, (adventureProgress.contributed / adventureProgress.target) * 100)}%` }} />
                </div>
                <span style={{ fontSize: 11, color: '#666666', whiteSpace: 'nowrap' }}>
                  {adventureProgress.contributed.toLocaleString()} / {adventureProgress.target.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#888888' }}>No featured adventure</p>
          )}
        </div>
      </div>

      {/* ── Two-column parallax scroll ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 24px 0', display: 'flex', gap: 16 }}>

        {/* Left column — faster */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div
            className="scroll-up-infinite"
            style={{ '--scroll-duration': `${leftDuration}s` } as React.CSSProperties}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {leftDisplay.map((item, i) => <ColCard key={item.uid} item={item} cardIndex={i} />)}
            </div>
          </div>
        </div>

        {/* Right column — slower (parallax effect) */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div
            className="scroll-up-infinite"
            style={{ '--scroll-duration': `${rightDuration}s` } as React.CSSProperties}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {rightDisplay.map((item, i) => <ColCard key={item.uid} item={item} cardIndex={i} />)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Ticker ── */}
      <div style={{ height: 110, flexShrink: 0, background: '#f4f4f4', borderTop: '2px solid #dddddd', overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        {tickerText ? (
          <div className="ticker-scroll-infinite" style={{ '--ticker-duration': `${tickerDuration}s` } as React.CSSProperties}>
            <span style={{ fontSize: 46, fontFamily: 'var(--font-barlow)', fontWeight: 700, color: '#333333', paddingLeft: '100vw' }}>{doubledTicker}</span>
          </div>
        ) : (
          <span style={{ fontSize: 42, fontFamily: 'var(--font-barlow)', fontWeight: 700, color: '#888888', paddingLeft: 24 }}>No recent activity yet.</span>
        )}
      </div>
    </div>
  )
}

// ── Unified column card renderer ──────────────────────────────────────────────

function ColCard({ item, cardIndex }: { item: ColItem; cardIndex: number }) {
  if (item.kind === 'splash') return <SplashPanel imageIndex={item.imageIndex} />
  if (item.kind === 'kid')    return <KidCard kid={item.data} cardIndex={cardIndex} />
  if (item.kind === 'quest')  return <QuestCard quest={item.data} cardIndex={cardIndex} />
  return <RewardCard reward={item.data} />
}

// ── Splash panel ──────────────────────────────────────────────────────────────

function SplashPanel({ imageIndex }: { imageIndex: 0 | 1 | 2 }) {
  const splashImages = [
    { src: '/scroll-logo.png',        alt: 'SPARK Quest' },
    { src: '/scroll-motivational.png', alt: 'Motivational message' },
    { src: '/scroll-qr.png',          alt: 'QR code to join' },
  ]
  const img  = splashImages[imageIndex]
  const isQr = imageIndex === 2
  return (
    <div style={{ height: SPLASH_EACH_H, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isQr ? 16 : 0 }}>
      <img
        src={img.src}
        alt={img.alt}
        style={{ maxWidth: isQr ? 420 : '100%', maxHeight: SPLASH_EACH_H - 48, objectFit: 'contain', ...(isQr ? { background: '#fff', borderRadius: 20, padding: 16, border: '2px solid #dddddd' } : {}) }}
      />
      {isQr && (
        <p style={{ fontSize: 20, color: '#3399cc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Scan to join</p>
      )}
    </div>
  )
}

// ── Kid card — blue background; yellow pulse if scored today ──────────────────

function KidCard({ kid, cardIndex }: { kid: ScrollKid; cardIndex: number }) {
  const kp = { body: kid.body_points ?? 0, brain: kid.brain_points ?? 0, heart: kid.heart_points ?? 0, hands: kid.hands_points ?? 0, team: kid.team_points ?? 0 }
  const hasGoal   = !!kid.long_term_goal
  const scoredToday = kid.daily_points_today > 0

  // Yellow pulse for active scorers; blue glow for everyone else
  const glowDuration = scoredToday ? 2 : 3 + (cardIndex % 5)
  const glowDelay    = scoredToday ? '0s' : `${-((cardIndex * 1.1) % 8)}s`
  const animation    = scoredToday
    ? `yellow-pulse ${glowDuration}s ease-in-out infinite`
    : `card-glow ${glowDuration}s ease-in-out infinite`

  return (
    <div style={{
      background: '#e6f4ff',
      border: '2px solid #3399cc',
      borderRadius: 24,
      padding: '28px 28px 24px',
      minHeight: 500,
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      animation,
      animationDelay: glowDelay,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle blue orb */}
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: '#3399cc', opacity: 0.08, pointerEvents: 'none' }} />

      {/* Today badge */}
      {scoredToday && (
        <div style={{ position: 'absolute', top: 16, right: 16, background: '#ffcc33', borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 800, color: '#111111', letterSpacing: '0.05em' }}>
          +{kid.daily_points_today} today ⚡
        </div>
      )}

      {/* Avatar — centered, large */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 170, height: 170, borderRadius: '50%', overflow: 'hidden', border: scoredToday ? '4px solid #ffcc33' : '4px solid #3399cc', flexShrink: 0, background: '#c8e4f4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {kid.avatar_url ? (
            <img src={kid.avatar_url} alt={kid.name_handle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 60, color: '#3399cc', textTransform: 'uppercase' }}>
              {kid.name_handle.slice(0, 2)}
            </span>
          )}
        </div>
      </div>

      {/* Name + XP */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 40, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#111111', lineHeight: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {kid.name_handle}
        </p>
        <p style={{ fontSize: 20, color: '#444444', marginTop: 6 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 34, color: '#3399cc' }}>{kid.total_points_earned}</span>
          {' '}<span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 16 }}>xp earned</span>
        </p>
      </div>

      {/* Goal */}
      {hasGoal ? (
        <div style={{ textAlign: 'center', padding: '0 8px' }}>
          <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3399cc', marginBottom: 4, fontWeight: 700 }}>Working toward</p>
          <p style={{ fontSize: 18, color: '#1a5c8a', fontWeight: 700, lineHeight: 1.2 }}>{kid.long_term_goal!.title}</p>
        </div>
      ) : (
        <p style={{ fontSize: 16, color: '#7aaac5', fontStyle: 'italic', textAlign: 'center' }}>Setting goals…</p>
      )}

      {/* Progress bar */}
      <div style={{ marginTop: 'auto' }}>
        {hasGoal ? (
          <DomainProgressBar kidPoints={kp} totalEarned={kid.total_points_earned} targetCost={kid.long_term_goal!.cost} availablePoints={kid.available_points} height="lg" showLabel />
        ) : (
          <>
            <div style={{ height: 20, borderRadius: 999, background: '#c8e4f4' }}>
              <div style={{ height: '100%', borderRadius: 999, background: '#3399cc', width: `${Math.min(100, (kid.total_points_earned / 200) * 100)}%` }} />
            </div>
            <p style={{ fontSize: 16, color: '#7aaac5', marginTop: 8, textAlign: 'center' }}>Choose your goal in the app</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Quest card — image background if available ────────────────────────────────

function QuestCard({ quest, cardIndex }: { quest: ScrollQuest; cardIndex: number }) {
  const domain   = quest.domain_tags[0] ?? 'team'
  const accent   = DOMAIN_COLORS[domain] ?? '#3399cc'
  const bg       = DOMAIN_BG[domain]    ?? '#e6f4ff'
  const emoji    = DOMAIN_EMOJI[domain] ?? '⚡'
  const bobDelay = -((cardIndex * 0.7) % 3)
  const hasImage = !!quest.image_url

  return (
    <div style={{
      height: 280,
      background: hasImage ? '#111111' : bg,
      border: `2px solid ${accent}66`,
      borderLeft: hasImage ? `6px solid ${accent}` : `6px solid ${accent}`,
      borderRadius: 24,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background: image or glow orb */}
      {hasImage ? (
        <>
          <img src={quest.image_url!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.88) 45%, rgba(0,0,0,0.15) 100%)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: accent, opacity: 0.12, pointerEvents: 'none' }} />
      )}

      {/* Content */}
      <div style={{ position: 'relative', padding: '20px 32px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.85)' : accent }}>
            Active Challenge{quest.is_grit_quest ? '  🔥' : ''}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{
            fontFamily: 'var(--font-barlow)',
            fontWeight: 900,
            fontSize: 40,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: hasImage ? '#ffffff' : '#111111',
            margin: 0,
            flex: 1,
          }}>
            {quest.title}
          </h2>
          <span style={{
            fontFamily: 'var(--font-barlow)',
            fontWeight: 900,
            fontSize: 44,
            color: hasImage ? '#ffcc33' : accent,
            lineHeight: 1,
            flexShrink: 0,
            display: 'inline-block',
            animation: `badge-bob 3.5s ease-in-out infinite`,
            animationDelay: `${bobDelay}s`,
          }}>
            +{quest.point_value}<span style={{ fontSize: 18, opacity: 0.7 }}> pts</span>
          </span>
        </div>

        {!hasImage && (
          <p style={{ fontSize: 14, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
            Complete with a SPARK mentor
          </p>
        )}
      </div>
    </div>
  )
}

// ── Reward card — image background if available ───────────────────────────────

function RewardCard({ reward }: { reward: ScrollReward }) {
  const isDrop    = reward.type === 'drop'
  const accent    = isDrop ? '#ff9933' : '#3399cc'
  const bgColor   = isDrop ? '#fff4e6' : '#e6f4ff'
  const icon      = isDrop ? '🎁' : '🗺'
  const label     = isDrop ? 'Drop' : 'Group Adventure'
  const costLabel = isDrop ? `${reward.cost} pts` : `${reward.cost} pts / kid`
  const hasImage  = !!reward.image_url

  return (
    <div style={{
      height: 560,
      background: hasImage ? '#111111' : bgColor,
      border: `2px solid ${accent}66`,
      borderLeft: `6px solid ${accent}`,
      borderRadius: 24,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background: image or glow orb */}
      {hasImage ? (
        <>
          <img src={reward.image_url!} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.2) 100%)' }} />
        </>
      ) : (
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: accent, opacity: 0.1, pointerEvents: 'none' }} />
      )}

      {/* Content at the bottom */}
      <div style={{ position: 'relative', padding: '32px 48px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 36 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em', color: hasImage ? 'rgba(255,255,255,0.8)' : accent }}>{label}</span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 64, lineHeight: 1, textTransform: 'uppercase', letterSpacing: '-0.02em', color: hasImage ? '#ffffff' : '#111111', margin: 0 }}>
          {reward.title}
        </h2>

        {reward.description && !hasImage && (
          <p style={{ fontSize: 26, color: '#555555', lineHeight: 1.4, maxWidth: '90%', margin: 0 }}>{reward.description}</p>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 52, color: hasImage ? '#ffcc33' : accent, lineHeight: 1 }}>{costLabel}</span>
          <span style={{ fontSize: 18, color: hasImage ? 'rgba(255,255,255,0.65)' : '#666666', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            {isDrop ? '— spend in the app' : '— contribute together'}
          </span>
        </div>
      </div>
    </div>
  )
}
