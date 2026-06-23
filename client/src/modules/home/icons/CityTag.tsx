export default function CityTag({
  letters,
  color,
  className,
}: {
  letters: string
  color: string
  className?: string
}) {
  return (
    <div
      className={`font-black italic leading-none select-none ${className || ''}`}
      style={{
        color,
        fontSize: '3.2rem',
        letterSpacing: '-0.02em',
      }}
    >
      {letters}
    </div>
  )
}
