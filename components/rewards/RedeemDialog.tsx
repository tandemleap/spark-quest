'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface RedeemDialogProps {
  title: string
  pointCost: number
  availablePoints: number
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function RedeemDialog({ title, pointCost, availablePoints, onConfirm, onCancel }: RedeemDialogProps) {
  const [loading, setLoading] = useState(false)
  const canAfford = availablePoints >= pointCost

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in px-6">
      <div className="bg-[--color-surface] rounded-3xl p-6 w-full max-w-sm animate-pop-in">
        <h3 className="text-xl font-bold text-[--color-text] mb-2">Spend Points?</h3>
        <p className="text-[--color-muted] text-sm mb-4">
          Spend <span className="text-[--color-accent-light] font-bold">{pointCost} pts</span> on <span className="text-[--color-text] font-semibold">{title}</span>?
        </p>

        {!canAfford && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-2xl px-4 py-3 mb-4">
            <p className="text-red-400 text-sm font-medium">
              You need {pointCost - availablePoints} more points. Complete more quests first!
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-[--color-muted] mb-6">
          <span>You have: <span className="text-[--color-text] font-bold">{availablePoints} pts</span></span>
          <span>After: <span className={`font-bold ${canAfford ? 'text-[--color-text]' : 'text-red-400'}`}>{availablePoints - pointCost} pts</span></span>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!canAfford} loading={loading} onClick={handleConfirm}>
            Spend {pointCost} pts
          </Button>
        </div>
      </div>
    </div>
  )
}
