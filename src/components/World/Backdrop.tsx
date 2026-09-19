import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BackSide,
  Color,
  ShaderMaterial,
  Vector3,
  type Mesh,
} from 'three'
import { sceneState } from '../../animation/journey'
import { cameraFocus } from './CameraRig'
import { rng, smooth, sub } from './math'
import { make } from './textures'

/**
 * The atmosphere behind the processing stages (after the estate): a warm, candle-like glow
 * behind each subject, slow wisps of aroma drifting across it and golden bokeh.
 */

const backdropVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`

const backdropFragment = /* glsl */ `
  uniform float uTime; uniform float uOpacity; uniform vec3 uBg; uniform sampler2D uNoise;
  uniform vec3 uFocus; uniform vec3 uGlow; uniform vec3 uBase; uniform vec3 uWisp; uniform vec3 uGold;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    // Angle from the subject (the camera's field of view is narrow, so work in radians).
    float ang = acos(clamp(dot(d, uFocus), -1.0, 1.0));
    float f = exp(-pow(ang / 0.2, 2.0));

    // Warm pool of light behind the subject, like lamplight in a quiet kitchen.
    vec3 col = uBase;
    col = mix(col, uGlow, f * 0.9);
    col += uGlow * exp(-pow(ang / 0.07, 2.0)) * 0.35;
    // Deep, quiet edges.
    col *= 0.6 + 0.4 * exp(-pow(ang / 0.35, 2.0));

    // Spherical coordinates for the patterns.
    vec2 sph = vec2(atan(d.z, d.x) / 6.2831, asin(clamp(d.y, -1.0, 1.0)) / 3.1416);

    // Slow, curling wisps of aroma.
    float t = uTime * 0.018;
    vec2 wp = vec2(sph.x * 34.0, sph.y * 18.0 - t * 6.0);
    // Pre-baked tileable fbm: two lookups instead of per-pixel noise.
    float warp = texture2D(uNoise, wp * 0.02 + vec2(t, -t) * 0.1).r;
    float w = texture2D(uNoise, wp * 0.035 + vec2(warp * 0.12, warp * 0.06)).r;
    float wisp = smoothstep(0.5, 0.8, w) * (0.3 + 0.7 * f);
    col = mix(col, uWisp * (0.35 + 0.65 * f), wisp * 0.16);

    // Golden bokeh drifting upward.
    vec2 bp = vec2(sph.x * 110.0, sph.y * 55.0 - uTime * 0.05);
    vec2 cell = floor(bp);
    vec2 local = fract(bp) - 0.5;
    float rnd = hash(cell);
    vec2 off = vec2(hash(cell + 3.1), hash(cell + 7.7)) - 0.5;
    float r = 0.12 + rnd * 0.18;
    float disc = smoothstep(r, r * 0.55, length(local - off * 0.5));
    float twinkle = 0.55 + 0.45 * sin(uTime * (0.4 + rnd) + rnd * 20.0);
    float bokeh = disc * step(0.8, rnd) * twinkle * (0.25 + 0.75 * f);
    col += uGold * bokeh * 0.09;

    gl_FragColor = vec4(mix(uBg, col, uOpacity), 1.0);
    #include <colorspace_fragment>
  }
`

/** Tileable value-noise fbm (256²), baked once on the CPU. */
function noiseTexture() {
  return make('backdrop-noise', 256, (ctx, size) => {
    const r = rng(77)
    const g = 16
    const grid = Array.from({ length: g * g }, () => r())
    const val = (x: number, y: number, f: number) => {
      const cells = g / f
      const fx = (x / size) * cells
      const fy = (y / size) * cells
      const x0 = Math.floor(fx)
      const y0 = Math.floor(fy)
      const tx = fx - x0
      const ty = fy - y0
      const sx = tx * tx * (3 - 2 * tx)
      const sy = ty * ty * (3 - 2 * ty)
      const at = (i: number, j: number) => grid[(((j % cells) + cells) % cells) * f * g + (((i % cells) + cells) % cells) * f]
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * sx
      const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * sx
      return a + (b - a) * sy
    }
    const img = ctx.createImageData(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = val(x, y, 4) * 0.55 + val(x, y, 2) * 0.3 + val(x, y, 1) * 0.15
        const i = (y * size + x) * 4
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v * 255
        img.data[i + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  })
}

/** Glow colour per stage (journey time → colour). */
const GLOWS: [number, string][] = [
  [2.3, '#2c2416'],
  [3.3, '#3d2210'],
  [4.5, '#33200f'],
  [5.5, '#3a2613'],
  [6.8, '#402410'],
  [7.6, '#4a3214'],
  [10, '#4a3214'],
]
const glowColors = GLOWS.map(([at, c]) => [at, new Color(c)] as const)

const tmpColor = new Color()
function glowAt(pos: number) {
  let i = 0
  while (i < glowColors.length - 2 && pos > glowColors[i + 1][0]) i++
  const [a, ca] = glowColors[i]
  const [b, cb] = glowColors[i + 1]
  return tmpColor.copy(ca).lerp(cb, smooth(Math.min(1, Math.max(0, (pos - a) / (b - a)))))
}

const focusDir = new Vector3()

export default function Backdrop() {
  const sphere = useRef<Mesh>(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: backdropVertex,
        fragmentShader: backdropFragment,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uBg: { value: new Color('#0b0705') },
          uNoise: { value: noiseTexture() },
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uFocus: { value: new Vector3(0, 0, -1) },
          uGlow: { value: new Color('#3d2210') },
          uBase: { value: new Color('#0b0705') },
          uWisp: { value: new Color('#e9d5b8') },
          uGold: { value: new Color('#ffcf85') },
        },
      }),
    [],
  )


  useFrame(({ camera, clock, scene }) => {
    const pos = sceneState.pos
    const k = smooth(sub(pos, 2.2, 2.7))
    const time = clock.elapsedTime

    const sph = sphere.current
    if (sph) {
      sph.visible = k > 0.001
      sph.position.copy(camera.position)
      focusDir.copy(cameraFocus).sub(camera.position).normalize()
      const u = material.uniforms
      u.uTime.value = time
      u.uOpacity.value = k
      if (scene.background instanceof Color) u.uBg.value.copy(scene.background)
      u.uFocus.value.copy(focusDir)
      u.uGlow.value.copy(glowAt(pos))
    }

  }, -1)

  return (
    <>
      <mesh ref={sphere} material={material} renderOrder={-30} frustumCulled={false} visible={false}>
        <sphereGeometry args={[80, 48, 24]} />
      </mesh>
    </>
  )
}
