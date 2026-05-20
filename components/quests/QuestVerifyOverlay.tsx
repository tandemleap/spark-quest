'use client'

import { useState, useEffect, useRef } from 'react'
import { PinEntry } from '@/components/ui/PinEntry'
import { Button } from '@/components/ui/Button'
import { fireConfetti } from '@/components/ui/ConfettiLayer'
import { showPointsToast } from '@/components/ui/PointsToast'
import type { Quest } from '@/lib/types'

// Delay in ms between API success and celebration firing —
// gives staff time to hand the phone back to the kid.
const HANDOFF_DELAY = 2800

interface QuestVerifyOverlayProps {
  quest: Quest
  onClose: () => void
  onSuccess: (pointsAwarded: number) => void
}

type OverlayState = 'pin' | 'initials' | 'powerup' | 'handoff' | 'success' | 'already_done'

function playSound(path: string) {
  try {
    const audio = new Audio(path)
    audio.volume = 0.85
    audio.play().catch(() => {}) // ignore autoplay policy errors
  } catch {}
}

export function QuestVerifyOverlay({ quest, onClose, onSuccess }: QuestVerifyOverlayProps) {
  const [state, setState] = useState<OverlayState>('pin')
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [verifiedPin, setVerifiedPin] = useState('')
  const [initials, setInitials] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [totalPointsAwarded, setTotalPointsAwarded] = useState(0)
  const [powerupClaimed, setPowerupClaimed] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown tick during handoff state
  useEffect(() => {
    if (state !== 'handoff') return
    setCountdown(3)
    let n = 3
    countdownRef.current = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) clearInterval(countdownRef.current!)
    }, 1000)
    return () => clearInterval(countdownRef.current!)
  }, [state])

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
    if (res.status === 409) { setState('already_done'); return }
    setPinStatus('success')
    setVerifiedPin(enteredPin)
    setTimeout(() => { setState('initials'); setPinStatus('idle') }, 500)
  }

  async function submitQuest(claimed: boolean) {
    setVerifying(true)
    setPowerupClaimed(claimed)
    const kidId = localStorage.getItem('spark_kid_id')
    const res = await fetch('/api/quests/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kidId,
        quest_id: quest.id,
        passcode: verifiedPin,
        staff_initials: initials.trim().toUpperCase(),
        powerup_claimed: claimed,
      }),
    })
    setVerifying(false)
    if (res.status === 409) { setState('already_done'); return }
    if (!res.ok) {
      setPinStatus('error')
      setState('pin')
      setTimeout(() => setPinStatus('idle'), 900)
      return
    }
    const { points_awarded } = await res.json()
    setTotalPointsAwarded(points_awarded)

    // Show handoff screen — celebration fires after HANDOFF_DELAY
    setState('handoff')
    setTimeout(() => {
      setState('success')
      fireConfetti()
      showPointsToast(points_awarded)
      // Pick sound: powerup earns the big victory, base quest gets great-success
      playSound(claimed
        ? '/sounds/victory.mp3'
        : '/sounds/great-success.mp3'
      )
      onSuccess(points_awarded)
    }, HANDOFF_DELAY)
  }

  function handleInitialsNext() {
    if (!initials.trim()) return
    if (quest.is_grit_quest && quest.grit_powerup_description) {
      setState('powerup')
    } else {
      submitQuest(false)
    }
  }

  const heading: Record<OverlayState, string> = {
    pin:         'Staff Verification',
    initials:    'Staff Initials',
    powerup:     'Bonus Challenge 🔥',
    handoff:     'Verified! ✓',
    success:     'Quest Complete! 🎉',
    already_done:'Already Done',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-[430px] mx-auto w-full bg-[--color-bg] rounded-t-3xl px-6 pt-6 pb-10 animate-slide-up">

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[--color-text]">{heading[state]}</h2>
          {state !== 'handoff' && state !== 'success' && (
            <button onClick={onClose} className="text-[--color-muted] hover:text-[--color-text] text-2xl leading-none w-8 h-8 flex items-center justify-center">
              ×
            </button>
          )}
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
              onClick={handleInitialsNext}
            >
              {quest.is_grit_quest && quest.grit_powerup_description ? 'Next →' : 'Confirm & Award Points'}
            </Button>
          </div>
        )}

        {state === 'powerup' && quest.grit_powerup_description && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl p-4 border border-[--color-border]" style={{ background: 'var(--color-surface)' }}>
              <p className="text-[--color-muted] text-xs font-semibold uppercase tracking-wide mb-2">Grit Power-Up</p>
              <p className="text-[--color-text] text-base leading-snug">{quest.grit_powerup_description}</p>
              {quest.grit_powerup_points && (
                <p className="text-[--color-accent-light] font-bold text-sm mt-2">
                  Bonus: +{quest.grit_powerup_points} pts
                </p>
              )}
            </div>
            <p className="text-[--color-muted] text-sm text-center">Did this kid also do the above?</p>
            <div className="flex flex-col gap-2">
              <Button size="lg" loading={verifying} onClick={() => submitQuest(true)}>
                🔥 Yes, I did this too! (+{quest.grit_powerup_points} pts)
              </Button>
              <Button size="lg" variant="secondary" loading={verifying} onClick={() => submitQuest(false)}>
                Not this time — just the quest
              </Button>
            </div>
          </div>
        )}

        {state === 'handoff' && (
          <div className="flex flex-col items-center gap-5 py-4">
            <div className="text-7xl animate-pop-in">✅</div>
            <div className="text-center">
              <p className="text-2xl font-black text-green-400">Quest approved!</p>
              <p className="text-[--color-muted] text-base mt-2">Hand the phone back to the kid.</p>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-[--color-accent] flex items-center justify-center">
              <span className="text-3xl font-black text-[--color-accent-light]">{countdown}</span>
            </div>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-6xl animate-pop-in">⚡</div>
            <div className="text-center">
              <p className="text-4xl font-black text-[--color-accent-light]">+{totalPointsAwarded} pts</p>
              <p className="text-[--color-muted] mt-1">
                {powerupClaimed ? 'Quest + Power-Up complete! 🔥' : 'Quest complete! Keep it up.'}
              </p>
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
