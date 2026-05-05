'use client'

import { useState, useEffect } from 'react'
import { QuestCard } from '@/components/quests/QuestCard'
import { QuestVerifyOverlay } from '@/components/quests/QuestVerifyOverlay'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { CATEGORY_LABELS } from '@/lib/types'
import type { Quest, QuestCategory } from '@/lib/types'

const CATEGORIES: Array<{ value: 'all' | QuestCategory; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'movement', label: 'Movement' },
  { value: 'learning', label: 'Learning' },
  { value: 'community', label: 'Community' },
]

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | QuestCategory>('all')
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [verifyQuest, setVerifyQuest] = useState<Quest | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/quests')
      .then(r => r.json())
      .then(data => {
        setQuests(data)
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'all' ? quests : quests.filter(q => q.category === filter)

  function handleSuccess(questId: string) {
    setCompletedIds(prev => new Set([...prev, questId]))
  }

  return (
    <div className="px-4 pt-8 pb-4">
      {/* Header */}
      <div className="animate-slide-down mb-5">
        <h1 className="text-3xl font-bold text-[--color-text]">Quests</h1>
        <p className="text-[--color-muted] text-sm mt-1">Complete quests to earn points ⚡</p>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5 animate-slide-up" style={{ animationDelay: '0.05s', opacity: 0 }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
              filter === cat.value
                ? 'bg-[--color-accent] text-white'
                : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Quest list */}
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
            <p className="text-center text-[--color-muted] pt-12">No quests in this category yet.</p>
          )}
        </div>
      )}

      {/* Quest detail sheet */}
      <Sheet
        open={!!selectedQuest}
        onClose={() => setSelectedQuest(null)}
        title={selectedQuest?.title}
      >
        {selectedQuest && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-[--color-muted] uppercase tracking-wide">
                {CATEGORY_LABELS[selectedQuest.category]}
              </span>
              <span className="flex items-center gap-1 text-[--color-accent-light] font-bold text-lg">
                ⚡ {selectedQuest.point_value} pts
              </span>
              {selectedQuest.repeatable && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[--color-surface] border border-[--color-border] text-[--color-muted]">
                  ↻ Repeatable
                </span>
              )}
            </div>

            {selectedQuest.description && (
              <p className="text-[--color-text] text-base leading-relaxed">{selectedQuest.description}</p>
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

      {/* Verification overlay */}
      {verifyQuest && (
        <QuestVerifyOverlay
          quest={verifyQuest}
          onClose={() => setVerifyQuest(null)}
          onSuccess={() => {
            handleSuccess(verifyQuest.id)
            setVerifyQuest(null)
          }}
        />
      )}
    </div>
  )
}
