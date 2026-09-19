import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, type Texture } from 'three'

/**
 * Real, photographed surfaces (CC0 scans from Poly Haven, in public/real/): the materials
 * keep their shapes and animation, but their surfaces come from the real thing.
 *
 * Textures are created synchronously and fill in when the image lands, so materials keep the
 * same shader variant from the first frame (no recompiles when they load).
 */

const base = `${import.meta.env.BASE_URL}real/`
const loader = new TextureLoader()
const cache = new Map<string, Texture>()

function tex(path: string, color: boolean, repeat: [number, number] = [1, 1]) {
  const key = `${path}|${repeat.join(',')}`
  const hit = cache.get(key)
  if (hit) return hit
  const t = loader.load(base + path)
  t.colorSpace = color ? SRGBColorSpace : NoColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

export interface SurfaceSet {
  map?: Texture
  normalMap: Texture
  roughnessMap: Texture
}

function surface(id: string, repeat: [number, number], withColor = true): SurfaceSet {
  return {
    map: withColor ? tex(`${id}/${id}_diff_1k.jpg`, true, repeat) : undefined,
    normalMap: tex(`${id}/${id}_nor_gl_1k.jpg`, false, repeat),
    roughnessMap: tex(`${id}/${id}_rough_1k.jpg`, false, repeat),
  }
}

/** Hand-hammered brass: real scratches, hammer marks and polish wear (no colour — ours stays). */
export const brassScan = () => surface('brass_pot_01', [3, 1], false)
/** Sun-worn timber for the drying bed, rake and grinder base. */
export const weatheredWood = () => surface('weathered_planks', [1, 1])
/** Polished hardwood tabletop the brass set stands on. */
export const tabletop = () => surface('wood_table_001', [1.6, 1.6])

export const unitNormal = (s = 1) => new Vector2(s, s)

/** Real interior light (warm wood-panelled room) for reflections on brass and steel. */
export const INTERIOR_HDR = `${base}wooden_lounge_1k.hdr`
export const BASKET_GLTF = `${base}wicker_basket_01/wicker_basket_01.gltf`
