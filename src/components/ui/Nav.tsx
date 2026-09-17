import { useEffect, useState } from 'react'
import { scrollToTarget, setScrollLocked } from '../../animation/scrollController'
import { useCart } from '../../state/cart'
import { Arrow, BrandMark, Wordmark } from './Brand'

const LINKS = [
  { label: 'Origin', href: '#chapter-estate' },
  { label: 'Process', href: '#chapter-beans' },
  { label: 'Coffee', href: '#order' },
  { label: 'Shop', href: '#products' },
]

function CartButton() {
  const { count, setOpen } = useCart()
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 text-cream transition-colors hover:border-gold-soft"
      aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`}
    >
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" strokeLinejoin="round" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[0.62rem] font-semibold text-espresso">
          {count}
        </span>
      )}
    </button>
  )
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setScrollLocked(open)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    requestAnimationFrame(() => scrollToTarget(href))
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-700 ease-(--ease-lux) ${
          scrolled ? 'border-b border-cream/[0.07] bg-espresso/60 py-3 backdrop-blur-xl' : 'border-b border-transparent bg-transparent py-5 md:py-7'
        }`}
      >
        <nav className="mx-auto flex max-w-[92rem] items-center justify-between px-5 md:px-10" aria-label="Primary">
          <a href="#top" onClick={go('#top')} className="flex items-center gap-3 text-cream" aria-label="Manam — back to the start">
            <BrandMark className="h-8 w-8 text-gold" />
            <Wordmark />
          </a>

          <ul className="hidden items-center gap-10 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={go(l.href)}
                  className="link-underline pb-1 text-[0.7rem] font-medium uppercase tracking-[0.26em] text-cream/75 transition-colors duration-500 hover:text-cream"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <a href="#order" onClick={go('#order')} className="btn-gold hidden px-5 py-3 sm:inline-flex">
              Order coffee
            </a>
            <CartButton />
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              <span className={`absolute h-px w-4 bg-cream transition-transform duration-500 ${open ? 'rotate-45' : '-translate-y-[3px]'}`} />
              <span className={`absolute h-px w-4 bg-cream transition-transform duration-500 ${open ? '-rotate-45' : 'translate-y-[3px]'}`} />
            </button>
          </div>
        </nav>
      </header>

      <div
        id="mobile-menu"
        className={`fixed inset-0 z-40 flex flex-col justify-between bg-espresso/95 px-6 pb-10 pt-28 backdrop-blur-2xl transition-[opacity,visibility] duration-700 lg:hidden ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      >
        <ul className="space-y-2">
          {LINKS.map((l, i) => (
            <li
              key={l.href}
              className="transition-[transform,opacity] duration-700 ease-(--ease-lux)"
              style={{ transitionDelay: open ? `${120 + i * 70}ms` : '0ms', transform: open ? 'none' : 'translateY(20px)', opacity: open ? 1 : 0 }}
            >
              <a href={l.href} onClick={go(l.href)} className="display flex items-baseline justify-between border-b border-cream/10 py-4 text-5xl">
                {l.label}
                <span className="eyebrow text-gold">0{i + 1}</span>
              </a>
            </li>
          ))}
        </ul>
        <a href="#order" onClick={go('#order')} className="btn-gold justify-center">
          Order coffee <Arrow />
        </a>
      </div>
    </>
  )
}
