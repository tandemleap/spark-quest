'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { DomainProgressBar } from '@/components/ui/DomainProgressBar'
import {
  ALL_DOMAINS, DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_EMOJIS, kidDomainPoints
} from '@/lib/types'
import type { Kid, Drop, Adventure } from '@/lib/types'

// Reward cost for progress bar: drops use point_cost, adventures use point_cost_per_kid
function rewardCost(r: Drop | Adventure, type: string): number {
  return type === 'drop' ? (r as Drop).point_cost : (r as Adventure).point_cost_per_kid
}

function rewardTitle(r: Drop | Adventure): string {
  return r.title
}

interface GoalCompletion {
  id: string
  points_awarded: number
  powerup_claimed: boolean
  completed_at: string
  quests: { title: string; domain_tags: string[]; point_value: number } | null
}

type GoalSlot = 'short' | 'long'

const DOMAIN_BAR_COLORS: Record<string, string> = {
  body:  '#D2643C',
  brain: '#FAB83C',
  heart: '#D282A0',
  hands: '#50BE96',
  team:  '#8C78E6',
}

export default function ProgressStationPage() {
  const [kid, setKid] = useState<Kid | null>(null)
  const [completions, setCompletions] = useState<GoalCompletion[]>([])
  const [drops, setDrops] = useState<Drop[]>([])
  const [adventures, setAdventures] = useState<Adventure[]>([])
  const [goalPicker, setGoalPicker] = useState<GoalSlot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const kidId = typeof window !== 'undefined' ? localStorage.getItem('spark_kid_id') : null

  useEffect(() => {
    if (!kidId) return
    Promise.all([
      fetch(`/api/kids/${kidId}`).then(r => r.json()),
      fetch(`/api/kids/${kidId}/completions`).then(r => r.json()),
      fetch('/api/drops').then(r => r.json()),
      fetch('/api/adventures').then(r => r.json()),
    ]).then(([kidData, completionsData, dropsData, adventuresData]) => {
      setKid(kidData)
      setCompletions(completionsData)
      setDrops(dropsData)
      setAdventures(adventuresData)
      setLoading(false)
    })
  }, [kidId])

  async function setGoal(slot: GoalSlot, rewardId: string, rewardType: 'drop' | 'adventure') {
    if (!kidId || !kid) return
    setSaving(true)
    const field = slot === 'short'
      ? { short_term_goal_id: rewardId, short_term_goal_type: rewardType }
      : { long_term_goal_id: rewardId, long_term_goal_type: rewardType }

    const res = await fetch(`/api/kids/${kidId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    })
    if (res.ok) {
      const updated = await res.json()
      setKid(updated)
    }
    setSaving(false)
    setGoalPicker(null)
  }

  async function clearGoal(slot: GoalSlot) {
    if (!kidId) return
    const field = slot === 'short'
      ? { short_term_goal_id: null, short_term_goal_type: null }
      : { long_term_goal_id: null, long_term_goal_type: null }
    const res = await fetch(`/api/kids/${kidId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field),
    })
    if (res.ok) {
      const updated = await res.json()
      setKid(updated)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center pt-32"><LoadingSpinner size="lg" /></div>
  }
  if (!kid) return null

  const domainPoints = kidDomainPoints(kid)
  const totalDomainPts = Object.values(domainPoints).reduce((s, v) => s + v, 0)

  // Find goal reward objects
  function findReward(id: string | null, type: string | null): Drop | Adventure | null {
    if (!id || !type) return null
    return type === 'drop'
      ? drops.find(d => d.id === id) ?? null
      : adventures.find(a => a.id === id) ?? null
  }

  const shortReward = findReward(kid.short_term_goal_id, kid.short_term_goal_type)
  const longReward  = findReward(kid.long_term_goal_id, kid.long_term_goal_type)

  // Filter rewards for goal picker
  function pickerRewards(slot: GoalSlot) {
    const isShort = slot === 'short'
    const allRewards: Array<{ r: Drop | Adventure; type: 'drop' | 'adventure'; cost: number }> = [
      ...drops.map(d => ({ r: d as Drop | Adventure, type: 'drop' as const, cost: d.point_cost })),
      ...adventures.map(a => ({ r: a as Drop | Adventure, type: 'adventure' as const, cost: a.point_cost_per_kid })),
    ]
    const filtered = allRewards
      .filter(({ cost }) => isShort ? cost <= 75 : cost >= 76)
      // Can't set same reward as the other goal
      .filter(({ r, type }) =>
        !(r.id === kid!.long_term_goal_id && type === kid!.long_term_goal_type) &&
        !(r.id === kid!.short_term_goal_id && type === kid!.short_term_goal_type)
      )
    return filtered.sort((a, b) => a.cost - b.cost)
  }

  return (
    <div className="px-4 pt-6 pb-4 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="animate-slide-down flex items-center gap-4">
        <Link href="/onboarding/avatar" className="relative flex-shrink-0">
          <Avatar avatarUrl={kid.avatar_url} handle={kid.name_handle} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-[--color-accent] rounded-full flex items-center justify-center text-white text-[10px] ring-2 ring-[--color-bg]">
            {kid.avatar_url ? '✎' : '+'}
          </span>
        </Link>
        <div className="flex-1">
          <p className="font-barlow font-black text-[10px] uppercase tracking-[0.2em] text-[--color-muted]">Progress Station</p>
          <h1 className="font-barlow font-black text-2xl uppercase leading-tight text-[--color-text]" style={{ letterSpacing: '-0.01em' }}>
            {kid.name_handle}
          </h1>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="font-barlow font-black text-2xl text-[--color-accent-light]">{kid.total_points_earned}</span>
            <span className="text-xs uppercase tracking-widest text-[--color-muted]">xp earned</span>
            <span className="text-[--color-muted] mx-1">·</span>
            <span className="font-bold text-base text-[--color-text]">{kid.available_points}</span>
            <span className="text-xs uppercase tracking-widest text-[--color-muted]">to spend</span>
          </div>
        </div>
      </div>

      {/* ── Domain dots ── */}
      <div className="animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        <div className="flex items-center gap-2">
          {ALL_DOMAINS.map(d => {
            const pts = domainPoints[d]
            const pct = totalDomainPts > 0 ? pts / totalDomainPts : 0
            const size = Math.max(10, Math.round(10 + pct * 22))
            return (
              <div key={d} className="flex flex-col items-center gap-1">
                <div
                  title={`${DOMAIN_LABELS[d]}: ${pts} pts`}
                  style={{
                    width: size, height: size,
                    borderRadius: '50%',
                    background: pts > 0 ? DOMAIN_BAR_COLORS[d] : '#333',
                    transition: 'all 0.4s ease',
                  }}
                />
                <span className="text-[9px] text-[--color-muted] uppercase tracking-wide">{DOMAIN_EMOJIS[d]}</span>
              </div>
            )
          })}
          <span className="text-xs text-[--color-muted] ml-2">Domain balance</span>
        </div>
      </div>

      {/* ── Short-term Goal Card ── */}
      <GoalCard
        label="Short-term Goal"
        sublabel="≤ 75 pts"
        reward={shortReward}
        rewardType={kid.short_term_goal_type}
        kid={kid}
        domainPoints={domainPoints}
        onSet={() => setGoalPicker('short')}
        onClear={() => clearGoal('short')}
        animDelay="0.1s"
      />

      {/* ── Long-term Goal Card ── */}
      <GoalCard
        label="Long-term Goal"
        sublabel="76+ pts"
        reward={longReward}
        rewardType={kid.long_term_goal_type}
        kid={kid}
        domainPoints={domainPoints}
        onSet={() => setGoalPicker('long')}
        onClear={() => clearGoal('long')}
        animDelay="0.15s"
      />

      {/* ── Domain Breakdown ── */}
      <Card className="animate-slide-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <p className="font-barlow font-black text-xs uppercase tracking-[0.15em] text-[--color-muted] mb-3">
          Where you've been showing up
        </p>
        <div className="flex flex-col gap-3">
          {ALL_DOMAINS.map(d => {
            const pts = domainPoints[d]
            const maxPts = Math.max(...Object.values(domainPoints), 1)
            const pct = (pts / maxPts) * 100
            return (
              <div key={d} className="flex items-center gap-3">
                <div className="w-5 text-center flex-shrink-0">
                  <span style={{ fontSize: 14 }}>{DOMAIN_EMOJIS[d]}</span>
                </div>
                <span className="w-12 text-xs font-bold flex-shrink-0" style={{ color: DOMAIN_BAR_COLORS[d] }}>
                  {DOMAIN_LABELS[d]}
                </span>
                <div className="flex-1 rounded-full h-2" style={{ background: '#2C2C2A' }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: DOMAIN_BAR_COLORS[d] }}
                  />
                </div>
                <span className="text-xs font-bold text-[--color-muted] w-10 text-right flex-shrink-0">{pts} xp</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Recent Activity ── */}
      <div className="animate-slide-up" style={{ animationDelay: '0.25s', opacity: 0 }}>
        <p className="font-barlow font-black text-xs uppercase tracking-[0.15em] text-[--color-muted] mb-3">
          Recent Activity
        </p>
        <div className="flex flex-col gap-2">
          {completions.length === 0 && (
            <p className="text-[--color-muted] text-sm text-center py-4">No quests completed yet. Get out there!</p>
          )}
          {completions.map((c) => {
            const quest = c.quests
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[--color-text] truncate">
                    {quest?.title ?? 'Quest'}
                    {c.powerup_claimed && ' 🔥'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {(quest?.domain_tags ?? []).map(tag => (
                      <span key={tag} className="text-[10px] font-bold uppercase tracking-wide" style={{ color: DOMAIN_BAR_COLORS[tag] ?? '#888' }}>
                        {DOMAIN_EMOJIS[tag as keyof typeof DOMAIN_EMOJIS]} {DOMAIN_LABELS[tag as keyof typeof DOMAIN_LABELS]}
                      </span>
                    ))}
                    <span className="text-[10px] text-[--color-muted]">
                      {new Date(c.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                <span className="font-barlow font-black text-lg text-[--color-accent-light]">+{c.points_awarded}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Goal Picker Sheet ── */}
      <Sheet
        open={goalPicker !== null}
        onClose={() => setGoalPicker(null)}
        title={goalPicker === 'short' ? 'Set Short-term Goal' : 'Set Long-term Goal'}
      >
        {goalPicker !== null && (
          <div className="flex flex-col gap-3">
            <p className="text-[--color-muted] text-sm">
              {goalPicker === 'short'
                ? 'Choose a reward under 75 pts as your next target.'
                : 'Choose a bigger reward (76+ pts) to work toward over time.'}
            </p>
            {pickerRewards(goalPicker).map(({ r, type, cost }) => {
              const pts = kid.available_points
              const needMore = Math.max(0, cost - pts)
              return (
                <button
                  key={r.id}
                  onClick={() => setGoal(goalPicker, r.id, type)}
                  disabled={saving}
                  className="text-left rounded-xl px-4 py-3 active:scale-[0.98] transition-transform"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[--color-text]">{r.title}</span>
                    <span className="font-barlow font-black text-lg text-[--color-accent-light]">{cost} pts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-[--color-muted] px-2 py-0.5 rounded-sm" style={{ background: 'var(--color-border)' }}>
                      {type === 'drop' ? '🎁 Drop' : '🗺 Adventure'}
                    </span>
                    <span className="text-xs text-[--color-muted]">
                      {needMore > 0 ? `${needMore} more pts needed` : 'Ready to redeem!'}
                    </span>
                  </div>
                </button>
              )
            })}
            {pickerRewards(goalPicker).length === 0 && (
              <p className="text-center text-[--color-muted] py-8">No eligible rewards available right now.</p>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ── GoalCard subcomponent ──────────────────────────────────────────────────────

function GoalCard({
  label, sublabel, reward, rewardType, kid, domainPoints, onSet, onClear, animDelay,
}: {
  label: string
  sublabel: string
  reward: Drop | Adventure | null
  rewardType: string | null
  kid: Kid
  domainPoints: Record<string, number>
  onSet: () => void
  onClear: () => void
  animDelay: string
}) {
  const cost = reward && rewardType ? rewardCost(reward, rewardType) : 0
  const kp = { body: domainPoints.body, brain: domainPoints.brain, heart: domainPoints.heart, hands: domainPoints.hands, team: domainPoints.team }

  return (
    <Card className="animate-slide-up" style={{ animationDelay: animDelay, opacity: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-barlow font-black text-xs uppercase tracking-[0.15em] text-[--color-muted]">
            {label}
          </p>
          <p className="text-[10px] text-[--color-muted]">{sublabel}</p>
        </div>
        {reward && (
          <button
            onClick={onClear}
            className="text-xs text-[--color-muted] hover:text-[--color-text] transition-colors"
          >
            Change
          </button>
        )}
      </div>

      {!reward ? (
        <button
          onClick={onSet}
          className="w-full rounded-xl border-2 border-dashed py-6 flex flex-col items-center gap-1 transition-colors hover:border-[--color-accent]"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span className="text-2xl">🎯</span>
          <span className="text-sm font-semibold text-[--color-muted]">Set a goal</span>
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-barlow font-black text-xl uppercase leading-tight text-[--color-text]" style={{ letterSpacing: '-0.01em' }}>
              {rewardTitle(reward)}
            </h3>
            <div className="flex-shrink-0 ml-3 text-right">
              <span className="font-barlow font-black text-2xl text-[--color-accent-light]">{cost}</span>
              <span className="block text-[10px] uppercase tracking-wider text-[--color-muted]">pts</span>
            </div>
          </div>

          <DomainProgressBar
            kidPoints={kp}
            totalEarned={kid.total_points_earned}
            targetCost={cost}
            availablePoints={kid.available_points}
            height="lg"
            showLabel
          />

          {kid.available_points >= cost && (
            <div className="mt-3">
              <Link href="/rewards">
                <Button size="sm" className="w-full">Spend Points →</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
