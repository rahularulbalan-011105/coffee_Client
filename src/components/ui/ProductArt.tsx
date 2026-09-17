import type { Product } from '../../data/products'
import { BrassSetArt, FilterArt, PackArt } from './PackArt'

export default function ProductArt({ product, className = 'h-full w-full' }: { product: Product; className?: string }) {
  const art = product.art
  if (art.kind === 'brass') return <BrassSetArt className={className} />
  if (art.kind === 'filter') return <FilterArt className={className} />
  return <PackArt theme={art.theme} name={product.name} sub={art.sub} weight={product.weight} variant={art.kind} className={className} />
}
