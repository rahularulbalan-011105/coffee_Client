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

/** Engraved band: dotted rows around a zigzag, as on traditional brassware. */
function EngravedBand({ x0, x1, y, id }: { x0: number; x1: number; y: number; id: string }) {
  const teeth = Math.round((x1 - x0) / 9)
  const step = (x1 - x0) / teeth
  const zig = Array.from({ length: teeth + 1 }, (_, i) => `${x0 + i * step},${y + (i % 2 ? -3.2 : 3.2)}`).join(' ')
  const dots = (yy: number) =>
    Array.from({ length: Math.round((x1 - x0) / 5) }, (_, i) => <circle key={`${yy}-${i}`} cx={x0 + 2.5 + i * 5} cy={yy} r="0.9" />)
  return (
    <g fill={`url(#e${id})`} stroke={`url(#e${id})`}>
      {dots(y - 8)}
      <polyline points={zig} fill="none" strokeWidth="1.1" />
      {dots(y + 8)}
    </g>
  )
}

/** Brass dabara-tumbler set illustration for the gift card. */
export function BrassSetArt({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 240 320" className={className} role="img" aria-label="Engraved brass dabara and tumbler set">
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#8a6428" />
          <stop offset="0.2" stopColor="#d9b56b" />
          <stop offset="0.42" stopColor="#f3dca4" />
          <stop offset="0.62" stopColor="#d2a95c" />
          <stop offset="0.88" stopColor="#9a7132" />
          <stop offset="1" stopColor="#6d4c1e" />
        </linearGradient>
        <linearGradient id={`i${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#b38a45" />
          <stop offset="0.5" stopColor="#e9cf93" />
          <stop offset="1" stopColor="#8e6a2e" />
        </linearGradient>
        <linearGradient id={`e${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#5a3e14" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#7a5520" stopOpacity="0.8" />
          <stop offset="1" stopColor="#4a3210" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`s${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="268" rx="112" ry="12" fill={`url(#s${id})`} />

      {/* Dabara: deep straight wall, flat flared rim */}
      <path d="M22 196 L26 258 Q27 266 36 266 L100 266 Q109 266 110 258 L114 196 Z" fill={`url(#b${id})`} />
      <EngravedBand x0={25} x1={111} y={226} id={id} />
      <ellipse cx="68" cy="194" rx="60" ry="10" fill={`url(#i${id})`} />
      <ellipse cx="68" cy="194" rx="46" ry="6.5" fill="#6d4c1e" opacity="0.55" />
      <path d="M8 194 a60 10 0 0 0 120 0" fill="none" stroke="#f6e3b4" strokeWidth="2" />

      {/* Tumbler: tapered, flared lip */}
      <path d="M140 128 L150 256 Q151 264 160 264 L204 264 Q213 264 214 256 L224 128 Z" fill={`url(#b${id})`} />
      <EngravedBand x0={143} x1={221} y={168} id={id} />
      <ellipse cx="182" cy="126" rx="48" ry="8" fill={`url(#i${id})`} />
      <ellipse cx="182" cy="127" rx="38" ry="5.2" fill="#6d4c1e" opacity="0.55" />
      <path d="M134 126 a48 8 0 0 0 96 0" fill="none" stroke="#f6e3b4" strokeWidth="2" />
      <rect x="152" y="134" width="6" height="126" fill="#fff" opacity="0.14" />
      <g stroke="#f1e4d0" strokeOpacity="0.4" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M172 112 c-5 -8 5 -12 0 -22 s5 -12 0 -20" />
        <path d="M190 114 c-5 -8 5 -12 0 -22 s5 -12 0 -18" />
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
