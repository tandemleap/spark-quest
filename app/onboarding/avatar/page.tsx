'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

type AvatarState = 'loading' | 'setup' | 'camera' | 'preview' | 'generating' | 'result' | 'compare' | 'error'
type ImageSource = 'camera' | 'upload'

type Gender = 'neutral' | 'boy' | 'girl'
type Vibe = 'bold' | 'cool' | 'cute' | 'fierce'

const MAX_GENERATIONS = 10

const GENDERS: { value: Gender; label: string; emoji: string }[] = [
  { value: 'neutral', label: 'No preference', emoji: '⚡' },
  { value: 'boy',     label: 'Guy / masc',    emoji: '🤙' },
  { value: 'girl',    label: 'Girl / fem',    emoji: '✌️' },
]

const VIBES: { value: Vibe; label: string; emoji: string; desc: string }[] = [
  { value: 'bold',   label: 'Bold',   emoji: '🔥', desc: 'bright & vibrant' },
  { value: 'cool',   label: 'Cool',   emoji: '😎', desc: 'dark & edgy' },
  { value: 'cute',   label: 'Cute',   emoji: '✨', desc: 'soft & friendly' },
  { value: 'fierce', label: 'Fierce', emoji: '💪', desc: 'intense & dramatic' },
]

export default function AvatarOnboardingPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<AvatarState>('loading')
  const [gender, setGender] = useState<Gender>('neutral')
  const [vibe, setVibe] = useState<Vibe>('bold')
  const [imageSource, setImageSource] = useState<ImageSource>('camera')
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [previousUrl, setPreviousUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [generationCount, setGenerationCount] = useState(0)
  const [scrollVisible, setScrollVisible] = useState(true)

  useEffect(() => {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) { setState('setup'); return }

    fetch(`/api/kids/${kidId}`)
      .then(r => r.json())
      .then(kid => {
        setGenerationCount(kid.avatar_generation_count ?? 0)
        setScrollVisible(kid.show_avatar_in_scroll ?? true)
        setState('setup')
      })
      .catch(() => setState('setup'))
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
      setCameraError("Can't access camera. You can upload a photo or skip and add your avatar later.")
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function openCamera() {
    setImageSource('camera')
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

  function openFilePicker() {
    setImageSource('upload')
    fileInputRef.current?.click()
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      cropImageToSquare(dataUrl, (cropped) => {
        setCapturedImage(cropped)
        setState('preview')
      })
    }
    reader.readAsDataURL(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function cropImageToSquare(dataUrl: string, callback: (result: string) => void) {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current!
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext('2d')!
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 512, 512)
      callback(canvas.toDataURL('image/jpeg', 0.9))
    }
    img.src = dataUrl
  }

  function retake() {
    setCapturedImage(null)
    if (imageSource === 'camera') {
      setState('camera')
      startCamera()
    } else {
      setState('setup')
    }
  }

  async function generateAvatar() {
    if (!capturedImage) return
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return

    if (imageSource === 'upload') {
      await uploadPhoto(kidId)
      return
    }

    setState('generating')
    try {
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_id: kidId, image: capturedImage.split(',')[1], gender, vibe }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        if (error === 'limit_reached') { setState('result'); return }
        throw new Error()
      }
      const data = await res.json()
      setGenerationCount(data.generation_count)
      setGeneratedUrl(data.avatar_url)
      setPreviousUrl(data.previous_avatar_url ?? null)
      localStorage.setItem('spark_kid_avatar', data.avatar_url)
      setState(data.previous_avatar_url ? 'compare' : 'result')
    } catch {
      setState('error')
    }
  }

  async function uploadPhoto(kidId: string) {
    setState('generating')
    try {
      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kid_id: kidId, image: capturedImage!.split(',')[1] }),
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

  async function pickAvatar(url: string) {
    const kidId = localStorage.getItem('spark_kid_id')
    if (kidId && url !== generatedUrl) {
      await fetch(`/api/kids/${kidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: url }),
      })
    }
    localStorage.setItem('spark_kid_avatar', url)
    router.push('/home')
  }

  async function toggleScrollVisibility() {
    const kidId = localStorage.getItem('spark_kid_id')
    if (!kidId) return
    const newVal = !scrollVisible
    setScrollVisible(newVal)
    await fetch(`/api/kids/${kidId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_avatar_in_scroll: newVal }),
    })
  }

  function tryAgain() {
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

  const attemptsLeft = MAX_GENERATIONS - generationCount
  const atLimit = generationCount >= MAX_GENERATIONS

  return (
    <main className="app-shell min-h-screen flex flex-col">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelected}
      />

      <div className="px-6 pt-10 pb-4">
        <h1 className="text-3xl font-bold text-[--color-text]">Your SPARK Avatar</h1>
      </div>

      <div className="flex-1 px-6 flex flex-col gap-5 overflow-y-auto pb-10">

        {/* LOADING */}
        {state === 'loading' && (
          <div className="flex justify-center pt-16">
            <LoadingSpinner size="lg" />
          </div>
        )}

        {/* SETUP — pick style before camera */}
        {state === 'setup' && (
          <>
            <p className="text-[--color-muted] text-base leading-snug">
              Take a selfie and we&apos;ll generate a cool AI sticker avatar — or upload a photo directly.
            </p>

            {/* Attempt counter */}
            {generationCount > 0 && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold ${
                atLimit
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : attemptsLeft <= 3
                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                  : 'bg-[--color-surface] text-[--color-muted] border border-[--color-border]'
              }`}>
                <span>{atLimit ? '🚫' : attemptsLeft <= 3 ? '⚠️' : '🎨'}</span>
                <span>
                  {atLimit
                    ? 'AI generation limit reached (10/10)'
                    : `${attemptsLeft} AI generation${attemptsLeft === 1 ? '' : 's'} remaining`}
                </span>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-[--color-text] mb-3">Make it look like a...</p>
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map(g => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    style={{ touchAction: 'manipulation' }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      gender === g.value
                        ? 'bg-[--color-accent] text-white border-[--color-accent]'
                        : 'bg-[--color-surface] text-[--color-text] border-[--color-border]'
                    }`}
                  >
                    <span>{g.emoji}</span>
                    {gender === g.value && <span>✓</span>}
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[--color-text] mb-3">Pick a vibe</p>
              <div className="grid grid-cols-2 gap-2">
                {VIBES.map(v => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setVibe(v.value)}
                    style={{ touchAction: 'manipulation' }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-colors ${
                      vibe === v.value
                        ? 'border-[--color-accent] bg-[--color-surface] text-[--color-text]'
                        : 'border-[--color-border] bg-[--color-surface] text-[--color-muted]'
                    }`}
                  >
                    <span className="text-2xl">{v.emoji}</span>
                    <div className="flex-1">
                      <p className={`text-sm font-bold leading-tight ${vibe === v.value ? 'text-[--color-text]' : 'text-[--color-muted]'}`}>{v.label}</p>
                      <p className="text-xs leading-tight opacity-70">{v.desc}</p>
                    </div>
                    {vibe === v.value && <span className="text-[--color-accent-light] font-bold text-sm ml-auto">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              {!atLimit && (
                <Button size="lg" onClick={openCamera}>
                  📸 Take Selfie + AI Magic
                </Button>
              )}
              <Button variant="secondary" size="lg" onClick={openFilePicker}>
                🖼 Upload a Photo
              </Button>
              <Button variant="ghost" size="lg" onClick={skip}>
                Skip for now
              </Button>
            </div>

            {/* Scroll visibility toggle */}
            <ScrollToggle visible={scrollVisible} onToggle={toggleScrollVisibility} />
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
              {cameraError && (
                <Button size="lg" onClick={openFilePicker}>🖼 Upload a Photo Instead</Button>
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
              {imageSource === 'upload'
                ? 'Happy with this photo? Tap below to use it as your avatar.'
                : `Happy with the shot? Tap below to generate your ${VIBES.find(v => v.value === vibe)?.label} sticker avatar.`}
            </p>
            <div className="w-full aspect-square rounded-3xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Your photo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={generateAvatar}>
                {imageSource === 'upload' ? '✅ Use This Photo' : '✨ Make My Avatar'}
              </Button>
              <Button variant="secondary" size="lg" onClick={retake}>
                {imageSource === 'upload' ? '🖼 Choose Different Photo' : 'Retake'}
              </Button>
              <Button variant="ghost" size="lg" onClick={skip}>Skip for now</Button>
            </div>
          </>
        )}

        {/* GENERATING */}
        {state === 'generating' && capturedImage && (
          <>
            <div className="w-full aspect-square rounded-3xl overflow-hidden relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedImage} alt="Your photo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4">
                <LoadingSpinner size="lg" />
                <p className="text-white font-semibold animate-pulse">
                  {imageSource === 'upload' ? 'Saving your photo…' : 'Crafting your look…'}
                </p>
                {imageSource !== 'upload' && (
                  <p className="text-white/60 text-xs">This takes about 20–30 seconds</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* RESULT */}
        {state === 'result' && generatedUrl && (
          <>
            <p className="text-sm text-[--color-muted] text-center">
              {imageSource === 'upload'
                ? 'Your photo is set as your avatar!'
                : atLimit
                ? 'Looking good! (AI generation limit reached.)'
                : `Love it or want to try a different look? ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left.`}
            </p>
            <div className="w-full aspect-square rounded-3xl overflow-hidden animate-pop-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedUrl} alt="Your avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" onClick={() => router.push('/home')}>
                ✅ Keep it — let&apos;s go!
              </Button>
              {imageSource !== 'upload' && !atLimit && (
                <Button variant="secondary" size="lg" onClick={tryAgain}>
                  🔁 Try again ({attemptsLeft} left)
                </Button>
              )}
            </div>
            <ScrollToggle visible={scrollVisible} onToggle={toggleScrollVisibility} />
          </>
        )}

        {/* COMPARE — pick current vs new */}
        {state === 'compare' && previousUrl && generatedUrl && (
          <>
            <p className="text-base font-semibold text-[--color-text] text-center">Pick your favorite!</p>
            <p className="text-sm text-[--color-muted] text-center -mt-3">
              Tap the one you want to keep. ({attemptsLeft} attempt{attemptsLeft === 1 ? '' : 's'} remaining.)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                onClick={() => pickAvatar(previousUrl)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden ring-2 ring-[--color-border] hover:ring-[--color-accent] transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previousUrl} alt="Previous avatar" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-bold text-[--color-text]">Previous</span>
              </button>
              <button
                type="button"
                style={{ touchAction: 'manipulation' }}
                onClick={() => pickAvatar(generatedUrl)}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden ring-2 ring-[--color-border] hover:ring-[--color-accent] transition-all">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedUrl} alt="New avatar" className="w-full h-full object-cover" />
                </div>
                <span className="text-sm font-bold text-[--color-text]">New ✨</span>
              </button>
            </div>
            <ScrollToggle visible={scrollVisible} onToggle={toggleScrollVisibility} />
          </>
        )}

        {/* ERROR */}
        {state === 'error' && (
          <>
            <div className="w-full aspect-square rounded-3xl bg-[--color-surface] flex flex-col items-center justify-center gap-3">
              <span className="text-5xl">😬</span>
              <p className="text-[--color-muted] text-sm text-center px-6">
                Something went wrong. You can try again or skip and add your avatar later.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Button variant="secondary" size="lg" onClick={() => setState('setup')}>Try again</Button>
              <Button variant="ghost" size="lg" onClick={skip}>Skip for now</Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function ScrollToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ touchAction: 'manipulation' }}
      className="flex items-center justify-between w-full px-4 py-3.5 rounded-2xl bg-[--color-surface] border border-[--color-border] text-left"
    >
      <div>
        <p className="text-sm font-semibold text-[--color-text]">Show my photo on the group scroll</p>
        <p className="text-xs text-[--color-muted] mt-0.5">The TV display shown in the program space</p>
      </div>
      <div className={`w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 relative ${visible ? 'bg-[--color-accent]' : 'bg-[--color-border]'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${visible ? 'translate-x-6' : 'translate-x-1'}`} />
      </div>
    </button>
  )
}
