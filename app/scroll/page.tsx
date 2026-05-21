'use client'

import { useState, useEffect, useMemo } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { DomainProgressBar } from '@/components/ui/DomainProgressBar'
import { supabase } from '@/lib/supabase'
import type { Kid } from '@/lib/types'

// No auth, no nav. Landscape TV ambient display.

interface ScrollKid extends Pick<Kid, 'id' | 'name_handle' | 'total_points_earned' | 'available_points' | 'avatar_url' | 'body_points' | 'brain_points' | 'heart_points' | 'hands_points' | 'team_points'> {
  long_term_goal: { title: string; cost: number } | null
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

export default function ScrollPage() {
  const [kids, setKids] = useState<ScrollKid[]>([])
  const [completions, setCompletions] = useState<Completion[]>([])
  const [adventureProgress, setAdventureProgress] = useState<AdventureProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/scroll')
      .then(r => r.json())
      .then(({ kids: k, recentCompletions: c, adventureProgress: ap }) => {
        setKids(k)
        setCompletions(c)
        setAdventureProgress(ap)
        setLoading(false)
      })

    // Live updates when any kid's points change
    const channel = supabase
      .channel('scroll-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'kids' }, (payload) => {
        setKids(prev => prev.map(k => k.id === payload.new.id ? { ...k, ...payload.new } : k))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  // Duplicate list for seamless infinite scroll
  const displayKids = useMemo(() => [...kids, ...kids], [kids])

  // Duration: ~4.5s per row of 4 cards
  const rowCount = Math.ceil(kids.length / 4)
  const scrollDuration = Math.max(40, rowCount * 4.5)

  // Ticker text built from completions
  const tickerItems = completions.map(c =>
    `⚡ ${c.kids?.name_handle ?? '?'} completed "${c.quests?.title ?? '?'}" +${c.points_awarded}pts`
  )
  const tickerText = tickerItems.join('   ·   ')
  const doubledTicker = tickerText + '   ·   ' + tickerText
  const tickerDuration = Math.max(30, tickerItems.length * 6)

  if (loading) {
    return (
      <div style={{ background: '#0D0D0D', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#7C3AED', fontSize: 32, fontWeight: 900 }}>Loading...</span>
      </div>
    )
  }

  return (
    <div style={{ background: '#0D0D0D', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '"Space Grotesk", system-ui, sans-serif', color: '#F5F5F5' }}>

      {/* ── Fixed Header ── */}
      <div style={{
        height: 80, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px',
        background: '#141414',
        borderBottom: '1px solid #303030',
      }}>
        {/* Left: wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28, fontFamily: 'var(--font-barlow)', fontWeight: 900, letterSpacing: '-0.01em', color: '#A78BFA' }}>⚡ SPARK QUEST</span>
        </div>

        {/* Center */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#777' }}>
            Progress Board
          </p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
            {kids.length} members • sorted A–Z
          </p>
        </div>

        {/* Right: adventure progress */}
        <div style={{ textAlign: 'right', minWidth: 260 }}>
          {adventureProgress ? (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#A78BFA', marginBottom: 4 }}>
                🗺 {adventureProgress.title}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 8, borderRadius: 999, background: '#2C2C2A', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.min(100, (adventureProgress.contributed / adventureProgress.target) * 100)}%`,
                    background: '#7C3AED', borderRadius: 999,
                  }} />
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

      {/* ── Scrolling Grid ── */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '24px 32px 0' }}>
        <div
          className="scroll-up-infinite"
          style={{ '--scroll-duration': `${scrollDuration}s` } as React.CSSProperties}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {displayKids.map((kid, i) => (
              <KidCard key={`${kid.id}-${i}`} kid={kid} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Fixed Bottom Ticker ── */}
      <div style={{
        height: 48, flexShrink: 0,
        background: '#141414',
        borderTop: '1px solid #303030',
        overflow: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        {tickerText ? (
          <div
            className="ticker-scroll-infinite"
            style={{ '--ticker-duration': `${tickerDuration}s` } as React.CSSProperties}
          >
            <span style={{ fontSize: 15, color: '#555', paddingLeft: '100vw' }}>{doubledTicker}</span>
          </div>
        ) : (
          <span style={{ fontSize: 14, color: '#444', paddingLeft: 24 }}>No recent activity yet.</span>
        )}
      </div>
    </div>
  )
}

function KidCard({ kid }: { kid: ScrollKid }) {
  const kp = {
    body:  kid.body_points  ?? 0,
    brain: kid.brain_points ?? 0,
    heart: kid.heart_points ?? 0,
    hands: kid.hands_points ?? 0,
    team:  kid.team_points  ?? 0,
  }
  const hasGoal = !!kid.long_term_goal

  return (
    <div style={{
      background: '#1A1A1A',
      border: '1px solid #2A2A2A',
      borderRadius: 16,
      padding: '18px 20px',
      minHeight: 190,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar avatarUrl={kid.avatar_url} handle={kid.name_handle} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', letterSpacing: '-0.01em', color: '#F5F5F5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {kid.name_handle}
          </p>
          <p style={{ fontSize: 12, color: '#777', marginTop: 2 }}>
            <span style={{ fontFamily: 'var(--font-barlow)', fontWeight: 900, fontSize: 16, color: '#A78BFA' }}>
              {kid.total_points_earned}
            </span>{' '}
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 10 }}>xp</span>
          </p>
        </div>
        {hasGoal && (
          <div style={{ textAlign: 'right', flexShrink: 0, maxWidth: 120 }}>
            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#555', marginBottom: 2 }}>Goal</p>
            <p style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, lineHeight: 1.2, textAlign: 'right' }}>
              {kid.long_term_goal!.title}
            </p>
          </div>
        )}
        {!hasGoal && (
          <p style={{ fontSize: 11, color: '#444', fontStyle: 'italic', flexShrink: 0 }}>Setting goals…</p>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 'auto' }}>
        {hasGoal ? (
          <DomainProgressBar
            kidPoints={kp}
            totalEarned={kid.total_points_earned}
            targetCost={kid.long_term_goal!.cost}
            availablePoints={kid.available_points}
            height="sm"
            showLabel
          />
        ) : (
          <>
            <div style={{ height: 12, borderRadius: 999, background: '#2C2C2A' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: '#333',
                width: `${Math.min(100, (kid.total_points_earned / 200) * 100)}%`,
              }} />
            </div>
            <p style={{ fontSize: 10, color: '#444', marginTop: 4 }}>Choose your goal in the app</p>
          </>
        )}
      </div>
    </div>
  )
}
