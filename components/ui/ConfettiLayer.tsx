'use client'

import confetti from 'canvas-confetti'

export function fireConfetti() {
  confetti({
    particleCount: 140,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#7C3AED', '#A78BFA', '#C2714F', '#C97D20', '#4A7C59', '#8B6FA6'],
    disableForReducedMotion: true,
  })
}

export function fireConfettiSides() {
  confetti({
    particleCount: 60,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.6 },
    colors: ['#7C3AED', '#A78BFA', '#C2714F'],
    disableForReducedMotion: true,
  })
  confetti({
    particleCount: 60,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.6 },
    colors: ['#7C3AED', '#A78BFA', '#C97D20'],
    disableForReducedMotion: true,
  })
}
