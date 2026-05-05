'use client'

import { useState, useEffect, FormEvent } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Button } from '@/components/ui/Button'
import type { Quest, QuestCategory } from '@/lib/types'

const CATEGORIES: QuestCategory[] = ['creativity', 'movement', 'learning', 'community']

const DEFAULT_FORM = {
  title: '',
  description: '',
  category: 'community' as QuestCategory,
  point_value: 10,
  repeatable: false,
  expires_at: '',
}

export default function AdminQuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)

  function getToken() {
    return sessionStorage.getItem('spark_admin_token') ?? ''
  }

  useEffect(() => {
    fetch('/api/admin/quests', { headers: { 'x-admin-token': getToken() } })
      .then(r => r.json())
      .then(data => {
        setQuests(data)
        setLoading(false)
      })
  }, [])

  function openNew() {
    setEditingQuest(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
  }

  function openEdit(q: Quest) {
    setEditingQuest(q)
    setForm({
      title: q.title,
      description: q.description ?? '',
      category: q.category,
      point_value: q.point_value,
      repeatable: q.repeatable,
      expires_at: q.expires_at ? q.expires_at.slice(0, 10) : '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const token = getToken()

    const payload = {
      ...form,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      ...(editingQuest ? { id: editingQuest.id } : {}),
    }

    const res = await fetch('/api/admin/quests', {
      method: editingQuest ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (!res.ok) return

    const saved = await res.json()
    if (editingQuest) {
      setQuests(prev => prev.map(q => q.id === saved.id ? saved : q))
    } else {
      setQuests(prev => [saved, ...prev])
    }
    setShowForm(false)
  }

  async function toggleActive(q: Quest) {
    const token = getToken()
    const res = await fetch('/api/admin/quests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ id: q.id, is_active: !q.is_active }),
    })
    if (res.ok) {
      const saved = await res.json()
      setQuests(prev => prev.map(x => x.id === saved.id ? saved : x))
    }
  }

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[--color-text]">Quests</h1>
          <Button size="sm" onClick={openNew}>+ New Quest</Button>
        </div>

        {loading ? (
          <p className="text-[--color-muted]">Loading...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {quests.map(q => (
              <div
                key={q.id}
                className={`bg-[--color-surface] border rounded-2xl px-4 py-3 flex items-center gap-3 ${
                  q.is_active ? 'border-[--color-border]' : 'border-[--color-border] opacity-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[--color-text] truncate">{q.title}</p>
                  <p className="text-xs text-[--color-muted]">{q.category} · {q.point_value} pts{q.repeatable ? ' · repeatable' : ''}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(q)}
                    className="text-xs text-[--color-accent-light] hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleActive(q)}
                    className={`text-xs ${q.is_active ? 'text-red-400' : 'text-green-400'} hover:underline`}
                  >
                    {q.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
          <div className="bg-[--color-surface] rounded-3xl p-6 w-full max-w-md max-h-[90svh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[--color-text] mb-4">
              {editingQuest ? 'Edit Quest' : 'New Quest'}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <AdminInput label="Title" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} required />
              <AdminTextarea label="Description" value={form.description} onChange={v => setForm(f => ({ ...f, description: v }))} />
              <div>
                <label className="text-xs text-[--color-muted] mb-1 block">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value as QuestCategory }))}
                  className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text]"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <AdminInput label="Points" type="number" value={String(form.point_value)} onChange={v => setForm(f => ({ ...f, point_value: Number(v) }))} required />
              <AdminInput label="Expires (optional)" type="date" value={form.expires_at} onChange={v => setForm(f => ({ ...f, expires_at: v }))} />
              <label className="flex items-center gap-2 text-sm text-[--color-text] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.repeatable}
                  onChange={e => setForm(f => ({ ...f, repeatable: e.target.checked }))}
                  className="accent-[--color-accent]"
                />
                Repeatable
              </label>
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

function AdminInput({ label, value, onChange, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]"
      />
    </div>
  )
}

function AdminTextarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs text-[--color-muted] mb-1 block">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent] resize-none"
      />
    </div>
  )
}
