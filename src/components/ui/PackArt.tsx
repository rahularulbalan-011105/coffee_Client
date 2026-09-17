import { useId } from 'react'

export interface PackTheme {
  body: string
  bodyDark: string
  foil: string
  ink: string
}

interface PackArtProps {
  theme: PackTheme
  name: string
  sub: string
  weight: string
  variant?: 'pouch' | 'tin'
  className?: string
}

/** Studio-lit packaging rendered as SVG — crisp at any size, zero image weight. */
export function PackArt({ theme, name, sub, weight, variant = 'pouch', className = '' }: PackArtProps) {
  const id = useId().replace(/:/g, '')
  const lines = name.split(' ')

  if (variant === 'tin') {
    return (
      <svg viewBox="0 0 240 320" className={className} role="img" aria-label={`${name} tin`}>
        <defs>
          <linearGradient id={`tb${id}`} x1="0" x2="1">
            <stop offset="0" stopColor={theme.bodyDark} />
            <stop offset="0.28" stopColor={theme.body} />
            <stop offset="0.5" stopColor={theme.body} stopOpacity="0.92" />
            <stop offset="0.78" stopColor={theme.bodyDark} />
            <stop offset="1" stopColor="#050302" />
          </linearGradient>
          <linearGradient id={`tf${id}`} x1="0" x2="1">
            <stop offset="0" stopColor="#6d4b1e" />
            <stop offset="0.3" stopColor="#f0d59b" />
            <stop offset="0.55" stopColor={theme.foil} />
            <stop offset="1" stopColor="#5a3c16" />
          </linearGradient>
          <radialGradient id={`ts${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="1" stopColor="#000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="120" cy="300" rx="92" ry="12" fill={`url(#ts${id})`} />
        <rect x="42" y="58" width="156" height="236" rx="10" fill={`url(#tb${id})`} />
        <rect x="38" y="44" width="164" height="30" rx="8" fill={`url(#tf${id})`} />
        <ellipse cx="120" cy="45" rx="82" ry="9" fill="#f5deaa" opacity="0.5" />
        <rect x="42" y="268" width="156" height="10" fill={`url(#tf${id})`} opacity="0.85" />
        <text x="120" y="118" textAnchor="middle" fill={theme.foil} fontFamily="Cormorant Garamond, serif" fontSize="22" letterSpacing="6">
          MANAM
        </text>
        <text x="120" y="136" textAnchor="middle" fill={theme.foil} opacity="0.75" fontSize="10">
          மணம்
        </text>
        <line x1="84" y1="150" x2="156" y2="150" stroke={theme.foil} strokeOpacity="0.5" />
        {lines.map((l, i) => (
          <text key={i} x="120" y={182 + i * 24} textAnchor="middle" fill={theme.ink} fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="23">
            {l}
          </text>
        ))}
        <text x="120" y="250" textAnchor="middle" fill={theme.ink} opacity="0.7" fontSize="7.5" letterSpacing="2.5" fontFamily="Manrope, sans-serif">
          {sub.toUpperCase()} · {weight}
        </text>
        <rect x="58" y="58" width="10" height="236" fill="#fff" opacity="0.07" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label={`${name} pouch`}>
      <defs>
        <linearGradient id={`pb${id}`} x1="0" x2="1" y1="0" y2="0.2">
          <stop offset="0" stopColor={theme.bodyDark} />
          <stop offset="0.35" stopColor={theme.body} />
          <stop offset="0.7" stopColor={theme.bodyDark} />
          <stop offset="1" stopColor="#060403" />
        </linearGradient>
        <linearGradient id={`pf${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6d4b1e" />
          <stop offset="0.35" stopColor="#f3dca8" />
          <stop offset="0.6" stopColor={theme.foil} />
          <stop offset="1" stopColor="#5a3c16" />
        </linearGradient>
        <linearGradient id={`pg${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`ps${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="302" rx="96" ry="12" fill={`url(#ps${id})`} />
      {/* Pouch silhouette with crimped top and soft gusset */}
      <path d="M48 36 h144 l4 14 -2 6 c6 70 10 150 8 236 q-1 8 -9 9 H57 q-8 -1 -9 -9 c-2 -86 2 -166 8 -236 l-2 -6z" fill={`url(#pb${id})`} />
      <path d="M48 36 h144 l4 14 H44z" fill={`url(#pf${id})`} />
      {Array.from({ length: 24 }, (_, i) => (
        <line key={i} x1={52 + i * 6} y1="38" x2={52 + i * 6} y2="48" stroke="#3a2710" strokeOpacity="0.35" />
      ))}
      <path d="M48 36 h144 l4 14 -2 6 c6 70 10 150 8 236 q-1 8 -9 9 H57 q-8 -1 -9 -9 c-2 -86 2 -166 8 -236 l-2 -6z" fill={`url(#pg${id})`} />
      {/* Label */}
      <rect x="68" y="92" width="104" height="164" rx="3" fill="none" stroke={theme.foil} strokeOpacity="0.55" />
      <text x="120" y="120" textAnchor="middle" fill={theme.foil} fontFamily="Cormorant Garamond, serif" fontSize="19" letterSpacing="5">
        MANAM
      </text>
      <text x="120" y="136" textAnchor="middle" fill={theme.foil} opacity="0.75" fontSize="9">
        மணம்
      </text>
      {/* Dabara + tumbler line drawing */}
      <g stroke={theme.foil} strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.9">
        <path d="M106 150 h16 l-2.2 24 a2 2 0 0 1 -2 1.8 h-7.6 a2 2 0 0 1 -2 -1.8z" />
        <path d="M96 170 c3 8 12 11 24 11 s21 -3 24 -11" />
        <path d="M111 146 c-1 -2 1 -3 0 -5 M117 146 c-1 -2 1 -3 0 -5" opacity="0.6" />
      </g>
      {lines.map((l, i) => (
        <text key={i} x="120" y={206 + i * 20} textAnchor="middle" fill={theme.ink} fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize="19">
          {l}
        </text>
      ))}
      <text x="120" y="246" textAnchor="middle" fill={theme.ink} opacity="0.7" fontSize="6.5" letterSpacing="2.2" fontFamily="Manrope, sans-serif">
        {sub.toUpperCase()} · {weight}
      </text>
    </svg>
  )
}

/** Brass dabara-tumbler set illustration for the gift card. */
export function BrassSetArt({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label="Brass dabara and tumbler set">
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#4a3112" />
          <stop offset="0.22" stopColor="#c99a4c" />
          <stop offset="0.38" stopColor="#f6e0ab" />
          <stop offset="0.55" stopColor="#b8873d" />
          <stop offset="0.85" stopColor="#5e3f17" />
          <stop offset="1" stopColor="#2c1c0a" />
        </linearGradient>
        <radialGradient id={`c${id}`} cx="0.45" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#f1dcbc" />
          <stop offset="0.6" stopColor="#c89a68" />
          <stop offset="1" stopColor="#7a4d27" />
        </radialGradient>
        <radialGradient id={`s${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="286" rx="104" ry="14" fill={`url(#s${id})`} />
      {/* Dabara — back half first, so the tumbler sits inside it */}
      <ellipse cx="120" cy="226" rx="100" ry="16" fill="#2b1a0b" />
      <path d="M20 226 a100 16 0 0 1 200 0" fill="none" stroke="#f3d99f" strokeWidth="3" />
      {/* Tumbler */}
      <path d="M80 92 h80 l-10 176 q-1 8 -9 8 h-42 q-8 0 -9 -8z" fill={`url(#b${id})`} />
      <ellipse cx="120" cy="92" rx="40" ry="8" fill={`url(#c${id})`} />
      <ellipse cx="120" cy="92" rx="40" ry="8" fill="none" stroke="#f6e0ab" strokeWidth="2.5" />
      <path d="M84 120 h72 M88 250 h64" stroke="#3a260e" strokeOpacity="0.45" />
      <rect x="92" y="96" width="7" height="170" fill="#fff" opacity="0.12" />
      {/* Dabara front */}
      <path d="M20 226 a100 16 0 0 0 200 0 q-4 52 -100 56 q-96 -4 -100 -56z" fill={`url(#b${id})`} />
      <path d="M20 226 a100 16 0 0 0 200 0" fill="none" stroke="#f3d99f" strokeWidth="3" />
      <g stroke="#f1e4d0" strokeOpacity="0.45" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M110 76 c-5 -8 5 -12 0 -22 s5 -12 0 -20" />
        <path d="M128 78 c-5 -8 5 -12 0 -22 s5 -12 0 -18" />
      </g>
    </svg>
  )
}

/** Two-tier South Indian filter in brushed steel. */
export function FilterArt({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label="Stainless steel South Indian filter">
      <defs>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#3c3e40" />
          <stop offset="0.25" stopColor="#c9ccce" />
          <stop offset="0.4" stopColor="#f3f4f4" />
          <stop offset="0.6" stopColor="#9a9da0" />
          <stop offset="1" stopColor="#2b2c2e" />
        </linearGradient>
        <radialGradient id={`h${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.6" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="292" rx="80" ry="11" fill={`url(#h${id})`} />
      <path d="M62 170 h116 v112 q0 8 -8 8 h-100 q-8 0 -8 -8z" fill={`url(#s${id})`} />
      <rect x="58" y="164" width="124" height="10" rx="4" fill={`url(#s${id})`} />
      <path d="M68 92 h104 v74 h-104z" fill={`url(#s${id})`} />
      <rect x="62" y="84" width="116" height="10" rx="4" fill={`url(#s${id})`} />
      <path d="M64 84 q56 -40 112 0z" fill={`url(#s${id})`} />
      <rect x="112" y="52" width="16" height="14" rx="4" fill="#c9a35b" />
      <rect x="62" y="228" width="116" height="3" fill="#c9a35b" opacity="0.8" />
    </svg>
  )
}
