/**
 * Bakes the coffee kit into Draco-compressed GLB files:
 *   public/models/coffee-kit.glb       (desktop detail)
 *   public/models/coffee-kit-lite.glb  (mobile detail)
 *
 * Run with `npm run models`. Meshes carry geometry only; PBR materials are applied at
 * runtime so brass, steel and liquids stay consistent across every model source.
 * To use artist-made models instead, export GLBs with the same node names.
 */
import { Document, NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { draco } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { mkdirSync, statSync } from 'node:fs'
import type { BufferGeometry } from 'three'
import { buildKit } from '../src/components/World/geometry'

async function bake(detail: 'high' | 'low', file: string) {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const scene = doc.createScene('coffee-kit')
  const kit = buildKit(detail)

  for (const [name, geo] of Object.entries(kit) as [string, BufferGeometry][]) {
    const prim = doc.createPrimitive()
    const add = (semantic: string, attr: string) => {
      const a = geo.getAttribute(attr)
      if (!a) return
      const type = a.itemSize === 3 ? 'VEC3' : 'VEC2'
      prim.setAttribute(
        semantic,
        doc.createAccessor().setType(type).setArray(new Float32Array(a.array as ArrayLike<number>)).setBuffer(buffer),
      )
    }
    add('POSITION', 'position')
    add('NORMAL', 'normal')
    add('TEXCOORD_0', 'uv')
    if (geo.index) {
      prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geo.index.array)).setBuffer(buffer))
    }
    const mesh = doc.createMesh(name).addPrimitive(prim)
    scene.addChild(doc.createNode(name).setMesh(mesh))
  }

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule(),
  })
  await doc.transform(draco({ method: 'edgebreaker', quantizePosition: 16, quantizeNormal: 12 }))
  await io.write(file, doc)
  console.log(`${file}  ${(statSync(file).size / 1024).toFixed(1)} KB  (${Object.keys(kit).length} meshes)`)
}

mkdirSync('public/models', { recursive: true })
await bake('high', 'public/models/coffee-kit.glb')
await bake('low', 'public/models/coffee-kit-lite.glb')
