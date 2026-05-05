interface AvatarProps {
  avatarUrl: string | null
  handle: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const HANDLE_COLORS = [
  '#7C3AED', '#C2714F', '#C97D20', '#4A7C59', '#8B6FA6',
  '#2563EB', '#DB2777', '#059669', '#D97706', '#7C3AED',
]

function getColorForHandle(handle: string): string {
  let hash = 0
  for (let i = 0; i < handle.length; i++) {
    hash = handle.charCodeAt(i) + ((hash << 5) - hash)
  }
  return HANDLE_COLORS[Math.abs(hash) % HANDLE_COLORS.length]
}

function getInitials(handle: string): string {
  const parts = handle.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return handle.slice(0, 2).toUpperCase()
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export function Avatar({ avatarUrl, handle, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizes[size]
  const color = getColorForHandle(handle)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={handle}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-[--color-accent] ${className}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold ring-2 ring-white/10 ${className}`}
      style={{ background: color }}
    >
      <span className="text-white">{getInitials(handle)}</span>
    </div>
  )
}
