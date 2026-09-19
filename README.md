# Manam — From the estates of Chikmagalur to your tumbler

A long, vertically scrolling coffee film. The page scrolls normally; behind it a persistent
layer of real footage cuts from a misty Chikmagalur-style valley through harvest, drying,
roasting, grinding, filtering and brewing to a brass dabara and tumbler — and ends at an
order counter with the finished cup still on screen.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
npm run preview
```

## How the journey works

```
<Journey>                       sections/Journey.tsx
  sticky 100svh film layer      ← <Film> (components/Film) + readability vignette
  chapters (normal flow)        ← 9 <Chapter> sections, then <OrderSection>
  progress rail
<OurStory> <Products> <Footer>  ← ordinary sections after the film layer releases
```

- **Journey time** (`animation/journey.ts`) is measured in *chapter units*: chapter `i` spans
  `[i, i+1]` and is centred on screen at `i + 0.5`. Page scroll is mapped to that time by
  measuring the real chapter elements, so chapter heights can change freely.
- **Shots** (`SHOTS` in `components/Film/Film.tsx`) each cover a range of journey time. A shot
  cross-dissolves in over the previous one at its start and slowly pushes in while it holds.
  Clips loop muted at 0.85× speed, load only when within ~1 chapter, and pause off-screen.
- **Portrait footage** is shown full-bleed on phones; on wide screens it sits in a feathered
  window right of the copy over a blurred fill of its own poster frame.
- **Colour story:** `animation/palette.ts` tints the DOM vignette from plantation green to
  espresso so the copy stays legible over every shot.
- **Chapter copy** rides a sticky layer inside each section: it enters from below, holds while
  its shot plays, and leaves upward.

## Footage

Clips live in `public/film/` (`<name>.mp4` + `<name>.jpg` poster, 720p H.264, no audio, warm
grade). To swap in your own footage, replace the files with the same names — or add a shot to
`SHOTS`. Current clips are free stock from Pexels (free for commercial use, no attribution
required):

| Shot | Pexels video |
| --- | --- |
| `estate` | 19669269 |
| `harvest-pick` | 30690821 |
| `harvest-basket` | 7116722 |
| `drying` | 31053382 |
| `roast-drop` | 11296403 |
| `roast-cool` | 4927236 |
| `grind` | 8430961 |
| `filter` | 6932326 |
| `decoction` | 6932466 |
| `dabara`, `pour`, `finale` | 31271814 |

(`https://www.pexels.com/video/<id>/`)

## Commerce

`state/cart.tsx` is a small cart (persisted in `localStorage`); `CartDrawer` shows lines, totals
and a demo "Place order". Product data and placeholder prices live in `data/products.ts` —
wire these to a real checkout before launch. Copy and prices are illustrative.
