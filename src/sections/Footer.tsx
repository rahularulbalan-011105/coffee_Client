import { useState } from 'react'
import { BrandMark, Wordmark } from '../components/ui/Brand'

const COLUMNS = [
  { title: 'Shop', links: ['Coffee', 'Brass & filters', 'Gift sets', 'Subscriptions'] },
  { title: 'Manam', links: ['Our story', 'Estates', 'Journal', 'Cafés'] },
  { title: 'Help', links: ['Brewing guide', 'Shipping', 'Contact', 'FAQ'] },
]

export default function Footer() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)

  return (
    <footer className="relative border-t border-cream/[0.07] bg-roast pt-20 pb-10">
      <div className="mx-auto max-w-[92rem] px-6 md:px-10">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3">
              <BrandMark className="h-10 w-10 text-gold" />
              <Wordmark />
            </div>
            <p className="display mt-8 max-w-md text-3xl leading-tight text-cream/85">
              Letters from the estate — harvest notes, new roasts and the occasional recipe.
            </p>
            <form
              className="mt-8 flex max-w-md items-center gap-2 border-b border-cream/20 pb-2 focus-within:border-gold"
              onSubmit={(e) => {
                e.preventDefault()
                if (email) setJoined(true)
              }}
            >
              <label htmlFor="newsletter" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-cream placeholder:text-cream/30 focus:outline-none"
              />
              <button type="submit" className="eyebrow text-[0.6rem] text-gold hover:text-gold-soft">
                {joined ? 'Welcome ✓' : 'Subscribe'}
              </button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-6 lg:col-start-7">
            {COLUMNS.map((c) => (
              <div key={c.title}>
                <p className="eyebrow text-[0.6rem] text-gold/80">{c.title}</p>
                <ul className="mt-5 space-y-3">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="#top" className="link-underline text-sm font-light text-cream/60 hover:text-cream">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <p aria-hidden="true" className="display mt-24 select-none text-center text-[clamp(4rem,19vw,17rem)] leading-[0.8] tracking-[0.08em] text-cream/[0.05]">
          MANAM
        </p>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-cream/[0.07] pt-8 text-xs text-cream/40 md:flex-row">
          <p>© {new Date().getFullYear()} Manam Coffee Co. Roasted in Bengaluru.</p>
          <p className="eyebrow text-[0.55rem]">Bean · Roast · Grind · Filter · Brew · Serve</p>
        </div>
      </div>
    </footer>
  )
}
