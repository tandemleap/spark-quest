'use client'

import { useState, useEffect, FormEvent } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Button } from '@/components/ui/Button'
import type { Drop, Adventure } from '@/lib/types'

interface AdventureWithContributors extends Adventure {
  points_contributed: number
  contributors: { kid_id: string; name_handle: string; points_spent: number }[]
}

const DEFAULT_DROP = { title: '', description: '', point_cost: 10, quantity_available: '' }
const DEFAULT_ADV = { title: '', description: '', point_cost_per_kid: 25, kids_threshold: 6, stays_open_after_unlock: false }

export default function AdminRewardsPage() {
  const [tab, setTab] = useState<'drops' | 'adventures'>('drops')
  const [drops, setDrops] = useState<Drop[]>([])
  const [adventures, setAdventures] = useState<AdventureWithContributors[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expandedAdv, setExpandedAdv] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dropForm, setDropForm] = useState(DEFAULT_DROP)
  const [advForm, setAdvForm] = useState(DEFAULT_ADV)
  const [saving, setSaving] = useState(false)
  const [unlocking, setUnlocking] = useState<string | null>(null)

  function getToken() { return sessionStorage.getItem('spark_admin_token') ?? '' }

  useEffect(() => {
    const token = getToken()
    Promise.all([
      fetch('/api/admin/rewards?type=drop', { headers: { 'x-admin-token': token } }).then(r => r.json()),
      fetch('/api/admin/rewards?type=adventure', { headers: { 'x-admin-token': token } }).then(r => r.json()),
    ]).then(([d, a]) => { setDrops(d); setAdventures(a); setLoading(false) })
  }, [])

  function openNew() {
    setEditingId(null)
    if (tab === 'drops') setDropForm(DEFAULT_DROP)
    else setAdvForm(DEFAULT_ADV)
    setShowForm(true)
  }

  function openEdit(item: Drop | AdventureWithContributors) {
    setEditingId(item.id)
    if (tab === 'drops') {
      const d = item as Drop
      setDropForm({ title: d.title, description: d.description ?? '', point_cost: d.point_cost, quantity_available: d.quantity_available !== null ? String(d.quantity_available) : '' })
    } else {
      const a = item as AdventureWithContributors
      setAdvForm({ title: a.title, description: a.description ?? '', point_cost_per_kid: a.point_cost_per_kid, kids_threshold: a.kids_threshold, stays_open_after_unlock: a.stays_open_after_unlock })
    }
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const type = tab === 'drops' ? 'drop' : 'adventure'
    const payload = tab === 'drops'
      ? { ...dropForm, quantity_available: dropForm.quantity_available !== '' ? Number(dropForm.quantity_available) : null, ...(editingId ? { id: editingId } : {}) }
      : { ...advForm, ...(editingId ? { id: editingId } : {}) }

    const res = await fetch(`/api/admin/rewards?type=${type}`, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) return
    const saved = await res.json()
    if (tab === 'drops') {
      setDrops(prev => editingId ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev])
    } else {
      setAdventures(prev => editingId ? prev.map(a => a.id === saved.id ? { ...saved, points_contributed: a.points_contributed, contributors: a.contributors } : a) : [{ ...saved, points_contributed: 0, contributors: [] }, ...prev])
    }
    setShowForm(false)
  }

  async function toggleActive(id: string, current: boolean) {
    const type = tab === 'drops' ? 'drop' : 'adventure'
    const res = await fetch(`/api/admin/rewards?type=${type}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({ id, is_active: !current }),
    })
    if (!res.ok) return
    const saved = await res.json()
    if (tab === 'drops') setDrops(prev => prev.map(d => d.id === saved.id ? saved : d))
    else setAdventures(prev => prev.map(a => a.id === saved.id ? { ...saved, points_contributed: a.points_contributed, contributors: a.contributors } : a))
  }

  async function manualUnlock(id: string) {
    setUnlocking(id)
    const res = await fetch('/api/admin/rewards?type=adventure', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({ id, is_unlocked: true, unlocked_at: new Date().toISOString() }),
    })
    setUnlocking(null)
    if (!res.ok) return
    const saved = await res.json()
    setAdventures(prev => prev.map(a => a.id === saved.id ? { ...saved, points_contributed: a.points_contributed, contributors: a.contributors } : a))
  }

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[--color-text]">Rewards</h1>
          <Button size="sm" onClick={openNew}>+ New {tab === 'drops' ? 'Drop' : 'Adventure'}</Button>
        </div>

        <div className="flex gap-2 mb-5">
          {(['drops', 'adventures'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === t ? 'bg-[--color-accent] text-white' : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'}`}>
              {t === 'drops' ? '🎁 Drops' : '🗺 Adventures'}
            </button>
          ))}
        </div>

        {loading ? <p className="text-[--color-muted]">Loading...</p> : tab === 'drops' ? (
          <div className="flex flex-col gap-2">
            {drops.map(item => (
              <div key={item.id} className={`bg-[--color-surface] border rounded-2xl px-4 py-3 flex items-center gap-3 ${item.is_active ? 'border-[--color-border]' : 'border-[--color-border] opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[--color-text] truncate">{item.title}</p>
                  <p className="text-xs text-[--color-muted]">
                    {item.point_cost} pts{item.quantity_available !== null ? ` · ${item.quantity_available} left` : ' · unlimited'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(item)} className="text-xs text-[--color-accent-light] hover:underline">Edit</button>
                  <button onClick={() => toggleActive(item.id, item.is_active)} className={`text-xs ${item.is_active ? 'text-red-400' : 'text-green-400'} hover:underline`}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
            {drops.length === 0 && <p className="text-center text-[--color-muted] pt-8">No drops yet.</p>}
          </div>
        ) : (
          /* Adventures with contribution tracking */
          <div className="flex flex-col gap-3">
            {adventures.map(adv => {
              const goal = adv.point_cost_per_kid * adv.kids_threshold
              const pct = goal > 0 ? Math.min(100, Math.round((adv.points_contributed / goal) * 100)) : 0
              const isExpanded = expandedAdv === adv.id

              return (
                <div key={adv.id} className={`bg-[--color-surface] border rounded-2xl overflow-hidden ${adv.is_active ? 'border-[--color-border]' : 'border-[--color-border] opacity-50'}`}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[--color-text] truncate">{adv.title}</p>
                          {adv.is_unlocked && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-700/40 text-green-400 flex-shrink-0">
                              ✓ Unlocked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[--color-muted] mt-0.5">
                          {adv.point_cost_per_kid} pts/kid · {adv.kids_threshold} kids needed · {adv.contributors.length} contributing
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEdit(adv)} className="text-xs text-[--color-accent-light] hover:underline">Edit</button>
                        <button onClick={() => toggleActive(adv.id, adv.is_active)} className={`text-xs ${adv.is_active ? 'text-red-400' : 'text-green-400'} hover:underline`}>
                          {adv.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-[--color-muted] mb-1">
                        <span>{adv.points_contributed.toLocaleString()} / {goal.toLocaleString()} pts</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-[--color-bg] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: adv.is_unlocked ? '#22c55e' : 'var(--color-accent)' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!adv.is_unlocked && (
                        <button
                          onClick={() => manualUnlock(adv.id)}
                          disabled={unlocking === adv.id}
                          className="text-xs text-green-400 hover:underline disabled:opacity-50"
                        >
                          {unlocking === adv.id ? 'Unlocking…' : 'Mark as Unlocked'}
                        </button>
                      )}
                      {adv.contributors.length > 0 && (
                        <button onClick={() => setExpandedAdv(isExpanded ? null : adv.id)} className="text-xs text-[--color-muted] hover:text-[--color-text]">
                          {isExpanded ? '▲ Hide contributors' : `▼ ${adv.contributors.length} contributor${adv.contributors.length !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contributor list */}
                  {isExpanded && adv.contributors.length > 0 && (
                    <div className="border-t border-[--color-border] px-4 py-3 flex flex-col gap-1.5">
                      {adv.contributors.map((c, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-[--color-text]">{c.name_handle}</span>
                          <span className="text-[--color-muted] text-xs">{c.points_spent} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {adventures.length === 0 && <p className="text-center text-[--color-muted] pt-8">No adventures yet.</p>}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[--color-surface] rounded-3xl p-6 w-full max-w-md max-h-[90svh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[--color-text] mb-4">
              {editingId ? 'Edit' : 'New'} {tab === 'drops' ? 'Drop' : 'Adventure'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {tab === 'drops' ? (
                <>
                  <FInput label="Title" value={dropForm.title} onChange={v => setDropForm(f => ({ ...f, title: v }))} required />
                  <FTextarea label="Description" value={dropForm.description} onChange={v => setDropForm(f => ({ ...f, description: v }))} />
                  <FInput label="Point Cost" type="number" value={String(dropForm.point_cost)} onChange={v => setDropForm(f => ({ ...f, point_cost: Number(v) }))} required />
                  <FInput label="Quantity (leave blank = unlimited)" type="number" value={dropForm.quantity_available} onChange={v => setDropForm(f => ({ ...f, quantity_available: v }))} />
                </>
              ) : (
                <>
                  <FInput label="Title" value={advForm.title} onChange={v => setAdvForm(f => ({ ...f, title: v }))} required />
                  <FTextarea label="Description" value={advForm.description} onChange={v => setAdvForm(f => ({ ...f, description: v }))} />
                  <FInput label="Points Per Kid" type="number" value={String(advForm.point_cost_per_kid)} onChange={v => setAdvForm(f => ({ ...f, point_cost_per_kid: Number(v) }))} required />
                  <FInput label="Kids Needed (threshold)" type="number" value={String(advForm.kids_threshold)} onChange={v => setAdvForm(f => ({ ...f, kids_threshold: Number(v) }))} required />
                  <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                    <input type="checkbox" checked={advForm.stays_open_after_unlock} onChange={e => setAdvForm(f => ({ ...f, stays_open_after_unlock: e.target.checked }))} className="accent-[--color-accent]" />
                    Stays open after unlock (kids can keep contributing)
                  </label>
                </>
              )}
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" loading={saving}>Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function FInput({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]" />
    </div>
  )
}

function FTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent] resize-none" />
    </div>
  )
}
