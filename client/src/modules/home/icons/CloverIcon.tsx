// 原创的"凯尔特人绿"三叶草风格图标，不是官方队标的描摹，纯粹是配色+三叶草元素的致敬。
const GREEN = '#0C7C3E'
const GREEN_LIGHT = '#4CAF6E'
const CREAM = '#F2EFD8'

function ClassicClover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="32" r="18" fill={GREEN} stroke={GREEN_LIGHT} strokeWidth="1.5" />
      <circle cx="32" cy="56" r="18" fill={GREEN} stroke={GREEN_LIGHT} strokeWidth="1.5" />
      <circle cx="68" cy="56" r="18" fill={GREEN} stroke={GREEN_LIGHT} strokeWidth="1.5" />
      <path d="M50 64 L50 92" stroke={GREEN} strokeWidth="6" strokeLinecap="round" />
    </svg>
  )
}

function BadgeClover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" fill="none" stroke={GREEN} strokeWidth="3" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={CREAM} strokeWidth="1" strokeDasharray="2 3" />
      <g transform="translate(0,4)">
        <circle cx="50" cy="32" r="13" fill={GREEN} />
        <circle cx="36" cy="50" r="13" fill={GREEN} />
        <circle cx="64" cy="50" r="13" fill={GREEN} />
        <path d="M50 56 L50 75" stroke={GREEN} strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

function FourLeafClover({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="30" r="16" fill={GREEN_LIGHT} stroke={GREEN} strokeWidth="1.5" />
      <circle cx="50" cy="70" r="16" fill={GREEN_LIGHT} stroke={GREEN} strokeWidth="1.5" />
      <circle cx="30" cy="50" r="16" fill={GREEN_LIGHT} stroke={GREEN} strokeWidth="1.5" />
      <circle cx="70" cy="50" r="16" fill={GREEN_LIGHT} stroke={GREEN} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="8" fill={GREEN} />
    </svg>
  )
}

export default function CloverIcon({ variant = 1, className }: { variant?: 1 | 2 | 3; className?: string }) {
  if (variant === 2) return <BadgeClover className={className} />
  if (variant === 3) return <FourLeafClover className={className} />
  return <ClassicClover className={className} />
}
