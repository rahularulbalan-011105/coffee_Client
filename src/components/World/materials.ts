import { Color, DoubleSide, MeshDepthMaterial, MeshLambertMaterial, RGBADepthPacking, MeshPhysicalMaterial, MeshStandardMaterial, Vector2, type Material, type Texture } from 'three'
import { canopyClusterTextures, coffeeClusterTextures, singleLeafTextures } from './foliageTextures'
import { dabaraEngraving, filterLowerEngraving, filterUpperEngraving, tumblerEngraving } from './engraving'
import { brassScan, tabletop, weatheredWood } from './realAssets'
import { brushedRoughness, dropletNormal, foamTexture, perforatedTexture, rippleNormal } from './textures'

/**
 * Shared PBR materials. Created lazily (textures need `document`) and reused by
 * every mesh, so the GPU compiles each shader program once.
 */

let cache: ReturnType<typeof build> | null = null

/**
 * Turns a smooth blob into a leafy canopy: world-space noise breaks up colour and normals,
 * so a few hundred triangles read as thousands of leaves from a distance.
 */
export function applyFoliageNoise(material: Material, scale = 1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFolScale = { value: scale }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFolPos;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 folP = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          folP = instanceMatrix * folP;
        #endif
        vFolPos = (modelMatrix * folP).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFolPos;
        uniform float uFolScale;
        float folHash(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.5, 71.7))) * 43758.5453); }
        float folNoise(vec3 p) {
          vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(folHash(i), folHash(i + vec3(1,0,0)), f.x), mix(folHash(i + vec3(0,1,0)), folHash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(folHash(i + vec3(0,0,1)), folHash(i + vec3(1,0,1)), f.x), mix(folHash(i + vec3(0,1,1)), folHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 folW = vFolPos * uFolScale;
        float folN = folNoise(folW * 1.7) * 0.6 + folNoise(folW * 5.1) * 0.4;
        diffuseColor.rgb *= 0.5 + folN * 0.9;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 folJ = vec3(folNoise(folW * 2.3), folNoise(folW * 2.3 + 17.0), folNoise(folW * 2.3 + 41.0)) - 0.5;
        normal = normalize(normal + folJ * 1.4);`,
      )
  }
  material.customProgramCacheKey = () => `foliage-${scale}`
}

/**
 * Alpha-tested foliage cards look like slivers when seen edge-on. Scale their alpha by how
 * squarely they face the camera, so grazing cards dissolve and the bush reads as leaves.
 */
function fadeGrazingCards(material: Material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vFacing;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec3 cardN = normalize(normalMatrix * objectNormal);
        vFacing = abs(dot(cardN, normalize(-mvPosition.xyz)));`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFacing;')
      .replace('#include <alphatest_fragment>', 'diffuseColor.a *= smoothstep(0.08, 0.4, vFacing);\n#include <alphatest_fragment>')
  }
  material.customProgramCacheKey = () => `foliage-card-${material.type}`
}

function build() {
  const brushed = brushedRoughness()

  const brass = new MeshPhysicalMaterial({
    color: new Color('#d7a653'),
    metalness: 1,
    roughness: 0.3,
    roughnessMap: brushed,
    clearcoat: 0.35,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.25,
    side: DoubleSide,
  })

  // Serving set: soft satin gold with a hand-engraved band (as in traditional brassware).
  // The surface itself is a scan of real hand-hammered brass: its roughness (polish wear,
  // fingerprints) and, in the lacquer layer, its hammer marks and scratches.
  const scan = brassScan()
  const satinBrass = (tex?: { map: Texture; bump: Texture }) =>
    new MeshPhysicalMaterial({
      color: new Color('#e2bd72'),
      map: tex?.map ?? null,
      bumpMap: tex?.bump ?? null,
      bumpScale: 1.4,
      metalness: 1,
      roughness: 0.62,
      roughnessMap: scan.roughnessMap,
      clearcoat: 0.3,
      clearcoatRoughness: 0.22,
      clearcoatNormalMap: scan.normalMap,
      clearcoatNormalScale: new Vector2(0.6, 0.6),
      envMapIntensity: 1.7,
      side: DoubleSide,
    })
  const dabaraBrass = satinBrass(dabaraEngraving())
  const tumblerBrass = satinBrass(tumblerEngraving())
  // The filter belongs to the same set.
  const filterLowerBrass = satinBrass(filterLowerEngraving())
  const filterUpperBrass = satinBrass(filterUpperEngraving())
  const satinPlain = satinBrass()
  const brassInner = new MeshStandardMaterial({ color: new Color('#6e5024'), metalness: 1, roughness: 0.5, side: DoubleSide })

  const brassDark = new MeshStandardMaterial({
    color: new Color('#8e6630'),
    metalness: 1,
    roughness: 0.42,
    roughnessMap: brushed,
    side: DoubleSide,
  })

  const steel = new MeshStandardMaterial({
    color: new Color('#e4e8ec'),
    metalness: 1,
    roughness: 0.22,
    roughnessMap: brushed,
    envMapIntensity: 1.35,
    side: DoubleSide,
  })

  const steelInner = new MeshStandardMaterial({
    color: new Color('#6d6a66'),
    metalness: 1,
    roughness: 0.45,
    side: DoubleSide,
  })

  const perforated = new MeshStandardMaterial({
    map: perforatedTexture(),
    metalness: 0.85,
    roughness: 0.4,
    side: DoubleSide,
  })

  // Real sun-worn planks (scan), toned towards a dark oiled teak.
  const woodScan = weatheredWood()
  const wood = new MeshStandardMaterial({
    map: woodScan.map,
    normalMap: woodScan.normalMap,
    roughnessMap: woodScan.roughnessMap,
    color: new Color('#b08a6a'),
    roughness: 1,
    metalness: 0,
  })

  const woodKnob = new MeshPhysicalMaterial({
    color: new Color('#2a170e'),
    roughness: 0.35,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
  })

  const bean = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.55,
    clearcoatRoughness: 0.32,
    sheen: 0.25,
    sheenColor: new Color('#5a3219'),
    sheenRoughness: 0.7,
    envMapIntensity: 0.8,
  })

  const powder = new MeshStandardMaterial({
    color: new Color('#3d2416'),
    roughness: 1,
    metalness: 0,
  })

  // Polished hardwood tabletop (scan) under the grinder, filter and serving set.
  const tableScan = tabletop()
  const table = new MeshStandardMaterial({
    map: tableScan.map,
    normalMap: tableScan.normalMap,
    roughnessMap: tableScan.roughnessMap,
    color: new Color('#8a6a55'),
    roughness: 1,
    metalness: 0,
    envMapIntensity: 1.2,
  })

  const foam = new MeshStandardMaterial({
    map: foamTexture(),
    color: new Color('#b9a58c'),
    roughness: 0.85,
    metalness: 0,
    transparent: true,
  })

  // Waxy, glossy coffee leaf — colour comes from per-instance tint.
  const leafTex = singleLeafTextures()
  const leaf = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    map: leafTex.map,
    normalMap: leafTex.normal,
    normalScale: new Vector2(0.8, 0.8),
    roughness: 0.6,
    metalness: 0,
    // Rain-wet: a thin waxy coat broken up by droplets (real coffee leaves are satin, not foil).
    clearcoat: 0.28,
    clearcoatRoughness: 0.3,
    clearcoatNormalMap: dropletNormal(),
    clearcoatNormalScale: new Vector2(0.25, 0.25),
    sheen: 0.3,
    sheenColor: new Color('#b9d18a'),
    side: DoubleSide,
    envMapIntensity: 0.45,
  })

  const foliage = new MeshStandardMaterial({ color: new Color('#ffffff'), roughness: 0.8, metalness: 0 })
  applyFoliageNoise(foliage)

  // Foliage cards: each shows a sprig of individually painted leaves (alpha-cut).
  const coffeeTex = coffeeClusterTextures()
  const leafCard = new MeshStandardMaterial({
    map: coffeeTex.map,
    normalMap: coffeeTex.normal,
    normalScale: new Vector2(1.2, 1.2),
    alphaTest: 0.5,
    side: DoubleSide,
    roughness: 0.5,
    metalness: 0,
    envMapIntensity: 0.6,
  })
  fadeGrazingCards(leafCard)
  // Distant foliage: same painted sprigs, cheap per-vertex lighting (it is small on screen).
  const canopyTex = canopyClusterTextures()
  const canopyCard = new MeshLambertMaterial({ map: canopyTex.map, alphaTest: 0.5, side: DoubleSide })
  fadeGrazingCards(canopyCard)
  const leafCardFar = new MeshLambertMaterial({ map: coffeeTex.map, alphaTest: 0.5, side: DoubleSide })
  fadeGrazingCards(leafCardFar)

  // Coffee cherries have a waxy skin: a soft sheen rather than a candy gloss.
  const cherry = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    roughness: 0.42,
    metalness: 0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    envMapIntensity: 0.9,
  })

  const bark = new MeshStandardMaterial({ color: new Color('#4a3a2a'), roughness: 0.9, metalness: 0 })

  const enamel = new MeshPhysicalMaterial({
    color: new Color('#16110e'),
    roughness: 0.32,
    metalness: 0.4,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  })

  const ember = new MeshStandardMaterial({
    color: new Color('#2a1206'),
    emissive: new Color('#ff7a26'),
    emissiveIntensity: 0,
    roughness: 0.2,
  })

  // Shadows don't need the engraving texture: share the plain depth shader.
  const plainDepth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })

  return { brass, dabaraBrass, tumblerBrass, filterLowerBrass, filterUpperBrass, satinPlain, brassInner, plainDepth, brassDark, steel, steelInner, perforated, wood, woodKnob, bean, powder, table, foam, leaf, foliage, leafCard, leafCardFar, canopyCard, cherry, bark, enamel, ember }
}

export function getMaterials() {
  if (!cache) cache = build()
  return cache
}

/** Glossy liquid surface. Each liquid needs its own instance (its own colour). */
export function createLiquidMaterial(color: string) {
  const normal = rippleNormal().clone()
  normal.needsUpdate = true
  normal.repeat.set(1.5, 1.5)
  return new MeshPhysicalMaterial({
    color: new Color(color),
    // Dark and glossy: sharp key-light highlights, very little broad env reflection.
    roughness: 0.08,
    metalness: 0,
    normalMap: normal,
    normalScale: new Vector2(0.2, 0.2),
    envMapIntensity: 0.3,
    specularIntensity: 0.55,
  })
}

export const PLANT_COLORS = {
  leaves: ['#3f7a3e', '#4a8a46', '#57984f', '#3a723a', '#62a256', '#468240'],
  cherryUnripe: new Color('#5f8a34'),
  cherryTurning: new Color('#c98a2a'),
  cherryRipe: new Color('#a3141a'),
  cherryDeep: new Color('#6a0c12'),
  greenBean: new Color('#8e9a62'),
  driedBean: new Color('#b1a574'),
  roastingBean: new Color('#7a5230'),
  roastedBean: new Color('#3a2214'),
}

export const COFFEE_COLORS = {
  decoction: new Color('#1d0d05'),
  withMilk: new Color('#6b3c1c'),
  water: new Color('#a4b6c0'),
  milk: new Color('#efe3cf'),
}
