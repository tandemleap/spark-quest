'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Button } from '@/components/ui/Button'
import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_EMOJIS, DOMAIN_COLORS } from '@/lib/types'
import type { Drop, Adventure, Domain, DomainRequirements } from '@/lib/types'

interface AdventureWithContributors extends Adventure {
  points_contributed: number
  contributors: { kid_id: string; name_handle: string; points_spent: number }[]
}

const BLANK_DOMAIN_REQS = (): Record<Domain, string> =>
  ({ body: '', brain: '', heart: '', hands: '', team: '' })

const DEFAULT_DROP = { title: '', description: '', point_cost: 10, quantity_available: '', is_featured: false, domain_requirements: BLANK_DOMAIN_REQS() }
const DEFAULT_ADV  = { title: '', description: '', point_cost_per_kid: 25, kids_threshold: 6, stays_open_after_unlock: false, is_featured: false, domain_requirements: BLANK_DOMAIN_REQS() }

function parseDomainReqs(raw: Record<Domain, string>): DomainRequirements {
  const out: DomainRequirements = {}
  for (const d of ALL_DOMAINS) {
    const v = Number(raw[d])
    if (v > 0) out[d] = v
  }
  return out
}

function domainReqsToStrings(reqs: DomainRequirements | undefined): Record<Domain, string> {
  const out = BLANK_DOMAIN_REQS()
  for (const d of ALL_DOMAINS) {
    if (reqs?.[d]) out[d] = String(reqs[d])
  }
  return out
}

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
  const [featuring, setFeaturing] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

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
    setImageUrl(null)
    if (tab === 'drops') setDropForm(DEFAULT_DROP)
    else setAdvForm(DEFAULT_ADV)
    setShowForm(true)
  }

  function openEdit(item: Drop | AdventureWithContributors) {
    setEditingId(item.id)
    setImageUrl(item.image_url ?? null)
    if (tab === 'drops') {
      const d = item as Drop
      setDropForm({
        title: d.title,
        description: d.description ?? '',
        point_cost: d.point_cost,
        quantity_available: d.quantity_available !== null ? String(d.quantity_available) : '',
        is_featured: d.is_featured ?? false,
        domain_requirements: domainReqsToStrings(d.domain_requirements),
      })
    } else {
      const a = item as AdventureWithContributors
      setAdvForm({
        title: a.title,
        description: a.description ?? '',
        point_cost_per_kid: a.point_cost_per_kid,
        kids_threshold: a.kids_threshold,
        stays_open_after_unlock: a.stays_open_after_unlock,
        is_featured: a.is_featured ?? false,
        domain_requirements: domainReqsToStrings(a.domain_requirements),
      })
    }
    setShowForm(true)
  }

  async function handleImagePick(file: File) {
    if (!editingId) return
    setImageUploading(true)
    const entity_type = tab === 'drops' ? 'drop' : 'adventure'
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      const res = await fetch('/api/admin/upload-card-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
        body: JSON.stringify({ base64, entity_type, entity_id: editingId }),
      })
      setImageUploading(false)
      if (res.ok) {
        const { image_url } = await res.json()
        setImageUrl(image_url)
        if (tab === 'drops') setDrops(prev => prev.map(d => d.id === editingId ? { ...d, image_url } : d))
        else setAdventures(prev => prev.map(a => a.id === editingId ? { ...a, image_url } : a))
      }
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const type = tab === 'drops' ? 'drop' : 'adventure'
    const payload = tab === 'drops'
      ? {
          ...dropForm,
          quantity_available: dropForm.quantity_available !== '' ? Number(dropForm.quantity_available) : null,
          domain_requirements: parseDomainReqs(dropForm.domain_requirements),
          ...(editingId ? { id: editingId } : {}),
        }
      : {
          ...advForm,
          domain_requirements: parseDomainReqs(advForm.domain_requirements),
          ...(editingId ? { id: editingId } : {}),
        }

    const res = await fetch(`/api/admin/rewards?type=${type}`, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) return
    const saved = await res.json()

    if (tab === 'drops') {
      // If this drop is now featured, clear featured on all others
      if (saved.is_featured) {
        setDrops(prev => prev.map(d => ({ ...d, is_featured: d.id === saved.id })))
        setAdventures(prev => prev.map(a => ({ ...a, is_featured: false })))
      } else {
        setDrops(prev => editingId ? prev.map(d => d.id === saved.id ? saved : d) : [saved, ...prev])
      }
    } else {
      if (saved.is_featured) {
        setDrops(prev => prev.map(d => ({ ...d, is_featured: false })))
        setAdventures(prev => prev.map(a => a.id === saved.id
          ? { ...saved, points_contributed: a.points_contributed, contributors: a.contributors }
          : { ...a, is_featured: false }
        ))
      } else {
        setAdventures(prev => editingId
          ? prev.map(a => a.id === saved.id ? { ...saved, points_contributed: a.points_contributed, contributors: a.contributors } : a)
          : [{ ...saved, points_contributed: 0, contributors: [] }, ...prev]
        )
      }
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

  async function toggleFeatured(id: string, type: 'drop' | 'adventure') {
    setFeaturing(id)
    const res = await fetch(`/api/admin/rewards?type=${type}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({ id, is_featured: true }),
    })
    setFeaturing(null)
    if (!res.ok) return
    // Clear all featured flags client-side, set this one
    setDrops(prev => prev.map(d => ({ ...d, is_featured: d.id === id && type === 'drop' })))
    setAdventures(prev => prev.map(a => ({ ...a, is_featured: a.id === id && type === 'adventure' })))
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[--color-text] truncate">{item.title}</p>
                    {item.is_featured && <span className="text-xs text-yellow-400 flex-shrink-0">⭐ Featured</span>}
                    {item.image_url && <span className="text-xs text-[--color-muted] flex-shrink-0">🖼</span>}
                  </div>
                  <p className="text-xs text-[--color-muted]">
                    {item.point_cost} pts{item.quantity_available !== null ? ` · ${item.quantity_available} left` : ' · unlimited'}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!item.is_featured && (
                    <button
                      onClick={() => toggleFeatured(item.id, 'drop')}
                      disabled={featuring === item.id}
                      className="text-xs text-yellow-400 hover:underline disabled:opacity-50"
                    >
                      ⭐ Feature
                    </button>
                  )}
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
                          {adv.is_featured && <span className="text-xs text-yellow-400 flex-shrink-0">⭐ Featured</span>}
                          {adv.is_unlocked && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-700/40 text-green-400 flex-shrink-0">✓ Unlocked</span>}
                        </div>
                        <p className="text-xs text-[--color-muted] mt-0.5">
                          {adv.point_cost_per_kid} pts/kid · {adv.kids_threshold} kids needed · {adv.contributors.length} contributing
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!adv.is_featured && (
                          <button
                            onClick={() => toggleFeatured(adv.id, 'adventure')}
                            disabled={featuring === adv.id}
                            className="text-xs text-yellow-400 hover:underline disabled:opacity-50"
                          >
                            ⭐ Feature
                          </button>
                        )}
                        <button onClick={() => openEdit(adv)} className="text-xs text-[--color-accent-light] hover:underline">Edit</button>
                        <button onClick={() => toggleActive(adv.id, adv.is_active)} className={`text-xs ${adv.is_active ? 'text-red-400' : 'text-green-400'} hover:underline`}>
                          {adv.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-[--color-muted] mb-1">
                        <span>{adv.points_contributed.toLocaleString()} / {goal.toLocaleString()} pts</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 bg-[--color-bg] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: adv.is_unlocked ? '#22c55e' : 'var(--color-accent)' }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {!adv.is_unlocked && (
                        <button onClick={() => manualUnlock(adv.id)} disabled={unlocking === adv.id} className="text-xs text-green-400 hover:underline disabled:opacity-50">
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
          <div className="rounded-3xl p-6 w-full max-w-md max-h-[90svh] overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
            <h2 className="text-xl font-bold text-[--color-text] mb-4">
              {editingId ? 'Edit' : 'New'} {tab === 'drops' ? 'Drop' : 'Adventure'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {tab === 'drops' ? (
                <>
                  <FInput label="Title" value={dropForm.title} onChange={v => setDropForm(f => ({ ...f, title: v }))} required />
                  <FTextarea label="Description" value={dropForm.description} onChange={v => setDropForm(f => ({ ...f, description: v }))} />
                  <FInput label="Point Cost" type="number" value={String(dropForm.point_cost)} onChange={v => setDropForm(f => ({ ...f, point_cost: Number(v) }))} required />
                  <FInput label="Quantity (leave blank = unlimited)" type="number" value={dropForm.quantity_available} onChange={v => setDropForm(f => ({ ...f, quantity_available: v }))} />
                  <DomainReqsForm
                    values={dropForm.domain_requirements}
                    onChange={v => setDropForm(f => ({ ...f, domain_requirements: v }))}
                  />
                  <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                    <input type="checkbox" checked={dropForm.is_featured} onChange={e => setDropForm(f => ({ ...f, is_featured: e.target.checked }))} className="accent-[--color-accent]" />
                    ⭐ Feature on home page
                  </label>
                </>
              ) : (
                <>
                  <FInput label="Title" value={advForm.title} onChange={v => setAdvForm(f => ({ ...f, title: v }))} required />
                  <FTextarea label="Description" value={advForm.description} onChange={v => setAdvForm(f => ({ ...f, description: v }))} />
                  <FInput label="Points Per Kid" type="number" value={String(advForm.point_cost_per_kid)} onChange={v => setAdvForm(f => ({ ...f, point_cost_per_kid: Number(v) }))} required />
                  <FInput label="Kids Needed (threshold)" type="number" value={String(advForm.kids_threshold)} onChange={v => setAdvForm(f => ({ ...f, kids_threshold: Number(v) }))} required />
                  <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                    <input type="checkbox" checked={advForm.stays_open_after_unlock} onChange={e => setAdvForm(f => ({ ...f, stays_open_after_unlock: e.target.checked }))} className="accent-[--color-accent]" />
                    Stays open after unlock
                  </label>
                  <DomainReqsForm
                    values={advForm.domain_requirements}
                    onChange={v => setAdvForm(f => ({ ...f, domain_requirements: v }))}
                  />
                  <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                    <input type="checkbox" checked={advForm.is_featured} onChange={e => setAdvForm(f => ({ ...f, is_featured: e.target.checked }))} className="accent-[--color-accent]" />
                    ⭐ Feature on home page
                  </label>
                </>
              )}
              {/* Card image — only available when editing */}
              {editingId ? (
                <div>
                  <label className="text-xs text-[--color-muted] mb-2 block">Card Image (shown on scroll display)</label>
                  <div className="flex items-center gap-3">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Card" className="w-20 h-14 object-cover rounded-xl border border-[--color-border]" />
                    ) : (
                      <div className="w-20 h-14 rounded-xl border border-dashed border-[--color-border] flex items-center justify-center text-[--color-muted] text-xs">No image</div>
                    )}
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImagePick(e.target.files[0]) }} />
                    <button
                      type="button"
                      disabled={imageUploading}
                      onClick={() => imageInputRef.current?.click()}
                      className="px-3 py-2 text-xs font-semibold rounded-xl border border-[--color-border] text-[--color-text] hover:border-[--color-accent] disabled:opacity-50"
                    >
                      {imageUploading ? 'Uploading…' : imageUrl ? 'Change image' : 'Upload image'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[--color-muted] bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2">
                  💡 Save this reward first, then edit it to add a card image.
                </p>
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

function DomainReqsForm({ values, onChange }: {
  values: Record<Domain, string>
  onChange: (v: Record<Domain, string>) => void
}) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-2 block font-semibold">
        Domain Requirements <span className="font-normal">(leave blank = no requirement)</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {ALL_DOMAINS.map(domain => (
          <div key={domain} className="flex items-center gap-2 bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0" style={{ color: DOMAIN_COLORS[domain] }}>
              {DOMAIN_EMOJIS[domain]}
            </span>
            <span className="text-xs text-[--color-text] flex-1">{DOMAIN_LABELS[domain]}</span>
            <input
              type="number"
              min="0"
              value={values[domain]}
              onChange={e => onChange({ ...values, [domain]: e.target.value })}
              placeholder="—"
              className="w-14 bg-transparent text-[--color-text] text-sm text-right focus:outline-none"
            />
          </div>
        ))}
      </div>
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
