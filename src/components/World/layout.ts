import { Vector3 } from 'three'

/**
 * The world is a vertical descent. Units are roughly decimetres (a tumbler is 0.46 tall,
 * a coffee bush ~15). The estate sits on the ground plane (y = 0); every later stage sits
 * lower, so the coffee literally falls from one stage into the next as the page scrolls.
 *
 *   y ≈  +9   hero coffee branch (harvest)
 *   y =   0   estate ground
 *   y =  -9   drying bed
 *   y = -16   roaster + cooling tray
 *   y = -22.5 grinder
 *   y = -27.2 South Indian filter
 *   y = -32.5 dabara + tumbler
 */
export const BRANCH = new Vector3(3.0, 9.0, 9.0)

export const STATIONS = {
  bed: new Vector3(0.4, -9, 4),
  roaster: new Vector3(-0.2, -16, 3),
  grinder: new Vector3(0.1, -22.5, 2.6),
  filter: new Vector3(0.9, -27.2, 2.8),
  dabara: new Vector3(0.5, -32.5, 3.2),
  tumbler: new Vector3(1.14, -32.5, 2.95),
} as const

/** Where falling cherries dissolve in the mist and green beans begin to rain. */
export const MIST_BAND_Y = -2.6

export const BED = { width: 3.2, depth: 2.0, top: 0.12 } as const

export const ROASTER = {
  drumY: 1.32,
  drumRadius: 0.55,
  hopperMouth: 2.55,
  chute: new Vector3(0.72, 0.98, 0.62),
  tray: new Vector3(1.35, 0.78, 0.9),
  trayRadius: 0.78,
} as const

export const GRINDER = {
  hopperTop: 1.34,
  throat: 1.02,
  /** Outlet of the chute, relative to the grinder origin. */
  outlet: new Vector3(0.46, 0.46, 0.08),
} as const

export const FILTER = {
  radius: 0.3,
  lowerHeight: 0.62,
  upperBottom: 0.5,
  upperTop: 1.1,
  moundBase: 0.53,
} as const

export const DABARA = { radius: 0.3, height: 0.17, rim: 0.335 } as const
export const TUMBLER = { height: 0.46, radiusTop: 0.128, radiusBottom: 0.108 } as const

/** World position helper: station origin + local offset. */
export const at = (station: Vector3, x: number, y: number, z: number) => new Vector3(station.x + x, station.y + y, station.z + z)

/** Low evening sun behind the estate, just right of the valley (world direction). */
export const ESTATE_SUN = new Vector3(0.14, 0.075, -1).normalize()
