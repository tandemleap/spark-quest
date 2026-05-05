'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PointsBadge } from '@/components/ui/PointsBadge'
import { RedeemDialog } from '@/components/rewards/RedeemDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { showPointsToast } from '@/components/ui/PointsToast'
import type { Kid, Drop, Adventure } from '@/lib/types'

interface PendingRedeem {
  type: 'drop' | 'adventure'
  id: string
  title: string
  cost: number
}

export default function RewardsPage() {
  const [kid, setKid] = useState<Kid | null>(null)
  const [drops, setDrops] = useState<Drop[]>([])
  const [adventures, setAdventures] = useState<Adventure[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<PendingRedeem | null>(null)
  const [redeemed, setRedeemed] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'drops' | 'adventures'>('drops')

  const kidId = typeof window !== 'undefined' ? localStorage.getItem('spark_kid_id') : null

  useEffect(() => {
    if (!kidId) return
    Promise.all([
      fetch(`/api/kids/${kidId}`).then(r => r.json()),
      fetch('/api/drops').then(r => r.json()),
      fetch('/api/adventures').then(r => r.json()),
    ]).then(([kidData, dropsData, adventuresData]) => {
      setKid(kidData)
      setDrops(dropsData)
      setAdventures(adventuresData)
      setLoading(false)
    })
  }, [kidId])

  async function handleRedeem() {
    if (!pending || !kidId || !kid) return

    const res = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kidId,
        reward_type: pending.type,
        reward_id: pending.id,
        points: pending.cost,
      }),
    })

    if (!res.ok) {
      const { error } = await res.json()
      alert(error || 'Something went wrong')
      setPending(null)
      return
    }

    setKid(prev => prev ? { ...prev, available_points: prev.available_points - pending.cost } : prev)
    setRedeemed(prev => new Set([...prev, pending.id]))
    showPointsToast(-pending.cost)
    setPending(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center pt-32">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 animate-slide-down">
        <div>
          <h1 className="text-3xl font-bold text-[--color-text]">Rewards</h1>
          <p className="text-[--color-muted] text-sm mt-0.5">Spend your hard-earned points</p>
        </div>
        {kid && <PointsBadge points={kid.available_points} type="available" size="md" />}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <button
          onClick={() => setActiveTab('drops')}
          className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
            activeTab === 'drops'
              ? 'bg-[--color-accent] text-white'
              : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
          }`}
        >
          🎁 Drops
        </button>
        <button
          onClick={() => setActiveTab('adventures')}
          className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
            activeTab === 'adventures'
              ? 'bg-[--color-accent] text-white'
              : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
          }`}
        >
          🗺 Adventures
        </button>
      </div>

      {/* Drops */}
      {activeTab === 'drops' && (
        <div className="flex flex-col gap-3">
          {drops.map((drop, i) => {
            const alreadyRedeemed = redeemed.has(drop.id)
            const canAfford = (kid?.available_points ?? 0) >= drop.point_cost
            const outOfStock = drop.quantity_available !== null && drop.quantity_available <= 0

            return (
              <Card
                key={drop.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[--color-text]">{drop.title}</h3>
                    {drop.description && (
                      <p className="text-[--color-muted] text-sm mt-0.5">{drop.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <PointsBadge points={drop.point_cost} type="available" size="sm" />
                    {drop.quantity_available !== null && (
                      <p className="text-xs text-[--color-muted] mt-1">{drop.quantity_available} left</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={canAfford && !outOfStock && !alreadyRedeemed ? 'primary' : 'secondary'}
                  disabled={outOfStock || alreadyRedeemed}
                  onClick={() => setPending({ type: 'drop', id: drop.id, title: drop.title, cost: drop.point_cost })}
                >
                  {alreadyRedeemed ? '✓ Redeemed' : outOfStock ? 'Out of Stock' : `Spend ${drop.point_cost} pts`}
                </Button>
              </Card>
            )
          })}
          {drops.length === 0 && (
            <p className="text-center text-[--color-muted] pt-12">No drops available right now.</p>
          )}
        </div>
      )}

      {/* Adventures */}
      {activeTab === 'adventures' && (
        <div className="flex flex-col gap-3">
          {adventures.map((adv, i) => {
            const totalNeeded = adv.point_cost_per_kid * adv.kids_threshold
            const contributed = adv.points_contributed ?? 0
            const pct = Math.min(100, Math.round((contributed / totalNeeded) * 100))
            const alreadyContributed = redeemed.has(adv.id)
            const canAfford = (kid?.available_points ?? 0) >= adv.point_cost_per_kid

            return (
              <Card
                key={adv.id}
                className="animate-slide-up"
                style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-lg text-[--color-text] flex-1">{adv.title}</h3>
                  {adv.is_unlocked && (
                    <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded-full">
                      UNLOCKED ✓
                    </span>
                  )}
                </div>
                {adv.description && (
                  <p className="text-[--color-muted] text-sm mb-3">{adv.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[--color-muted] mb-1.5">
                    <span>{contributed} / {totalNeeded} pts</span>
                    <span>{adv.contributors_count ?? 0} / {adv.kids_threshold} kids</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div
                      className="bg-[--color-accent] h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-[--color-muted]">
                    Your share: <span className="text-[--color-text] font-semibold">{adv.point_cost_per_kid} pts</span>
                  </p>
                  <Button
                    size="sm"
                    variant={canAfford && !alreadyContributed ? 'primary' : 'secondary'}
                    disabled={alreadyContributed || (!adv.stays_open_after_unlock && adv.is_unlocked)}
                    onClick={() => setPending({ type: 'adventure', id: adv.id, title: adv.title, cost: adv.point_cost_per_kid })}
                  >
                    {alreadyContributed ? '✓ Contributed' : `Contribute ${adv.point_cost_per_kid} pts`}
                  </Button>
                </div>
              </Card>
            )
          })}
          {adventures.length === 0 && (
            <p className="text-center text-[--color-muted] pt-12">No adventures available right now.</p>
          )}
        </div>
      )}

      {/* Confirm dialog */}
      {pending && kid && (
        <RedeemDialog
          title={pending.title}
          pointCost={pending.cost}
          availablePoints={kid.available_points}
          onConfirm={handleRedeem}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}
