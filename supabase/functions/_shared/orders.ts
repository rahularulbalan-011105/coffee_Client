/** Shared bits for the checkout functions: prices, CORS and the Supabase REST helper. */

/**
 * Prices in rupees, kept on the server so a tampered browser cannot set its own total.
 * Keep in step with `src/data/products.ts`.
 */
export const PRICES: Record<string, { name: string; price: number }> = {
  'filter-coffee': { name: 'Filter Coffee', price: 349 },
  'estate-blend': { name: 'Premium Estate Blend', price: 499 },
  'chikmagalur-reserve': { name: 'Chikmagalur Reserve', price: 749 },
  'monsooned-malabar': { name: 'Monsooned Malabar', price: 579 },
  'brass-set': { name: 'Brass Dabara Set', price: 2450 },
  'brass-filter': { name: 'Traditional Filter', price: 890 },
  'estate-gift': { name: 'Estate Gift Tin', price: 1290 },
}

export const SHIPPING_FLAT = 60
export const FREE_SHIPPING_ABOVE = 999

export const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } })

/** A short, readable order number: THP-4KQ7X2. */
export function orderNumber() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `THP-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Minimal PostgREST call with the service-role key (bypasses row-level security). */
export async function db<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      'content-type': 'application/json',
      ...(init.prefer ? { prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`database error: ${text.slice(0, 300)}`)
  return (text ? JSON.parse(text) : null) as T
}

export const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
export const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''
export const razorpayAuth = () => `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`
