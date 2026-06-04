'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { PinEntry } from '@/components/ui/PinEntry'

interface RedeemDialogProps {
  title: string
  pointCost: number
  availablePoints: number
  onConfirm: (passcode: string) => Promise<void>
  onCancel: () => void
}

export function RedeemDialog({ title, pointCost, availablePoints, onConfirm, onCancel }: RedeemDialogProps) {
  const [step, setStep] = useState<'confirm' | 'pin'>('confirm')
  const [pinStatus, setPinStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle')
  const canAfford = availablePoints >= pointCost

  async function handlePin(pin: string) {
    setPinStatus('checking')
    try {
      await onConfirm(pin)
      setPinStatus('success')
    } catch {
      setPinStatus('error')
      setTimeout(() => setPinStatus('idle'), 900)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[430px] rounded-t-3xl p-6 animate-slide-up" style={{ background: '#ffffff' }}>

        {step === 'confirm' && (
          <>
            <h3 className="text-xl font-bold text-[--color-text] mb-2">Spend Points?</h3>
            <p className="text-[--color-muted] text-sm mb-4">
              Spend <span className="text-[--color-accent] font-bold">{pointCost} pts</span> on{' '}
              <span className="text-[--color-text] font-semibold">{title}</span>?
            </p>

            {!canAfford && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4">
                <p className="text-red-600 text-sm font-medium">
                  You need {pointCost - availablePoints} more points. Complete more quests first!
                </p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-[--color-muted] mb-6">
              <span>You have: <span className="text-[--color-text] font-bold">{availablePoints} pts</span></span>
              <span>After: <span className={`font-bold ${canAfford ? 'text-[--color-text]' : 'text-red-500'}`}>{availablePoints - pointCost} pts</span></span>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
              <Button className="flex-1" disabled={!canAfford} onClick={() => setStep('pin')}>
                Spend {pointCost} pts
              </Button>
            </div>
          </>
        )}

        {step === 'pin' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[--color-text]">Staff Verification</h3>
              <button
                onClick={() => { setStep('confirm'); setPinStatus('idle') }}
                className="text-[--color-muted] hover:text-[--color-text] text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <p className="text-[--color-muted] text-sm text-center mb-6">
              Have a SPARK staff member enter the passcode to approve spending{' '}
              <span className="text-[--color-text] font-semibold">{pointCost} pts</span> on{' '}
              <span className="text-[--color-text] font-semibold">{title}</span>.
            </p>
            <PinEntry onSubmit={handlePin} status={pinStatus} />
          </>
        )}
      </div>
    </div>
  )
}
