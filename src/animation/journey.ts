import { gsap, ScrollTrigger } from './scrollController'

/**
 * THE JOURNEY
 * ------------------------------------------------------------------------------------
 * The page is a long, normally-scrolling document of chapters. A sticky film layer sits
 * behind it and cuts from shot to shot as the page scrolls.
 *
 * Journey time is measured in *chapter units*: chapter i spans [i, i+1]
 * and sits centred in the viewport at i + 0.5. The scroll → time mapping is measured from
 * the real DOM, so chapters can have any height and the cuts never drift.
 */

export const CHAPTERS = [
  { id: 'estate', stage: 'Origin', label: 'Estate' },
  { id: 'harvest', stage: 'Origin', label: 'Harvest' },
  { id: 'beans', stage: 'Process', label: 'Beans' },
  { id: 'processing', stage: 'Process', label: 'Roast' },
  { id: 'grinding', stage: 'Process', label: 'Grind' },
  { id: 'filtering', stage: 'Brew', label: 'Filter' },
  { id: 'brewing', stage: 'Brew', label: 'Decoction' },
  { id: 'dabara', stage: 'Serve', label: 'Dabara' },
  { id: 'pouring', stage: 'Serve', label: 'Pour' },
  { id: 'order', stage: 'Order', label: 'Order' },
] as const

export type ChapterId = (typeof CHAPTERS)[number]['id']
export const CHAPTER_COUNT = CHAPTERS.length

/** Journey time in chapter units, 0 … CHAPTER_COUNT (read by the film and tests). */
export const sceneState = { pos: 0 }

export interface JourneyOptions {
  wrapper: HTMLElement
  chapters: HTMLElement[]
  onProgress?: (pos: number) => void
}

export function createJourney({ wrapper, chapters, onProgress }: JourneyOptions) {
  // Scroll (px from wrapper top) → journey time, piecewise-linear through chapter centres.
  let xs: number[] = []
  let ys: number[] = []
  const measure = () => {
    const vh = window.innerHeight
    const top = wrapper.getBoundingClientRect().top
    const max = Math.max(1, wrapper.offsetHeight - vh)
    xs = [0]
    ys = [0]
    chapters.forEach((el, i) => {
      const r = el.getBoundingClientRect()
      // A chapter may pin its "arrival" moment elsewhere than its middle (data-anchor-vh).
      const anchor = el.dataset.anchorVh ? Number(el.dataset.anchorVh) * vh : r.height / 2
      const centre = r.top - top + anchor - vh / 2
      xs.push(Math.min(max, Math.max(xs[xs.length - 1] + 1, centre)))
      ys.push(i + 0.5)
    })
    xs.push(Math.max(max, xs[xs.length - 1] + 1))
    ys.push(CHAPTER_COUNT)
  }
  const map = (s: number) => {
    if (s <= xs[0]) return ys[0]
    for (let i = 1; i < xs.length; i++) {
      if (s <= xs[i]) return ys[i - 1] + ((s - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1])
    }
    return ys[ys.length - 1]
  }

  measure()

  // Test/debug hook: the page scroll position that shows a given journey time.
  const scrollFor = (pos: number) => {
    const top = wrapper.getBoundingClientRect().top + window.scrollY
    for (let i = 1; i < ys.length; i++) {
      if (pos <= ys[i]) return top + xs[i - 1] + ((pos - ys[i - 1]) / (ys[i] - ys[i - 1])) * (xs[i] - xs[i - 1])
    }
    return top + xs[xs.length - 1]
  }
  ;(window as unknown as { __journey?: unknown }).__journey = { scrollFor }

  let target = 0
  let current = 0
  const st = ScrollTrigger.create({
    trigger: wrapper,
    start: 'top top',
    end: 'bottom bottom',
    onRefresh: (self) => {
      measure()
      target = map(self.scroll() - self.start)
    },
    onUpdate: (self) => {
      target = map(self.scroll() - self.start)
    },
  })
  target = map(st.scroll() - st.start)
  current = target
  sceneState.pos = current
  onProgress?.(current)

  // Lenis already smooths the scroll; follow it directly, once per frame.
  const tick = () => {
    if (current === target) return
    current = target
    sceneState.pos = current
    onProgress?.(current)
  }
  gsap.ticker.add(tick)

  return {
    kill() {
      gsap.ticker.remove(tick)
      st.kill()
    },
  }
}
