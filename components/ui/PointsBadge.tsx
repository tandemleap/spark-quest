interface PointsBadgeProps {
  points: number
  type?: 'earned' | 'available'
  size?: 'sm' | 'md' | 'lg'
}

export function PointsBadge({ points, type = 'earned', size = 'md' }: PointsBadgeProps) {
  const sizes = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-lg gap-2',
  }

  const iconSize = { sm: 12, md: 16, lg: 22 }

  if (type === 'available') {
    return (
      <span className={`inline-flex items-center rounded-full bg-[--color-surface] border border-[--color-border] font-semibold text-[--color-accent-light] ${sizes[size]}`}>
        <CoinIcon size={iconSize[size]} />
        {points.toLocaleString()}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-[--color-accent]/20 border border-[--color-accent]/30 font-semibold text-[--color-accent-light] ${sizes[size]}`}>
      <StarIcon size={iconSize[size]} />
      {points.toLocaleString()}
    </span>
  )
}

function StarIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function CoinIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="9" opacity="0.2" />
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="12" y="17" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold">$</text>
    </svg>
  )
}
