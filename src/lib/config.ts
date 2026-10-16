/**
 * Checkout configuration. Everything here comes from build-time environment variables
 * (see `.env.example`). With nothing set the site still runs: checkout then clearly
 * states that payment is not live yet instead of pretending an order was taken.
 */

const env = import.meta.env

export const SUPABASE_URL = (env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/** Razorpay's public key id (`rzp_test_…` / `rzp_live_…`). The secret never leaves the server. */
export const RAZORPAY_KEY_ID = (env.VITE_RAZORPAY_KEY_ID as string | undefined) ?? ''

/** True once the Supabase functions that take orders are reachable. */
export const checkoutLive = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const SHIPPING_FLAT = 60
export const FREE_SHIPPING_ABOVE = 999

export const shippingFor = (subtotal: number) => (subtotal === 0 || subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT)
