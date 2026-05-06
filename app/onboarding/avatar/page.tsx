'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type AvatarState = 'setup' | 'camera' | 'preview' | 'generating' | 'result' | 'error'

type Gender = 'neutral' | 'boy' | 'girl'
type Style = 'cartoon' | 'anime' | 'fortnite' | 'pencil' | 'pixel' | 'watercolor'

const STYLES: { value: Style; label: string; emoji: string }[] = [
  { value: 'cartoon',    label: 'Cartoon',    emoji: '🎨' },
  { value: 'anime',      label: 'Anime',      emoji: '⛩️' },
  { value: 'fortnite',   label: 'Fortnite',   emoji: '🎮' },
  { value: 'pencil',     label: 'Pencil Sketch', emoji: '✏️' },
  { value: 'pixel',      label: 'Pixel Art',  emoji: '👾' },
  { value: 'watercolor', label: 'Watercolor', emoji: '🖌️' },
]

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'neutral', label: 'No preference' },
  { value: 'boy',     label: 'Guy / masculine' },
  { value: 'girl',    label: 'Girl / feminine' },
]

export default function AvatarOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<AvatarState>('setup')
  const [gender, setGender] = useState<Gender>('neutral')
  const [style, setStyle] = useState<Style>('cartoon')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [hasUsedRetry, setHasUsedRetry] = useState(false)
  const [isRetrySession, setIsRetrySession] = useState(false)

  useEffect(() => {
    setHasUsedRetry(localStorage.getItem('spark_avatar_retried') === 'true')
  }, [])

  async function startCamera() {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCameraError("Can't access camera. You can skip and add your avatar later.")
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function openCamera() {
    setState('camera')
    startCamera()
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 512, 512)
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85))
    stopCamera()
    setState('preview')
  }

  function retake() {
    setCapturedImage(null)
    setState('camera')
    startCamera()
  }

  async function generateAvatar() {
    if (!capturedImage) return
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return
    setState('generating')
    try {
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_id: kidId, image: capturedImage.split(',')[1], style, gender, force: isRetrySession }),
      })
      if (!res.ok) throw new Error()
      const { avatar_url } = await res.json()
      setGeneratedUrl(avatar_url)
      localStorage.setItem('spark_kid_avatar', avatar_url)
      setState('result')
    } catch {
      setState('error')
    }
  }

  function keepAvatar() {
    router.push('/home')
  }

  function tryAgain() {
    localStorage.setItem('spark_avatar_retried', 'true')
    setHasUsedRetry(true)
    setIsRetrySession(true)
    setGeneratedUrl(null)
    setCapturedImage(null)
    setState('camera')
    startCamera()
  }

  function skip() {
    stopCamera()
    router.push('/home')
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  return (
    <main className="app-shell min-h-screen flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      <div className="px-6 pt-10 pb-4">
        <h1 className="text-3xl font-bold text-[--color-text]">Your SPARK Avatar</h1>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-5 overflow-y-auto pb-10">

        {/* SETUP — pick style before camera */}
        {state === 'setup' && (
          <>
            <p className="text-[--color-muted] text-base leading-snug">
              Take a selfie. We&apos;ll turn it into a cool avatar just for you. Pick your style first.
            </p>

            <div>
              <p className="text-sm font-semibold text-[--color-text] mb-3">I want my avatar to look like a...</p>
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    style={{ touchAction: 'manipulation' }}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      gender === g.value
                        ? 'bg-[--color-accent] text-white border-[--color-accent]'
                        : 'bg-[--color-surface] text-[--color-text] border-[--color-border]'
                    }`}
                  >
                    {gender === g.value ? '✓ ' : ''}{g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[--color-text] mb-3">Pick a style</p>
              <div className="grid grid-cols-3 gap-2">
                {STYLES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    style={{ touchAction: 'manipulation' }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-center transition-colors ${
                      style === s.value
                        ? 'border-[--color-accent] bg-[--color-surface] text-[--color-text]'
                        : 'border-[--color-border] bg-[--color-surface] text-[--color-muted]'
                    }`}
                  >
                    <span className="text-2xl">{s.emoji}</span>
                    <span className="text-xs font-semibold leading-tight">{s.label}</span>
                    {style === s.value && (
                      <span className="text-[10px] font-bold text-[--color-accent-light]">✓ selected</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Button size="lg" onClick={openCamera}>
                📸 Open Camera
              </Button>
              <Button variant="ghost" size="lg" onClick={skip}>
                Skip for now
              </Button>
            </div>
          </>
        )}

        {/* CAMERA */}
        {state === 'camera' && (
          <>
            <p className="text-sm text-[--color-muted]">
              Position your face in the frame, then tap the button below.
            </p>
            <div className="w-full aspect-square rounded-3xl overflow-hidden bg-[--color-surface] relative">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="text-4xl">📷</span>
                  <p className="text-[--color-muted] text-sm">{cameraError}</p>
                </div>
              ) : (
                <video ref={videoRef} playsInline muted autoPlay className="w-full h-full object-cover scale-x-[-1]" />
              )}
            </div>
            <div className="flex flex-col gap-3">
              {!cameraError && (
                <Button size="lg" onClick={capturePhoto}>📸 Take Selfie</Button>
              )}
              <Button variant="secondary" size="lg" onClick={() => { stopCamera(); setState('setup') }}>
                ← Back
              </Button>
              <Button variant="ghost" size="lg" onClick={skip}>Skip for now</Button>
            </div>
          </>
        )}

        {/* PREVIEW */}
        {state === 'preview' && capturedImage && (
          <>
            <p className="text-sm text-[--color-muted]">
              Happy with the shot? Tap below to generate your <strong className="text-[--color-text]">{STYLES.find(s => s.value === style)?.label}</strong> avatar.
            </p>
            <div className="w-full aspect-square rounded-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Your selfie" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => generateAvatar()}>✨ Make My Avatar</Button>
              <Button variant="secondary" size="lg" onClick={retake}>Retake</Button>
              <Button variant="ghost" size="lg" onClick={skip}>Skip for now</Button>
            </div>
          </>
        )}

        {/* GENERATING */}
        {state === 'generating' && capturedImage && (
          <>
            <div className="w-full aspect-square rounded-3xl overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Your selfie" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-white font-semibold animate-pulse">Crafting your look…</p>
                <p className="text-white/60 text-xs">This takes about 20–30 seconds</p>
              </div>
            </div>
          </>
        )}

        {/* RESULT */}
        {state === 'result' && generatedUrl && (
          <>
            <p className="text-sm text-[--color-muted] text-center">
              {hasUsedRetry
                ? 'Looking good! Tap below to save your avatar.'
                : 'Love it or want to try a different look?'}
            </p>
            <div className="w-full aspect-square rounded-3xl overflow-hidden animate-pop-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedUrl} alt="Your avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={keepAvatar}>
                ✅ Keep it — let&apos;s go!
              </Button>
              {!hasUsedRetry && (
                <Button variant="secondary" size="lg" onClick={tryAgain}>
                  🔁 Try one more time
                </Button>
              )}
            </div>
          </>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <>
            <div className="w-full aspect-square rounded-3xl bg-[--color-surface] flex flex-col items-center justify-center gap-3">
              <span className="text-5xl">😬</span>
              <p className="text-[--color-muted] text-sm text-center px-6">
                Avatar generation timed out. You can try again or skip and add it later.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="secondary" size="lg" onClick={retake}>Try again</Button>
              <Button variant="ghost" size="lg" onClick={skip}>Skip for now</Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
