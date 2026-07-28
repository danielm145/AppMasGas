/**
 * Marca MWC dibujada en SVG — el logotipo del parque es "MWC" en itálica con
 * una ola; esta es una reproducción vectorial limpia para la interfaz.
 * Sin emojis: toda la iconografía de la app sale de aquí o de lucide.
 */

export function LogoMark({ className, color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 64 40" className={className} fill="none" aria-hidden>
      {/* MWC en itálica pesada */}
      <text
        x="0"
        y="27"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="900"
        fontStyle="italic"
        fontSize="26"
        letterSpacing="-1.5"
        fill={color}
      >
        MWC
      </text>
      {/* Ola bajo la marca */}
      <path
        d="M2 33c6-5 10-5 16 0s10 5 16 0 10-5 16 0 8 4 12 1"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

export function LogoLockup({ className, inverted }: { className?: string; inverted?: boolean }) {
  const ink = inverted ? '#ffffff' : '#0d1f33';
  const sub = inverted ? 'rgba(255,255,255,0.75)' : '#0891b2';
  return (
    <svg viewBox="0 0 210 40" className={className} fill="none" role="img" aria-label="Miami Watersports Complex">
      <text x="0" y="26" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontStyle="italic" fontSize="25" letterSpacing="-1.5" fill={ink}>
        MWC
      </text>
      <path d="M2 32c5-4 9-4 14 0s9 4 14 0 9-4 14 0" stroke={sub} strokeWidth="2.4" strokeLinecap="round" />
      <text x="66" y="16" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="11" letterSpacing="0.6" fill={ink}>
        MIAMI WATERSPORTS
      </text>
      <text x="66" y="30" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="11" letterSpacing="3.2" fill={sub}>
        COMPLEX
      </text>
    </svg>
  );
}
