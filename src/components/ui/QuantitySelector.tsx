interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  size?: 'sm' | 'md'
}

export default function QuantitySelector({ value, onChange, min = 1, max = 20, label, size = 'md' }: QuantitySelectorProps) {
  const box = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  return (
    <div
      className={`inline-flex items-center rounded-full border border-cream/20 ${size === 'sm' ? 'h-8' : 'h-10'}`}
      role="group"
      aria-label={`Quantity for ${label}`}
    >
      <button
        type="button"
        className={`${box} rounded-full text-lg leading-none text-cream/70 transition-colors hover:text-gold-soft disabled:opacity-30`}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={`${box} rounded-full text-lg leading-none text-cream/70 transition-colors hover:text-gold-soft disabled:opacity-30`}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
