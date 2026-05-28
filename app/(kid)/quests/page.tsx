'use client'

import { useState, useEffect } from 'react'
import { QuestCard } from '@/components/quests/QuestCard'
import { QuestVerifyOverlay } from '@/components/quests/QuestVerifyOverlay'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ALL_DOMAINS, DOMAIN_LABELS, DOMAIN_EMOJIS, DOMAIN_COLORS } from '@/lib/types'
import type { Quest, Domain } from '@/lib/types'

const DOMAIN_FILTERS: Array<{ value: 'all' | Domain; label: string }> = [
  { value: 'all', label: 'All' },
  ...ALL_DOMAINS.map(d => ({ value: d as Domain, label: `${DOMAIN_EMOJIS[d]} ${DOMAIN_LABELS[d]}` })),
]

const DAILY_CAP = 40

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [domainFilter, setDomainFilter] = useState<'all' | Domain>('all')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [verifyQuest, setVerifyQuest] = useState<Quest | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [dailyPointsToday, setDailyPointsToday] = useState(0)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    Promise.all([
      fetch('/api/quests').then(r => r.json()),
      kidId ? fetch(`/api/kids/${kidId}`).then(r => r.json()) : Promise.resolve(null),
    ]).then(([questData, kidData]) => {
      setQuests(questData)
      if (kidData?.daily_points_today != null) setDailyPointsToday(kidData.daily_points_today)
      setLoading(false)
    })
  }, [])

  const staffNames = Array.from(
    new Set(quests.map(q => q.created_by).filter(Boolean) as string[])
  ).sort()

  const filtered = quests
    .filter(q => domainFilter === 'all' || q.domain_tags.includes(domainFilter as Domain))
    .filter(q => staffFilter === 'all' || q.created_by === staffFilter)

  return (
    <div className="px-4 pt-8 pb-4">
      <div className="animate-slide-down mb-5">
        <p className="font-barlow font-black text-[10px] uppercase tracking-[0.2em] text-[--color-muted] mb-0.5">
          SPARK Quest
        </p>
        <h1
          className="font-barlow font-black text-4xl uppercase text-[--color-text]"
          style={{ letterSpacing: '-0.02em' }}
        >
          Quests
        </h1>
        <p className="text-[--color-muted] text-sm mt-1">Complete challenges to earn XP ⚡</p>
      </div>

      {/* Daily cap warning */}
      {dailyPointsToday >= DAILY_CAP ? (
        <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3 bg-red-950 border border-red-800">
          <span className="text-xl flex-shrink-0">🚫</span>
          <div>
            <p className="text-red-400 font-bold text-sm">Daily limit reached (40/40 pts)</p>
            <p className="text-red-400/70 text-xs">You&apos;ve maxed out for today. Come back tomorrow!</p>
          </div>
        </div>
      ) : dailyPointsToday >= DAILY_CAP - 10 ? (
        <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3 bg-amber-950 border border-amber-800">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-amber-400 font-bold text-sm">Almost at your daily limit!</p>
            <p className="text-amber-400/70 text-xs">Only {DAILY_CAP - dailyPointsToday} pts left today (40 pt max)</p>
          </div>
        </div>
      ) : null}

      {/* Domain filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-3 animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        {DOMAIN_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setDomainFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-barlow font-bold text-xs uppercase tracking-widest transition-all duration-150 border ${
              domainFilter === f.value
                ? 'text-white border-transparent'
                : 'text-[--color-muted] border-[--color-border]'
            }`}
            style={domainFilter === f.value && f.value !== 'all'
              ? { background: DOMAIN_COLORS[f.value as Domain], borderColor: DOMAIN_COLORS[f.value as Domain] }
              : domainFilter === f.value
              ? { background: 'var(--color-accent)', borderColor: 'var(--color-accent)' }
              : { background: 'var(--color-surface)' }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Staff filter */}
      {staffNames.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
          <button
            onClick={() => setStaffFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
              staffFilter === 'all'
                ? 'bg-[--color-accent]/20 text-[--color-text] border border-[--color-accent]/50 font-bold'
                : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
            }`}
          >
            All staff
          </button>
          {staffNames.map(name => (
            <button
              key={name}
              onClick={() => setStaffFilter(name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                staffFilter === name
                  ? 'bg-[--color-accent]/20 text-[--color-text] border border-[--color-accent]/50 font-bold'
                  : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((q, i) => (
            <div
              key={q.id}
              className="animate-slide-up"
              style={{ animationDelay: `${0.05 + i * 0.04}s`, opacity: 0 }}
            >
              <div className="relative">
                {completedIds.has(q.id) && !q.repeatable && (
                  <div className="absolute inset-0 rounded-3xl bg-black/40 z-10 flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-black/50 px-3 py-1 rounded-full">✓ Done</span>
                  </div>
                )}
                <QuestCard quest={q} onClick={() => setSelectedQuest(q)} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-[--color-muted] pt-12">No quests match this filter.</p>
          )}
        </div>
      )}

      {/* Quest detail sheet */}
      <Sheet open={!!selectedQuest} onClose={() => setSelectedQuest(null)} title={selectedQuest?.title}>
        {selectedQuest && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 flex-wrap">
              {selectedQuest.domain_tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: DOMAIN_COLORS[tag] + '33', color: DOMAIN_COLORS[tag] }}
                >
                  {DOMAIN_EMOJIS[tag]} {DOMAIN_LABELS[tag]}
                </span>
              ))}
              <span className="flex items-center gap-1 text-[--color-accent] font-bold text-lg">
                ⚡ {selectedQuest.point_value} pts
              </span>
              {selectedQuest.is_grit_quest && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-900/30 text-orange-400 font-semibold">
                  🔥 Grit Quest
                </span>
              )}
              {selectedQuest.repeatable && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[--color-surface] border border-[--color-border] text-[--color-muted]">
                  ↻ Repeatable
                </span>
              )}
              {selectedQuest.created_by && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[--color-surface] border border-[--color-border] text-[--color-muted]">
                  Posted by {selectedQuest.created_by}
                </span>
              )}
            </div>

            {selectedQuest.description ? (
              <p className="text-[--color-text] text-base leading-relaxed">{selectedQuest.description}</p>
            ) : (
              <p className="text-[--color-muted] text-sm italic">No additional details for this quest.</p>
            )}

            {selectedQuest.is_grit_quest && selectedQuest.grit_powerup_description && (
              <div className="bg-orange-900/15 border border-orange-700/30 rounded-2xl p-4">
                <p className="text-orange-400 font-semibold text-xs uppercase tracking-wide mb-1">🔥 Grit Power-Up (+{selectedQuest.grit_powerup_points} pts)</p>
                <p className="text-[--color-text] text-sm">{selectedQuest.grit_powerup_description}</p>
              </div>
            )}

            {selectedQuest.expires_at && (
              <p className="text-xs text-[--color-muted]">
                ⏰ Expires: {new Date(selectedQuest.expires_at).toLocaleDateString()}
              </p>
            )}

            {completedIds.has(selectedQuest.id) && !selectedQuest.repeatable ? (
              <div className="bg-green-900/20 border border-green-700/30 rounded-2xl px-4 py-3 text-center">
                <p className="text-green-400 font-semibold">✓ You completed this quest!</p>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={() => {
                  setSelectedQuest(null)
                  setTimeout(() => setVerifyQuest(selectedQuest), 100)
                }}
              >
                ⚡ I Did This!
              </Button>
            )}
          </div>
        )}
      </Sheet>

      {verifyQuest && (
        <QuestVerifyOverlay
          quest={verifyQuest}
          dailyPointsToday={dailyPointsToday}
          onClose={() => setVerifyQuest(null)}
          onSuccess={(pts) => {
            setCompletedIds(prev => new Set([...prev, verifyQuest.id]))
            setDailyPointsToday(prev => Math.min(DAILY_CAP, prev + pts))
            setVerifyQuest(null)
          }}
        />
      )}
    </div>
  )
}
