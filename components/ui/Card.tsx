import { ReactNode, CSSProperties } from 'react'
import { QuestCategory, CATEGORY_COLORS } from '@/lib/types'

interface CardProps {
  children: ReactNode
  category?: QuestCategory
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({ children, category, className = '', style, onClick }: CardProps) {
  const bg = (category && CATEGORY_COLORS[category]) || 'var(--color-surface)'

  return (
    <div
      className={`card-grain rounded-3xl p-5 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-100' : ''} ${className}`}
      style={{ background: bg, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
