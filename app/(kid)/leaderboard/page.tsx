'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { PointsBadge } from '@/components/ui/PointsBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { supabase } from '@/lib/supabase'
import type { Kid } from '@/lib/types'

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [myKidId, setMyKidId] = useState<string | null>(null)

  useEffect(() => {
    setMyKidId(localStorage.getItem('spark_kid_id'))

    // Initial fetch
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setKids(data)
        setLoading(false)
      })

    // Realtime subscription
    const channel = supabase
      .channel('leaderboard-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kids' },
        (payload) => {
          setKids(prev =>
            prev
              .map(k => k.id === payload.new.id ? (payload.new as Kid) : k)
              .sort((a, b) => b.total_points_earned - a.total_points_earned)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="animate-slide-down mb-6">
        <h1 className="text-3xl font-bold text-[--color-text]">Leaderboard</h1>
        <p className="text-[--color-muted] text-sm mt-1">Ranked by total points earned ⚡</p>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {kids.map((k, i) => {
          const isMe = k.id === myKidId
          return (
            <div
              key={k.id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 animate-slide-up ${
                isMe
                  ? 'bg-[--color-accent]/20 border border-[--color-accent]/40'
                  : 'bg-[--color-surface] border border-[--color-border]'
              }`}
              style={{ animationDelay: `${i * 0.03}s`, opacity: 0 }}
            >
              {/* Rank */}
              <div className="w-8 text-center text-lg flex-shrink-0">
                {i < 3 ? MEDALS[i] : <span className="text-[--color-muted] text-sm font-bold">#{i + 1}</span>}
              </div>

              <Avatar avatarUrl={k.avatar_url} handle={k.name_handle} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold truncate ${isMe ? 'text-[--color-accent-light]' : 'text-[--color-text]'}`}>
                    {k.name_handle}
                  </span>
                  {isMe && <span className="text-xs text-[--color-accent-light] font-medium">(you)</span>}
                </div>
                <p className="text-xs text-[--color-muted]">{k.available_points} pts to spend</p>
              </div>

              <PointsBadge points={k.total_points_earned} type="earned" size="sm" />
            </div>
          )
        })}

        {kids.length === 0 && (
          <p className="text-center text-[--color-muted] pt-12">No one on the board yet — be the first!</p>
        )}
      </div>
    </div>
  )
}
