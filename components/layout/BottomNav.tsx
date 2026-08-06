'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  {
    href: '/home',
    label: 'HOME',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
  },
  {
    href: '/quests',
    label: 'QUESTS',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
    ),
  },
  {
    href: '/rewards',
    label: 'REWARDS',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
        <path d="M20 12V22H4V12" /><path d="M22 7H2v5h20V7z" /><path d="M12 22V7" />
        <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
      </svg>
    ),
  },
  {
    href: '/progress-station',
    label: 'PROGRESS',
    icon: (_active: boolean) => (
      // Upward trend / personal journey icon
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 17 8.5 10.5 13.5 15.5 22 7" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
]

export function BottomNav({ onSwitchUser }: { onSwitchUser?: () => void }) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-40"
      style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors duration-150 relative"
              style={{ color: active ? 'var(--color-accent-light)' : 'var(--color-muted)' }}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: 'var(--color-accent-light)' }}
                />
              )}
              {tab.icon(active)}
              <span
                className="font-barlow font-bold text-[9px] tracking-widest"
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
        {onSwitchUser && (
          <button
            type="button"
            onClick={onSwitchUser}
            className="flex-1 flex flex-col items-center py-2.5 gap-0.5 transition-colors duration-150"
            style={{ color: 'var(--color-muted)', touchAction: 'manipulation' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="font-barlow font-bold text-[9px] tracking-widest">
              SWITCH
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
