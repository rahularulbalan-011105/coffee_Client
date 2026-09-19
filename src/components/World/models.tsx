import { Component, createContext, useContext, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import type { BufferGeometry, Mesh } from 'three'
import { buildKit, type KitName } from './geometry'

/**
 * Model registry. Scene components ask for geometry by name (`useKit('tumbler')`) and never
 * care where it came from: the Draco GLB in /public/models, or the procedural generator
 * if the GLB cannot load. Replacing a model = exporting a GLB node with the same name.
 */

type Kit = Record<KitName, BufferGeometry>
const KitContext = createContext<Kit | null>(null)

const BASE = import.meta.env.BASE_URL
const url = (detail: 'high' | 'low') => `${BASE}models/${detail === 'high' ? 'coffee-kit.glb' : 'coffee-kit-lite.glb'}`
const DRACO = `${BASE}draco/`

function GLBKit({ detail, children }: { detail: 'high' | 'low'; children: ReactNode }) {
  const { nodes } = useGLTF(url(detail), DRACO)
  const kit = useMemo(() => {
    const fallback = buildKit(detail)
    const out = { ...fallback }
    for (const name of Object.keys(fallback) as KitName[]) {
      const node = nodes[name] as Mesh | undefined
      if (node?.geometry) out[name] = node.geometry
    }
    return out
  }, [nodes, detail])
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>
}

function ProceduralKit({ detail, children }: { detail: 'high' | 'low'; children: ReactNode }) {
  const kit = useMemo(() => buildKit(detail), [detail])
  return <KitContext.Provider value={kit}>{children}</KitContext.Provider>
}

class KitBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('[coffee-kit] GLB unavailable, using procedural models.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function KitProvider({ detail, children }: { detail: 'high' | 'low'; children: ReactNode }) {
  return (
    <KitBoundary fallback={<ProceduralKit detail={detail}>{children}</ProceduralKit>}>
      <GLBKit detail={detail}>{children}</GLBKit>
    </KitBoundary>
  )
}

export function useKit(name: KitName) {
  const kit = useContext(KitContext)
  if (!kit) throw new Error('useKit must be used inside <KitProvider>')
  return kit[name]
}

