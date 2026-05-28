// Multicolor domain progress bar.
// Bar width = targetCost (100%). Filled portion is split by domain color in proportion
// to how many points the kid earned in each domain.

const DOMAIN_SEGMENTS = [
  { key: 'body'  as const, color: '#ff9933' },
  { key: 'brain' as const, color: '#ffcc33' },
  { key: 'heart' as const, color: '#993399' },
  { key: 'hands' as const, color: '#33cc00' },
  { key: 'team'  as const, color: '#3399cc' },
]

interface DomainProgressBarProps {
  kidPoints: { body: number; brain: number; heart: number; hands: number; team: number }
  totalEarned: number
  targetCost: number
  /** Used for "ready to redeem" check — falls back to totalEarned if omitted */
  availablePoints?: number
  height?: 'sm' | 'lg'
  showLabel?: boolean
}

export function DomainProgressBar({
  kidPoints,
  totalEarned,
  targetCost,
  availablePoints,
  height = 'sm',
  showLabel = true,
}: DomainProgressBarProps) {
  const h = height === 'lg' ? 16 : 12

  const filledTotal = Math.min(totalEarned, targetCost)
  const fillFraction = targetCost > 0 ? filledTotal / targetCost : 0

  const spendable = availablePoints ?? totalEarned
  const readyToRedeem = spendable >= targetCost
  const remaining = Math.max(0, targetCost - spendable)

  return (
    <div>
      {/* Track */}
      <div
        style={{ height: h, borderRadius: 999, background: '#e0e0e0', position: 'relative', overflow: 'hidden' }}
      >
        {/* Filled portion — width animates, segments split by flex */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 0, height: '100%',
            width: `${fillFraction * 100}%`,
            display: 'flex',
            borderRadius: 999,
            overflow: 'hidden',
            transition: 'width 0.7s ease-out',
          }}
        >
          {DOMAIN_SEGMENTS.map(seg => {
            const pts = kidPoints[seg.key]
            if (pts <= 0) return null
            return (
              <div
                key={seg.key}
                style={{ flex: pts, background: seg.color, height: '100%' }}
              />
            )
          })}
          {/* If no domain points yet but filledTotal > 0, show gray */}
          {filledTotal > 0 && DOMAIN_SEGMENTS.every(s => kidPoints[s.key] <= 0) && (
            <div style={{ flex: 1, background: '#888780', height: '100%' }} />
          )}
        </div>
      </div>

      {showLabel && (
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>
            {filledTotal} of {targetCost} pts
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: readyToRedeem ? '#4ade80' : 'var(--color-muted)' }}>
            {readyToRedeem ? 'Ready to redeem! 🎉' : `${remaining} more to go`}
          </span>
        </div>
      )}
    </div>
  )
}
