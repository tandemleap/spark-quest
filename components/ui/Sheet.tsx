'use client'

import { ReactNode, useEffect } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
}

export function Sheet({ open, onClose, children, title }: SheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative max-w-[430px] mx-auto w-full bg-[--color-surface] rounded-t-3xl shadow-2xl animate-slide-up"
        style={{ maxHeight: '90svh', overflowY: 'auto' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[--color-border]" />
        </div>

        {title && (
          <div className="px-6 pt-2 pb-4 border-b border-[--color-border]">
            <h2 className="text-xl font-bold text-[--color-text]">{title}</h2>
          </div>
        )}

        <div className="px-6 pt-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  )
}
