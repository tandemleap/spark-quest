'use client'

import { useState, FormEvent } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { Button } from '@/components/ui/Button'

export default function AdminSettingsPage() {
  const [current, setCurrent] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (newPass !== confirm) {
      setMessage({ type: 'error', text: 'New passcodes do not match.' })
      return
    }
    if (newPass.length < 4) {
      setMessage({ type: 'error', text: 'Passcode must be at least 4 characters.' })
      return
    }

    setLoading(true)
    setMessage(null)

    const token = sessionStorage.getItem('spark_admin_token') ?? ''
    const res = await fetch('/api/admin/passcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ current_passcode: current, new_passcode: newPass }),
    })

    setLoading(false)
    setCurrent('')
    setNewPass('')
    setConfirm('')

    if (!res.ok) {
      const { error } = await res.json()
      setMessage({ type: 'error', text: error ?? 'Something went wrong.' })
    } else {
      setMessage({ type: 'success', text: 'Passcode updated successfully.' })
    }
  }

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[--color-text] mb-6">Settings</h1>

        <div className="bg-[--color-surface] border border-[--color-border] rounded-3xl p-6">
          <h2 className="text-lg font-semibold text-[--color-text] mb-4">Change Staff Passcode</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-[--color-muted] mb-1 block">Current Passcode</label>
              <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password"
                className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]" />
            </div>
            <div>
              <label className="text-xs text-[--color-muted] mb-1 block">New Passcode</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required autoComplete="new-password"
                className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]" />
            </div>
            <div>
              <label className="text-xs text-[--color-muted] mb-1 block">Confirm New Passcode</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password"
                className="w-full bg-[--color-bg] border border-[--color-border] rounded-xl px-3 py-2 text-[--color-text] focus:outline-none focus:border-[--color-accent]" />
            </div>

            {message && (
              <p className={`text-sm px-1 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                {message.text}
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} disabled={!current || !newPass || !confirm} className="mt-1">
              Update Passcode
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
