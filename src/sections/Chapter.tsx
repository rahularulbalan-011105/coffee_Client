import { forwardRef, useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../animation/scrollController'

export interface ChapterCopy {
  number: string
  eyebrow: string
  title: [string, string]
  body: string
  aside: string
}

interface ChapterProps {
  id: string
  copy: ChapterCopy
  /** Section height in svh — longer chapters give their animation more room. */
  height: number
  /** First chapter is on screen at load: no fade-in. */
  first?: boolean
  /** Text colour treatment for bright, misty chapters. */
  tone?: 'mist' | 'dark'
  children?: ReactNode
}

/**
 * One stage of the journey. The section scrolls normally; its copy rides a sticky layer
 * so it enters from below, holds while the scene beneath it plays, then leaves upward.
 */
const Chapter = forwardRef<HTMLElement, ChapterProps>(function Chapter({ id, copy, height, first, tone = 'dark', children }, ref) {
  const section = useRef<HTMLElement | null>(null)
  const inner = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = section.current
    const content = inner.current
    if (!el || !content) return
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) return
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: el, start: first ? 'top top' : 'top 70%', end: 'bottom 45%', scrub: 0.5 },
      })
      if (!first) tl.fromTo(content, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out' })
      tl.to(content, { autoAlpha: 1, duration: first ? 0.6 : 0.5 })
      tl.to(content, { autoAlpha: 0, y: -50, duration: 0.25, ease: 'power2.in' })
    }, el)
    return () => ctx.revert()
  }, [first])

  return (
    <section
      id={`chapter-${id}`}
      data-chapter={id}
      ref={(node) => {
        section.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      className="relative"
      style={{ height: `${height}svh` }}
      aria-labelledby={`chapter-${id}-title`}
    >
      <div className="pointer-events-none sticky top-0 flex h-[100svh] items-end md:items-center">
        <div className="mx-auto w-full max-w-[92rem] px-6 pb-[12svh] md:px-10 md:pb-0">
          <div ref={inner} className="mx-auto max-w-[34rem] text-center md:mx-0 md:text-left lg:max-w-[38rem]">
            <p className={`eyebrow flex items-center justify-center gap-4 md:justify-start ${tone === 'mist' ? 'text-gold-soft' : 'text-gold'}`}>
              <span className="tabular-nums opacity-70">{copy.number}</span>
              <span className="h-px w-8 bg-current opacity-50" />
              {copy.eyebrow}
            </p>
            <h2 id={`chapter-${id}-title`} className="display text-glow mt-5 text-[clamp(2.8rem,10.5vw,4.2rem)] uppercase md:text-[clamp(3.8rem,6vw,6.4rem)]">
              <span className="block">{copy.title[0]}</span>
              <span className={`block normal-case italic ${tone === 'mist' ? 'text-cream' : 'text-gold-soft'}`}>{copy.title[1]}</span>
            </h2>
            <p className="text-glow mt-6 text-lg font-light text-cream/90 md:text-xl">{copy.body}</p>
            <p className="text-glow mx-auto mt-3 max-w-sm text-sm font-light leading-relaxed text-cream/60 md:mx-0">{copy.aside}</p>
            {children}
          </div>
        </div>
      </div>
    </section>
  )
})

export default Chapter
