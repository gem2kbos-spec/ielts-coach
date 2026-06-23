export default function BasketballIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="38" fill="#E8742C" stroke="#3A2110" strokeWidth="2.5" />
      <path d="M50 12 L50 88" stroke="#3A2110" strokeWidth="2.2" />
      <path d="M12 50 L88 50" stroke="#3A2110" strokeWidth="2.2" />
      <path d="M16 28 Q50 50 16 72" stroke="#3A2110" strokeWidth="2.2" fill="none" />
      <path d="M84 28 Q50 50 84 72" stroke="#3A2110" strokeWidth="2.2" fill="none" />
    </svg>
  )
}
