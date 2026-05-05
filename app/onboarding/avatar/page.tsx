'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type AvatarState = 'camera' | 'preview' | 'generating' | 'done' | 'error' | 'skip_confirm'

export default function AvatarOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<AvatarState>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  async function startCamera() {
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
      setCameraError("Can't access camera. You can skip this and add your avatar later.")
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    // Draw square crop from center
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 512, 512)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedImage(dataUrl)
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

    const base64 = capturedImage.split(',')[1]

    try {
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_id: kidId, image: base64 }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const { avatar_url } = await res.json()
      setGeneratedUrl(avatar_url)
      setState('done')
    } catch {
      setState('error')
    }
  }

  function skipToHome() {
    router.push('/home')
  }

  return (
    <main className="app-shell min-h-screen flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <h1 className="text-3xl font-bold text-[--color-text]">Your SPARK Avatar</h1>
        <p className="text-[--color-muted] mt-1 text-sm">
          {state === 'camera' && "Take a selfie and we'll turn it into a cartoon avatar."}
          {state === 'preview' && "Looking good! Generate your avatar?"}
          {state === 'generating' && "Crafting your look..."}
          {state === 'done' && "Your avatar is ready! 🎉"}
          {state === 'error' && "Something went wrong. Skip for now?"}
        </p>
      </div>

      {/* Camera / Preview area */}
      <div className="flex-1 px-6 flex flex-col items-center gap-6">

        {/* Camera view */}
        {state === 'camera' && (
          <div className="w-full aspect-square rounded-3xl overflow-hidden bg-[--color-surface] relative">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="text-4xl">📷</span>
                <p className="text-[--color-muted] text-sm">{cameraError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
          </div>
        )}

        {/* Captured preview */}
        {(state === 'preview' || state === 'generating') && capturedImage && (
          <div className="w-full aspect-square rounded-3xl overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Your selfie" className="w-full h-full object-cover" />
            {state === 'generating' && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-white font-semibold animate-pulse">Crafting your look...</p>
              </div>
            )}
          </div>
        )}

        {/* Generated avatar */}
        {state === 'done' && generatedUrl && (
          <div className="w-full aspect-square rounded-3xl overflow-hidden animate-pop-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedUrl} alt="Your avatar" className="w-full h-full object-cover" />
          </div>
        )}

        {state === 'error' && (
          <div className="w-full aspect-square rounded-3xl bg-[--color-surface] flex flex-col items-center justify-center gap-3">
            <span className="text-5xl">😬</span>
            <p className="text-[--color-muted] text-sm text-center px-6">
              Avatar generation timed out. You can still play — add your avatar later from your profile.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 w-full pb-8">
          {state === 'camera' && (
            <>
              {!cameraError && (
                <Button size="lg" onClick={capturePhoto}>
                  📸 Take Selfie
                </Button>
              )}
              <Button variant="ghost" size="lg" onClick={skipToHome}>
                Skip for now
              </Button>
            </>
          )}

          {state === 'preview' && (
            <>
              <Button size="lg" onClick={generateAvatar}>
                ✨ Make My Avatar
              </Button>
              <Button variant="secondary" size="lg" onClick={retake}>
                Retake
              </Button>
              <Button variant="ghost" size="lg" onClick={skipToHome}>
                Skip for now
              </Button>
            </>
          )}

          {state === 'done' && (
            <Button size="lg" onClick={skipToHome}>
              Looks great! Let&apos;s go →
            </Button>
          )}

          {state === 'error' && (
            <>
              <Button variant="secondary" size="lg" onClick={retake}>
                Try again
              </Button>
              <Button variant="ghost" size="lg" onClick={skipToHome}>
                Skip for now
              </Button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
