'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  { href: '/admin/dashboard', label: '📊 Dashboard' },
  { href: '/admin/kids',      label: '👥 Kids' },
  { href: '/admin/quests',    label: '⚡ Quests' },
  { href: '/admin/rewards',   label: '🎁 Rewards' },
  { href: '/admin/completions', label: '✅ Completions' },
  { href: '/admin/redemptions', label: '💸 Redemptions' },
  { href: '/admin/settings',  label: '⚙️ Settings' },
]

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    sessionStorage.removeItem('spark_admin_token')
    router.push('/admin')
  }

  return (
    <nav className="bg-[--color-surface] border-b border-[--color-border] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-[--color-accent-light]">⚡ SPARK Staff Portal</span>
        <button onClick={handleLogout} className="text-xs text-[--color-muted] hover:text-red-400 transition-colors">
          Logout
        </button>
      </div>
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              pathname === tab.href
                ? 'bg-[--color-accent] text-white'
                : 'text-[--color-muted] hover:text-[--color-text]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
