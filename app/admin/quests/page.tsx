'use client'

import { useState, useEffect, useRef, FormEvent } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Button } from '@/components/ui/Button'
import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_EMOJIS, DOMAIN_COLORS } from '@/lib/types'
import type { Quest, Domain } from '@/lib/types'

const DEFAULT_FORM = {
  title: '',
  description: '',
  domain_tags: [] as Domain[],
  point_value: 10,
  repeatable: false,
  is_grit_quest: false,
  grit_powerup_description: '',
  grit_powerup_points: '' as string | number,
  expires_at: '',
  created_by: '',
  quest_type: 'standard' as 'standard' | 'record_chase',
  score_unit: '',
  score_direction: 'higher' as 'higher' | 'lower',
  record_set_points: '' as string | number,
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [domainFilter, setDomainFilter] = useState<'all' | Domain>('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  function getToken() { return sessionStorage.getItem('spark_admin_token') ?? '' }

  useEffect(() => {
    fetch('/api/admin/quests', { headers: { 'x-admin-token': getToken() } })
      .then(r => r.json())
      .then(data => { setQuests(data); setLoading(false) })
  }, [])

  function openNew() {
    setEditingQuest(null)
    setForm(DEFAULT_FORM)
    setImageUrl(null)
    setImageError(null)
    setShowForm(true)
  }

  function openEdit(q: Quest) {
    setEditingQuest(q)
    setImageUrl(q.image_url ?? null)
    setForm({
      title: q.title,
      description: q.description ?? '',
      domain_tags: q.domain_tags ?? [],
      point_value: q.point_value,
      repeatable: q.repeatable,
      is_grit_quest: q.is_grit_quest ?? false,
      grit_powerup_description: q.grit_powerup_description ?? '',
      grit_powerup_points: q.grit_powerup_points ?? '',
      expires_at: q.expires_at ? q.expires_at.slice(0, 10) : '',
      created_by: q.created_by ?? '',
      quest_type: q.quest_type ?? 'standard',
      score_unit: q.score_unit ?? '',
      score_direction: q.score_direction ?? 'higher',
      record_set_points: q.record_set_points ?? '',
    })
    setShowForm(true)
  }

  function toggleDomain(domain: Domain) {
    setForm(f => ({
      ...f,
      domain_tags: f.domain_tags.includes(domain)
        ? f.domain_tags.filter(d => d !== domain)
        : [...f.domain_tags, domain],
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const isRecordChase = form.quest_type === 'record_chase'
    const payload = {
      title: form.title,
      description: form.description || null,
      domain_tags: form.domain_tags,
      point_value: form.point_value,
      repeatable: isRecordChase ? true : form.repeatable,
      is_grit_quest: form.is_grit_quest,
      grit_powerup_description: form.is_grit_quest ? (form.grit_powerup_description || null) : null,
      grit_powerup_points: form.is_grit_quest && form.grit_powerup_points ? Number(form.grit_powerup_points) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      created_by: form.created_by.trim() || null,
      quest_type: form.quest_type,
      score_unit: isRecordChase ? (form.score_unit.trim() || null) : null,
      score_direction: isRecordChase ? form.score_direction : 'higher',
      record_set_points: isRecordChase && form.record_set_points !== '' ? Number(form.record_set_points) : 0,
      ...(editingQuest ? { id: editingQuest.id } : {}),
    }
    const res = await fetch('/api/admin/quests', {
      method: editingQuest ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) return
    const saved = await res.json()
    setQuests(prev => editingQuest ? prev.map(q => q.id === saved.id ? saved : q) : [saved, ...prev])
    setShowForm(false)
  }

  async function toggleActive(q: Quest) {
    const res = await fetch('/api/admin/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
      body: JSON.stringify({ id: q.id, is_active: !q.is_active }),
    })
    if (res.ok) {
      const saved = await res.json()
      setQuests(prev => prev.map(x => x.id === saved.id ? saved : x))
    }
  }

  async function handleImagePick(file: File) {
    if (!editingQuest) return
    setImageUploading(true)
    setImageError(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      const res = await fetch('/api/admin/upload-card-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': getToken() },
        body: JSON.stringify({ base64, entity_type: 'quest', entity_id: editingQuest.id }),
      })
      setImageUploading(false)
      if (res.ok) {
        const { image_url } = await res.json()
        setImageUrl(image_url)
        setImageError(null)
        setQuests(prev => prev.map(q => q.id === editingQuest.id ? { ...q, image_url } : q))
      } else {
        const body = await res.json().catch(() => ({}))
        setImageError(body.error ?? `Upload failed (${res.status})`)
      }
    }
    reader.onerror = () => { setImageUploading(false); setImageError('Could not read file') }
    reader.readAsDataURL(file)
  }

  const staffNames = Array.from(new Set(quests.map(q => q.created_by).filter(Boolean) as string[])).sort()

  const filtered = quests
    .filter(q => domainFilter === 'all' || (q.domain_tags ?? []).includes(domainFilter))
    .filter(q => staffFilter === 'all' || q.created_by === staffFilter)

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[--color-text]">Quests ({quests.length})</h1>
          <Button size="sm" onClick={openNew}>+ New Quest</Button>
        </div>

        {/* Domain filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-2">
          <FilterChip active={domainFilter === 'all'} onClick={() => setDomainFilter('all')}>All</FilterChip>
          {ALL_DOMAINS.map(d => (
            <FilterChip
              key={d}
              active={domainFilter === d}
              onClick={() => setDomainFilter(d)}
              color={DOMAIN_COLORS[d]}
            >
              {DOMAIN_EMOJIS[d]} {DOMAIN_LABELS[d]}
            </FilterChip>
          ))}
        </div>

        {staffNames.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4">
            <FilterChip active={staffFilter === 'all'} onClick={() => setStaffFilter('all')} small>All staff</FilterChip>
            {staffNames.map(name => (
              <FilterChip key={name} active={staffFilter === name} onClick={() => setStaffFilter(name)} small>{name}</FilterChip>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-[--color-muted]">Loading...</p>
        ) : (
          <div className="flex flex-col gap-2 mt-2">
            {filtered.map(q => (
              <div
                key={q.id}
                className={`bg-[--color-surface] border rounded-2xl px-4 py-3 flex items-center gap-3 ${q.is_active ? 'border-[--color-border]' : 'border-[--color-border] opacity-50'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-[--color-text] truncate">{q.title}</p>
                    {q.is_grit_quest && <span className="text-xs">🔥</span>}
                    {q.quest_type === 'record_chase' && <span className="text-xs">📊</span>}
                    {q.image_url && <span className="text-xs text-[--color-muted]">🖼</span>}
                  </div>
                  <p className="text-xs text-[--color-muted]">
                    {(q.domain_tags ?? []).map(d => `${DOMAIN_EMOJIS[d]} ${DOMAIN_LABELS[d]}`).join(' · ') || 'No domain'}
                    {' · '}{q.point_value} pts
                    {q.quest_type === 'record_chase' ? ` · ${q.score_unit ?? 'score'} (${q.score_direction ?? 'higher'})` : q.repeatable ? ' · repeatable' : ''}
                    {q.created_by ? ` · ${q.created_by}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(q)} className="text-xs text-[--color-accent-light] hover:underline">Edit</button>
                  <button onClick={() => toggleActive(q)} className={`text-xs ${q.is_active ? 'text-red-400' : 'text-green-400'} hover:underline`}>
                    {q.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[--color-muted] pt-8">No quests match this filter.</p>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="rounded-3xl p-6 w-full max-w-md max-h-[90svh] overflow-y-auto" style={{ background: 'var(--color-surface)' }}>
            <h2 className="text-xl font-bold text-[--color-text] mb-4">
              {editingQuest ? 'Edit Quest' : 'New Quest'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <AInput label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <ATextarea label="Description (shown to kids when they tap the quest)" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />

              {/* Card image — only available after quest is saved */}
              {editingQuest ? (
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
                  {imageError && (
                    <p className="text-red-500 text-xs mt-2">⚠️ {imageError}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[--color-muted] bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2">
                  💡 Save this quest first, then edit it to add a card image.
                </p>
              )}

              {/* Domain tags multi-select */}
              <div>
                <label className="text-xs text-[--color-muted] mb-2 block">Domain Tags (select all that apply)</label>
                <div className="flex gap-2 flex-wrap">
                  {ALL_DOMAINS.map(domain => {
                    const selected = form.domain_tags.includes(domain)
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
                        style={selected
                          ? { background: DOMAIN_COLORS[domain], borderColor: DOMAIN_COLORS[domain], color: '#fff' }
                          : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }
                        }
                      >
                        {DOMAIN_EMOJIS[domain]} {DOMAIN_LABELS[domain]}
                        {selected && ' ✓'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <AInput label="Points (awarded for beating the record, or for any completion if standard)" type="number" value={String(form.point_value)} onChange={v => setForm(f => ({ ...f, point_value: Number(v) }))} required />
              <AInput label="Posted by (staff name)" value={form.created_by} onChange={v => setForm(f => ({ ...f, created_by: v }))} />
              <AInput label="Expires (optional)" type="date" value={form.expires_at} onChange={v => setForm(f => ({ ...f, expires_at: v }))} />

              {/* Quest type */}
              <div>
                <label className="text-xs text-[--color-muted] mb-2 block">Quest Type</label>
                <div className="flex gap-2">
                  {(['standard', 'record_chase'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, quest_type: type }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
                      style={form.quest_type === type
                        ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#fff' }
                        : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }
                      }
                    >
                      {type === 'standard' ? '⚡ Standard' : '📊 Record Chase'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Record chase config */}
              {form.quest_type === 'record_chase' && (
                <div className="border border-[--color-border] rounded-2xl p-4 flex flex-col gap-3" style={{ background: '#e6f4ff' }}>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#3399cc]">Record Chase Settings</p>
                  <AInput
                    label="Score unit (e.g. jumps, seconds, meters)"
                    value={form.score_unit}
                    onChange={v => setForm(f => ({ ...f, score_unit: v }))}
                  />
                  <div>
                    <label className="text-xs text-[--color-muted] mb-2 block">Direction (what counts as better?)</label>
                    <div className="flex gap-2">
                      {(['higher', 'lower'] as const).map(dir => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, score_direction: dir }))}
                          className="flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-colors"
                          style={form.score_direction === dir
                            ? { background: '#3399cc', borderColor: '#3399cc', color: '#fff' }
                            : { background: 'var(--color-bg)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }
                          }
                        >
                          {dir === 'higher' ? '↑ Higher is better' : '↓ Lower is better'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <AInput
                    label="Points for setting initial record (usually 0 or 5)"
                    type="number"
                    value={String(form.record_set_points)}
                    onChange={v => setForm(f => ({ ...f, record_set_points: v }))}
                  />
                  <p className="text-xs text-[#3399cc]">
                    Record chase quests are always repeatable. Kids earn {form.point_value} pts each time they beat their personal best.
                  </p>
                </div>
              )}

              {form.quest_type === 'standard' && (
                <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                  <input type="checkbox" checked={form.repeatable} onChange={e => setForm(f => ({ ...f, repeatable: e.target.checked }))} className="accent-[--color-accent]" />
                  Repeatable
                </label>
              )}

              <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                <input type="checkbox" checked={form.is_grit_quest} onChange={e => setForm(f => ({ ...f, is_grit_quest: e.target.checked }))} className="accent-[--color-accent]" />
                🔥 Grit Quest (show flame badge on card)
              </label>

              {form.is_grit_quest && (
                <div className="bg-[--color-bg] border border-[--color-border] rounded-2xl p-4 flex flex-col gap-3">
                  <p className="text-xs text-[--color-muted] font-semibold uppercase tracking-wide">Grit Power-Up</p>
                  <ATextarea
                    label="Power-Up description (shown after verification)"
                    value={form.grit_powerup_description}
                    onChange={v => setForm(f => ({ ...f, grit_powerup_description: v }))}
                  />
                  <AInput
                    label="Bonus points for completing the Power-Up"
                    type="number"
                    value={String(form.grit_powerup_points)}
                    onChange={v => setForm(f => ({ ...f, grit_powerup_points: v }))}
                  />
                </div>
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

function FilterChip({
  active, onClick, children, small, color,
}: {
  active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean; color?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 rounded-full font-semibold transition-all duration-150 border-2 ${
        small ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
      }`}
      style={active && color
        ? { background: color, borderColor: color, color: '#fff' }
        : active
        ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)', color: '#fff' }
        : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-muted)' }
      }
    >
      {children}
    </button>
  )
}

function AInput({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]" />
    </div>
  )
}

function ATextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent] resize-none" />
    </div>
  )
}
