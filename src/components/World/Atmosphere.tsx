import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import {
  BackSide,
  Color,
  FogExp2,
  Object3D,
  ShaderMaterial,
  Vector3,
  type DirectionalLight,
  type HemisphereLight,
  type Mesh,
  type SpotLight,
} from 'three'
import { sceneState } from '../../animation/journey'
import { cameraFocus } from './CameraRig'
import { smooth, window01 } from './math'

/**
 * The colour story of the journey, keyed by chapter time:
 * misty plantation green → straw drying yard → warm roastery → espresso studio.
 */
interface Mood {
  at: number
  bg: string
  fog: string
  density: number
  sky: number
  skyTop: string
  skyHorizon: string
  hemiSky: string
  hemiGround: string
  hemi: number
  sun: number
  sunColor: string
  sunDir: [number, number, number]
  key: number
  keyColor: string
  env: number
}

const MOODS: Mood[] = [
  { at: 0, bg: '#b4bab3', fog: '#b1b8ae', density: 0.0034, sky: 1, skyTop: '#7c858a', skyHorizon: '#c9cec7', hemiSky: '#e4ebea', hemiGround: '#4a6a3e', hemi: 1.55, sun: 1.5, sunColor: '#f4f2ea', sunDir: [0.25, 0.7, -1], key: 0, keyColor: '#ffe0b8', env: 0.35 },
  { at: 1.5, bg: '#aeb5ad', fog: '#a9b1a6', density: 0.006, sky: 1, skyTop: '#7c858a', skyHorizon: '#c3c9c1', hemiSky: '#e4ebea', hemiGround: '#4a6a3e', hemi: 1.6, sun: 1.6, sunColor: '#f4f2ea', sunDir: [0.25, 0.8, -0.8], key: 0, keyColor: '#ffe0b8', env: 0.4 },
  { at: 2.1, bg: '#6f7563', fog: '#8f957f', density: 0.08, sky: 0.3, skyTop: '#55604f', skyHorizon: '#a9ad96', hemiSky: '#dfe0cb', hemiGround: '#2a2a1c', hemi: 0.8, sun: 2.2, sunColor: '#ffe3b5', sunDir: [-0.6, 0.8, -0.2], key: 10, keyColor: '#ffe0b8', env: 0.5 },
  { at: 2.55, bg: '#1d1a12', fog: '#221f16', density: 0.05, sky: 0, skyTop: '#1d1a12', skyHorizon: '#1d1a12', hemiSky: '#e0d7ba', hemiGround: '#1d170f', hemi: 0.55, sun: 1.8, sunColor: '#ffe7c4', sunDir: [-0.6, 1, 0.4], key: 34, keyColor: '#ffe0b8', env: 0.6 },
  { at: 3.5, bg: '#140e0a', fog: '#140e0a', density: 0.08, sky: 0, skyTop: '#140e0a', skyHorizon: '#140e0a', hemiSky: '#ffdcb5', hemiGround: '#140a05', hemi: 0.34, sun: 0.35, sunColor: '#ffd2a0', sunDir: [-0.6, 1, 0.4], key: 60, keyColor: '#ffc38a', env: 0.75 },
  { at: 4.5, bg: '#0d0806', fog: '#0d0806', density: 0.11, sky: 0, skyTop: '#0d0806', skyHorizon: '#0d0806', hemiSky: '#ffdcb5', hemiGround: '#140a05', hemi: 0.28, sun: 0, sunColor: '#ffd2a0', sunDir: [-0.6, 1, 0.4], key: 70, keyColor: '#ffc995', env: 0.85 },
  { at: 6.5, bg: '#0e0806', fog: '#0e0806', density: 0.11, sky: 0, skyTop: '#0e0806', skyHorizon: '#0e0806', hemiSky: '#ffd6a8', hemiGround: '#140a05', hemi: 0.26, sun: 0, sunColor: '#ffd2a0', sunDir: [-0.6, 1, 0.4], key: 66, keyColor: '#ffb77a', env: 0.85 },
  { at: 7.5, bg: '#0b0705', fog: '#0b0705', density: 0.12, sky: 0, skyTop: '#0b0705', skyHorizon: '#0b0705', hemiSky: '#ffdcb5', hemiGround: '#140a05', hemi: 0.28, sun: 0, sunColor: '#ffd2a0', sunDir: [-0.6, 1, 0.4], key: 70, keyColor: '#ffc995', env: 0.9 },
  { at: 10, bg: '#0b0705', fog: '#0b0705', density: 0.12, sky: 0, skyTop: '#0b0705', skyHorizon: '#0b0705', hemiSky: '#ffdcb5', hemiGround: '#140a05', hemi: 0.28, sun: 0, sunColor: '#ffd2a0', sunDir: [-0.6, 1, 0.4], key: 70, keyColor: '#ffc995', env: 0.9 },
]

const parsed = MOODS.map((m) => ({
  ...m,
  bgC: new Color(m.bg),
  fogC: new Color(m.fog),
  skyTopC: new Color(m.skyTop),
  skyHorC: new Color(m.skyHorizon),
  hemiSkyC: new Color(m.hemiSky),
  hemiGroundC: new Color(m.hemiGround),
  sunC: new Color(m.sunColor),
  keyC: new Color(m.keyColor),
  dir: new Vector3(...m.sunDir).normalize(),
}))

/** Live, interpolated mood for the current frame. */
const currentMood = {
  bg: new Color(),
  fog: new Color(),
  skyTop: new Color(),
  skyHorizon: new Color(),
  hemiSky: new Color(),
  hemiGround: new Color(),
  sunColor: new Color(),
  keyColor: new Color(),
  sunDir: new Vector3(),
  density: 0,
  sky: 0,
  hemi: 0,
  sun: 0,
  key: 0,
  env: 0,
}

function sampleMood(pos: number) {
  let i = 0
  while (i < parsed.length - 2 && pos > parsed[i + 1].at) i++
  const a = parsed[i]
  const b = parsed[i + 1]
  const t = smooth(Math.min(1, Math.max(0, (pos - a.at) / (b.at - a.at))))
  const o = currentMood
  o.bg.copy(a.bgC).lerp(b.bgC, t)
  o.fog.copy(a.fogC).lerp(b.fogC, t)
  o.skyTop.copy(a.skyTopC).lerp(b.skyTopC, t)
  o.skyHorizon.copy(a.skyHorC).lerp(b.skyHorC, t)
  o.hemiSky.copy(a.hemiSkyC).lerp(b.hemiSkyC, t)
  o.hemiGround.copy(a.hemiGroundC).lerp(b.hemiGroundC, t)
  o.sunColor.copy(a.sunC).lerp(b.sunC, t)
  o.keyColor.copy(a.keyC).lerp(b.keyC, t)
  o.sunDir.copy(a.dir).lerp(b.dir, t).normalize()
  // Density interpolates geometrically — the jump from landscape to macro spans 20×.
  o.density = a.density * Math.pow(b.density / a.density, t)
  o.sky = a.sky + (b.sky - a.sky) * t
  o.hemi = a.hemi + (b.hemi - a.hemi) * t
  o.sun = a.sun + (b.sun - a.sun) * t
  o.key = a.key + (b.key - a.key) * t
  o.env = a.env + (b.env - a.env) * t
  return o
}

/* ------------------------------------------------------------------- sky */

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`
const skyFragment = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunColor; uniform float uOpacity; uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 11.7; a *= 0.5; } return v; }
  void main() {
    vec3 d = normalize(vDir);
    float s = max(dot(d, uSun), 0.0);
    vec3 col = mix(uHorizon, uTop, pow(clamp(d.y * 2.2 + 0.04, 0.0, 1.0), 0.55));
    // Overcast: a soft, bright patch where the sun hides behind the cloud deck.
    col += uSunColor * pow(s, 4.0) * 0.12;

    // Layered grey monsoon cloud, drifting slowly.
    vec2 uv = d.xz / (max(d.y, 0.0) + 0.16) * 0.9;
    uv.x += uTime * 0.006;
    float warp = fbm(uv * 0.5 + 3.1);
    float n = fbm(uv * 0.9 + warp * 1.2);
    float cover = smoothstep(0.25, 0.65, n) * smoothstep(-0.05, 0.12, d.y);
    float thick = smoothstep(0.45, 0.9, n);
    vec3 cloudLight = vec3(0.78, 0.8, 0.8);
    vec3 cloudGrey = vec3(0.46, 0.49, 0.51);
    vec3 cloud = mix(cloudLight, cloudGrey, thick);
    // Brighter undersides nearer the hidden sun.
    cloud += uSunColor * pow(s, 3.0) * (1.0 - thick) * 0.08;
    col = mix(col, cloud, cover * 0.9);
    gl_FragColor = vec4(col, uOpacity);
    #include <colorspace_fragment>
  }
`

/* ------------------------------------------------------------------ veil */

const veilFragment = /* glsl */ `
  uniform float uTime; uniform float uOpacity; uniform vec3 uColor;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main() {
    // Rising mist: the edge of the cloud sweeps up the screen as the camera sinks through it.
    float n = fbm(vUv * vec2(3.0, 2.0) + vec2(uTime * 0.02, uTime * 0.05));
    float cover = smoothstep(0.0, 1.0, uOpacity * 1.6 - 0.3 + (n - 0.5) * 0.9);
    gl_FragColor = vec4(uColor * (0.9 + n * 0.2), clamp(cover, 0.0, 1.0) * min(1.0, uOpacity * 1.4));
    #include <colorspace_fragment>
  }
`
const veilVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }
`

export default function Atmosphere({ shadowMap }: { shadowMap: number }) {
  const scene = useThree((s) => s.scene)
  const key = useRef<SpotLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const hemi = useRef<HemisphereLight>(null)
  const sky = useRef<Mesh>(null)
  const veil = useRef<Mesh>(null)
  const keyTarget = useMemo(() => new Object3D(), [])
  const sunTarget = useMemo(() => new Object3D(), [])
  const bg = useMemo(() => new Color(), [])
  const fog = useMemo(() => new FogExp2('#9aa690', 0.004), [])

  const skyMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: BackSide,
        depthWrite: false,
        transparent: true,
        uniforms: {
          uTop: { value: new Color() },
          uHorizon: { value: new Color() },
          uSun: { value: new Vector3() },
          uSunColor: { value: new Color() },
          uOpacity: { value: 1 },
          uTime: { value: 0 },
        },
      }),
    [],
  )
  const veilMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: veilVertex,
        fragmentShader: veilFragment,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color('#a7ab96') } },
      }),
    [],
  )

  // Fog must exist before the shader warm-up, or every material recompiles on first frame.
  useLayoutEffect(() => {
    scene.fog = fog
    scene.background = bg
    return () => {
      scene.fog = null
    }
  }, [scene, fog, bg])

  useFrame(({ camera, clock }) => {
    const pos = sceneState.pos
    const m = sampleMood(pos)
    bg.copy(m.bg)
    scene.background = bg
    fog.color.copy(m.fog)
    fog.density = m.density
    scene.fog = fog
    scene.environmentIntensity = m.env

    const f = cameraFocus
    if (hemi.current) {
      hemi.current.color.copy(m.hemiSky)
      hemi.current.groundColor.copy(m.hemiGround)
      hemi.current.intensity = m.hemi
    }
    if (sun.current) {
      sun.current.intensity = m.sun
      sun.current.color.copy(m.sunColor)
      sun.current.position.copy(f).addScaledVector(m.sunDir, 60)
      sunTarget.position.copy(f)
      sunTarget.updateMatrixWorld()
    }
    if (key.current) {
      key.current.intensity = m.key
      key.current.color.copy(m.keyColor)
      key.current.position.set(f.x - 2.1, f.y + 3.4, f.z + 2.0)
      keyTarget.position.copy(f)
      keyTarget.updateMatrixWorld()
    }
    if (sky.current) {
      sky.current.visible = m.sky > 0.002
      sky.current.position.copy(camera.position)
      const u = skyMat.uniforms
      u.uTop.value.copy(m.skyTop)
      u.uHorizon.value.copy(m.skyHorizon)
      u.uSun.value.copy(m.sunDir)
      u.uSunColor.value.copy(m.sunColor).multiplyScalar(m.sky)
      u.uOpacity.value = m.sky
      u.uTime.value = clock.elapsedTime
    }
    if (veil.current) {
      const k = window01(pos, 1.78, 2.46, 0.26)
      veil.current.visible = k > 0.002
      veilMat.uniforms.uOpacity.value = k
      veilMat.uniforms.uTime.value = clock.elapsedTime
      veilMat.uniforms.uColor.value.copy(m.fog).lerp(bg, 0.2)
    }
  }, -1)

  return (
    <>
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050302']} />
        <Lightformer form="rect" intensity={2.4} color="#ffd6a1" position={[0, 5, 1]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={4} color="#ffc98c" position={[-5, 1.5, 2]} rotation-y={Math.PI / 2.4} scale={[1.2, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#e7dccd" position={[5, 2, -3]} rotation-y={-Math.PI / 1.6} scale={[0.6, 6, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#6b3c1c" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffe2bd" position={[-3, 1.5, 5]} scale={[2, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.6} color="#ffd6a1" position={[3.5, 1.2, 4.5]} scale={[2.2, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={6} color="#fff1dc" position={[2.5, 3, 4]} scale={1.2} target={[0, 0, 0]} />
      </Environment>

      <mesh ref={sky} material={skyMat} renderOrder={-20} frustumCulled={false}>
        <sphereGeometry args={[1000, 32, 16]} />
      </mesh>

      <hemisphereLight ref={hemi} />
      <primitive object={sunTarget} />
      <directionalLight ref={sun} target={sunTarget} />
      <primitive object={keyTarget} />
      <spotLight
        ref={key}
        target={keyTarget}
        angle={0.52}
        penumbra={0.85}
        distance={14}
        decay={2}
        castShadow
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={1}
        shadow-camera-far={10}
      />
      <directionalLight position={[4, 2.5, 5]} intensity={0.35} color="#c9d2de" />

      <mesh ref={veil} material={veilMat} renderOrder={1000} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  )
}
