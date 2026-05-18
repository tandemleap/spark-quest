import { ReactNode, CSSProperties } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

export function Card({ children, className = '', style, onClick }: CardProps) {
  return (
    <div
      className={`card-grain rounded-3xl p-5 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform duration-100' : ''} ${className}`}
      style={{ background: 'var(--color-surface)', ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
