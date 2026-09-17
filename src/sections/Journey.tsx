import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CHAPTERS, CHAPTER_COUNT, createJourney, type ChapterId } from '../animation/journey'
import { posterAt, tintAt } from '../animation/palette'
import { useQuality } from '../hooks/useQuality'
import ProgressRail, { RAIL_STARTS } from '../components/ui/ProgressRail'
import Chapter, { type ChapterCopy } from './Chapter'
import OrderSection from './OrderSection'

const CoffeeWorld = lazy(() => import('../components/World/CoffeeWorld'))

type StoryId = Exclude<ChapterId, 'order'>

const STORY: Record<StoryId, { copy: ChapterCopy; height: number; tone?: 'mist' | 'dark' }> = {
  estate: {
    height: 190,
    tone: 'mist',
    copy: {
      number: '01',
      eyebrow: 'Chikmagalur · Karnataka',
      title: ['From the hills', 'of Chikmagalur'],
      body: 'Where every cup begins.',
      aside: 'Carefully grown. Naturally nurtured. Under silver oaks, at a thousand metres, in the morning mist of the Western Ghats.',
    },
  },
  harvest: {
    height: 170,
    tone: 'mist',
    copy: {
      number: '02',
      eyebrow: 'The harvest',
      title: ['First,', 'the cherry.'],
      body: 'Selected from the heart of the estate.',
      aside: 'Picked by hand only when crimson-ripe — one cherry, one branch, one pass at a time.',
    },
  },
  beans: {
    height: 160,
    copy: {
      number: '03',
      eyebrow: 'The drying yard',
      title: ['Every bean', 'has a journey.'],
      body: 'From the estate to the roast.',
      aside: 'Pulped, washed and raked on raised beds until the green beans dry to the colour of straw.',
    },
  },
  processing: {
    height: 170,
    copy: {
      number: '04',
      eyebrow: 'Roasting',
      title: ['Crafted', 'with patience.'],
      body: 'Every stage shapes the flavour.',
      aside: 'Slow drum-roasted in small batches, then cooled in the open tray to hold the aroma in.',
    },
  },
  grinding: {
    height: 160,
    copy: {
      number: '05',
      eyebrow: 'Grinding',
      title: ['Ground', 'fresh.'],
      body: 'Unlocking the aroma within every bean.',
      aside: 'Milled for the filter — fine enough to bloom, coarse enough to drip clean.',
    },
  },
  filtering: {
    height: 170,
    copy: {
      number: '06',
      eyebrow: 'The filter',
      title: ['Time becomes', 'flavour.'],
      body: 'Slow extraction. Deep character.',
      aside: 'Pressed into the upper chamber and left beneath near-boiling water, drop by patient drop.',
    },
  },
  brewing: {
    height: 160,
    copy: {
      number: '07',
      eyebrow: 'The decoction',
      title: ['The heart', 'of the cup.'],
      body: 'Rich. Smooth. Unmistakably South Indian.',
      aside: 'A thick, dark decoction, fragrant enough to wake the whole house.',
    },
  },
  dabara: {
    height: 160,
    copy: {
      number: '08',
      eyebrow: 'The dabara',
      title: ['A ritual', 'worth savouring.'],
      body: 'Served the South Indian way.',
      aside: 'Decoction meets frothed, full-cream milk in a hand-beaten brass dabara.',
    },
  },
  pouring: {
    height: 180,
    copy: {
      number: '09',
      eyebrow: 'The pour',
      title: ['Pulled', 'from a height.'],
      body: 'Back and forth, until it wears a crown of foam.',
      aside: 'The long pour cools the coffee to just-right and folds air into every sip.',
    },
  },
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Poster used when WebGL is unavailable or the device cannot keep up. */
function JourneyPoster({ posterRef }: { posterRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={posterRef}
      className="absolute inset-0 transition-[background] duration-1000"
      style={{ background: 'radial-gradient(60% 55% at 66% 45%, var(--poster-glow, #5c7560) 0%, var(--poster-base, #16261c) 70%)' }}
    >
      <svg viewBox="0 0 400 300" className="absolute bottom-0 right-0 h-[70%] w-[80%] opacity-25 md:w-[55%]" aria-hidden="true">
        <path d="M0 220 Q60 160 120 190 T240 170 T400 150 V300 H0Z" fill="#0b0705" opacity="0.5" />
        <path d="M0 250 Q80 210 160 230 T320 215 T400 205 V300 H0Z" fill="#0b0705" opacity="0.7" />
      </svg>
    </div>
  )
}

export default function Journey({ onReady }: { onReady: () => void }) {
  const quality = useQuality()
  const wrapper = useRef<HTMLDivElement>(null)
  const chapters = useRef<(HTMLElement | null)[]>([])
  const railRef = useRef<HTMLDivElement>(null)
  const railFill = useRef<HTMLDivElement>(null)
  const railDots = useRef<(HTMLLIElement | null)[]>([])
  const cue = useRef<HTMLDivElement>(null)
  const poster = useRef<HTMLDivElement>(null)
  const [webgl] = useState(hasWebGL)
  const [gaveUp, setGaveUp] = useState(false)
  const [inView, setInView] = useState(true)
  const showWorld = webgl && !gaveUp

  useEffect(() => {
    if (!showWorld) onReady()
  }, [showWorld, onReady])

  useEffect(() => {
    const el = wrapper.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: '5% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = wrapper.current
    if (!el) return
    let lastGroup = -1
    let lastTint = ''
    const journey = createJourney({
      wrapper: el,
      chapters: chapters.current.filter((c): c is HTMLElement => !!c),
      onProgress: (pos) => {
        if (railFill.current) railFill.current.style.transform = `scaleY(${pos / CHAPTER_COUNT})`
        let group = 0
        RAIL_STARTS.forEach((start, i) => pos >= start && (group = i))
        if (group !== lastGroup) {
          railDots.current.forEach((d, i) => d?.setAttribute('data-active', String(i === group)))
          lastGroup = group
        }
        const tint = tintAt(pos).join(' ')
        if (tint !== lastTint) {
          el.style.setProperty('--tint', tint)
          lastTint = tint
        }
        if (poster.current) {
          const p = posterAt(pos)
          poster.current.style.setProperty('--poster-glow', p.glow)
          poster.current.style.setProperty('--poster-base', p.base)
        }
        if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - pos * 4))
        if (railRef.current) railRef.current.style.opacity = pos > 9.55 ? '0' : '1'
      },
    })
    return () => journey.kill()
  }, [])

  useEffect(() => {
    if (railRef.current) railRef.current.style.visibility = inView ? 'visible' : 'hidden'
  }, [inView])

  const story = CHAPTERS.filter((c) => c.id !== 'order') as unknown as { id: StoryId }[]

  return (
    <div ref={wrapper} id="journey" className="relative" style={{ ['--tint' as string]: '18 30 22' }}>
      {/* Persistent world layer: stays with the viewport while the story scrolls over it. */}
      <div className="sticky top-0 z-0 h-[100svh] w-full overflow-hidden">
        {showWorld ? (
          <Suspense fallback={null}>
            <CoffeeWorld quality={quality} active={inView} onReady={onReady} onGiveUp={() => setGaveUp(true)} />
          </Suspense>
        ) : (
          <JourneyPoster posterRef={poster} />
        )}
        <div className="journey-vignette pointer-events-none absolute inset-0" />
        <div ref={cue} className="pointer-events-none absolute bottom-9 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
          <span className="eyebrow text-[0.58rem] text-cream/60">Scroll to begin the journey</span>
          <span className="block h-12 w-px overflow-hidden bg-cream/15">
            <span className="block h-full w-full bg-gold-soft [animation:scroll-cue_2.4s_var(--ease-lux)_infinite]" />
          </span>
        </div>
      </div>

      <div className="relative z-10 -mt-[100svh]">
        {story.map(({ id }, i) => (
          <Chapter
            key={id}
            id={id}
            first={i === 0}
            copy={STORY[id].copy}
            height={STORY[id].height}
            tone={STORY[id].tone}
            ref={(node) => {
              chapters.current[i] = node
            }}
          />
        ))}
        <OrderSection
          ref={(node) => {
            chapters.current[story.length] = node
          }}
        />
      </div>

      <ProgressRail ref={railRef} fillRef={railFill} dotRefs={railDots} />
    </div>
  )
}
