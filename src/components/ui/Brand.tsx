interface BrandMarkProps {
  className?: string
}

/** Monogram: a tumbler inside a dabara ring. */
export function BrandMark({ className = 'h-8 w-8' }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="18.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <path d="M8.5 25.5c2.4 3.2 6.8 5.2 11.5 5.2s9.1-2 11.5-5.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M14.8 11.2h10.4l-1.6 15.2a1.4 1.4 0 0 1-1.4 1.2h-4.4a1.4 1.4 0 0 1-1.4-1.2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M14.2 10.8h11.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M18.4 8.2c-.6-1 .6-1.8 0-2.8M21.6 8.2c-.6-1 .6-1.8 0-2.8" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-display text-[1.3rem] font-medium leading-none tracking-[0.28em] sm:text-[1.45rem] sm:tracking-[0.34em]">MANAM</span>
      <span lang="ta" className="hidden text-[0.7rem] leading-none tracking-normal text-gold/80 sm:inline">மணம்</span>
    </span>
  )
}

export function Arrow({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
