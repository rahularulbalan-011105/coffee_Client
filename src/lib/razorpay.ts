const SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

export interface RazorpayResult {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface OpenOptions {
  keyId: string
  razorpayOrderId: string
  amount: number
  currency: string
  name: string
  description: string
  prefill: { name: string; email?: string; contact: string }
  notes?: Record<string, string>
  onSuccess: (result: RazorpayResult) => void
  onDismiss: () => void
  onFailure: (message: string) => void
}

interface RazorpayInstance {
  open: () => void
  on: (event: string, handler: (payload: { error?: { description?: string; reason?: string } }) => void) => void
}

type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance

let loading: Promise<RazorpayCtor> | null = null

/** Loads Razorpay's hosted checkout once, on demand. */
function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor }
  if (w.Razorpay) return Promise.resolve(w.Razorpay)
  if (loading) return loading
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SCRIPT
    el.async = true
    el.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay checkout did not load')))
    el.onerror = () => {
      loading = null
      reject(new Error('Could not reach Razorpay. Check your connection and try again.'))
    }
    document.head.appendChild(el)
  })
  return loading
}

/** Opens Razorpay's payment sheet (cards, UPI, net banking, wallets). */
export async function payWithRazorpay(o: OpenOptions) {
  const Razorpay = await loadCheckout()
  const checkout = new Razorpay({
    key: o.keyId,
    order_id: o.razorpayOrderId,
    amount: o.amount,
    currency: o.currency,
    name: o.name,
    description: o.description,
    image: `${window.location.origin}${import.meta.env.BASE_URL}favicon.svg`,
    prefill: o.prefill,
    notes: o.notes,
    theme: { color: '#c9a35b', backdrop_color: '#0b0705' },
    handler: (result: RazorpayResult) => o.onSuccess(result),
    modal: { ondismiss: () => o.onDismiss(), escape: true, backdropclose: false },
  })
  checkout.on('payment.failed', (payload) => {
    o.onFailure(payload.error?.description ?? 'The payment could not be completed.')
  })
  checkout.open()
}
