'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { PointsToastContainer } from '@/components/ui/PointsToast'
import { FullPageSpinner } from '@/components/ui/LoadingSpinner'

export default function KidLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) {
      router.replace('/')
    } else {
      setChecked(true)
    }
  }, [router])

  if (!checked) return <FullPageSpinner />

  return (
    <div className="app-shell min-h-screen bg-[--color-bg]">
      <main className="pb-nav">{children}</main>
      <BottomNav />
      <PointsToastContainer />
    </div>
  )
}
