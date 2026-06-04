'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PointsBadge } from '@/components/ui/PointsBadge'
import { RedeemDialog } from '@/components/rewards/RedeemDialog'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { showPointsToast } from '@/components/ui/PointsToast'
import {
  DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_EMOJIS,
  checkDomainEligibility, kidDomainPoints,
} from '@/lib/types'
import type { Kid, Drop, Adventure, Domain, DomainRequirements } from '@/lib/types'

interface PendingRedeem {
  type: 'drop' | 'adventure'
  id: string
  title: string
  cost: number
}

function DomainProgressBars({ requirements, kidPoints }: {
  requirements: DomainRequirements
  kidPoints: Record<Domain, number>
}) {
  const entries = (Object.entries(requirements) as [Domain, number][]).filter(([, n]) => n > 0)
  if (entries.length === 0) return null
  return (
    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1.5">
      <p className="text-xs text-[--color-muted] font-semibold uppercase tracking-wide mb-0.5">Domain Requirements</p>
      {entries.map(([domain, needed]) => {
        const current = kidPoints[domain] ?? 0
        const met = current >= needed
        const pct = Math.min(100, Math.round((current / needed) * 100))
        return (
          <div key={domain} className="flex items-center gap-2">
            <span className="text-xs w-16 flex-shrink-0 font-medium" style={{ color: DOMAIN_COLORS[domain] }}>
              {DOMAIN_EMOJIS[domain]} {DOMAIN_LABELS[domain]}
            </span>
            <div className="flex-1 bg-white/10 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: met ? '#4ade80' : DOMAIN_COLORS[domain],
                }}
              />
            </div>
            <span className={`text-xs flex-shrink-0 font-semibold ${met ? 'text-green-400' : 'text-[--color-muted]'}`}>
              {met ? '✓' : `${current}/${needed}`}
            </span>
          </div>
        )
      })}
    </div>
  )
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

  async function handleRedeem(passcode: string) {
    if (!pending || !kidId || !kid) return
    const res = await fetch('/api/rewards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kid_id: kidId,
        reward_type: pending.type,
        reward_id: pending.id,
        points: pending.cost,
        passcode,
      }),
    })
    if (res.status === 401) {
      throw new Error('Invalid passcode')
    }
    if (!res.ok) {
      const body = await res.json()
      alert(body.error || 'Something went wrong')
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

  const myDomainPoints = kid ? kidDomainPoints(kid) : { body: 0, brain: 0, heart: 0, hands: 0, team: 0 }

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
            activeTab === 'drops' ? 'bg-[--color-accent] text-white' : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
          }`}
        >
          🎁 Drops
        </button>
        <button
          onClick={() => setActiveTab('adventures')}
          className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all duration-150 ${
            activeTab === 'adventures' ? 'bg-[--color-accent] text-white' : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
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
            const { eligible } = checkDomainEligibility(myDomainPoints, drop.domain_requirements ?? {})

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

                <DomainProgressBars requirements={drop.domain_requirements ?? {}} kidPoints={myDomainPoints} />

                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={canAfford && eligible && !outOfStock && !alreadyRedeemed ? 'primary' : 'secondary'}
                    disabled={outOfStock || alreadyRedeemed || !eligible}
                    onClick={() => setPending({ type: 'drop', id: drop.id, title: drop.title, cost: drop.point_cost })}
                  >
                    {alreadyRedeemed ? '✓ Redeemed'
                      : outOfStock ? 'Out of Stock'
                      : !eligible ? 'Domain requirements needed'
                      : `Spend ${drop.point_cost} pts`}
                  </Button>
                </div>
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
            const { eligible } = checkDomainEligibility(myDomainPoints, adv.domain_requirements ?? {})

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

                {/* Group progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-[--color-muted] mb-1.5">
                    <span>{contributed} / {totalNeeded} pts</span>
                    <span>{adv.contributors_count ?? 0} / {adv.kids_threshold} kids</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2.5">
                    <div className="bg-[--color-accent] h-2.5 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <DomainProgressBars requirements={adv.domain_requirements ?? {}} kidPoints={myDomainPoints} />

                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-[--color-muted]">
                    Your share: <span className="text-[--color-text] font-semibold">{adv.point_cost_per_kid} pts</span>
                  </p>
                  <Button
                    size="sm"
                    variant={canAfford && eligible && !alreadyContributed ? 'primary' : 'secondary'}
                    disabled={alreadyContributed || !eligible || (!adv.stays_open_after_unlock && adv.is_unlocked)}
                    onClick={() => setPending({ type: 'adventure', id: adv.id, title: adv.title, cost: adv.point_cost_per_kid })}
                  >
                    {alreadyContributed ? '✓ Contributed'
                      : !eligible ? 'Domain requirements needed'
                      : `Contribute ${adv.point_cost_per_kid} pts`}
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
