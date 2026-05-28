import { Quest, DOMAIN_COLORS, DOMAIN_LABELS, DOMAIN_EMOJIS, getDomainCardColor } from '@/lib/types'

interface QuestCardProps {
  quest: Quest
  onClick: () => void
  style?: React.CSSProperties
}

export function QuestCard({ quest, onClick, style }: QuestCardProps) {
  const bgColor = getDomainCardColor(quest.domain_tags)
  const accentColor = quest.domain_tags.length > 0 ? DOMAIN_COLORS[quest.domain_tags[0]] : 'var(--color-accent)'

  return (
    <button
      onClick={onClick}
      className="card-grain w-full rounded-2xl p-5 text-left active:scale-[0.97] transition-transform duration-100 overflow-hidden"
      style={{
        background: bgColor,
        borderLeft: `4px solid ${accentColor}`,
        ...style,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Domain tags row */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            {quest.domain_tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: DOMAIN_COLORS[tag] }}
              >
                {DOMAIN_EMOJIS[tag]} {DOMAIN_LABELS[tag]}
              </span>
            ))}
            {quest.is_grit_quest && (
              <span
                className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm"
                style={{ background: '#FF3322', color: '#fff' }}
              >
                🔥 Grit
              </span>
            )}
            {quest.repeatable && (
              <span className="text-[10px] font-semibold text-[--color-muted] uppercase tracking-wide">↻ repeat</span>
            )}
            {quest.expires_at && (
              <span className="text-[10px] font-semibold text-[--color-muted] uppercase tracking-wide">⏰ limited</span>
            )}
          </div>

          {/* Title — condensed bold */}
          <h3
            className="font-barlow font-black text-xl leading-tight text-[--color-text] uppercase"
            style={{ letterSpacing: '-0.01em' }}
          >
            {quest.title}
          </h3>
          {quest.description && (
            <p className="mt-1.5 text-sm text-[--color-muted] line-clamp-2 leading-snug">
              {quest.description}
            </p>
          )}
        </div>

        {/* Points badge */}
        <div
          className="flex-shrink-0 flex flex-col items-center justify-center w-[52px] h-[52px] rounded-xl"
          style={{
            background: accentColor + '22',
            border: `1.5px solid ${accentColor}55`,
          }}
        >
          <span
            className="text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5"
            style={{ color: accentColor }}
          >pts</span>
          <span
            className="font-barlow font-black text-2xl leading-none"
            style={{ color: accentColor }}
          >
            {quest.point_value}
          </span>
          {quest.grit_powerup_points && (
            <span className="text-[8px] font-bold leading-none mt-0.5 text-[--color-muted]">
              +{quest.grit_powerup_points}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
