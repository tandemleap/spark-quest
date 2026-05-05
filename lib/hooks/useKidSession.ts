'use client'

import { useState, useEffect } from 'react'

interface KidSession {
  kidId: string
  handle: string
}

export function useKidSession() {
  const [session, setSessionState] = useState<KidSession | null | 'loading'>('loading')

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    const handle = localStorage.getItem('spark_kid_handle')
    if (kidId && handle) {
      setSessionState({ kidId, handle })
    } else {
      setSessionState(null)
    }
  }, [])

  function setSession(kidId: string, handle: string) {
    localStorage.setItem('spark_kid_id', kidId)
    localStorage.setItem('spark_kid_handle', handle)
    setSessionState({ kidId, handle })
  }

  function clearSession() {
    localStorage.removeItem('spark_kid_id')
    localStorage.removeItem('spark_kid_handle')
    setSessionState(null)
  }

  return { session, setSession, clearSession }
}
