'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { FullPageSpinner } from '@/components/ui/LoadingSpinner'

type LoginState = 'checking' | 'returning' | 'new' | 'submitting'

export default function LoginPage() {
  const router = useRouter()
  const [state, setState] = useState<LoginState>('checking')
  const [handle, setHandle] = useState('')
  const [storedHandle, setStoredHandle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    const kidHandle = localStorage.getItem('spark_kid_handle')
    if (kidId && kidHandle) {
      setStoredHandle(kidHandle)
      setState('returning')
    } else {
      setState('new')
    }
  }, [])

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    const trimmed = handle.trim()
    if (!trimmed) return
    setState('submitting')
    setError('')

    const res = await fetch('/api/kids', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name_handle: trimmed }),
    })

    if (res.status === 409) {
      setError(`"${trimmed}" is already taken. Try adding your last initial or a number.`)
      setState('new')
      return
    }

    if (!res.ok) {
      setError('Something went wrong. Try again.')
      setState('new')
      return
    }

    const { id } = await res.json()
    localStorage.setItem('spark_kid_id', id)
    localStorage.setItem('spark_kid_handle', trimmed)
    router.push('/onboarding/avatar')
  }

  if (state === 'checking') return <FullPageSpinner />

  if (state === 'returning') {
    return (
      <main className="app-shell min-h-screen flex flex-col items-center justify-center px-6 gap-8">
        <div className="flex flex-col items-center gap-4 animate-pop-in">
          <Avatar avatarUrl={null} handle={storedHandle} size="xl" />
          <div className="text-center">
            <p className="text-[--color-muted] text-sm mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-[--color-text]">{storedHandle}</h1>
          </div>
          <p className="text-[--color-muted] text-base">That you?</p>
        </div>

        <div className="flex flex-col gap-3 w-full animate-slide-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
          <Button size="lg" onClick={() => router.push('/home')}>
            Yeah, let&apos;s go! →
          </Button>
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              localStorage.removeItem('spark_kid_id')
              localStorage.removeItem('spark_kid_handle')
              setHandle('')
              setState('new')
            }}
          >
            Not me
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell min-h-screen flex flex-col px-6 pt-16 gap-8">
      <div className="animate-slide-down">
        <div className="inline-flex items-center gap-2 bg-[--color-accent]/20 border border-[--color-accent]/30 px-3 py-1 rounded-full mb-4">
          <span className="text-[--color-accent-light] text-sm font-semibold">⚡ SPARK Quest</span>
        </div>
        <h1 className="text-4xl font-bold text-[--color-text] leading-tight">
          What do people<br />call you?
        </h1>
        <p className="text-[--color-muted] mt-2 text-base">
          Pick a name or handle. This is how you&apos;ll show up on the leaderboard.
        </p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-slide-up" style={{ animationDelay: '0.15s', opacity: 0 }}>
        <input
          type="text"
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="e.g. Billy K, SkyHigh22, Maya..."
          maxLength={24}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="words"
          className="w-full bg-[--color-surface] border border-[--color-border] rounded-2xl px-5 py-4 text-lg text-[--color-text] placeholder:text-[--color-muted] focus:outline-none focus:border-[--color-accent] transition-colors"
        />

        {error && (
          <p className="text-red-400 text-sm px-1">{error}</p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={state === 'submitting'}
          disabled={!handle.trim()}
        >
          Let&apos;s go →
        </Button>
      </form>

      <p className="text-[--color-muted] text-xs text-center mt-auto pb-8">
        No email or password needed — just your name.
      </p>
    </main>
  )
}
