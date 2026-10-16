import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config'

/**
 * Calls a Supabase Edge Function. Those functions hold the Razorpay secret and the
 * service-role key, so prices are worked out and orders are written server-side — the
 * browser only ever says which coffees and where to send them.
 */
export async function invoke<T>(fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `${fn} failed (${res.status})`
    throw new Error(message)
  }
  return data as T
}
