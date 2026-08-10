import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'

type StatePanelProps = {
  title: string
  description: string
  tone?: 'loading' | 'error' | 'empty'
  backTo?: string
  backLabel?: string
}

const TONE_CONFIG = {
  loading: {
    icon: LoaderCircle,
    iconClass: 'text-primary animate-spin',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-destructive',
  },
  empty: {
    icon: Inbox,
    iconClass: 'text-muted-foreground',
  },
} as const

export default function StatePanel({
  title,
  description,
  tone = 'loading',
  backTo,
  backLabel = '返回首页',
}: StatePanelProps) {
  const config = TONE_CONFIG[tone]
  const Icon = config.icon

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      {backTo && (
        <Link to={backTo} className="text-sm text-muted-foreground hover:underline">
          ← {backLabel}
        </Link>
      )}
      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center sm:py-14">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-background/70">
            <Icon className={`h-6 w-6 ${config.iconClass}`} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
