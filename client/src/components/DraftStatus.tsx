import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type DraftStatusProps = {
  status: 'idle' | 'saving' | 'saved'
  onClear?: () => void
  compact?: boolean
}

export default function DraftStatus({ status, onClear, compact = false }: DraftStatusProps) {
  const [confirming, setConfirming] = useState(false)
  const label = status === 'saving'
    ? '草稿保存中…'
    : status === 'saved'
      ? '草稿已保存'
      : '未保存草稿'

  useEffect(() => {
    if (!confirming) return
    const timer = window.setTimeout(() => setConfirming(false), 2500)
    return () => window.clearTimeout(timer)
  }, [confirming])

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="rounded-full px-3 py-1.5">
        {label}
      </Badge>
      {onClear && (
        <Button
          variant={confirming ? 'destructive' : 'ghost'}
          size={compact ? 'sm' : 'default'}
          onClick={() => {
            if (!confirming) {
              setConfirming(true)
              return
            }
            setConfirming(false)
            onClear()
          }}
        >
          {confirming ? '确认清空' : '清空草稿'}
        </Button>
      )}
    </div>
  )
}
