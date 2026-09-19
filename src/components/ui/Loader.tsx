import { useEffect, useState } from 'react'
import { BrandMark } from './Brand'

/** Brand curtain shown until the WebGL scene has drawn its first frames. */
export default function Loader({ ready }: { ready: boolean }) {
  const [gone, setGone] = useState(false)
  const [forced, setForced] = useState(false)
  const done = ready || forced

  useEffect(() => {
    // Never hold the page hostage: lift the curtain after a few seconds regardless.
    const t = window.setTimeout(() => setForced(true), 7000)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!done) return
    const t = window.setTimeout(() => setGone(true), 1400)
    return () => window.clearTimeout(t)
  }, [done])

  if (gone) return null

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col items-center justify-center bg-espresso transition-opacity duration-[1200ms] ease-(--ease-lux) ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <BrandMark className="h-16 w-16 text-gold" />
        <span className="absolute -top-3 left-1/2 h-4 w-px -translate-x-1/2 bg-gold/60 [animation:steam-rise_1.8s_ease-out_infinite]" />
      </div>
      <p className="eyebrow mt-8 text-cream/60">Brewing the experience</p>
      <div className="mt-5 h-px w-40 overflow-hidden bg-cream/10">
        <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-gold to-transparent [animation:loader-sweep_1.6s_ease-in-out_infinite]" />
      </div>
      <style>{`@keyframes loader-sweep{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
    </div>
  )
}
