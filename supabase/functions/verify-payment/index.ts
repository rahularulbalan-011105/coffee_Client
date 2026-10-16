// Confirms a Razorpay payment by checking its signature, then marks the order paid.
// Deploy: supabase functions deploy verify-payment --no-verify-jwt
import { CORS, db, json, RAZORPAY_KEY_SECRET } from '../_shared/orders.ts'

/** Razorpay signs `order_id|payment_id` with the key secret. */
async function signatureFor(payload: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(RAZORPAY_KEY_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time compare, so a wrong signature cannot be guessed byte by byte. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!RAZORPAY_KEY_SECRET) return json({ error: 'Payments are not configured yet.' }, 503)

  try {
    const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = (await req.json()) as Record<string, string>
    if (!orderNumber || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: 'Missing payment details.' }, 400)
    }

    const expected = await signatureFor(`${razorpay_order_id}|${razorpay_payment_id}`)
    if (!same(expected, razorpay_signature)) {
      await db(`orders?order_number=eq.${orderNumber}`, { method: 'PATCH', body: JSON.stringify({ status: 'failed' }) })
      return json({ error: 'That payment could not be verified.' }, 400)
    }

    const updated = await db<{ order_number: string }[]>(
      `orders?order_number=eq.${orderNumber}&razorpay_order_id=eq.${razorpay_order_id}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: JSON.stringify({ status: 'paid', razorpay_payment_id, paid_at: new Date().toISOString() }),
      },
    )
    if (!updated || updated.length === 0) return json({ error: 'That order could not be found.' }, 404)

    return json({ ok: true, orderNumber })
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not confirm the payment.' }, 500)
  }
})
