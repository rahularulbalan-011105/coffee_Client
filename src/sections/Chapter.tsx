import { forwardRef, useLayoutEffect, useRef, type ReactNode } from 'react'
import { gsap, prefersReducedMotion } from '../animation/scrollController'

export interface ChapterCopy {
  number: string
  eyebrow: string
  title: [string, string]
  body: string
  aside: string
  /** Three quick facts shown under the copy. */
  facts?: { value: string; label: string }[]
  /** A short practice note (the "how we do it" line). */
  note?: string
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
        scrollTrigger: { trigger: el, start: first ? 'top top' : 'top 85%', end: 'bottom 30%', scrub: true },
      })
      if (!first) tl.fromTo(content, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' })
      tl.to(content, { autoAlpha: 1, duration: first ? 0.7 : 0.6 })
      tl.to(content, { autoAlpha: 0, y: -40, duration: 0.2, ease: 'power2.in' })
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
            <p className="text-glow mx-auto mt-3 hidden max-w-md text-sm font-light leading-relaxed text-cream/65 sm:block md:mx-0">{copy.aside}</p>
            {copy.facts && (
              <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 divide-x divide-cream/15 border-y border-cream/15 py-3 md:mx-0 md:mt-8 md:py-4">
                {copy.facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse px-2 first:pl-0 md:px-4">
                    <dt className="eyebrow mt-2 min-h-[2.6em] text-[0.52rem] leading-snug text-cream/60 md:text-[0.56rem]">{f.label}</dt>
                    <dd className={`display text-glow whitespace-nowrap text-[1.45rem] leading-none md:text-[1.9rem] ${tone === 'mist' ? 'text-cream' : 'text-gold-soft'}`}>
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {copy.note && (
              <p className="text-glow mx-auto mt-4 hidden max-w-md items-start gap-3 text-left text-[0.8rem] font-light leading-relaxed text-cream/70 md:mx-0 md:flex">
                <span className="mt-[0.55em] h-px w-6 shrink-0 bg-gold/60" aria-hidden="true" />
                <span>{copy.note}</span>
              </p>
            )}
            {children}
          </div>
        </div>
      </div>
    </section>
  )
})

export default Chapter
