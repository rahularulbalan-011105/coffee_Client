import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { productById } from '../data/products'

interface CartLine {
  id: string
  qty: number
}

interface CartValue {
  lines: CartLine[]
  count: number
  subtotal: number
  open: boolean
  setOpen: (open: boolean) => void
  add: (id: string, qty?: number) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
}

const CartContext = createContext<CartValue | null>(null)
const STORAGE_KEY = 'manam-cart'

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : []
    return parsed.filter((l) => productById(l.id) && l.qty > 0)
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* storage unavailable — cart still works for this visit */
    }
  }, [lines])

  const add = useCallback((id: string, qty = 1) => {
    setLines((prev) => {
      const hit = prev.find((l) => l.id === id)
      if (hit) return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(20, l.qty + qty) } : l))
      return [...prev, { id, qty: Math.min(20, qty) }]
    })
  }, [])

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(20, qty) } : l))))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const value = useMemo<CartValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0)
    const subtotal = lines.reduce((n, l) => n + (productById(l.id)?.price ?? 0) * l.qty, 0)
    return { lines, count, subtotal, open, setOpen, add, setQty, clear }
  }, [lines, open, add, setQty, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
