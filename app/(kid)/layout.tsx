'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { PointsToastContainer } from '@/components/ui/PointsToast'
import { FullPageSpinner } from '@/components/ui/LoadingSpinner'

export default function KidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)
  const [showGoalPrompt, setShowGoalPrompt] = useState(false)
  const [missingCount, setMissingCount] = useState(0)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) {
      router.replace('/')
      return
    }
    setChecked(true)

    // Show at most once per browser session
    if (sessionStorage.getItem('goals_prompt_dismissed')) return

    fetch(`/api/kids/${kidId}`)
      .then(r => r.json())
      .then(kid => {
        const missing = [kid.short_term_goal_id, kid.long_term_goal_id].filter(g => !g).length
        if (missing > 0) {
          setMissingCount(missing)
          setShowGoalPrompt(true)
        }
      })
      .catch(() => {})
  }, [router])

  function dismissPrompt() {
    sessionStorage.setItem('goals_prompt_dismissed', '1')
    setShowGoalPrompt(false)
  }

  function goToGoals() {
    dismissPrompt()
    router.push('/progress-station')
  }

  if (!checked) return <FullPageSpinner />

  return (
    <div className="app-shell min-h-screen bg-[--color-bg]">
      <main className="pb-nav">{children}</main>
      <BottomNav />
      <PointsToastContainer />
      {showGoalPrompt && (
        <GoalPromptSheet missingCount={missingCount} onSetGoals={goToGoals} onSkip={dismissPrompt} />
      )}
    </div>
  )
}

function GoalPromptSheet({
  missingCount,
  onSetGoals,
  onSkip,
}: {
  missingCount: number
  onSetGoals: () => void
  onSkip: () => void
}) {
  const both = missingCount === 2
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl px-6 pt-6 pb-12 animate-slide-up"
        style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
      >
        <div className="w-10 h-1 rounded-full bg-[--color-border] mx-auto mb-5" />

        <div className="text-center mb-6">
          <span className="text-4xl block mb-3">🎯</span>
          <h2
            className="font-barlow font-black text-2xl uppercase text-[--color-text] mb-2"
            style={{ letterSpacing: '-0.01em' }}
          >
            {both ? 'Set Your Goals!' : 'One Goal Missing'}
          </h2>
          <p className="text-[--color-muted] text-sm leading-snug max-w-xs mx-auto">
            {both
              ? "You haven't set a short-term or long-term goal yet. Goals help you track what you're working toward!"
              : "You're missing one of your goals. Head to Progress to finish setting up!"}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onSetGoals}
            style={{ background: 'var(--color-accent)', touchAction: 'manipulation' }}
            className="w-full py-4 rounded-2xl font-barlow font-black text-lg uppercase tracking-wide text-white"
          >
            Set My Goals →
          </button>
          <button
            type="button"
            onClick={onSkip}
            style={{ touchAction: 'manipulation' }}
            className="w-full py-3 text-sm font-semibold text-[--color-muted]"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
