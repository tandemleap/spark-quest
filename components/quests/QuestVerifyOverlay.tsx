'use client'

import { useState, useEffect, useRef } from 'react'
import { PinEntry } from '@/components/ui/PinEntry'
import { Button } from '@/components/ui/Button'
import { fireConfetti } from '@/components/ui/ConfettiLayer'
import { showPointsToast } from '@/components/ui/PointsToast'
import type { Quest } from '@/lib/types'

interface PersonalBest {
  best_score: number | null
  attempts: number
}

// Delay in ms between API success and celebration firing —
// gives staff time to hand the phone back to the kid.
const HANDOFF_DELAY = 2800

const DAILY_CAP = 40

interface QuestVerifyOverlayProps {
  quest: Quest
  onClose: () => void
  onSuccess: (pointsAwarded: number) => void
  dailyPointsToday?: number
}

type OverlayState = 'score' | 'pin' | 'initials' | 'powerup' | 'handoff' | 'success' | 'already_done' | 'daily_limit'

function playSound(path: string) {
  try {
    const audio = new Audio(path)
    audio.volume = 0.85
    audio.play().catch(() => {}) // ignore autoplay policy errors
  } catch {}
}

export function QuestVerifyOverlay({ quest, onClose, onSuccess, dailyPointsToday = 0 }: QuestVerifyOverlayProps) {
  const isRecordChase = quest.quest_type === 'record_chase'
  const [state, setState] = useState<OverlayState>(isRecordChase ? 'score' : 'pin')
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const [verifiedPin, setVerifiedPin] = useState('')
  const [initials, setInitials] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [totalPointsAwarded, setTotalPointsAwarded] = useState(0)
  const [dailyRemaining, setDailyRemaining] = useState(DAILY_CAP - dailyPointsToday)
  const [powerupClaimed, setPowerupClaimed] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Record chase state
  const [personalBest, setPersonalBest] = useState<PersonalBest | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [newRecord, setNewRecord] = useState<boolean | null>(null)

  // Fetch personal best for record chase quests
  useEffect(() => {
    if (!isRecordChase) return
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return
    fetch(`/api/quests/record?kid_id=${kidId}&quest_id=${quest.id}`)
      .then(r => r.json())
      .then(data => setPersonalBest(data))
  }, [isRecordChase, quest.id])

  // Live record comparison as score is typed
  useEffect(() => {
    if (!isRecordChase || !scoreInput || personalBest?.best_score == null) {
      setNewRecord(null)
      return
    }
    const val = parseFloat(scoreInput)
    if (isNaN(val)) { setNewRecord(null); return }
    setNewRecord(quest.score_direction === 'lower' ? val < personalBest.best_score : val > personalBest.best_score)
  }, [scoreInput, personalBest, isRecordChase, quest.score_direction])

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
    const scoreVal = isRecordChase && scoreInput ? parseFloat(scoreInput) : undefined
    const res = await fetch('/api/quests/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kidId,
        quest_id: quest.id,
        passcode: verifiedPin,
        staff_initials: initials.trim().toUpperCase(),
        powerup_claimed: claimed,
        score_value: scoreVal,
      }),
    })
    setVerifying(false)
    if (res.status === 409) { setState('already_done'); return }
    if (res.status === 403) {
      const body = await res.json()
      if (body.error === 'daily_limit_reached') { setState('daily_limit'); return }
    }
    if (!res.ok) {
      setPinStatus('error')
      setState('pin')
      setTimeout(() => setPinStatus('idle'), 900)
      return
    }
    const { points_awarded, daily_remaining } = await res.json()
    setTotalPointsAwarded(points_awarded)
    setDailyRemaining(daily_remaining ?? 0)

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

  const dailyLeft = DAILY_CAP - dailyPointsToday
  const expectedPoints = quest.point_value + (powerupClaimed && quest.grit_powerup_points ? quest.grit_powerup_points : 0)
  const wasCapped = totalPointsAwarded > 0 && totalPointsAwarded < expectedPoints

  const isFirstAttempt = isRecordChase && (personalBest?.best_score == null)

  const heading: Record<OverlayState, string> = {
    score:        isFirstAttempt ? 'Set Your Record 🎯' : 'Beat Your Record 📊',
    pin:          'Staff Verification',
    initials:     'Staff Initials',
    powerup:      'Bonus Challenge 🔥',
    handoff:      'Verified! ✓',
    success:      isFirstAttempt ? 'Record Set! 🎯' : 'Quest Complete! 🎉',
    already_done: 'Already Done',
    daily_limit:  'Daily Limit Reached',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-[430px] mx-auto w-full rounded-t-3xl px-6 pt-6 pb-10 animate-slide-up" style={{ background: '#ffffff' }}>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[--color-text]">{heading[state]}</h2>
          {state !== 'handoff' && state !== 'success' && (
            <button onClick={onClose} className="text-[--color-muted] hover:text-[--color-text] text-2xl leading-none w-8 h-8 flex items-center justify-center">
              ×
            </button>
          )}
        </div>

        {state === 'score' && (
          <div className="flex flex-col gap-5">
            {/* Current personal best */}
            {personalBest === null ? (
              <p className="text-[--color-muted] text-sm text-center">Loading…</p>
            ) : isFirstAttempt ? (
              <div className="rounded-2xl px-4 py-3 text-center border border-[--color-border]" style={{ background: '#f4f4f4' }}>
                <p className="text-2xl mb-1">🎯</p>
                <p className="text-[--color-text] font-semibold text-sm">First attempt!</p>
                <p className="text-[--color-muted] text-xs mt-0.5">Enter your score to set your personal record.</p>
              </div>
            ) : (
              <div className="rounded-2xl px-4 py-3 text-center border-2" style={{ borderColor: '#3399cc', background: '#e6f4ff' }}>
                <p className="text-xs font-bold uppercase tracking-widest text-[#3399cc] mb-1">Current Record</p>
                <p className="font-barlow font-black text-4xl text-[--color-text]">
                  {personalBest.best_score}
                  <span className="text-lg font-semibold ml-1 text-[--color-muted]">{quest.score_unit}</span>
                </p>
                <p className="text-xs text-[--color-muted] mt-0.5">
                  {quest.score_direction === 'lower' ? 'Lower is better' : 'Higher is better'} · {personalBest.attempts} attempt{personalBest.attempts !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* New score input */}
            <div>
              <label className="text-xs text-[--color-muted] uppercase tracking-widest font-semibold block mb-2">
                {isFirstAttempt ? 'Your score' : 'New score'}
                {quest.score_unit && <span className="ml-1 normal-case">({quest.score_unit})</span>}
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={scoreInput}
                onChange={e => setScoreInput(e.target.value)}
                placeholder="0"
                autoFocus
                className="w-full rounded-2xl px-5 py-4 text-center text-3xl font-black text-[--color-text] focus:outline-none border-2"
                style={{
                  background: '#f4f4f4',
                  borderColor: newRecord === true ? '#33cc00' : newRecord === false ? '#cc3333' : '#dddddd',
                }}
              />
              {/* Live record comparison */}
              {!isFirstAttempt && scoreInput && (
                <p className={`text-sm font-semibold text-center mt-2 ${newRecord === true ? 'text-green-600' : newRecord === false ? 'text-red-500' : 'text-[--color-muted]'}`}>
                  {newRecord === true
                    ? `🏆 New record! ${personalBest?.best_score} → ${scoreInput} ${quest.score_unit ?? ''}`
                    : newRecord === false
                    ? `Doesn't beat ${personalBest?.best_score} ${quest.score_unit ?? ''}`
                    : ''}
                </p>
              )}
            </div>

            <Button
              size="lg"
              disabled={!scoreInput.trim()}
              onClick={() => setState('pin')}
            >
              Next — Staff Verify →
            </Button>
          </div>
        )}

        {state === 'pin' && (
          <>
            <p className="text-[--color-muted] text-sm text-center mb-4">
              Have a SPARK staff member enter the passcode to verify:<br />
              <span className="text-[--color-text] font-semibold mt-1 block">"{quest.title}"</span>
            </p>
            {dailyLeft <= 10 && dailyLeft > 0 && (
              <div className="mb-4 px-4 py-2.5 rounded-xl text-center text-sm font-semibold bg-amber-950 text-amber-400 border border-amber-800">
                ⚠️ Only {dailyLeft} pt{dailyLeft === 1 ? '' : 's'} left today (40 pt daily max)
              </div>
            )}
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
            <div className="text-6xl animate-pop-in">{isFirstAttempt ? '🎯' : '⚡'}</div>
            <div className="text-center">
              {isFirstAttempt ? (
                <>
                  <p className="text-2xl font-black text-[--color-text]">
                    {scoreInput} {quest.score_unit}
                  </p>
                  <p className="text-[--color-muted] mt-1 text-sm">Record set! Come back tomorrow and beat it to earn</p>
                  <p className="font-bold text-[--color-accent] text-lg mt-0.5">+{quest.point_value} pts</p>
                </>
              ) : (
                <>
                  <p className="text-4xl font-black text-[--color-accent]">+{totalPointsAwarded} pts</p>
                  {scoreInput && newRecord && (
                    <p className="text-green-600 font-bold text-base mt-1">
                      🏆 {personalBest?.best_score} → {scoreInput} {quest.score_unit}
                    </p>
                  )}
                  {wasCapped ? (
                    <p className="text-amber-400 text-sm mt-1 font-semibold">Daily cap hit — had {totalPointsAwarded} pts left</p>
                  ) : (
                    <p className="text-[--color-muted] mt-1 text-sm">Keep pushing your record!</p>
                  )}
                </>
              )}
              {!isFirstAttempt && dailyRemaining === 0 && (
                <p className="text-red-400 text-xs mt-2 font-semibold uppercase tracking-wide">🚫 40/40 pts — daily limit reached</p>
              )}
              {!isFirstAttempt && dailyRemaining > 0 && dailyRemaining <= 10 && (
                <p className="text-amber-400 text-xs mt-2">⚠️ {dailyRemaining} pt{dailyRemaining === 1 ? '' : 's'} left today</p>
              )}
            </div>
            <Button size="lg" onClick={onClose} className="mt-2 w-full">Back to Quests</Button>
          </div>
        )}

        {state === 'daily_limit' && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="text-5xl">🚫</div>
            <p className="text-[--color-text] font-semibold text-lg">Daily limit reached!</p>
            <p className="text-[--color-muted] text-sm max-w-xs">
              You&apos;ve already earned 40 points today — that&apos;s the daily max. Come back tomorrow to keep earning!
            </p>
            <div className="w-full rounded-full h-3 mt-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div className="h-3 rounded-full bg-red-500 w-full" />
            </div>
            <p className="text-xs text-red-400 font-semibold">40 / 40 pts today</p>
            <Button size="lg" variant="secondary" onClick={onClose} className="mt-2 w-full">Got it</Button>
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
