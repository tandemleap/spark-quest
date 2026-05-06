'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { PointsBadge } from '@/components/ui/PointsBadge'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CATEGORY_LABELS, CATEGORY_TEXT_COLORS } from '@/lib/types'
import type { Kid, Quest, Adventure } from '@/lib/types'

export default function HomePage() {
  const [kid, setKid] = useState<Kid | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [adventure, setAdventure] = useState<Adventure | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return

    Promise.all([
      fetch(`/api/kids/${kidId}`).then(r => r.json()),
      fetch('/api/quests').then(r => r.json()),
      fetch('/api/adventures').then(r => r.json()),
    ]).then(([kidData, questData, adventureData]) => {
      setKid(kidData)
      setQuests((questData as Quest[]).slice(0, 3))
      const active = (adventureData as Adventure[]).find(a => a.is_active && !a.is_unlocked)
      setAdventure(active || null)
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

  const progressPct = adventure
    ? Math.min(100, Math.round(((adventure.points_contributed ?? 0) / (adventure.point_cost_per_kid * adventure.kids_threshold)) * 100))
    : 0

  return (
    <div className="px-4 pt-8 pb-4 flex flex-col gap-5">
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
            <p className="text-[--color-muted] text-xs font-medium uppercase tracking-wide">SPARK Quest</p>
            <h1 className="text-xl font-bold text-[--color-text]">{kid.name_handle}</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <PointsBadge points={kid.total_points_earned} type="earned" size="sm" />
          <PointsBadge points={kid.available_points} type="available" size="sm" />
        </div>
      </div>

      {/* Adventure hero card */}
      {adventure && (
        <Card
          className="animate-slide-up"
          style={{ animationDelay: '0.05s', opacity: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[--color-accent-light]">
              🗺 Group Adventure
            </span>
            {adventure.is_unlocked && (
              <span className="text-xs font-bold text-green-400">UNLOCKED ✓</span>
            )}
          </div>
          <h2 className="text-xl font-bold text-[--color-text] mb-1">{adventure.title}</h2>
          <p className="text-[--color-muted] text-sm mb-4">{adventure.description}</p>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-[--color-muted] mb-1.5">
              <span>{adventure.points_contributed ?? 0} pts contributed</span>
              <span>{adventure.point_cost_per_kid * adventure.kids_threshold} pts needed</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3">
              <div
                className="bg-[--color-accent] h-3 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-[--color-muted]">
            {adventure.kids_threshold} kids × {adventure.point_cost_per_kid} pts to unlock
          </p>
        </Card>
      )}

      {/* Featured quests */}
      <div className="animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-[--color-text]">Active Quests</h2>
          <Link href="/quests" className="text-[--color-accent-light] text-sm font-semibold">
            See all →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {quests.map((q, i) => (
            <Link key={q.id} href="/quests">
              <Card
                category={q.category}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 + i * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: CATEGORY_TEXT_COLORS[q.category] }}
                      >
                        {CATEGORY_LABELS[q.category]}
                      </span>
                      {q.repeatable && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-black/20" style={{ color: CATEGORY_TEXT_COLORS[q.category] }}>
                          Repeatable
                        </span>
                      )}
                    </div>
                    <h3
                      className="font-bold text-base leading-tight"
                      style={{ color: CATEGORY_TEXT_COLORS[q.category] }}
                    >
                      {q.title}
                    </h3>
                  </div>
                  <div
                    className="ml-3 flex items-center gap-1 font-bold text-lg"
                    style={{ color: CATEGORY_TEXT_COLORS[q.category] }}
                  >
                    ⚡{q.point_value}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <Link href="/rewards">
          <Card className="text-center py-6">
            <span className="text-3xl block mb-1">🎁</span>
            <span className="text-sm font-semibold text-[--color-text]">Rewards</span>
            <p className="text-xs text-[--color-muted] mt-0.5">{kid.available_points} pts to spend</p>
          </Card>
        </Link>
        <Link href="/leaderboard">
          <Card className="text-center py-6">
            <span className="text-3xl block mb-1">🏆</span>
            <span className="text-sm font-semibold text-[--color-text]">Leaderboard</span>
            <p className="text-xs text-[--color-muted] mt-0.5">See the rankings</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
