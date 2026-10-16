// Prices the basket, stores the delivery address and the order, and opens a Razorpay order.
// Deploy: supabase functions deploy create-order --no-verify-jwt
import {
  CORS,
  db,
  FREE_SHIPPING_ABOVE,
  json,
  orderNumber,
  PRICES,
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  razorpayAuth,
  SHIPPING_FLAT,
} from '../_shared/orders.ts'

interface Item {
  id: string
  qty: number
}

interface Address {
  name: string
  phone: string
  email?: string
  line1: string
  line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  notes?: string
}

const clean = (v: unknown, max = 200) => String(v ?? '').trim().slice(0, max)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) return json({ error: 'Payments are not configured yet.' }, 503)

  try {
    const body = (await req.json()) as { items?: Item[]; address?: Address }
    const items = (body.items ?? []).filter((i) => PRICES[i.id] && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20)
    if (items.length === 0) return json({ error: 'Your basket is empty.' }, 400)

    const a = body.address ?? ({} as Address)
    const address = {
      name: clean(a.name, 80),
      phone: clean(a.phone, 20).replace(/\s|-/g, ''),
      email: clean(a.email, 120) || null,
      line1: clean(a.line1),
      line2: clean(a.line2) || null,
      landmark: clean(a.landmark) || null,
      city: clean(a.city, 80),
      state: clean(a.state, 60),
      pincode: clean(a.pincode, 6),
      notes: clean(a.notes, 300) || null,
    }
    if (!address.name || !/^[6-9]\d{9}$/.test(address.phone) || !address.line1 || !address.city || !address.state || !/^\d{6}$/.test(address.pincode)) {
      return json({ error: 'That delivery address looks incomplete.' }, 400)
    }

    // Price the basket here — never from the browser.
    const lines = items.map((i) => ({ id: i.id, name: PRICES[i.id].name, qty: i.qty, price: PRICES[i.id].price }))
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0)
    const shipping = subtotal >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FLAT
    const total = subtotal + shipping
    const number = orderNumber()

    const [saved] = await db<{ id: string }[]>('addresses', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify(address),
    })

    const [order] = await db<{ id: string }[]>('orders', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        order_number: number,
        address_id: saved.id,
        items: lines,
        subtotal,
        shipping,
        total,
        status: 'pending',
      }),
    })

    const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { authorization: razorpayAuth(), 'content-type': 'application/json' },
      body: JSON.stringify({
        amount: total * 100, // paise
        currency: 'INR',
        receipt: number,
        notes: { order: number, city: address.city },
      }),
    })
    const rp = (await rpRes.json()) as { id?: string; amount?: number; currency?: string; error?: { description?: string } }
    if (!rpRes.ok || !rp.id) return json({ error: rp.error?.description ?? 'Could not start the payment.' }, 502)

    await db(`orders?id=eq.${order.id}`, { method: 'PATCH', body: JSON.stringify({ razorpay_order_id: rp.id }) })

    return json({
      orderNumber: number,
      razorpayOrderId: rp.id,
      amount: rp.amount ?? total * 100,
      currency: rp.currency ?? 'INR',
      keyId: RAZORPAY_KEY_ID,
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'Something went wrong starting your order. Please try again.' }, 500)
  }
})
