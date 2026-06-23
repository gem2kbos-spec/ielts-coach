export default function TennisIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* 球拍 */}
      <g stroke="#9CCC3C" strokeWidth="2.5" strokeLinecap="round">
        <path d="M30 100 L45 72" />
        <ellipse cx="55" cy="48" rx="26" ry="32" transform="rotate(-18 55 48)" />
        <path d="M38 35 L72 61" />
        <path d="M44 28 L78 55" />
        <path d="M50 22 L82 50" />
        <path d="M68 24 L40 60" />
        <path d="M75 30 L46 65" />
        <path d="M80 38 L51 70" />
      </g>
      <rect x="22" y="96" width="10" height="16" rx="4" transform="rotate(-30 27 104)" fill="#9CCC3C" />
      {/* 网球 */}
      <circle cx="86" cy="32" r="17" fill="#D7F205" stroke="#7A9E00" strokeWidth="2" />
      <path
        d="M71 24 Q86 30 86 32 Q86 34 101 40"
        stroke="#7A9E00"
        strokeWidth="1.8"
        fill="none"
      />
      <path
        d="M71 40 Q86 34 86 32 Q86 30 101 24"
        stroke="#7A9E00"
        strokeWidth="1.8"
        fill="none"
      />
    </svg>
  )
}
