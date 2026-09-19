import { forwardRef, useImperativeHandle, useRef } from 'react'
import { prefersReducedMotion } from '../../animation/scrollController'

/**
 * The journey as real footage: one shot per stage, stacked full-screen. Each shot fades in
 * over the one before it as the story scrolls (chapter i spans journey time [i, i + 1]),
 * with a slow push-in so the cut feels like one continuous film.
 */

interface Shot {
  name: string
  /** Journey time the shot covers. */
  from: number
  to: number
  /** Portrait footage is framed in a window on wide screens. */
  portrait?: boolean
  /** A still (no video). */
  still?: boolean
}

const SHOTS: Shot[] = [
  { name: 'estate', from: 0, to: 1 },
  { name: 'harvest-pick', from: 1, to: 1.5 },
  { name: 'harvest-basket', from: 1.5, to: 2, portrait: true },
  { name: 'drying', from: 2, to: 3 },
  { name: 'roast-drop', from: 3, to: 3.5 },
  { name: 'roast-cool', from: 3.5, to: 4 },
  { name: 'grind', from: 4, to: 5 },
  { name: 'filter', from: 5, to: 6 },
  { name: 'decoction', from: 6, to: 7 },
  { name: 'dabara', from: 7, to: 8, portrait: true },
  { name: 'pour', from: 8, to: 9, portrait: true },
  { name: 'finale', from: 9, to: 10.5, portrait: true, still: true },
]

/** Half-width of the cross-dissolve, in chapter units. */
const FADE = 0.14
/** Load a shot's video when it is this close (chapter units). */
const PRELOAD = 1.2

const base = import.meta.env.BASE_URL
const url = (file: string) => `${base}film/${file}`
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export interface FilmHandle {
  update: (pos: number) => void
}

const Film = forwardRef<FilmHandle, { onFirstFrame?: () => void }>(function Film({ onFirstFrame }, ref) {
  const layers = useRef<(HTMLDivElement | null)[]>([])
  const media = useRef<(HTMLDivElement | null)[]>([])
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const shown = useRef<boolean[]>([])
  const still = prefersReducedMotion()

  useImperativeHandle(ref, () => ({
    update(pos: number) {
      SHOTS.forEach((shot, i) => {
        const layer = layers.current[i]
        if (!layer) return
        // Fade in over the previous shot; stay opaque until the next one has fully covered it.
        const alpha = i === 0 ? 1 : clamp01((pos - (shot.from - FADE)) / (2 * FADE))
        const covered = i < SHOTS.length - 1 && pos > SHOTS[i + 1].from + FADE
        const visible = alpha > 0.001 && !covered
        layer.style.opacity = String(alpha)
        layer.style.visibility = visible ? 'visible' : 'hidden'

        // Slow push-in across the shot.
        const t = clamp01((pos - (shot.from - FADE)) / (shot.to - shot.from + 2 * FADE))
        const m = media.current[i]
        if (m) m.style.transform = `scale(${1.08 - t * 0.08}) translate3d(0, ${(0.5 - t) * 1.5}%, 0)`

        const v = videos.current[i]
        if (!v) return
        const near = pos > shot.from - PRELOAD && pos < shot.to + PRELOAD
        if (near && !v.src) {
          v.src = url(`${shot.name}.mp4`)
          v.load()
        }
        if (visible && !still) {
          if (v.paused && v.src) v.play().catch(() => undefined)
        } else if (!v.paused) v.pause()
        shown.current[i] = visible
      })
    },
  }))

  return (
    <div className="absolute inset-0 isolate bg-espresso" aria-hidden="true">
      {SHOTS.map((shot, i) => (
        <div
          key={shot.name}
          ref={(n) => {
            layers.current[i] = n
          }}
          className={`film-shot ${shot.portrait ? 'film-portrait' : ''}`}
          style={{ opacity: i === 0 ? 1 : 0, visibility: i === 0 ? 'visible' : 'hidden', zIndex: i }}
        >
          {/* Wide screens: a soft, blurred fill behind portrait footage. */}
          {shot.portrait && <img className="film-fill" src={url(`${shot.name}.jpg`)} alt="" loading="lazy" decoding="async" />}
          <div
            ref={(n) => {
              media.current[i] = n
            }}
            className="film-media"
          >
            {shot.still ? (
              <img className="film-frame" src={url(`${shot.name}.jpg`)} alt="" loading="lazy" decoding="async" />
            ) : (
              <video
                ref={(n) => {
                  videos.current[i] = n
                }}
                className="film-frame"
                poster={url(`${shot.name}.jpg`)}
                muted
                loop
                playsInline
                preload="auto"
                disablePictureInPicture
                onLoadedData={(e) => {
                  e.currentTarget.playbackRate = 0.85
                  if (i === 0) onFirstFrame?.()
                }}
                onPlay={(e) => (e.currentTarget.playbackRate = 0.85)}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  )
})

export default Film
