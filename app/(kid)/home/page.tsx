'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { PointsBadge } from '@/components/ui/PointsBadge'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DOMAIN_LABELS, DOMAIN_EMOJIS, DOMAIN_COLORS, getDomainCardColor } from '@/lib/types'
import type { Kid, Quest, FeaturedReward } from '@/lib/types'

export default function HomePage() {
  const [kid, setKid] = useState<Kid | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [featured, setFeatured] = useState<FeaturedReward | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return

    Promise.all([
      fetch(`/api/kids/${kidId}`).then(r => r.json()),
      fetch('/api/quests').then(r => r.json()),
      fetch('/api/featured-reward').then(r => r.json()),
    ]).then(([kidData, questData, featuredData]) => {
      setKid(kidData)
      setQuests((questData as Quest[]).slice(0, 3))
      setFeatured(featuredData)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!kid) return null

  const adventureProgressPct = featured?.type === 'adventure'
    ? Math.min(100, Math.round(((featured.points_contributed ?? 0) / (featured.point_cost_per_kid * featured.kids_threshold)) * 100))
    : 0

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between animate-slide-down">
        <div className="flex items-center gap-3">
          <Link href="/onboarding/avatar" className="relative flex-shrink-0">
            <Avatar avatarUrl={kid.avatar_url} handle={kid.name_handle} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[--color-accent] rounded-full flex items-center justify-center text-white text-[10px] ring-2 ring-[--color-bg]">
              {kid.avatar_url ? '✎' : '+'}
            </span>
          </Link>
          <div>
            <p
              className="font-barlow font-black text-[10px] uppercase tracking-[0.2em] text-[--color-muted]"
            >
              SPARK Quest
            </p>
            <h1 className="font-barlow font-black text-2xl uppercase leading-none text-[--color-text]" style={{ letterSpacing: '-0.01em' }}>
              {kid.name_handle}
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <PointsBadge points={kid.total_points_earned} type="earned" size="sm" />
          <PointsBadge points={kid.available_points} type="available" size="sm" />
        </div>
      </div>

      {/* Hero wordmark */}
      <div className="animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <div
          className="rounded-2xl px-5 py-4 flex items-center justify-between"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div>
            <p className="font-barlow font-black text-4xl uppercase leading-none text-[--color-text]" style={{ letterSpacing: '-0.02em' }}>
              Level up.
            </p>
            <p className="text-[--color-muted] text-sm mt-1">
              Complete challenges. Earn rewards.
            </p>
          </div>
          <span className="text-5xl">⚡</span>
        </div>
      </div>

      {/* Active Quests */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <h2
            className="font-barlow font-black text-xl uppercase tracking-wide text-[--color-text]"
            style={{ letterSpacing: '0.02em' }}
          >
            Active Quests
          </h2>
          <Link href="/quests" className="text-[--color-accent-light] text-xs font-bold uppercase tracking-wider">
            See all →
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {quests.map((q, i) => {
            const bg = getDomainCardColor(q.domain_tags)
            const accent = q.domain_tags.length > 0 ? DOMAIN_COLORS[q.domain_tags[0]] : 'var(--color-accent)'
            return (
              <Link key={q.id} href="/quests">
                <div
                  className="card-grain rounded-2xl px-4 py-3.5 flex items-center justify-between animate-slide-up"
                  style={{
                    background: bg,
                    borderLeft: `4px solid ${accent}`,
                    animationDelay: `${0.1 + i * 0.05}s`,
                    opacity: 0,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {q.domain_tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold uppercase tracking-widest" style={{ color: DOMAIN_COLORS[tag] }}>
                          {DOMAIN_EMOJIS[tag]} {DOMAIN_LABELS[tag]}
                        </span>
                      ))}
                      {q.is_grit_quest && (
                        <span className="text-[10px] font-black uppercase px-1 py-0.5 rounded-sm" style={{ background: '#FF3322', color: '#fff' }}>🔥</span>
                      )}
                    </div>
                    <h3 className="font-barlow font-black text-lg uppercase leading-tight text-white" style={{ letterSpacing: '-0.01em' }}>
                      {q.title}
                    </h3>
                  </div>
                  <div className="ml-3 flex-shrink-0 font-barlow font-black text-xl" style={{ color: accent }}>
                    {q.point_value}<span className="text-xs font-bold ml-0.5 text-white/40">pt</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Featured reward card */}
      {featured && (
        <Card
          className="animate-slide-up"
          style={{ animationDelay: '0.2s', opacity: 0 }}
        >
          {featured.type === 'adventure' ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-barlow font-black text-xs uppercase tracking-[0.15em] text-[--color-accent-light]">
                  🗺 Group Adventure
                </span>
                {featured.is_unlocked && (
                  <span className="text-xs font-bold text-green-400 uppercase tracking-wide">UNLOCKED ✓</span>
                )}
              </div>
              <h2 className="font-barlow font-black text-2xl uppercase leading-tight text-[--color-text] mb-1" style={{ letterSpacing: '-0.01em' }}>
                {featured.title}
              </h2>
              {featured.description && (
                <p className="text-[--color-muted] text-sm mb-4 leading-snug">{featured.description}</p>
              )}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-[--color-muted] mb-1.5">
                  <span>{featured.points_contributed} pts contributed</span>
                  <span>{featured.point_cost_per_kid * featured.kids_threshold} pts needed</span>
                </div>
                <div className="w-full rounded-full h-2.5" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${adventureProgressPct}%`, background: 'var(--color-accent)' }}
                  />
                </div>
              </div>
              <p className="text-xs text-[--color-muted]">
                {featured.kids_threshold} kids × {featured.point_cost_per_kid} pts to unlock
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="font-barlow font-black text-xs uppercase tracking-[0.15em] text-[--color-accent-light]">
                  🎁 Featured Drop
                </span>
              </div>
              <h2 className="font-barlow font-black text-2xl uppercase leading-tight text-[--color-text] mb-1" style={{ letterSpacing: '-0.01em' }}>
                {featured.title}
              </h2>
              {featured.description && (
                <p className="text-[--color-muted] text-sm mb-4 leading-snug">{featured.description}</p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[--color-muted] text-sm">
                  <span className="font-barlow font-black text-xl text-[--color-accent-light]">{featured.point_cost}</span>
                  <span className="text-xs ml-1 uppercase tracking-wide">pts</span>
                </p>
                <Link href="/rewards" className="text-xs text-[--color-accent-light] font-bold uppercase tracking-wider">
                  Rewards →
                </Link>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
        <Link href="/rewards">
          <Card className="text-center py-5 active:scale-[0.97] transition-transform duration-100">
            <span className="text-3xl block mb-2">🎁</span>
            <span className="font-barlow font-black text-sm uppercase tracking-wide text-[--color-text]">Rewards</span>
            <p className="text-xs text-[--color-muted] mt-0.5">{kid.available_points} pts to spend</p>
          </Card>
        </Link>
        <Link href="/progress-station">
          <Card className="text-center py-5 active:scale-[0.97] transition-transform duration-100">
            <span className="text-3xl block mb-2">📈</span>
            <span className="font-barlow font-black text-sm uppercase tracking-wide text-[--color-text]">Progress</span>
            <p className="text-xs text-[--color-muted] mt-0.5">Goals & history</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
