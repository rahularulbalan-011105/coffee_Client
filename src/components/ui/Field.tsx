import { useId, type ReactNode } from 'react'

interface FieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  type?: 'text' | 'tel' | 'email'
  placeholder?: string
  autoComplete?: string
  maxLength?: number
  inputMode?: 'text' | 'tel' | 'email' | 'numeric'
  optional?: boolean
  className?: string
  /** Renders a <select> with these options instead of a text input. */
  options?: string[]
  rows?: number
}

const shell = (error?: string) =>
  `w-full rounded-xl border bg-bean/50 px-4 py-3 text-[0.95rem] text-cream transition-colors duration-300 placeholder:text-cream/25 focus:outline-none ${
    error ? 'border-red-400/60 focus:border-red-300' : 'border-cream/12 hover:border-cream/25 focus:border-gold/70'
  }`

/** One labelled field, in the brand's dark-and-gold dress. */
export default function Field({
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  placeholder,
  autoComplete,
  maxLength,
  inputMode,
  optional,
  className = '',
  options,
  rows,
}: FieldProps) {
  const id = useId()
  let control: ReactNode
  if (options) {
    control = (
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${shell(error)} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23c9a35b%22 stroke-width=%221.4%22><path d=%22M3 6l5 5 5-5%22/></svg>')] bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10`}
      >
        <option value="">Select a state</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-roast">
            {o}
          </option>
        ))}
      </select>
    )
  } else if (rows) {
    control = (
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${shell(error)} resize-none`}
      />
    )
  } else {
    control = (
      <input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={shell(error)}
      />
    )
  }

  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow flex items-baseline gap-2 text-[0.55rem] text-cream/60">
        {label}
        {optional && <span className="tracking-normal text-cream/30 normal-case">optional</span>}
      </label>
      <div className="mt-2">{control}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-300/90">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-cream/35">{hint}</p>
      ) : null}
    </div>
  )
}
