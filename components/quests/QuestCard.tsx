import { Quest, CATEGORY_COLORS, CATEGORY_TEXT_COLORS, CATEGORY_LABELS } from '@/lib/types'

interface QuestCardProps {
  quest: Quest
  onClick: () => void
  style?: React.CSSProperties
}

export function QuestCard({ quest, onClick, style }: QuestCardProps) {
  const bgColor = CATEGORY_COLORS[quest.category] || 'var(--color-surface)'
  const textColor = CATEGORY_TEXT_COLORS[quest.category] || 'var(--color-text)'

  return (
    <button
      onClick={onClick}
      className="card-grain w-full rounded-3xl p-5 text-left active:scale-[0.97] transition-transform duration-100"
      style={{ background: bgColor, ...style }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: textColor }}>
              {CATEGORY_LABELS[quest.category]}
            </span>
            {quest.repeatable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-medium" style={{ color: textColor }}>
                ↻ Repeatable
              </span>
            )}
            {quest.expires_at && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-medium" style={{ color: textColor }}>
                ⏰ Limited
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg leading-snug" style={{ color: textColor }}>
            {quest.title}
          </h3>
          {quest.description && (
            <p className="mt-1 text-sm opacity-75 line-clamp-2" style={{ color: textColor }}>
              {quest.description}
            </p>
          )}
        </div>
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-black/15"
          style={{ color: textColor }}
        >
          <span className="text-lg font-black leading-none">⚡</span>
          <span className="text-xl font-black leading-none">{quest.point_value}</span>
          <span className="text-[10px] font-semibold">pts</span>
        </div>
      </div>
    </button>
  )
}
