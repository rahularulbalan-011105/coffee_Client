import { useEffect, useMemo, useState } from 'react'
import { inr, productById } from '../data/products'
import { INDIAN_STATES } from '../data/india'
import { checkoutLive, RAZORPAY_KEY_ID, shippingFor, FREE_SHIPPING_ABOVE } from '../lib/config'
import { invoke } from '../lib/supabase'
import { payWithRazorpay, type RazorpayResult } from '../lib/razorpay'
import { navigate } from '../state/route'
import { useCart } from '../state/cart'
import { Arrow, BrandMark, Wordmark } from '../components/ui/Brand'
import Field from '../components/ui/Field'
import ProductArt from '../components/ui/ProductArt'

export interface Address {
  name: string
  phone: string
  email: string
  line1: string
  line2: string
  landmark: string
  city: string
  state: string
  pincode: string
  notes: string
}

const EMPTY: Address = { name: '', phone: '', email: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: '', notes: '' }
const ADDRESS_KEY = 'thapra-address'

/** The last address used on this device — there are no accounts, so this is the memory. */
function loadAddress(): Address {
  try {
    const raw = window.localStorage.getItem(ADDRESS_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Address>) } : EMPTY
  } catch {
    return EMPTY
  }
}

function validate(a: Address) {
  const e: Partial<Record<keyof Address, string>> = {}
  if (a.name.trim().length < 2) e.name = 'Please tell us who to deliver to.'
  if (!/^[6-9]\d{9}$/.test(a.phone.replace(/\s|-/g, ''))) e.phone = 'A 10-digit Indian mobile number.'
  if (a.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.email)) e.email = 'That email does not look right.'
  if (a.line1.trim().length < 6) e.line1 = 'House or flat number and street.'
  if (a.city.trim().length < 2) e.city = 'Which city or town?'
  if (!a.state) e.state = 'Pick your state.'
  if (!/^\d{6}$/.test(a.pincode.trim())) e.pincode = 'A 6-digit PIN code.'
  return e
}

interface PlacedOrder {
  orderNumber: string
  total: number
  name: string
  city: string
  paid: boolean
}

const PLACED_KEY = 'thapra-last-order'

function rememberOrder(o: PlacedOrder) {
  try {
    window.localStorage.setItem(PLACED_KEY, JSON.stringify(o))
  } catch {
    /* storage unavailable — the confirmation on screen still stands */
  }
}

function loadOrder(): PlacedOrder | null {
  try {
    const raw = window.localStorage.getItem(PLACED_KEY)
    return raw ? (JSON.parse(raw) as PlacedOrder) : null
  } catch {
    return null
  }
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-[100svh] bg-espresso">
      <header className="sticky top-0 z-20 border-b border-cream/[0.07] bg-espresso/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[76rem] items-center justify-between px-6 py-4 md:px-10">
          <a href="#top" onClick={() => navigate('')} className="flex items-center gap-3 text-cream" aria-label="Thapra — back to the story">
            <BrandMark className="h-8 w-8 text-gold" />
            <Wordmark />
          </a>
          <button type="button" onClick={() => navigate('')} className="eyebrow text-[0.58rem] text-cream/50 transition-colors hover:text-cream">
            ← Back to the story
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}

/** The order confirmation, after a payment has gone through. */
export function OrderPlaced({ orderId }: { orderId: string }) {
  const order = loadOrder()
  const shown = order && order.orderNumber === orderId ? order : null
  return (
    <CheckoutShell>
      <main className="mx-auto flex min-h-[70svh] max-w-[46rem] flex-col items-center justify-center px-6 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 text-3xl text-gold-soft">✓</span>
        <p className="eyebrow mt-8 text-gold">Order {orderId}</p>
        <h1 className="display mt-4 text-[clamp(3rem,8vw,5rem)]">
          Nandri.
          <span className="block italic text-gold-soft">Your coffee is on its way.</span>
        </h1>
        {shown ? (
          <p className="mt-6 max-w-md font-light leading-relaxed text-cream/70">
            {shown.paid ? `We have received ${inr.format(shown.total)}. ` : ''}
            {shown.name}, we will roast your order on Monday and send it to {shown.city}. A confirmation is on its way
            to your phone.
          </p>
        ) : (
          <p className="mt-6 max-w-md font-light leading-relaxed text-cream/70">
            Keep this order number safe — it is how we will find your order if you write to us.
          </p>
        )}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button type="button" className="btn-gold" onClick={() => navigate('')}>
            Back to the story <Arrow />
          </button>
        </div>
      </main>
    </CheckoutShell>
  )
}

type Stage = 'form' | 'working' | 'error'

/** Delivery details and payment — the end of the journey, in the same dress as the rest of it. */
export default function Checkout() {
  const { lines, subtotal, clear } = useCart()
  const [address, setAddress] = useState<Address>(loadAddress)
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({})
  const [stage, setStage] = useState<Stage>('form')
  const [failure, setFailure] = useState('')

  const shipping = shippingFor(subtotal)
  const total = subtotal + shipping
  const live = checkoutLive && Boolean(RAZORPAY_KEY_ID)
  const items = useMemo(() => lines.map((l) => ({ ...l, product: productById(l.id) })).filter((l) => l.product), [lines])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const set = (key: keyof Address) => (value: string) => {
    setAddress((a) => ({ ...a, [key]: value }))
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e))
  }

  const finish = (orderNumber: string, paid: boolean) => {
    rememberOrder({ orderNumber, total, name: address.name.split(' ')[0] || address.name, city: address.city, paid })
    try {
      window.localStorage.setItem(ADDRESS_KEY, JSON.stringify(address))
    } catch {
      /* storage unavailable — the address still reached the server */
    }
    clear()
    navigate(`order/${encodeURIComponent(orderNumber)}`)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validate(address)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      document.querySelector('[data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!live) {
      setFailure('Payment is not switched on yet, so nothing was charged and no order was placed.')
      setStage('error')
      return
    }
    setStage('working')
    setFailure('')
    try {
      // The server prices the basket itself and opens the payment — amounts are never trusted from here.
      const created = await invoke<{ orderNumber: string; razorpayOrderId: string; amount: number; currency: string; keyId: string }>(
        'create-order',
        { items: lines.map((l) => ({ id: l.id, qty: l.qty })), address },
      )
      await payWithRazorpay({
        keyId: created.keyId || RAZORPAY_KEY_ID,
        razorpayOrderId: created.razorpayOrderId,
        amount: created.amount,
        currency: created.currency,
        name: 'Thapra Coffee',
        description: `Order ${created.orderNumber}`,
        prefill: { name: address.name, email: address.email || undefined, contact: address.phone },
        notes: { order: created.orderNumber },
        onSuccess: async (result: RazorpayResult) => {
          try {
            await invoke<{ ok: true }>('verify-payment', { orderNumber: created.orderNumber, ...result })
            finish(created.orderNumber, true)
          } catch (err) {
            setFailure(
              `Your payment went through but we could not confirm it automatically. Keep payment id ${result.razorpay_payment_id} and write to us — ${(err as Error).message}`,
            )
            setStage('error')
          }
        },
        onDismiss: () => setStage('form'),
        onFailure: (message) => {
          setFailure(message)
          setStage('error')
        },
      })
    } catch (err) {
      setFailure((err as Error).message)
      setStage('error')
    }
  }

  if (items.length === 0) {
    return (
      <CheckoutShell>
        <main className="mx-auto flex min-h-[70svh] max-w-[40rem] flex-col items-center justify-center px-6 text-center">
          <h1 className="display text-[clamp(2.6rem,7vw,4rem)]">Your tumbler is empty.</h1>
          <p className="mt-4 font-light text-cream/60">Pick a coffee from the estate and come back.</p>
          <button type="button" className="btn-gold mt-8" onClick={() => navigate('')}>
            Choose a coffee <Arrow />
          </button>
        </main>
      </CheckoutShell>
    )
  }

  return (
    <CheckoutShell>
      <main className="mx-auto max-w-[76rem] px-6 pb-24 pt-10 md:px-10 md:pt-16">
        <p className="eyebrow text-gold">Checkout · Delivery</p>
        <h1 className="display mt-4 text-[clamp(2.8rem,7vw,4.6rem)] uppercase leading-[0.95]">
          Where should we
          <span className="block italic normal-case text-gold-soft">send your coffee?</span>
        </h1>
        <p className="mt-5 max-w-lg font-light text-cream/60">
          Roasted the Monday after you order, and on its way the same week. We deliver across India.
        </p>

        {!live && (
          <p className="mt-8 rounded-2xl border border-gold/30 bg-gold/[0.06] px-5 py-4 text-sm leading-relaxed text-gold-soft">
            <strong className="font-medium">Payment is not live yet.</strong> The address form below works, but no
            payment can be taken and no order will be placed until the Razorpay and Supabase keys are added.
          </p>
        )}

        <form onSubmit={submit} className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <fieldset disabled={stage === 'working'} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div data-field-error={errors.name ? '' : undefined}>
                  <Field label="Full name" value={address.name} onChange={set('name')} error={errors.name} autoComplete="name" placeholder="Priya Raman" />
                </div>
                <div data-field-error={errors.phone ? '' : undefined}>
                  <Field
                    label="Mobile number"
                    value={address.phone}
                    onChange={set('phone')}
                    error={errors.phone}
                    type="tel"
                    inputMode="tel"
                    maxLength={10}
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    hint="For delivery updates only."
                  />
                </div>
              </div>

              <Field
                label="Email"
                value={address.email}
                onChange={set('email')}
                error={errors.email}
                type="email"
                inputMode="email"
                autoComplete="email"
                optional
                placeholder="you@example.com"
                hint="For the receipt."
              />

              <div data-field-error={errors.line1 ? '' : undefined}>
                <Field
                  label="Flat, house no., building"
                  value={address.line1}
                  onChange={set('line1')}
                  error={errors.line1}
                  autoComplete="address-line1"
                  placeholder="12/4, Sunrise Apartments"
                />
              </div>

              <Field
                label="Area, street, sector"
                value={address.line2}
                onChange={set('line2')}
                autoComplete="address-line2"
                optional
                placeholder="Gandhi Nagar, 4th Cross"
              />

              <Field label="Landmark" value={address.landmark} onChange={set('landmark')} optional placeholder="Opposite the temple" />

              <div className="grid gap-6 sm:grid-cols-3">
                <div data-field-error={errors.city ? '' : undefined}>
                  <Field label="City / town" value={address.city} onChange={set('city')} error={errors.city} autoComplete="address-level2" placeholder="Coimbatore" />
                </div>
                <div data-field-error={errors.state ? '' : undefined}>
                  <Field label="State" value={address.state} onChange={set('state')} error={errors.state} options={INDIAN_STATES} />
                </div>
                <div data-field-error={errors.pincode ? '' : undefined}>
                  <Field
                    label="PIN code"
                    value={address.pincode}
                    onChange={(v) => set('pincode')(v.replace(/\D/g, ''))}
                    error={errors.pincode}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="postal-code"
                    placeholder="641001"
                  />
                </div>
              </div>

              <Field label="Delivery notes" value={address.notes} onChange={set('notes')} optional rows={3} maxLength={300} placeholder="Leave with the neighbour if we are out." />
            </fieldset>
          </div>

          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-[1.75rem] border border-cream/10 bg-roast/70 p-6 backdrop-blur-xl">
                <p className="eyebrow text-gold">Your order</p>
                <ul className="mt-5 divide-y divide-cream/[0.08]">
                  {items.map((line) => (
                    <li key={line.id} className="flex gap-4 py-4">
                      <div className="h-20 w-16 shrink-0 rounded-lg bg-bean/60 p-1.5">
                        <ProductArt product={line.product!} />
                      </div>
                      <div className="flex flex-1 items-start justify-between gap-3">
                        <div>
                          <p className="display text-xl leading-none">{line.product!.name}</p>
                          <p className="mt-1.5 text-xs text-cream/45">
                            {line.product!.weight} · {line.qty} × {inr.format(line.product!.price)}
                          </p>
                        </div>
                        <p className="font-display text-lg text-gold-soft">{inr.format(line.product!.price * line.qty)}</p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 space-y-2 border-t border-cream/10 pt-4 text-sm text-cream/70">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{inr.format(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'Free' : inr.format(shipping)}</span>
                  </div>
                  {shipping > 0 && (
                    <p className="text-xs text-sage">Add {inr.format(FREE_SHIPPING_ABOVE - subtotal)} more for free shipping.</p>
                  )}
                </div>

                <div className="mt-4 flex items-baseline justify-between border-t border-cream/10 pt-4">
                  <span className="eyebrow text-cream/60">Total</span>
                  <span className="display text-4xl text-gold-soft">{inr.format(total)}</span>
                </div>

                <button type="submit" className="btn-gold mt-6 w-full justify-center" disabled={stage === 'working'}>
                  {stage === 'working' ? 'Opening payment…' : (
                    <>
                      Pay {inr.format(total)} <Arrow />
                    </>
                  )}
                </button>

                {stage === 'error' && (
                  <p role="alert" className="mt-4 rounded-xl border border-red-400/40 bg-red-500/[0.08] px-4 py-3 text-xs leading-relaxed text-red-200">
                    {failure}
                  </p>
                )}

                <p className="mt-4 text-center text-[0.7rem] leading-relaxed text-cream/35">
                  Pay by UPI, card, net banking or wallet. Payments are handled by Razorpay — we never see your card.
                </p>
              </div>

              <ul className="mt-6 space-y-2 text-xs text-cream/45">
                <li>✦ Roasted to order, every Monday.</li>
                <li>✦ Free shipping above {inr.format(FREE_SHIPPING_ABOVE)}.</li>
                <li>✦ Questions? hello@thapracoffee.com</li>
              </ul>
            </div>
          </aside>
        </form>
      </main>
    </CheckoutShell>
  )
}
