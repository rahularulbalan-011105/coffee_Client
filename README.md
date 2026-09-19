# Manam — From the estates of Chikmagalur to your tumbler

A long, vertically scrolling coffee film. The page scrolls normally; behind it a persistent
WebGL world descends from a misty Chikmagalur coffee estate through harvest, drying,
roasting, grinding, filtering and brewing to a brass dabara and tumbler — and ends at an
order counter with the finished cup still on screen.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview
npm run models     # re-bake public/models/*.glb from the procedural sources
```

Append `?quality=low` or `?quality=high` to force a rendering tier.

## How the journey works

```
<Journey>                       sections/Journey.tsx
  sticky 100svh world layer     ← <CoffeeWorld> (lazy, three.js) + readability vignette
  chapters (normal flow)        ← 9 <Chapter> sections, then <OrderSection>
  progress rail
<OurStory> <Products> <Footer>  ← ordinary sections after the world layer releases
```

- **World space is vertical.** `World/layout.ts` stacks the stages: estate at `y ≈ 0`,
  drying bed at `-9`, roaster `-16`, grinder `-22.5`, filter `-27.2`, dabara `-32.5`.
  The coffee physically falls from one stage into the next and the camera follows it down.
- **One master timeline** (`animation/journey.ts`) measured in *chapter units*: chapter `i`
  spans `[i, i+1]` and is centred on screen at `i + 0.5`. Page scroll is mapped to that time
  by measuring the real chapter elements, so chapter heights can change freely.
- The timeline tweens plain numbers on `sceneState` — `ripen`, `cherryFall`, `land`, `rake`,
  `toRoaster`, `roast`, `trayOut`, `toGrinder`, `grind`, `powder`, `water`, `lift`,
  `transfer`, `milk`, `pour`, `order`… — plus the camera path. Scene components read them in
  `useFrame`; React never re-renders while scrolling.
- **Colour story:** `World/Atmosphere.tsx` interpolates sky, fog, light and reflections from
  plantation green to espresso; `animation/palette.ts` tints the DOM vignette to match.
- **Chapter copy** rides a sticky layer inside each section: it enters from below, holds while
  its stage plays, and leaves upward.

## Scene modules (`src/components/World`)

| Module | Stage |
| --- | --- |
| `Estate.tsx` | terraced terrain, misty ridges, coffee bushes (leafy near, canopy LOD far), silver oaks, mist, sun shafts |
| `Harvest.tsx` | hero branch; cherries ripen green → crimson and fall into the mist |
| `DryingBed.tsx` | green beans rain onto a raised bed, get raked and dry to straw |
| `Roaster.tsx` | drum roaster, glowing window, cooling tray with sweeping arm |
| `Grinder.tsx` | brass grinder and the GPU powder stream falling into the filter |
| `Filter.tsx` | two-tier filter, press, kettle pour, lid, lift + drips, decoction, aroma |
| `DabaraSet.tsx`, `CoffeeCup.tsx` | decoction + milk into the dabara, the meter pour, froth, final set |
| `BeanFlow.tsx` | generic instanced "things travelling through waypoints" (all bean/cherry motion) |
| `CoffeePour.tsx`, `Effects3D.tsx` | shader liquid streams, steam, drips, splash, dust, aroma |

## Models (GLB)

`public/models/coffee-kit.glb` (desktop) and `coffee-kit-lite.glb` (mobile) are Draco-compressed
GLBs baked by `scripts/build-models.ts`. `World/models.tsx` loads them by node name (`tumbler`,
`dabara`, `filterLower`, `grinderBody`, `bean`, `cherry`, `leaf`, …) with the self-hosted decoder
in `public/draco/`; if the GLB fails to load, the same geometry is generated procedurally.
**To use artist-made models, export GLBs with the same node names** — no animation code changes.
Materials are applied at runtime so brass, steel and liquids stay consistent.

## Real assets (`public/real/`)

Surfaces and props are real-world captures (CC0, [Poly Haven](https://polyhaven.com)):

| Asset | Used for |
| --- | --- |
| `wooden_lounge` HDRI | reflections on brass, steel and wood (`RealReflections.tsx`); the estate keeps its own outdoor light |
| `brass_pot_01` scan | roughness and lacquer normal of every brass piece (engraving stays procedural) |
| `weathered_planks` | drying bed, rake, grinder base |
| `wood_table_001` | the tabletops under the grinder, filter and serving set (`Counters.tsx`) |
| `wicker_basket_01` model | the picker's basket the cherries drop into (`Harvest.tsx`) |

Swap any of them by replacing the files in `public/real/` (see `realAssets.ts`).

## Performance

- Instanced leaves, bushes, cherries and beans; canopy LOD for distant bushes; shader-driven
  particles and liquid; stages outside the camera's range are hidden.
- Shaders are compiled up front with `KHR_parallel_shader_compile` (`WarmUp` in `CoffeeWorld.tsx`)
  and the scene's light count never changes, so scrolling never triggers a recompile.
- Low tier (phones, coarse pointers, weak devices): fewer beans/particles/leaves, lite GLB,
  512² shadows, no post-processing. `PerformanceMonitor` drops effects if frames suffer and
  switches to a CSS poster if the device still cannot cope; no WebGL → poster from the start.
- The render loop stops once the journey scrolls away; three.js loads in a lazy chunk.

## Commerce

`state/cart.tsx` is a small cart (persisted in `localStorage`); `CartDrawer` shows lines, totals
and a demo "Place order". Product data and placeholder prices live in `data/products.ts` —
wire these to a real checkout before launch. Copy and prices are illustrative.
