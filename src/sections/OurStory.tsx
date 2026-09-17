import { useLayoutEffect, useRef } from 'react'
import { useReveal } from '../hooks/useReveal'
import { gsap, prefersReducedMotion } from '../animation/scrollController'

const CHAPTERS = [
  {
    era: 'c. 1670',
    title: 'Seven seeds',
    text: 'As the story goes, the Sufi saint Baba Budan returned from pilgrimage with seven coffee seeds and planted them on the Chandragiri hills above Chikmagalur. India’s coffee begins here.',
  },
  {
    era: '1800s',
    title: 'The estates',
    text: 'Coffee spread along the Western Ghats — Chikmagalur, Coorg, the Nilgiris — grown beneath silver oak and pepper vines, the shade that still shapes its gentle character.',
  },
  {
    era: '1900s',
    title: 'The filter arrives',
    text: 'In homes across Karnataka and Tamil Nadu, the two-tiered filter became a kitchen fixture, and mornings began with the slow patience of decoction.',
  },
  {
    era: 'Today',
    title: 'Estate to tumbler',
    text: 'We still work with the same hills: shade-grown, hand-picked, sun-dried and roasted in small batches — then sent straight to your door.',
  },
]

const FACTS = [
  { value: '1,100 m', label: 'Estate altitude' },
  { value: '100%', label: 'Shade grown' },
  { value: '7 days', label: 'Roast to door' },
]

export default function OurStory() {
  const root = useRef<HTMLElement>(null)
  const watermark = useRef<HTMLSpanElement>(null)
  useReveal(root)

  useLayoutEffect(() => {
    if (!watermark.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        watermark.current,
        { xPercent: 6 },
        { xPercent: -16, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } },
      )
    })
    return () => ctx.revert()
  }, [])

  return (
    <section id="story" ref={root} className="relative overflow-hidden bg-parchment py-28 text-ink md:py-40">
      <span
        ref={watermark}
        aria-hidden="true"
        className="display pointer-events-none absolute -top-4 left-0 select-none whitespace-nowrap text-[clamp(7rem,22vw,20rem)] leading-none text-plantation/[0.07]"
      >
        Chikmagalur
      </span>

      <div className="relative mx-auto max-w-[92rem] px-6 md:px-10">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:sticky lg:top-32 lg:col-span-5 lg:self-start">
            <p data-reveal className="eyebrow text-plantation">
              Our story
            </p>
            <h2 data-reveal="1" className="display mt-6 text-[clamp(3rem,6.5vw,6rem)]">
              Grown in the shade
              <em className="block text-bronze">of the Western Ghats.</em>
            </h2>
            <p data-reveal="2" className="mt-8 max-w-md text-lg font-light leading-relaxed text-ink/70">
              <em>Manam</em> is the Tamil word for fragrance — the aroma that drifts from a kitchen before anyone says
              good morning. Ours begins on a hillside in Chikmagalur.
            </p>
            <dl data-reveal="3" className="mt-10 grid max-w-md grid-cols-3 gap-4 border-y border-plantation/20 py-6">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt className="eyebrow text-[0.55rem] text-plantation/80">{f.label}</dt>
                  <dd className="display mt-2 text-3xl text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <ol className="relative lg:col-span-6 lg:col-start-7">
            <span className="absolute bottom-4 left-[0.4rem] top-4 w-px bg-plantation/25" aria-hidden="true" />
            {CHAPTERS.map((c, i) => (
              <li key={c.era} data-reveal={i} className="relative pb-16 pl-12 last:pb-0">
                <span className="absolute left-0 top-3 h-[0.85rem] w-[0.85rem] rounded-full border border-plantation bg-parchment" aria-hidden="true">
                  <span className="absolute inset-[3px] rounded-full bg-plantation" />
                </span>
                <p className="eyebrow text-bronze">{c.era}</p>
                <h3 className="display mt-3 text-[clamp(2.2rem,4vw,3.4rem)]">{c.title}</h3>
                <p className="mt-4 max-w-lg font-light leading-relaxed text-ink/70">{c.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
