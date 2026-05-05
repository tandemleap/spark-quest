'use client'

import { useState, useEffect } from 'react'

interface Toast {
  id: number
  points: number
  x: number
  y: number
}

let toastId = 0
let addToastFn: ((points: number) => void) | null = null

export function showPointsToast(points: number) {
  addToastFn?.(points)
}

export function PointsToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    addToastFn = (points: number) => {
      const id = ++toastId
      const x = 40 + Math.random() * 20
      const y = 50 + Math.random() * 20
      setToasts(prev => [...prev, { id, points, x, y }])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, 1400)
    }
    return () => { addToastFn = null }
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="absolute animate-float-up-fade font-bold text-2xl text-[--color-accent-light] drop-shadow-lg"
          style={{ left: `${t.x}%`, top: `${t.y}%` }}
        >
          +{t.points} pts ⚡
        </div>
      ))}
    </div>
  )
}
