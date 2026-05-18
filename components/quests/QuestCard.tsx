import { Quest, DOMAIN_COLORS, DOMAIN_TEXT_COLORS, DOMAIN_LABELS, DOMAIN_EMOJIS, getDomainCardColor, getDomainCardTextColor } from '@/lib/types'

interface QuestCardProps {
  quest: Quest
  onClick: () => void
  style?: React.CSSProperties
}

export function QuestCard({ quest, onClick, style }: QuestCardProps) {
  const bgColor = getDomainCardColor(quest.domain_tags)
  const textColor = getDomainCardTextColor(quest.domain_tags)

  return (
    <button
      onClick={onClick}
      className="card-grain w-full rounded-3xl p-5 text-left active:scale-[0.97] transition-transform duration-100"
      style={{ background: bgColor, ...style }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Domain tags + badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {quest.domain_tags.map(tag => (
              <span
                key={tag}
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: textColor }}
              >
                {DOMAIN_EMOJIS[tag]} {DOMAIN_LABELS[tag]}
              </span>
            ))}
            {quest.repeatable && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-medium" style={{ color: textColor }}>
                ↻ Repeatable
              </span>
            )}
            {quest.is_grit_quest && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-bold" style={{ color: textColor }}>
                🔥 Grit
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

        {/* Points badge */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-black/15"
          style={{ color: textColor }}
        >
          <span className="text-lg font-black leading-none">⚡</span>
          <span className="text-xl font-black leading-none">{quest.point_value}</span>
          <span className="text-[10px] font-semibold">pts</span>
          {quest.grit_powerup_points && (
            <span className="text-[9px] font-bold opacity-70">+{quest.grit_powerup_points}</span>
          )}
        </div>
      </div>
    </button>
  )
}
