'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Kid } from '@/lib/types'

export default function AdminKidsPage() {
  const [kids, setKids] = useState<Kid[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKid, setEditingKid] = useState<Kid | null>(null)
  const [availableAdj, setAvailableAdj] = useState('')
  const [totalAdj, setTotalAdj] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  function getToken() { return sessionStorage.getItem('spark_admin_token') ?? '' }

  useEffect(() => {
    fetch('/api/admin/kids', { headers: { 'x-admin-token': getToken() } })
      .then(r => r.json())
      .then(data => { setKids(data); setLoading(false) })
  }, [])

  function openEdit(kid: Kid) {
    setEditingKid(kid)
    setAvailableAdj(String(kid.available_points))
    setTotalAdj(String(kid.total_points_earned))
  }

  async function savePoints() {
    if (!editingKid) return
    setSaving(true)
    const res = await fetch('/api/admin/kids', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({
        id: editingKid.id,
        available_points: Number(availableAdj),
        total_points_earned: Number(totalAdj),
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setKids(prev => prev.map(k => k.id === updated.id ? updated : k))
      setEditingKid(null)
    }
  }

  const filtered = kids.filter(k =>
    k.name_handle.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[--color-text] mb-4">Kids ({kids.length})</h1>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name..."
          className="w-full bg-[--color-surface] border border-[--color-border] rounded-xl px-4 py-2.5 text-[--color-text] placeholder:text-[--color-muted] focus:outline-none focus:border-[--color-accent] mb-4"
        />

        {loading ? (
          <div className="flex justify-center pt-12"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((kid, i) => (
              <div key={kid.id} className={`bg-[--color-surface] border border-[--color-border] rounded-2xl px-4 py-3 flex items-center gap-3 animate-slide-up`} style={{ animationDelay: `${i * 0.02}s`, opacity: 0 }}>
                <Avatar avatarUrl={kid.avatar_url} handle={kid.name_handle} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[--color-text] truncate">{kid.name_handle}</p>
                  <p className="text-xs text-[--color-muted]">
                    {kid.total_points_earned} earned · {kid.available_points} available
                  </p>
                </div>
                <button
                  onClick={() => openEdit(kid)}
                  className="text-xs text-[--color-accent-light] hover:underline flex-shrink-0"
                >
                  Adjust
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[--color-muted] pt-8">No kids found.</p>
            )}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingKid && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[--color-surface] rounded-3xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-5">
              <Avatar avatarUrl={editingKid.avatar_url} handle={editingKid.name_handle} size="md" />
              <h2 className="text-lg font-bold text-[--color-text]">{editingKid.name_handle}</h2>
            </div>

            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="text-xs text-[--color-muted] mb-1 block">Available Points (to spend)</label>
                <input
                  type="number"
                  value={availableAdj}
                  onChange={e => setAvailableAdj(e.target.value)}
                  className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]"
                />
              </div>
              <div>
                <label className="text-xs text-[--color-muted] mb-1 block">Total Points Earned (leaderboard)</label>
                <input
                  type="number"
                  value={totalAdj}
                  onChange={e => setTotalAdj(e.target.value)}
                  className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingKid(null)}>Cancel</Button>
              <Button className="flex-1" loading={saving} onClick={savePoints}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
