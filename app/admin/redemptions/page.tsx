'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Redemption {
  id: string
  reward_type: 'drop' | 'adventure'
  reward_title: string
  points_spent: number
  redeemed_at: string
  kids: { id: string; name_handle: string }
}

export default function AdminRedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('spark_admin_token') ?? ''
    fetch('/api/admin/redemptions', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(data => { setRedemptions(data); setLoading(false) })
  }, [])

  const filtered = redemptions.filter(r =>
    r.kids?.name_handle?.toLowerCase().includes(search.toLowerCase()) ||
    r.reward_title?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSpent = filtered.reduce((s, r) => s + r.points_spent, 0)

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[--color-text]">
            Redemptions ({redemptions.length})
          </h1>
          <span className="text-sm text-[--color-muted]">{totalSpent.toLocaleString()} pts spent</span>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by kid or reward..."
          className="w-full bg-[--color-surface] border border-[--color-border] rounded-xl px-4 py-2.5 text-[--color-text] placeholder:text-[--color-muted] focus:outline-none focus:border-[--color-accent] mb-4"
        />

        {loading ? (
          <div className="flex justify-center pt-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(r => (
              <div key={r.id} className="bg-[--color-surface] border border-[--color-border] rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[--color-text] truncate">{r.kids?.name_handle}</span>
                    <span className="text-[--color-muted] text-sm">→</span>
                    <span className="text-[--color-text] truncate text-sm">{r.reward_title}</span>
                  </div>
                  <span className="text-red-400 font-bold text-sm flex-shrink-0">
                    -{r.points_spent} pts
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[--color-muted]">
                  <span className={`px-2 py-0.5 rounded-full border ${
                    r.reward_type === 'adventure'
                      ? 'border-[--color-accent]/40 text-[--color-accent-light]'
                      : 'border-[--color-border]'
                  }`}>
                    {r.reward_type === 'adventure' ? '🗺 Adventure' : '🎁 Drop'}
                  </span>
                  <span>·</span>
                  <span>{new Date(r.redeemed_at).toLocaleDateString()} {new Date(r.redeemed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[--color-muted] pt-8">No redemptions found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
