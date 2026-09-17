import type { PackTheme } from '../components/ui/PackArt'

export interface Product {
  id: string
  name: string
  tagline: string
  description: string
  weight: string
  price: number
  notes: string[]
  art: { kind: 'pouch' | 'tin'; theme: PackTheme; sub: string } | { kind: 'brass' } | { kind: 'filter' }
  badge?: string
}

/** The three coffees offered at the end of the journey. Prices are placeholders. */
export const ORDER_PRODUCTS: Product[] = [
  {
    id: 'filter-coffee',
    name: 'Filter Coffee',
    tagline: 'The everyday classic',
    description: 'Plantation A and robusta with 20% chicory — thick, bold decoction, made for milk.',
    weight: '250 g',
    price: 349,
    notes: ['Dark jaggery', 'Toasted almond'],
    art: { kind: 'pouch', sub: 'Coffee & chicory 80:20', theme: { body: '#3a1f12', bodyDark: '#140a05', foil: '#e0bf7d', ink: '#efe4d2' } },
    badge: 'Bestseller',
  },
  {
    id: 'estate-blend',
    name: 'Premium Estate Blend',
    tagline: 'Pure coffee, no chicory',
    description: 'Shade-grown arabica from our Chikmagalur estates, roasted medium-dark for a rounder cup.',
    weight: '250 g',
    price: 499,
    notes: ['Cocoa', 'Wild honey'],
    art: { kind: 'pouch', sub: '100% arabica', theme: { body: '#2c3f31', bodyDark: '#0e1611', foil: '#d8b774', ink: '#efe4d2' } },
  },
  {
    id: 'chikmagalur-reserve',
    name: 'Chikmagalur Reserve',
    tagline: 'Single-estate peaberry',
    description: 'Hand-sorted peaberries from the Baba Budan Giri slopes. Small lots, roasted to order.',
    weight: '200 g',
    price: 749,
    notes: ['Stone fruit', 'Cacao nib'],
    art: { kind: 'tin', sub: 'Single estate peaberry', theme: { body: '#e9dcc6', bodyDark: '#a8957a', foil: '#9c7234', ink: '#2a180d' } },
    badge: 'Limited',
  },
]

/** The wider collection shown after the story. */
export const COLLECTION: Product[] = [
  {
    id: 'monsooned-malabar',
    name: 'Monsooned Malabar',
    tagline: 'Monsoon-aged arabica',
    description: 'Rested through the monsoon winds on the Malabar coast. Earthy, mellow, low acidity.',
    weight: '250 g',
    price: 579,
    notes: ['Warm spice', 'Cedar'],
    art: { kind: 'pouch', sub: 'Monsoon-aged arabica', theme: { body: '#4a3a24', bodyDark: '#1a130a', foil: '#e0c285', ink: '#efe4d2' } },
  },
  {
    id: 'brass-set',
    name: 'Brass Dabara Set',
    tagline: 'Hand-beaten brass',
    description: 'A tumbler and dabara hand-beaten by artisans — the vessel the whole journey ends in.',
    weight: 'Set of 2',
    price: 2450,
    notes: ['Tin-lined', 'Heirloom'],
    art: { kind: 'brass' },
    badge: 'Heirloom',
  },
  {
    id: 'brass-filter',
    name: 'Traditional Filter',
    tagline: 'Engraved brass, two-tier',
    description: 'The classic South Indian filter with pressing disc and lid, engraved to match the dabara set.',
    weight: '4 cups',
    price: 890,
    notes: ['Tin-lined brass'],
    art: { kind: 'filter' },
  },
  {
    id: 'estate-gift',
    name: 'Estate Gift Tin',
    tagline: 'Two coffees, one ritual',
    description: 'Estate Blend and Reserve in a keepsake tin, with a brewing card in English and Tamil.',
    weight: '2 × 200 g',
    price: 1290,
    notes: ['Gift wrapped'],
    art: { kind: 'tin', sub: 'Estate gift collection', theme: { body: '#1f3526', bodyDark: '#0a130d', foil: '#e0c285', ink: '#efe4d2' } },
  },
]

export const ALL_PRODUCTS = [...ORDER_PRODUCTS, ...COLLECTION]
export const productById = (id: string) => ALL_PRODUCTS.find((p) => p.id === id)

export const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
