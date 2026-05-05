'use client'

import { useState } from 'react'
import { PinEntry } from '@/components/ui/PinEntry'
import { Button } from '@/components/ui/Button'
import { fireConfetti } from '@/components/ui/ConfettiLayer'
import { showPointsToast } from '@/components/ui/PointsToast'
import type { Quest } from '@/lib/types'

interface QuestVerifyOverlayProps {
  quest: Quest
  onClose: () => void
  onSuccess: (pointsAwarded: number) => void
}

type OverlayState = 'pin' | 'initials' | 'success' | 'already_done'

export function QuestVerifyOverlay({ quest, onClose, onSuccess }: QuestVerifyOverlayProps) {
  const [state, setState] = useState<OverlayState>('pin')
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [verifiedPin, setVerifiedPin] = useState('')
  const [initials, setInitials] = useState('')
  const [verifying, setVerifying] = useState(false)

  async function handlePin(enteredPin: string) {
    setPinStatus('checking')

    const kidId = localStorage.getItem('spark_kid_id')

    const res = await fetch('/api/quests/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: enteredPin, kid_id: kidId, quest_id: quest.id }),
    })

    if (res.status === 401) {
      setPinStatus('error')
      setTimeout(() => setPinStatus('idle'), 900)
      return
    }

    if (res.status === 409) {
      setState('already_done')
      return
    }

    // PIN valid
    setPinStatus('success')
    setVerifiedPin(enteredPin)
    setTimeout(() => {
      setState('initials')
      setPinStatus('idle')
    }, 500)
  }

  async function handleInitialsSubmit() {
    if (!initials.trim()) return
    setVerifying(true)

    const kidId = localStorage.getItem('spark_kid_id')

    const res = await fetch('/api/quests/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kidId,
        quest_id: quest.id,
        passcode: verifiedPin,
        staff_initials: initials.trim().toUpperCase(),
      }),
    })

    setVerifying(false)

    if (res.status === 409) {
      setState('already_done')
      return
    }

    if (!res.ok) {
      // Re-show pin on unexpected failure
      setPinStatus('error')
      setState('pin')
      setTimeout(() => setPinStatus('idle'), 900)
      return
    }

    const { points_awarded } = await res.json()
    setState('success')
    fireConfetti()
    showPointsToast(points_awarded)
    onSuccess(points_awarded)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-[430px] mx-auto w-full bg-[--color-bg] rounded-t-3xl px-6 pt-6 pb-10 animate-slide-up">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[--color-text]">
            {state === 'pin' && 'Staff Verification'}
            {state === 'initials' && 'Staff Initials'}
            {state === 'success' && 'Quest Complete! 🎉'}
            {state === 'already_done' && 'Already Done'}
          </h2>
          <button onClick={onClose} className="text-[--color-muted] hover:text-[--color-text] text-2xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>

        {state === 'pin' && (
          <>
            <p className="text-[--color-muted] text-sm text-center mb-8">
              Have a SPARK staff member enter the passcode to verify:<br />
              <span className="text-[--color-text] font-semibold mt-1 block">"{quest.title}"</span>
            </p>
            <PinEntry onSubmit={handlePin} status={pinStatus} />
          </>
        )}

        {state === 'initials' && (
          <div className="flex flex-col gap-4">
            <p className="text-[--color-muted] text-sm text-center">
              Staff: enter your initials to confirm.
            </p>
            <input
              type="text"
              value={initials}
              onChange={e => setInitials(e.target.value.slice(0, 3))}
              placeholder="e.g. SG"
              maxLength={3}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="characters"
              className="w-full bg-[--color-surface] border border-[--color-border] rounded-2xl px-5 py-4 text-center text-2xl font-bold uppercase tracking-widest text-[--color-text] focus:outline-none focus:border-[--color-accent]"
            />
            <Button
              size="lg"
              loading={verifying}
              disabled={initials.trim().length < 1}
              onClick={handleInitialsSubmit}
            >
              Confirm & Award Points
            </Button>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-6xl animate-pop-in">⚡</div>
            <div className="text-center">
              <p className="text-4xl font-black text-[--color-accent-light]">+{quest.point_value} pts</p>
              <p className="text-[--color-muted] mt-1">Quest complete! Keep it up.</p>
            </div>
            <Button size="lg" onClick={onClose} className="mt-2 w-full">Back to Quests</Button>
          </div>
        )}

        {state === 'already_done' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="text-5xl">🚫</div>
            <p className="text-[--color-text] font-semibold">You already completed this one!</p>
            <p className="text-[--color-muted] text-sm">This quest can only be done once. Look for repeatable quests for more points.</p>
            <Button size="lg" variant="secondary" onClick={onClose}>Got it</Button>
          </div>
        )}
      </div>
    </div>
  )
}
