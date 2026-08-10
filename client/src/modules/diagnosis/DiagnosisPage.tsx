import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Brain, Tags, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StatePanel from '@/components/StatePanel'
import { TAG_LABEL } from '@/lib/tagLabels'

const MODULE_LABEL: Record<string, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力', writing_expression: '表达训练' }

type Summary = {
  totalAttempts: number
  byModule: Record<string, { count: number; avgBand: number | null; avgAccuracy: number | null }>
  bySubtype: Record<string, { module: string; label: string; count: number; avgBand: number | null; avgAccuracy: number | null }>
  errorTagFrequency: Record<string, number>
}

export default function DiagnosisPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [days, setDays] = useState(30)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/dashboard/summary?days=${days}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || '加载失败')
        return data
      })
      .then(setSummary)
      .catch((e) => setError(e.message))
  }, [days])

  if (error) return <StatePanel title="诊断页暂时打不开" description={error} tone="error" backTo="/" backLabel="返回首页" />
  if (!summary) return <StatePanel title="正在整理诊断数据" description="系统正在统计近几次练习里的模块表现、子类型和高频弱项。" tone="loading" backTo="/" backLabel="返回首页" />

  const modules = Object.entries(summary.byModule)
  const weakest = modules.filter(([, v]) => v.avgBand !== null).sort((a, b) => (a[1].avgBand ?? 9) - (b[1].avgBand ?? 9))[0]
  const topTags = Object.entries(summary.errorTagFrequency).sort((a, b) => b[1] - a[1])
  const subtypes = Object.entries(summary.bySubtype || {})
  const weakestSubtype = subtypes.filter(([, v]) => v.avgBand !== null && v.count >= 2).sort((a, b) => (a[1].avgBand ?? 9) - (b[1].avgBand ?? 9))[0]

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 pr-16 sm:pr-20">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          {[7, 30].map((d) => (
            <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer rounded-full px-3 py-1.5" onClick={() => setDays(d)}>
              近 {d} 天
            </Badge>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-primary" />
              Diagnosis
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">诊断</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                从最近的练习记录里找出当前最值得补的模块、子类型和高频弱项标签，帮助你决定下一轮应该练什么。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Activity, label: '练习总数', value: String(summary.totalAttempts), desc: `近 ${days} 天内的总练习次数` },
              { icon: Target, label: '最弱模块', value: weakest ? (MODULE_LABEL[weakest[0]] || weakest[0]) : '-', desc: weakest ? `当前均分 ${weakest[1].avgBand}` : '需要更多数据' },
              { icon: Tags, label: '高频弱项', value: topTags[0] ? (TAG_LABEL[topTags[0][0]] || topTags[0][0]) : '-', desc: topTags[0] ? `出现 ${topTags[0][1]} 次` : '暂时没有标签数据' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-xl font-semibold">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {summary.totalAttempts === 0 ? (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent className="py-8 text-sm text-muted-foreground">
            这段时间还没有练习记录。写作、口语、阅读、听力或表达训练随便练一次都行，攒出一点数据后这里才能给出更有意义的诊断。
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <CardHeader>
              <CardTitle className="text-base">各模块概览</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {modules.map(([mod, v]) => (
                <div key={mod} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                  <div className="text-sm text-muted-foreground">{MODULE_LABEL[mod] || mod}</div>
                  <div className="mt-3 text-xl font-semibold">{v.avgBand ?? (v.avgAccuracy !== null ? `${v.avgAccuracy}%` : '-')}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{v.count} 次</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {subtypes.length > 0 && (
            <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <CardTitle className="text-base">按子类型细分</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {subtypes.map(([key, v]) => (
                  <div key={key} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                    <div className="text-sm text-muted-foreground">{v.label}</div>
                    <div className="mt-3 text-xl font-semibold">{v.avgBand ?? (v.avgAccuracy !== null ? `${v.avgAccuracy}%` : '-')}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{v.count} 次</div>
                  </div>
                ))}
              </CardContent>
              {weakestSubtype && (
                <CardContent className="pt-0 text-sm leading-7 text-muted-foreground">
                  细分里相对较弱的是 <strong>{weakestSubtype[1].label}</strong>（{weakestSubtype[1].avgBand}），比同模块的其他子类型更值得针对性补练。
                </CardContent>
              )}
            </Card>
          )}

          {topTags.length > 0 && (
            <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardHeader>
                <CardTitle className="text-base">最常出现的弱项标签</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {topTags.map(([tag, count]) => (
                  <Badge key={tag} variant="outline" className="rounded-full">
                    {TAG_LABEL[tag] || tag} × {count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/55 px-4 py-4 text-sm text-muted-foreground">
            <span>想继续深挖，可以直接问系统“诊断我哪里弱”，它会结合这些数据给更具体的训练建议。</span>
            <Link to="/weakness" className="font-medium hover:underline">
              查看弱点聚合本 →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
