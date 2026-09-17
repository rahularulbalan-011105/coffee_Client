import { forwardRef, useState } from 'react'
import { ORDER_PRODUCTS, inr, type Product } from '../data/products'
import { useCart } from '../state/cart'
import ProductArt from '../components/ui/ProductArt'
import QuantitySelector from '../components/ui/QuantitySelector'
import { Arrow } from '../components/ui/Brand'

function OrderCard({ product }: { product: Product }) {
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  return (
    <li className="group relative flex overflow-hidden rounded-[1.75rem] border border-cream/10 bg-espresso/55 backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-700 ease-(--ease-lux) hover:-translate-y-1.5 hover:border-gold/40 hover:shadow-[0_30px_80px_-30px_rgba(201,163,91,0.35)]">
      <div className="relative flex shrink-0 items-center py-5 pl-4">
        <div className="relative h-32 w-24">
          <div className="absolute inset-x-0 bottom-1 mx-auto h-4 w-2/3 rounded-full bg-black/60 blur-lg" />
          <div className="absolute inset-0 transition-transform duration-1000 ease-(--ease-lux) group-hover:-translate-y-1 group-hover:scale-[1.04]">
            <ProductArt product={product} />
          </div>
        </div>
      </div>
      {product.badge && (
        <span className="eyebrow absolute right-4 top-4 rounded-full border border-gold/40 px-2.5 py-1 text-[0.5rem] text-gold-soft">
          {product.badge}
        </span>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5 pl-3">
        <div className="pr-16">
          <p className="eyebrow text-[0.55rem] text-sage">{product.tagline}</p>
          <h3 className="display mt-1.5 text-[1.7rem] leading-none">{product.name}</h3>
        </div>
        <p className="text-[0.8rem] font-light leading-relaxed text-cream/60">{product.description}</p>
        <div className="flex items-baseline justify-between">
          <span className="font-display text-3xl text-gold-soft">{inr.format(product.price)}</span>
          <span className="text-xs text-cream/45">{product.weight}</span>
        </div>
        <div className="mt-auto flex items-center gap-3">
          <QuantitySelector label={product.name} value={qty} onChange={setQty} />
          <button
            type="button"
            onClick={() => {
              add(product.id, qty)
              setAdded(true)
              window.setTimeout(() => setAdded(false), 1600)
            }}
            className="eyebrow flex h-10 flex-1 items-center justify-center rounded-full border border-gold/50 text-[0.6rem] text-gold-soft transition-colors duration-500 hover:bg-gold hover:text-espresso"
          >
            {added ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </li>
  )
}

/**
 * The last stop of the journey. The finished cup stays on screen behind this layer —
 * you can order the coffee you just watched being made.
 */
const OrderSection = forwardRef<HTMLElement>(function OrderSection(_props, ref) {
  const { count, subtotal, setOpen, add } = useCart()

  return (
    <section ref={ref} id="order" data-chapter="order" data-anchor-vh="0.95" className="relative pb-[16svh]" aria-labelledby="order-title">
      <div className="mx-auto max-w-[92rem] px-6 pt-[72svh] md:px-10 md:pt-[70svh]">
        <div className="max-w-xl text-center md:text-left">
          <p className="eyebrow flex items-center justify-center gap-4 text-gold md:justify-start">
            <span className="opacity-70">10</span>
            <span className="h-px w-8 bg-current opacity-50" />
            From Chikmagalur, to you
          </p>
          <h2 id="order-title" className="display text-glow mt-5 text-[clamp(3rem,11vw,4.6rem)] uppercase md:text-[clamp(4rem,6.4vw,7rem)]">
            Your cup
            <span className="block italic normal-case text-gold-soft">is ready.</span>
          </h2>
          <p className="text-glow mt-6 text-lg font-light text-cream/85 md:text-xl">Bring the taste of Chikmagalur home.</p>
        </div>

        <div className="mt-[46svh] md:mt-[48svh]">
          <ul className="grid gap-4 lg:grid-cols-3">
            {ORDER_PRODUCTS.map((p) => (
              <OrderCard key={p.id} product={p} />
            ))}
          </ul>

          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-[1.75rem] border border-cream/10 bg-espresso/60 px-6 py-5 backdrop-blur-xl sm:flex-row">
            <p className="text-sm text-cream/70">
              {count > 0 ? (
                <>
                  <span className="text-cream">{count}</span> {count === 1 ? 'item' : 'items'} · {inr.format(subtotal)}
                </>
              ) : (
                'Roasted every Monday · Free shipping above ₹999'
              )}
            </p>
            <button
              type="button"
              className="btn-gold"
              onClick={() => {
                if (count === 0) add(ORDER_PRODUCTS[0].id)
                setOpen(true)
              }}
            >
              Order now <Arrow />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
})

export default OrderSection
