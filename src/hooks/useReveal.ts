import { useLayoutEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger, prefersReducedMotion } from '../animation/scrollController'

/**
 * Fades `[data-reveal]` children up as they enter the viewport.
 * `data-reveal="n"` staggers siblings by n × 0.08s.
 */
export function useReveal(scope: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scope.current
    if (!root) return
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>('[data-reveal]', root)
      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1, y: 0 })
        return
      }
      gsap.set(items, { autoAlpha: 0, y: 40 })
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 1.3,
            ease: 'expo.out',
            stagger: (i, el: HTMLElement) => Number(el.dataset.reveal || 0) * 0.08 + i * 0.04,
            overwrite: true,
          }),
      })
    }, root)
    return () => ctx.revert()
  }, [scope])
}
