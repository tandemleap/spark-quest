'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    sessionStorage.removeItem('spark_admin_token')
    router.push('/admin')
  }

  const tabs = [
    { href: '/admin/quests', label: 'Quests' },
    { href: '/admin/rewards', label: 'Rewards' },
    { href: '/admin/settings', label: 'Settings' },
  ]

  return (
    <nav className="bg-[--color-surface] border-b border-[--color-border] px-4 py-3 flex items-center justify-between">
      <div className="flex gap-1">
        {tabs.map(tab => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              pathname === tab.href
                ? 'bg-[--color-accent] text-white'
                : 'text-[--color-muted] hover:text-[--color-text]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="text-xs text-[--color-muted] hover:text-red-400 transition-colors"
      >
        Logout
      </button>
    </nav>
  )
}
