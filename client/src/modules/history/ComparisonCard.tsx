import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AttemptDetail } from '@/lib/api'

const SCORE_LABEL: Record<string, string> = {
  ta: 'TA', cc: 'CC', lr: 'LR', gra: 'GRA',
  fc: 'FC', pron: 'PRON',
}

function formatDelta(n: number) {
  if (n > 0) return `+${n}`
  return String(n)
}

function deltaColor(n: number) {
  if (n > 0) return 'text-green-600'
  if (n < 0) return 'text-destructive'
  return 'text-muted-foreground'
}

export default function ComparisonCard({ previous, delta }: Pick<AttemptDetail, 'previous' | 'delta'>) {
  if (!previous || !delta) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">对比上次（{previous.created_at}）</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {delta.kind === 'band' && typeof delta.bandDelta === 'number' && (
          <p className="text-sm">
            总分较上次<span className={deltaColor(delta.bandDelta)}>{formatDelta(delta.bandDelta)}</span>
            （上次 Band {previous.band_overall}）
          </p>
        )}
        {delta.kind === 'accuracy' && typeof delta.accuracyDelta === 'number' && (
          <p className="text-sm">
            正确率较上次<span className={deltaColor(delta.accuracyDelta)}>{formatDelta(delta.accuracyDelta)}%</span>
            （上次 {(previous.score as { accuracy?: number })?.accuracy}%）
          </p>
        )}
        {delta.scoreDelta && Object.keys(delta.scoreDelta).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(delta.scoreDelta).map(([k, v]) => (
              <Badge key={k} variant="outline" className={deltaColor(v)}>
                {SCORE_LABEL[k] || k} {formatDelta(v)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
