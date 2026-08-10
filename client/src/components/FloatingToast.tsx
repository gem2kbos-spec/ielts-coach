import { CheckCircle2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function FloatingToast({
  message,
  tone = 'default',
  className,
}: {
  message: string
  tone?: 'default' | 'success'
  className?: string
}) {
  const Icon = tone === 'success' ? CheckCircle2 : Info

  return (
    <div
      className={cn(
        'glass-surface fixed bottom-6 right-6 z-50 inline-flex max-w-sm items-center gap-2 rounded-2xl border border-border/70 bg-card/78 px-4 py-3 text-sm shadow-[0_20px_44px_rgba(15,23,42,0.18)]',
        className
      )}
    >
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-xl', tone === 'success' ? 'bg-emerald-500/12 text-emerald-500' : 'bg-primary/10 text-primary')}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="leading-6 text-foreground">{message}</span>
    </div>
  )
}
