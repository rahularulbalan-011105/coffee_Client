import { useEffect, useState } from 'react'

export type Tier = 'high' | 'low'

export interface QualitySettings {
  tier: Tier
  beans: number
  powder: number
  dust: number
  shadowMap: number
  dpr: [number, number]
  postfx: boolean
  dof: boolean
}

export function detectTier(): Tier {
  if (typeof window === 'undefined') return 'high'
  const forced = new URLSearchParams(window.location.search).get('quality')
  if (forced === 'low' || forced === 'high') return forced
  const small = window.matchMedia('(max-width: 820px)').matches
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const nav = navigator as Navigator & { deviceMemory?: number }
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 && (nav.deviceMemory ?? 8) <= 4
  return small || coarse || weak ? 'low' : 'high'
}

export function settingsFor(tier: Tier): QualitySettings {
  return tier === 'high'
    ? { tier, beans: 220, powder: 2600, dust: 240, shadowMap: 1024, dpr: [1, 1.75], postfx: true, dof: true }
    : { tier, beans: 100, powder: 900, dust: 80, shadowMap: 512, dpr: [1, 1.35], postfx: false, dof: false }
}

/** Tier is decided once per session so heavy scene resources never remount mid-scroll. */
export function useQuality() {
  const [settings] = useState(() => settingsFor(detectTier()))
  return settings
}

export type Layout = 'desktop' | 'tablet' | 'mobile'

export function getLayout(width: number): Layout {
  if (width < 768) return 'mobile'
  if (width < 1100) return 'tablet'
  return 'desktop'
}

export function useLayoutMode() {
  const [layout, setLayout] = useState<Layout>(() =>
    typeof window === 'undefined' ? 'desktop' : getLayout(window.innerWidth),
  )
  useEffect(() => {
    const onResize = () => setLayout(getLayout(window.innerWidth))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return layout
}
