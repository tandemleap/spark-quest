'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FullPageSpinner } from '@/components/ui/LoadingSpinner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/admin') {
      setChecked(true)
      return
    }

    const token = sessionStorage.getItem('spark_admin_token')
    if (!token) {
      router.replace('/admin')
      return
    }

    try {
      const [payloadB64] = token.split('.')
      const { exp } = JSON.parse(atob(payloadB64))
      if (Date.now() > exp) {
        sessionStorage.removeItem('spark_admin_token')
        router.replace('/admin')
        return
      }
    } catch {
      router.replace('/admin')
      return
    }

    setChecked(true)
  }, [pathname, router])

  if (!checked) return <FullPageSpinner />

  return <>{children}</>
}
