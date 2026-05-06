'use client'

import { useState, useEffect } from 'react'
import { AdminNav } from '@/components/layout/AdminNav'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Stats {
  totalKids: number
  totalCompletions: number
  totalRedemptions: number
  totalPointsAwarded: number
  totalPointsAvailable: number
  pointsThisWeek: number
  completionsThisWeek: number
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[--color-surface] border border-[--color-border] rounded-2xl p-4">
      <p className="text-xs text-[--color-muted] mb-1">{label}</p>
      <p className="text-3xl font-black text-[--color-text]">{value}</p>
      {sub && <p className="text-xs text-[--color-muted] mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('spark_admin_token') ?? ''
    fetch('/api/admin/dashboard', { headers: { 'x-admin-token': token } })
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

  return (
    <div className="min-h-screen bg-[--color-bg]">
      <AdminNav />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[--color-text] mb-6">Dashboard</h1>

        {loading ? (
          <div className="flex justify-center pt-12"><LoadingSpinner size="lg" /></div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Kids" value={stats.totalKids} />
            <StatCard label="Quest Completions" value={stats.totalCompletions} sub={`${stats.completionsThisWeek} this week`} />
            <StatCard label="Points Awarded" value={stats.totalPointsAwarded.toLocaleString()} sub={`${stats.pointsThisWeek.toLocaleString()} this week`} />
            <StatCard label="Points Available" value={stats.totalPointsAvailable.toLocaleString()} sub="across all kids" />
            <StatCard label="Redemptions" value={stats.totalRedemptions} />
            <StatCard label="Points Spent" value={(stats.totalPointsAwarded - stats.totalPointsAvailable).toLocaleString()} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
