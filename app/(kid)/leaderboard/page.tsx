'use client'

import { useState, useEffect } from 'react'
import { Avatar } from '@/components/ui/Avatar'
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

    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(data => {
        setKids(data)
        setLoading(false)
      })

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
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="animate-slide-down mb-6">
        <p className="font-barlow font-black text-[10px] uppercase tracking-[0.2em] text-[--color-muted] mb-0.5">
          SPARK Quest
        </p>
        <h1
          className="font-barlow font-black text-4xl uppercase text-[--color-text]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Leaderboard
        </h1>
        <p className="text-[--color-muted] text-sm mt-1">Ranked by total XP ⚡</p>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {kids.map((k, i) => {
          const isMe = k.id === myKidId
          const isTop3 = i < 3
          return (
            <div
              key={k.id}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 animate-slide-up ${
                isMe ? 'border' : 'border border-[--color-border]'
              }`}
              style={{
                background: isMe ? '#7C3AED22' : 'var(--color-surface)',
                borderColor: isMe ? '#7C3AED55' : undefined,
                animationDelay: `${i * 0.03}s`,
                opacity: 0,
              }}
            >
              {/* Rank */}
              <div className="w-10 text-center flex-shrink-0">
                {isTop3 ? (
                  <span className="text-xl">{MEDALS[i]}</span>
                ) : (
                  <span
                    className="font-barlow font-black text-lg text-[--color-muted]"
                  >
                    {i + 1}
                  </span>
                )}
              </div>

              <Avatar avatarUrl={k.avatar_url} handle={k.name_handle} size="md" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="font-barlow font-black text-base uppercase truncate"
                    style={{ color: isMe ? 'var(--color-accent-light)' : 'var(--color-text)' }}
                  >
                    {k.name_handle}
                  </span>
                  {isMe && <span className="text-[10px] text-[--color-accent-light] font-bold uppercase tracking-wide">(you)</span>}
                </div>
                <p className="text-xs text-[--color-muted]">{k.available_points} pts available</p>
              </div>

              <div className="flex-shrink-0 text-right">
                <span className="font-barlow font-black text-2xl text-[--color-accent-light]">
                  {k.total_points_earned}
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-[--color-muted] -mt-0.5">xp</span>
              </div>
            </div>
          )
        })}

        {kids.length === 0 && (
          <p className="text-center text-[--color-muted] pt-12">No one on the board yet — be first.</p>
        )}
      </div>
    </div>
  )
}
