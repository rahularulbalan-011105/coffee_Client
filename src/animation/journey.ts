import { gsap, ScrollTrigger } from './scrollController'

/**
 * THE JOURNEY
 * ------------------------------------------------------------------------------------
 * The page is a long, normally-scrolling document of chapters. A fixed WebGL layer sits
 * behind it, and its camera descends through a vertical world as the page scrolls.
 *
 * Time on the master timeline is measured in *chapter units*: chapter i spans [i, i+1]
 * and sits centred in the viewport at i + 0.5. The scroll → time mapping is measured from
 * the real DOM, so chapters can have any height and the choreography never drifts.
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

type Range = readonly [number, number]

/** Scene channels: each animates 0 → 1 across its window (chapter units). */
export const CHANNELS = {
  ripen: [0.85, 1.45],
  cherryFall: [1.4, 2.3],
  land: [1.95, 2.7],
  rake: [2.35, 3.05],
  toRoaster: [2.95, 3.55],
  roast: [3.2, 4.25],
  trayOut: [3.6, 4.15],
  toGrinder: [4.05, 4.7],
  grind: [4.4, 5.4],
  powder: [4.55, 5.5],
  press: [5.45, 5.58],
  water: [5.58, 5.98],
  lid: [5.93, 6.06],
  extract: [5.75, 6.7],
  lift: [6.1, 6.6],
  brew: [6.2, 7.3],
  transfer: [6.8, 7.9],
  milk: [7.35, 7.8],
  reveal: [7.25, 7.85],
  pour: [8.2, 9.1],
  finale: [9.0, 9.5],
  order: [9.3, 10.0],
} as const satisfies Record<string, Range>

export type Channel = keyof typeof CHANNELS

export interface CameraKey {
  at: number
  pos: [number, number, number]
  target: [number, number, number]
  fov: number
}

/** The descent. See World/layout.ts for station positions. */
export const CAMERA_KEYS: CameraKey[] = [
  // Estate: wide over the terraces, drifting in and down between the rows.
  // Estate: from the top of the terraces, out across the valley into the sunset.
  { at: 0.0, pos: [-2, 31, 46], target: [8, 17, -80], fov: 40 },
  { at: 0.55, pos: [-1, 25, 34], target: [5, 12, -30], fov: 38 },
  // Harvest: into the bush, face to face with the branch.
  { at: 1.05, pos: [1.2, 12.4, 18.5], target: [3.0, 9.6, 8.5], fov: 34 },
  { at: 1.5, pos: [1.0, 10.2, 13.8], target: [3.0, 9.0, 8.8], fov: 32 },
  // Follow the falling cherries down through the mist.
  { at: 2.0, pos: [1.0, 1.5, 12.0], target: [1.8, -2.5, 6.0], fov: 34 },
  // Drying bed: macro over the green beans.
  { at: 2.5, pos: [0.1, -6.5, 8.0], target: [0.4, -8.85, 4.0], fov: 32 },
  { at: 2.95, pos: [-0.5, -7.6, 8.4], target: [0.3, -9.4, 3.8], fov: 32 },
  // Down to the roaster.
  { at: 3.5, pos: [-3.9, -13.7, 7.6], target: [0.2, -14.95, 3.1], fov: 34 },
  { at: 3.95, pos: [-1.9, -14.2, 7.4], target: [0.8, -15.25, 3.5], fov: 32 },
  // Grinder.
  { at: 4.5, pos: [-0.2, -20.5, 6.4], target: [0.2, -21.8, 2.6], fov: 34 },
  { at: 5.0, pos: [0.4, -22.3, 6.3], target: [0.6, -23.8, 2.7], fov: 34 },
  // Filter.
  { at: 5.5, pos: [1.15, -25.15, 4.85], target: [0.9, -26.48, 2.8], fov: 32 },
  { at: 6.0, pos: [1.65, -25.45, 4.75], target: [0.9, -26.35, 2.8], fov: 32 },
  // Brewing: look down into the decoction.
  { at: 6.5, pos: [1.02, -25.5, 3.75], target: [0.9, -26.85, 2.78], fov: 30 },
  { at: 6.8, pos: [1.0, -25.62, 3.62], target: [0.9, -26.9, 2.78], fov: 30 },
  // Follow the lower chamber as it is carried down to the dabara.
  { at: 7.08, pos: [0.4, -29.2, 6.4], target: [0.5, -30.9, 3.1], fov: 34 },
  // Dabara reveal.
  { at: 7.55, pos: [0.57, -31.2, 6.0], target: [0.82, -31.95, 3.05], fov: 32 },
  { at: 8.05, pos: [0.8, -31.3, 5.8], target: [0.95, -31.95, 3.0], fov: 32 },
  // Pour.
  { at: 8.6, pos: [1.27, -31.1, 5.45], target: [1.04, -31.84, 2.95], fov: 32 },
  { at: 9.1, pos: [1.32, -31.6, 5.2], target: [0.95, -32.18, 2.9], fov: 30 },
  // Final product shot, then pull back for the order counter.
  { at: 9.5, pos: [1.32, -31.68, 5.15], target: [0.88, -32.2, 2.85], fov: 30 },
  { at: 10.0, pos: [1.2, -31.35, 5.9], target: [0.85, -32.1, 2.9], fov: 30 },
]

const k0 = CAMERA_KEYS[0]

const channelState = Object.fromEntries(Object.keys(CHANNELS).map((k) => [k, 0])) as Record<Channel, number>

export const sceneState = {
  /** Journey time in chapter units, 0 … CHAPTER_COUNT. */
  pos: 0,
  ...channelState,
  cam: {
    px: k0.pos[0],
    py: k0.pos[1],
    pz: k0.pos[2],
    tx: k0.target[0],
    ty: k0.target[1],
    tz: k0.target[2],
    fov: k0.fov,
  },
}

export interface JourneyOptions {
  wrapper: HTMLElement
  chapters: HTMLElement[]
  onProgress?: (pos: number) => void
}

export function createJourney({ wrapper, chapters, onProgress }: JourneyOptions) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } })
  tl.fromTo(sceneState, { pos: 0 }, { pos: CHAPTER_COUNT, duration: CHAPTER_COUNT }, 0)

  for (const [channel, [start, end]] of Object.entries(CHANNELS) as [Channel, Range][]) {
    tl.fromTo(sceneState, { [channel]: 0 }, { [channel]: 1, duration: end - start }, start)
  }

  for (let i = 0; i < CAMERA_KEYS.length - 1; i++) {
    const a = CAMERA_KEYS[i]
    const b = CAMERA_KEYS[i + 1]
    tl.fromTo(
      sceneState.cam,
      { px: a.pos[0], py: a.pos[1], pz: a.pos[2], tx: a.target[0], ty: a.target[1], tz: a.target[2], fov: a.fov },
      {
        px: b.pos[0],
        py: b.pos[1],
        pz: b.pos[2],
        tx: b.target[0],
        ty: b.target[1],
        tz: b.target[2],
        fov: b.fov,
        duration: b.at - a.at,
        ease: 'sine.inOut',
        immediateRender: i === 0,
      },
      a.at,
    )
  }

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
  tl.seek(current)
  onProgress?.(current)

  // Lenis already smooths the scroll; follow it directly, once per frame.
  const tick = () => {
    if (current === target) return
    current = target
    tl.seek(current)
    onProgress?.(current)
  }
  gsap.ticker.add(tick)

  return {
    timeline: tl,
    kill() {
      gsap.ticker.remove(tick)
      st.kill()
      tl.kill()
    },
  }
}
