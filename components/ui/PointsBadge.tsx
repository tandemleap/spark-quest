interface PointsBadgeProps {
  points: number
  type?: 'earned' | 'available'
  size?: 'sm' | 'md' | 'lg'
}

export function PointsBadge({ points, type = 'earned', size = 'md' }: PointsBadgeProps) {
  if (type === 'available') {
    const numSize = size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-base' : 'text-sm'
    const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]'
    return (
      <span className="inline-flex items-baseline gap-1 font-bold text-[--color-muted]">
        <span className={`${numSize} font-black text-[--color-text]`}>{points.toLocaleString()}</span>
        <span className={`${labelSize} uppercase tracking-wider`}>avail</span>
      </span>
    )
  }

  const numSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-base'
  const labelSize = size === 'lg' ? 'text-sm' : 'text-[10px]'
  return (
    <span className="inline-flex items-baseline gap-1 font-bold text-[--color-accent-light]">
      <span className={`${numSize} font-black`}>{points.toLocaleString()}</span>
      <span className={`${labelSize} uppercase tracking-widest text-[--color-muted]`}>xp</span>
    </span>
  )
}
