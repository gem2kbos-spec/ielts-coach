import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TAG_LABEL } from '@/lib/tagLabels'

const MODULE_LABEL: Record<string, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力' }

type Summary = {
  totalAttempts: number
  byModule: Record<string, { count: number; avgBand: number | null; avgAccuracy: number | null }>
  errorTagFrequency: Record<string, number>
}

export default function DiagnosisPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [days, setDays] = useState(30)

  useEffect(() => {
    fetch(`/api/dashboard/summary?days=${days}`)
      .then((r) => r.json())
      .then(setSummary)
  }, [days])

  if (!summary) return <p className="p-8 text-muted-foreground">加载中…</p>

  const modules = Object.entries(summary.byModule)
  const weakest = modules
    .filter(([, v]) => v.avgBand !== null)
    .sort((a, b) => (a[1].avgBand ?? 9) - (b[1].avgBand ?? 9))[0]
  const topTags = Object.entries(summary.errorTagFrequency).sort((a, b) => b[1] - a[1])

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          {[7, 30].map((d) => (
            <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDays(d)}>
              近{d}天
            </Badge>
          ))}
        </div>
      </div>
      <h1 className="text-2xl font-semibold">诊断</h1>

      {summary.totalAttempts === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            这段时间还没有练习记录，先去写一篇 Task2 或者练一次口语 Part2，攒点数据我才能给你诊断。
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">各模块概览</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {modules.map(([mod, v]) => (
                <div key={mod}>
                  <div className="text-sm text-muted-foreground">{MODULE_LABEL[mod] || mod}</div>
                  <div className="text-xl font-semibold">{v.avgBand ?? (v.avgAccuracy !== null ? `${v.avgAccuracy}%` : '-')}</div>
                  <div className="text-xs text-muted-foreground">{v.count} 次</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {weakest && (
            <Card>
              <CardContent className="py-4 text-sm">
                平均分相对较低的模块是<strong>{MODULE_LABEL[weakest[0]] || weakest[0]}</strong>（{weakest[1].avgBand}），值得多花点时间。
              </CardContent>
            </Card>
          )}

          {topTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">最常出现的弱项标签</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <Badge key={tag} variant="outline">
                    {TAG_LABEL[tag] || tag} × {count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-muted-foreground">
            更详细的训练建议可以直接在 Claude Code 对话里问"诊断我哪里弱"，会结合上面这些数据给具体建议。
          </p>
        </>
      )}
    </div>
  )
}
