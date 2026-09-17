import { useRef, useState } from 'react'
import { useReveal } from '../hooks/useReveal'
import { COLLECTION, inr, type Product } from '../data/products'
import { useCart } from '../state/cart'
import ProductArt from '../components/ui/ProductArt'
import QuantitySelector from '../components/ui/QuantitySelector'

function ProductCard({ product, index }: { product: Product; index: number }) {
  const { add } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  return (
    <li
      data-reveal={index}
      className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-cream/[0.08] bg-gradient-to-b from-bean/80 to-roast transition-[border-color,transform] duration-700 ease-(--ease-lux) hover:-translate-y-1 hover:border-gold/30"
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_45%,rgb(169_184_147/0.16),transparent_70%)] transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute inset-x-0 bottom-[12%] mx-auto h-6 w-2/3 rounded-full bg-black/60 blur-xl" />
        <div className="absolute inset-[12%] transition-transform duration-[1200ms] ease-(--ease-lux) group-hover:-translate-y-2 group-hover:scale-[1.035]">
          <ProductArt product={product} />
        </div>
        {product.badge && (
          <span className="eyebrow absolute left-5 top-5 rounded-full border border-gold/40 bg-espresso/40 px-3 py-1.5 text-[0.55rem] text-gold-soft backdrop-blur">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-4 border-t border-cream/[0.07] p-6">
        <div>
          <p className="eyebrow text-[0.55rem] text-sage">{product.tagline}</p>
          <h3 className="display mt-2 text-[1.9rem] leading-none">{product.name}</h3>
          <p className="mt-3 text-sm font-light leading-relaxed text-cream/55">{product.description}</p>
        </div>
        <div className="mt-auto flex items-baseline justify-between">
          <span className="font-display text-2xl text-gold-soft">{inr.format(product.price)}</span>
          <span className="text-xs text-cream/45">{product.weight}</span>
        </div>
        <div className="flex items-center gap-3">
          <QuantitySelector size="sm" label={product.name} value={qty} onChange={setQty} />
          <button
            type="button"
            onClick={() => {
              add(product.id, qty)
              setAdded(true)
              window.setTimeout(() => setAdded(false), 1600)
            }}
            className="eyebrow h-8 flex-1 rounded-full border border-cream/20 text-[0.56rem] transition-colors duration-500 hover:border-gold hover:bg-gold hover:text-espresso"
          >
            {added ? 'Added ✓' : 'Add to cart'}
          </button>
        </div>
      </div>
    </li>
  )
}

export default function Products() {
  const root = useRef<HTMLElement>(null)
  useReveal(root)

  return (
    <section id="products" ref={root} className="relative overflow-hidden bg-espresso py-28 md:py-40">
      <div className="pointer-events-none absolute -left-40 top-10 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgb(47_74_54/0.35),transparent_65%)]" />
      <div className="relative mx-auto max-w-[92rem] px-6 md:px-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p data-reveal className="eyebrow text-gold">
              The collection
            </p>
            <h2 data-reveal="1" className="display mt-6 text-[clamp(3rem,6.5vw,6rem)]">
              Everything for <em className="text-gold-soft">the ritual.</em>
            </h2>
          </div>
          <p data-reveal="2" className="max-w-sm font-light leading-relaxed text-cream/60">
            More coffees from the Western Ghats, and the brass and steel that turn them into a morning.
          </p>
        </div>

        <ul className="mt-16 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {COLLECTION.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </ul>
      </div>
    </section>
  )
}
