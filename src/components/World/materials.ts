import { Color, DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial, Vector2 } from 'three'
import { brushedRoughness, foamTexture, perforatedTexture, rippleNormal, tableTexture } from './textures'

/**
 * Shared PBR materials. Created lazily (textures need `document`) and reused by
 * every mesh, so the GPU compiles each shader program once.
 */

let cache: ReturnType<typeof build> | null = null

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

  const wood = new MeshStandardMaterial({
    color: new Color('#1f120b'),
    roughness: 0.48,
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

  const table = new MeshStandardMaterial({
    map: tableTexture(),
    color: new Color('#b09a8a'),
    roughness: 0.62,
    metalness: 0.05,
  })

  const foam = new MeshStandardMaterial({
    map: foamTexture(),
    color: new Color('#b9a58c'),
    roughness: 0.85,
    metalness: 0,
    transparent: true,
  })

  // Waxy, glossy coffee leaf — colour comes from per-instance tint.
  const leaf = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    sheen: 0.25,
    sheenColor: new Color('#b9d18a'),
    side: DoubleSide,
    envMapIntensity: 0.35,
  })

  const foliage = new MeshStandardMaterial({ color: new Color('#ffffff'), roughness: 0.8, metalness: 0 })
  foliage.onBeforeCompile = (shader) => {
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
        float folN = folNoise(vFolPos * 1.7) * 0.6 + folNoise(vFolPos * 5.1) * 0.4;
        diffuseColor.rgb *= 0.55 + folN * 0.8;`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        vec3 folJ = vec3(folNoise(vFolPos * 2.3), folNoise(vFolPos * 2.3 + 17.0), folNoise(vFolPos * 2.3 + 41.0)) - 0.5;
        normal = normalize(normal + folJ * 1.3);`,
      )
  }

  const cherry = new MeshPhysicalMaterial({
    color: new Color('#ffffff'),
    roughness: 0.28,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
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

  return { brass, brassDark, steel, steelInner, perforated, wood, woodKnob, bean, powder, table, foam, leaf, foliage, cherry, bark, enamel, ember }
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
  leaves: ['#1f4a2a', '#24562f', '#2f6436', '#1a3f25', '#3a6d3b', '#28502c'],
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
