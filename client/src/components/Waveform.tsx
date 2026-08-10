import { useAudioLevel } from '@/hooks/useAudioLevel'

export default function Waveform({ stream }: { stream: MediaStream | null }) {
  const history = useAudioLevel(stream)

  return (
    <div className="flex items-center justify-center gap-1 h-12">
      {history.map((level, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full bg-[linear-gradient(180deg,var(--gradient-from),var(--gradient-to))] transition-[height] duration-75"
          style={{ height: `${4 + level * 40}px` }}
        />
      ))}
    </div>
  )
}
