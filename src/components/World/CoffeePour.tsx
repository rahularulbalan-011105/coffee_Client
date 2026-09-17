import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3, type Mesh } from 'three'

/**
 * A liquid stream along a cubic Bézier, computed entirely in the vertex shader.
 * The geometry only stores (u, angle); every frame the parent supplies control
 * points so the stream follows a tilting vessel without rebuilding buffers.
 */

export interface StreamState {
  p0: Vector3
  p1: Vector3
  p2: Vector3
  p3: Vector3
  /** Visible window along the curve, 0..1. head ≥ tail. */
  head: number
  tail: number
  radius: number
}

interface CoffeePourProps {
  color: string
  highlight?: string
  opacity?: number
  /** Radius multiplier at the end of the curve (streams thin as they fall). */
  taper?: number
  segments?: number
  /** Called every frame to write the stream state. */
  drive: (s: StreamState) => void
}

const vertex = /* glsl */ `
  uniform vec3 uP0; uniform vec3 uP1; uniform vec3 uP2; uniform vec3 uP3;
  uniform float uHead; uniform float uTail; uniform float uRadius; uniform float uTaper; uniform float uTime;
  varying vec3 vNormalW; varying vec3 vPosW; varying float vT; varying float vAng;

  vec3 bez(float t) { float s = 1.0 - t; return s*s*s*uP0 + 3.0*s*s*t*uP1 + 3.0*s*t*t*uP2 + t*t*t*uP3; }
  vec3 dbez(float t) { float s = 1.0 - t; return 3.0*s*s*(uP1-uP0) + 6.0*s*t*(uP2-uP1) + 3.0*t*t*(uP3-uP2); }

  void main() {
    float u = position.x;
    float ang = position.y;
    float t = mix(uTail, uHead, u);
    vec3 c = bez(t);
    vec3 T = normalize(dbez(t) + vec3(1e-5));
    vec3 ref = abs(T.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 N = normalize(cross(T, ref));
    vec3 B = normalize(cross(T, N));

    // Laminar wobble: the stream breathes and sways a little as it falls.
    float wob = sin(t * 38.0 - uTime * 16.0) * 0.07 + sin(t * 71.0 - uTime * 27.0) * 0.035;
    c += N * sin(t * 9.0 - uTime * 5.0) * 0.004 * t;

    float r = uRadius * mix(1.0, uTaper, smoothstep(0.0, 0.7, t)) * (1.0 + wob);
    // Soft ends: the leading drop and the thinning tail.
    r *= smoothstep(0.0, 0.035, uHead - t + 0.004);
    r *= mix(1.0, smoothstep(0.0, 0.06, t - uTail), step(0.001, uTail));
    r *= step(0.0005, uHead - uTail);

    vec3 dir = cos(ang) * N + sin(ang) * B;
    vec3 p = c + dir * r;
    vNormalW = dir;
    vPosW = p;
    vT = t;
    vAng = ang;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor; uniform vec3 uHighlight; uniform float uOpacity; uniform float uTime;
  varying vec3 vNormalW; varying vec3 vPosW; varying float vT; varying float vAng;

  void main() {
    vec3 n = normalize(vNormalW);
    vec3 v = normalize(cameraPosition - vPosW);
    float ndv = abs(dot(n, v));
    float fres = pow(1.0 - ndv, 3.0);

    // Two warm key reflections + a moving streak that reads as flow.
    vec3 L1 = normalize(vec3(-0.6, 0.8, 0.5));
    vec3 L2 = normalize(vec3(0.7, 0.4, -0.6));
    vec3 h1 = normalize(L1 + v);
    vec3 h2 = normalize(L2 + v);
    float spec = pow(max(dot(n, h1), 0.0), 60.0) * 1.6 + pow(max(dot(n, h2), 0.0), 30.0) * 0.6;
    float streak = smoothstep(0.75, 1.0, sin(vT * 38.0 - uTime * 14.0 + sin(vAng * 2.0) * 1.5)) * 0.12;
    float diffuse = 0.55 + 0.45 * max(dot(n, L1), 0.0);

    vec3 col = uColor * diffuse;
    col += uHighlight * (spec + fres * 0.55 + streak * (1.0 - ndv));
    gl_FragColor = vec4(col, uOpacity * mix(1.0, 0.75 + fres, 1.0 - uOpacity));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export default function CoffeePour({
  color,
  highlight = '#ffd9a8',
  opacity = 1,
  taper = 0.55,
  segments = 72,
  drive,
}: CoffeePourProps) {
  const mesh = useRef<Mesh>(null)
  const radial = 10

  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array((segments + 1) * (radial + 1) * 3)
    let k = 0
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= radial; j++) {
        pos[k++] = i / segments
        pos[k++] = (j / radial) * Math.PI * 2
        pos[k++] = 0
      }
    }
    const idx: number[] = []
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radial; j++) {
        const a = i * (radial + 1) + j
        const b = a + radial + 1
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setIndex(idx)
    return g
  }, [segments])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: opacity < 1,
        depthWrite: opacity >= 1,
        uniforms: {
          uP0: { value: new Vector3() },
          uP1: { value: new Vector3() },
          uP2: { value: new Vector3() },
          uP3: { value: new Vector3() },
          uHead: { value: 0 },
          uTail: { value: 0 },
          uRadius: { value: 0.012 },
          uTaper: { value: taper },
          uTime: { value: 0 },
          uColor: { value: new Color(color) },
          uHighlight: { value: new Color(highlight) },
          uOpacity: { value: opacity },
        },
      }),
    [color, highlight, opacity, taper],
  )

  const state = useMemo<StreamState>(
    () => ({ p0: new Vector3(), p1: new Vector3(), p2: new Vector3(), p3: new Vector3(), head: 0, tail: 0, radius: 0.012 }),
    [],
  )

  useFrame(({ clock }) => {
    drive(state)
    const u = material.uniforms
    u.uP0.value.copy(state.p0)
    u.uP1.value.copy(state.p1)
    u.uP2.value.copy(state.p2)
    u.uP3.value.copy(state.p3)
    u.uHead.value = state.head
    u.uTail.value = state.tail
    u.uRadius.value = state.radius
    u.uTime.value = clock.elapsedTime
    if (mesh.current) mesh.current.visible = state.head - state.tail > 0.001
  })

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />
}
