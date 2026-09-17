import { useEffect, useState } from 'react'
import { useCart } from '../../state/cart'
import { inr, productById } from '../../data/products'
import { setScrollLocked } from '../../animation/scrollController'
import ProductArt from './ProductArt'
import QuantitySelector from './QuantitySelector'
import { Arrow } from './Brand'

const FREE_SHIPPING = 999

export default function CartDrawer() {
  const { lines, subtotal, open, setOpen, setQty, clear } = useCart()
  const [placed, setPlaced] = useState(false)

  useEffect(() => {
    setScrollLocked(open)
    if (!open) {
      setPlaced(false)
      return
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : 60
  const remaining = Math.max(0, FREE_SHIPPING - subtotal)

  return (
    <div className={`fixed inset-0 z-[65] ${open ? 'visible' : 'invisible'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-espresso/60 backdrop-blur-sm transition-opacity duration-500 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        data-lenis-prevent
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-cream/10 bg-roast shadow-2xl transition-transform duration-700 ease-(--ease-lux) ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between border-b border-cream/10 px-6 py-5">
          <div>
            <p className="eyebrow text-gold">Your cart</p>
            <p className="display mt-1 text-3xl">{placed ? 'Order received' : 'Ready to brew'}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-10 w-10 rounded-full border border-cream/20 text-cream/70 hover:text-cream"
            aria-label="Close cart"
          >
            ✕
          </button>
        </header>

        {placed ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="display text-5xl text-gold-soft">Nandri.</p>
            <p className="mt-4 font-light text-cream/70">
              This is a demo storefront, so nothing was charged. A real order would be roasted on Monday and at your
              door by Thursday.
            </p>
            <button type="button" className="btn-ghost mt-8" onClick={() => setOpen(false)}>
              Back to the story
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="display text-4xl">Your tumbler is empty.</p>
            <p className="mt-3 font-light text-cream/60">Pick a coffee from the estate to begin.</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-cream/10 overflow-y-auto px-6">
              {lines.map((line) => {
                const p = productById(line.id)
                if (!p) return null
                return (
                  <li key={line.id} className="flex gap-4 py-5">
                    <div className="h-24 w-20 shrink-0 rounded-xl bg-bean/60 p-2">
                      <ProductArt product={p} />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="display text-2xl leading-none">{p.name}</p>
                          <p className="mt-1 text-xs text-cream/50">{p.weight}</p>
                        </div>
                        <p className="font-display text-xl text-gold-soft">{inr.format(p.price * line.qty)}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <QuantitySelector size="sm" label={p.name} value={line.qty} min={0} onChange={(q) => setQty(line.id, q)} />
                        <button
                          type="button"
                          className="text-xs text-cream/40 underline-offset-4 hover:text-cream hover:underline"
                          onClick={() => setQty(line.id, 0)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            <footer className="space-y-3 border-t border-cream/10 px-6 py-6">
              <p className="text-xs text-sage">
                {remaining > 0 ? `Add ${inr.format(remaining)} more for free shipping.` : 'Free shipping unlocked.'}
              </p>
              <div className="flex justify-between text-sm text-cream/70">
                <span>Subtotal</span>
                <span>{inr.format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-cream/70">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : inr.format(shipping)}</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-cream/10 pt-3">
                <span className="eyebrow text-cream/60">Total</span>
                <span className="display text-3xl text-gold-soft">{inr.format(subtotal + shipping)}</span>
              </div>
              <button
                type="button"
                className="btn-gold mt-2 w-full justify-center"
                onClick={() => {
                  setPlaced(true)
                  clear()
                }}
              >
                Place order <Arrow />
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  )
}
