'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function AdminLoginPage() {
  const router = useRouter()
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    })

    setLoading(false)
    setPasscode('')

    if (!res.ok) {
      setError('Invalid passcode.')
      return
    }

    const { token } = await res.json()
    sessionStorage.setItem('spark_admin_token', token)
    router.push('/admin/quests')
  }

  return (
    <main className="app-shell min-h-screen flex flex-col items-center justify-center px-6 gap-8 bg-[--color-bg]">
      <div className="text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-3xl font-bold text-[--color-text]">SPARK Staff</h1>
        <p className="text-[--color-muted] mt-1 text-sm">Enter your staff passcode to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <input
          type="password"
          value={passcode}
          onChange={e => setPasscode(e.target.value)}
          placeholder="Staff passcode"
          autoComplete="current-password"
          className="w-full bg-[--color-surface] border border-[--color-border] rounded-2xl px-5 py-4 text-lg text-[--color-text] placeholder:text-[--color-muted] focus:outline-none focus:border-[--color-accent] transition-colors"
        />
        {error && <p className="text-red-400 text-sm px-1">{error}</p>}
        <Button type="submit" size="lg" loading={loading} disabled={!passcode}>
          Enter
        </Button>
      </form>
    </main>
  )
}
