'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DOMAIN_LABELS, DOMAIN_EMOJIS } from '@/lib/types'
import type { Domain } from '@/lib/types'

interface Completion {
  id: string
  completed_at: string
  verified_by_initials: string | null
  points_awarded: number
  powerup_claimed: boolean
  kids: { id: string; name_handle: string; avatar_url: string | null }
  quests: { id: string; title: string; domain_tags: Domain[]; point_value: number }
}

export default function AdminCompletionsPage() {
  const [completions, setCompletions] = useState<Completion[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('spark_admin_token') ?? ''
    fetch('/api/admin/completions', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(data => { setCompletions(data); setLoading(false) })
  }, [])

  const filtered = completions.filter(c =>
    c.kids?.name_handle?.toLowerCase().includes(search.toLowerCase()) ||
    c.quests?.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.verified_by_initials?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[--color-text] mb-4">
          Quest Completions ({completions.length})
        </h1>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by kid, quest, or staff initials..."
          className="w-full bg-[--color-surface] border border-[--color-border] rounded-xl px-4 py-2.5 text-[--color-text] placeholder:text-[--color-muted] focus:outline-none focus:border-[--color-accent] mb-4"
        />

        {loading ? (
          <div className="flex justify-center pt-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(c => (
              <div key={c.id} className="bg-[--color-surface] border border-[--color-border] rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-[--color-text] truncate">{c.kids?.name_handle}</span>
                    <span className="text-[--color-muted] text-sm">→</span>
                    <span className="text-[--color-text] truncate text-sm">{c.quests?.title}</span>
                  </div>
                  <span className="text-[--color-accent-light] font-bold text-sm flex-shrink-0">
                    +{c.points_awarded} pts
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[--color-muted]">
                  <span>{(c.quests?.domain_tags ?? []).map(d => `${DOMAIN_EMOJIS[d]} ${DOMAIN_LABELS[d]}`).join(' · ') || '—'}</span>
                  {c.powerup_claimed && <span className="text-orange-400">🔥 +Grit</span>}
                  <span>·</span>
                  <span>{new Date(c.completed_at).toLocaleDateString()} {new Date(c.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {c.verified_by_initials && (
                    <>
                      <span>·</span>
                      <span>Verified by <strong>{c.verified_by_initials}</strong></span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[--color-muted] pt-8">No completions found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
