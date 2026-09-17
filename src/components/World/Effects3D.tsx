import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
  type Group,
  type Points,
} from 'three'
import { rng } from './math'

/* ------------------------------------------------------------------- steam */

const steamVertex = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    // Cylindrical billboard: face the camera around the Y axis only.
    vec4 center = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 toCam = cameraPosition - center.xyz;
    // Seen from steeply above, a flat billboard would veil what is below it — fade it out.
    vFacing = 1.0 - smoothstep(0.55, 0.85, abs(normalize(toCam).y));
    toCam.y = 0.0;
    vec3 fwd = normalize(toCam + vec3(1e-4));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
    vec3 scale = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.0);
    vec3 world = center.xyz + right * position.x * scale.x + vec3(0.0, 1.0, 0.0) * position.y * scale.y;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`

const steamFragment = /* glsl */ `
  uniform float uTime; uniform float uIntensity; uniform float uSeed; uniform vec3 uColor;
  varying vec2 vUv;
  varying float vFacing;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.16 + uSeed;
    // Curl the column sideways as it rises, more the higher it gets.
    float sway = (fbm(vec2(uv.y * 1.4 - t * 0.8, uSeed)) - 0.5) * 0.9 * uv.y;
    sway += sin(uv.y * 5.0 - t * 3.0 + uSeed) * 0.05 * uv.y;
    float x = uv.x - 0.5 - sway;
    float width = mix(0.06, 0.3, uv.y);
    float column = exp(-(x * x) / (width * width * 0.6));
    float wisps = fbm(vec2(x * 3.5 + uSeed, uv.y * 2.0 - t * 2.2));
    float a = column * smoothstep(0.38, 0.85, wisps);
    a *= smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.4, uv.y);
    gl_FragColor = vec4(uColor, a * uIntensity * vFacing * 0.3);
  }
`

interface SteamProps {
  position: [number, number, number]
  /** Returns 0..1 each frame. */
  intensity: () => number
  count?: number
  width?: number
  height?: number
  follow?: () => Vector3 | null
}

export function Steam({ position, intensity, count = 3, width = 0.34, height = 0.9, follow }: SteamProps) {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(1, 1)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  const materials = useMemo(
    () =>
      Array.from({ length: count }, (_, i) =>
        new ShaderMaterial({
          vertexShader: steamVertex,
          fragmentShader: steamFragment,
          transparent: true,
          depthWrite: false,
          blending: NormalBlending,
          uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 0 },
            uSeed: { value: i * 3.17 + 0.5 },
            uColor: { value: new Color('#f3e6d4') },
          },
        }),
      ),
    [count],
  )

  useFrame(({ clock }) => {
    const k = intensity()
    if (group.current) {
      group.current.visible = k > 0.002
      const f = follow?.()
      if (f) group.current.position.copy(f)
    }
    for (const m of materials) {
      m.uniforms.uTime.value = clock.elapsedTime
      m.uniforms.uIntensity.value = k
    }
  })

  return (
    <group ref={group} position={position}>
      {materials.map((m, i) => (
        <mesh
          key={i}
          geometry={geometry}
          material={m}
          position={[(i - (count - 1) / 2) * width * 0.18, 0, (i % 2) * 0.02]}
          scale={[width * (0.8 + i * 0.15), height * (0.85 + ((i * 7) % 3) * 0.12), 1]}
          renderOrder={5}
          frustumCulled={false}
        />
      ))}
    </group>
  )
}

/* -------------------------------------------------------------- dust motes */

const dustVertex = /* glsl */ `
  uniform float uTime; uniform vec3 uCenter; uniform vec3 uBox; uniform float uSize; uniform float uPixelRatio;
  attribute float aSeed;
  varying float vTw;
  void main() {
    vec3 p = position + vec3(sin(uTime * 0.07 + aSeed * 6.0) * 0.3, uTime * 0.018 * (0.5 + aSeed), cos(uTime * 0.05 + aSeed * 4.0) * 0.3);
    // Wrap inside a box that travels with the camera target.
    p = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5 + uCenter;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.4 + aSeed) / -mv.z;
    vTw = 0.45 + 0.55 * sin(uTime * (0.6 + aSeed) + aSeed * 30.0);
  }
`

const dustFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity;
  varying float vTw;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vTw * uOpacity);
  }
`

interface DustProps {
  count: number
  center: () => Vector3
  /** Size of the wrapping volume around the centre. */
  box?: [number, number, number]
  size?: number
  color?: string
  /** 0..1 each frame. */
  opacity?: () => number
  seed?: number
}

export function Dust({ count, center, box = [4.5, 2.6, 4], size = 9, color = '#e8b77a', opacity, seed: seedValue = 99 }: DustProps) {
  const pointsRef = useRef<Points>(null)
  const { geometry, material } = useMemo(() => {
    const r = rng(seedValue)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * box[0] * 1.3
      pos[i * 3 + 1] = r() * box[1]
      pos[i * 3 + 2] = (r() - 0.5) * box[2] * 1.3
      seed[i] = r()
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    const m = new ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new Vector3() },
        uBox: { value: new Vector3(...box) },
        uSize: { value: size },
        uPixelRatio: { value: 1 },
        uColor: { value: new Color(color) },
        uOpacity: { value: 0.45 },
      },
    })
    return { geometry: g, material: m }
  }, [count, color, size, seedValue])

  useFrame(({ clock, gl }) => {
    const k = opacity ? opacity() : 1
    if (pointsRef.current) pointsRef.current.visible = k > 0.01
    material.uniforms.uOpacity.value = 0.45 * k
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uPixelRatio.value = gl.getPixelRatio()
    material.uniforms.uCenter.value.copy(center()).y += box[1] * 0.15
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
}

/* ------------------------------------------------------------------- drips */

const dripVertex = /* glsl */ `
  uniform float uTime; uniform float uTop; uniform float uBottom; uniform float uActive; uniform float uRadius;
  uniform float uPixelRatio; uniform float uSize;
  attribute vec3 aSeed;
  varying float vA;
  void main() {
    float period = 0.9 + aSeed.z * 0.8;
    float ph = fract(uTime / period + aSeed.x);
    float fall = ph * ph;
    vec3 p = vec3(cos(aSeed.y * 6.283) * uRadius * aSeed.x, mix(uTop, uBottom, fall), sin(aSeed.y * 6.283) * uRadius * aSeed.x);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.7 + aSeed.z * 0.6) / -mv.z;
    vA = uActive * step(0.02, ph) * (1.0 - step(0.98, ph));
  }
`

const dripFragment = /* glsl */ `
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    c.y *= 0.7;
    float d = length(c);
    if (d > 0.5 || vA < 0.01) discard;
    float spec = smoothstep(0.16, 0.0, length(c - vec2(-0.12, -0.12)));
    float rim = smoothstep(0.3, 0.5, d) * 0.35;
    gl_FragColor = vec4(mix(vec3(0.05, 0.022, 0.01) + rim * vec3(0.5, 0.3, 0.15), vec3(1.0, 0.88, 0.7), spec), vA * 0.95);
    #include <colorspace_fragment>
  }
`

interface DripsProps {
  count: number
  radius: number
  /** Called per frame: returns [topY, bottomY, active 0..1] in local space. */
  drive: () => [number, number, number]
  position?: [number, number, number]
}

export function Drips({ count, radius, drive, position }: DripsProps) {
  const ref = useRef<Points>(null)
  const { geometry, material } = useMemo(() => {
    const r = rng(5)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seeds, 3))
    const m = new ShaderMaterial({
      vertexShader: dripVertex,
      fragmentShader: dripFragment,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTop: { value: 1 },
        uBottom: { value: 0 },
        uActive: { value: 0 },
        uRadius: { value: radius },
        uPixelRatio: { value: 1 },
        uSize: { value: 0.22 },
      },
    })
    return { geometry: g, material: m }
  }, [count, radius])

  useFrame(({ clock, gl }) => {
    const [top, bottom, active] = drive()
    const u = material.uniforms
    u.uTime.value = clock.elapsedTime
    u.uTop.value = top
    u.uBottom.value = bottom
    u.uActive.value = active
    u.uPixelRatio.value = gl.getPixelRatio() * gl.domElement.height * 0.05
    if (ref.current) ref.current.visible = active > 0.01
  })

  return <points ref={ref} geometry={geometry} material={material} position={position} frustumCulled={false} />
}

/* ------------------------------------------------------------------ splash */

const splashVertex = /* glsl */ `
  uniform float uTime; uniform float uActive; uniform float uScale;
  attribute vec3 aSeed;
  varying float vA; varying float vSpec;
  void main() {
    float period = 0.45 + aSeed.z * 0.35;
    float ph = fract(uTime / period + aSeed.x);
    float ang = aSeed.y * 6.2831;
    float speed = 0.05 + aSeed.z * 0.07;
    vec3 p = vec3(cos(ang) * speed * ph, (0.16 + aSeed.x * 0.1) * ph - 0.55 * ph * ph, sin(ang) * speed * ph);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.004 + aSeed.z * 0.005) * uScale / -mv.z;
    vA = uActive * step(0.0, p.y) * (1.0 - ph);
    vSpec = aSeed.y;
  }
`

const splashFragment = /* glsl */ `
  varying float vA; varying float vSpec;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5 || vA < 0.01) discard;
    float s = smoothstep(0.2, 0.0, length(c - vec2(-0.12, -0.14)));
    vec3 col = mix(vec3(0.33, 0.18, 0.09), vec3(1.0, 0.9, 0.75), s);
    gl_FragColor = vec4(col, vA);
    #include <colorspace_fragment>
  }
`

export function Splash({ count, drive }: { count: number; drive: (out: Vector3) => number }) {
  const ref = useRef<Points>(null)
  const { geometry, material } = useMemo(() => {
    const r = rng(77)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seeds, 3))
    const m = new ShaderMaterial({
      vertexShader: splashVertex,
      fragmentShader: splashFragment,
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uActive: { value: 0 }, uScale: { value: 800 } },
    })
    return { geometry: g, material: m }
  }, [count])

  useFrame(({ clock, gl, size, camera }) => {
    const pts = ref.current
    if (!pts) return
    const active = drive(pts.position)
    pts.visible = active > 0.01
    const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180)
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uActive.value = active
    material.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(fov / 2))
  })

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={3} />
}

/* ------------------------------------------------------------------- aroma */

const aromaVertex = /* glsl */ `
  uniform float uTime; uniform float uScale; uniform float uHeight; uniform float uRadius;
  attribute vec3 aSeed;
  varying float vA;
  void main() {
    float ph = fract(uTime * (0.05 + aSeed.z * 0.05) + aSeed.x);
    float ang = aSeed.y * 6.2831 + ph * (4.0 + aSeed.z * 3.0);
    float rad = uRadius * (0.35 + ph * 1.3) * (0.6 + aSeed.x * 0.4);
    vec3 p = vec3(cos(ang) * rad, ph * uHeight, sin(ang) * rad);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (0.006 + aSeed.z * 0.01) * uScale / -mv.z;
    vA = smoothstep(0.0, 0.15, ph) * (1.0 - smoothstep(0.55, 1.0, ph));
  }
`

const aromaFragment = /* glsl */ `
  uniform float uIntensity; uniform vec3 uColor;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vA * uIntensity);
  }
`

/** Warm motes spiralling up from a cup — the idea of aroma, made visible. */
export function Aroma({
  count,
  position,
  intensity,
  height = 1.2,
  radius = 0.22,
}: {
  count: number
  position: [number, number, number]
  intensity: () => number
  height?: number
  radius?: number
}) {
  const ref = useRef<Points>(null)
  const { geometry, material } = useMemo(() => {
    const r = rng(12)
    const seeds = new Float32Array(count * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = r()
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3))
    g.setAttribute('aSeed', new BufferAttribute(seeds, 3))
    const m = new ShaderMaterial({
      vertexShader: aromaVertex,
      fragmentShader: aromaFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uScale: { value: 800 },
        uHeight: { value: height },
        uRadius: { value: radius },
        uIntensity: { value: 0 },
        uColor: { value: new Color('#ffc98a') },
      },
    })
    return { geometry: g, material: m }
  }, [count, height, radius])

  useFrame(({ clock, gl, size, camera }) => {
    const k = intensity()
    if (ref.current) ref.current.visible = k > 0.01
    const fov = ((camera as { fov?: number }).fov ?? 30) * (Math.PI / 180)
    material.uniforms.uTime.value = clock.elapsedTime
    material.uniforms.uIntensity.value = k * 0.8
    material.uniforms.uScale.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan(fov / 2))
  })

  return <points ref={ref} position={position} geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
}
