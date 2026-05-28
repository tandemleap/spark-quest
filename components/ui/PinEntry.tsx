'use client'

import { useState, useCallback, useEffect } from 'react'

interface PinEntryProps {
  onSubmit: (pin: string) => void
  disabled?: boolean
  status?: 'idle' | 'checking' | 'success' | 'error'
}

const PIN_LENGTH = 8

export function PinEntry({ onSubmit, disabled = false, status = 'idle' }: PinEntryProps) {
  const [digits, setDigits] = useState<string[]>([])

  const handleDigit = useCallback((d: string) => {
    if (disabled || status === 'checking') return
    setDigits(prev => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        setTimeout(() => onSubmit(next.join('')), 80)
      }
      return next
    })
  }, [disabled, status, onSubmit])

  const handleBackspace = useCallback(() => {
    if (disabled || status === 'checking') return
    setDigits(prev => prev.slice(0, -1))
  }, [disabled, status])

  // Reset digits when parent clears status back to idle after error
  useEffect(() => {
    if (status === 'idle') setDigits([])
  }, [status])

  const dotColor = (i: number) => {
    if (status === 'error') return 'bg-red-500'
    if (status === 'success') return 'bg-green-500'
    return i < digits.length ? 'bg-[--color-accent]' : 'bg-[#aaaaaa]'
  }

  return (
    <div className={`flex flex-col items-center gap-8 ${status === 'error' ? 'animate-shake' : ''}`}>
      {/* Dots */}
      <div className="flex gap-4">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-150 ${dotColor(i)} ${i < digits.length ? 'scale-110' : 'scale-100'}`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <KeypadButton key={n} label={String(n)} onPress={() => handleDigit(String(n))} disabled={disabled || status === 'checking'} />
        ))}
        <div /> {/* spacer */}
        <KeypadButton label="0" onPress={() => handleDigit('0')} disabled={disabled || status === 'checking'} />
        <KeypadButton
          label="⌫"
          onPress={handleBackspace}
          disabled={disabled || status === 'checking' || digits.length === 0}
          variant="ghost"
        />
      </div>

      {status === 'checking' && (
        <p className="text-sm text-[--color-muted] animate-pulse">Verifying...</p>
      )}
    </div>
  )
}

function KeypadButton({
  label,
  onPress,
  disabled,
  variant = 'default',
}: {
  label: string
  onPress: () => void
  disabled: boolean
  variant?: 'default' | 'ghost'
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={e => e.preventDefault()} // prevent keyboard popup on mobile
      onClick={onPress}
      className={`h-16 rounded-2xl text-xl font-semibold transition-all duration-100 active:scale-90 select-none
        ${variant === 'ghost'
          ? 'bg-transparent text-[--color-muted] hover:text-[--color-text]'
          : 'bg-[#e8e8e8] border border-[#bbbbbb] text-[--color-text] hover:bg-[#d4d4d4] active:bg-[#c0c0c0]'
        }
        disabled:opacity-30`}
    >
      {label}
    </button>
  )
}
