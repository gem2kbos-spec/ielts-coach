import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BarChart3, ClipboardCheck, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getMockReport, type MockReport } from '@/lib/api'
import StatePanel from '@/components/StatePanel'

export default function MockFullReport() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<MockReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getMockReport(id).then(setReport).catch((e) => setError(e.message))
  }, [id])

  if (error) return <StatePanel title="模考报告暂时打不开" description={error} tone="error" backTo="/" backLabel="返回首页" />
  if (!report) return <StatePanel title="正在生成模考报告" description="系统正在整理四个模块的结果并计算总体估计分。" tone="loading" backTo="/" backLabel="返回首页" />

  const completedLegs = report.legs.filter((leg) => !leg.skipped)

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <ClipboardCheck className="h-3.5 w-3.5 text-primary" />
              Full Mock Report
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">模考报告</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                这里汇总这次完整模考里四个模块的结果。若有跳过的模块，总分只按实际完成的部分做估计。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Trophy, label: '总体估计', value: report.overallBand != null ? `Band ${report.overallBand}` : '-', desc: '基于本次实际完成的模块' },
              { icon: BarChart3, label: '完成模块', value: `${completedLegs.length}/4`, desc: '跳过的模块不会计入平均值' },
              { icon: ClipboardCheck, label: '报告状态', value: '已生成', desc: '详细评语可继续去对应练习记录查看' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85">
        <CardContent className="py-5 text-sm leading-7 text-muted-foreground">
          四项里如果有跳过，总体估计只是用已完成项目的平均值，不代表一次完整四科都做完后的真实水平。
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {report.legs.map((leg) => (
          <Card key={leg.stage} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">{leg.label}</CardTitle>
              {leg.skipped ? (
                <Badge variant="outline" className="rounded-full">跳过</Badge>
              ) : (
                <Badge className="rounded-full">
                  Band {leg.band ?? '-'}
                  {leg.approxBand ? '（估计值）' : ''}
                </Badge>
              )}
            </CardHeader>
            {!leg.skipped && leg.detail && (
              <CardContent className="space-y-2 text-sm leading-7 text-muted-foreground">
                {leg.stage === 'writing' ? (
                  <>
                    {(leg.detail as { task1?: { band_overall: number } }).task1 ? (
                      <p>Task 1：Band {(leg.detail as { task1: { band_overall: number } }).task1.band_overall}（权重 1）</p>
                    ) : (
                      <p className="text-destructive">Task 1 未完成</p>
                    )}
                    {(leg.detail as { task2?: { band_overall: number } }).task2 ? (
                      <p>Task 2：Band {(leg.detail as { task2: { band_overall: number } }).task2.band_overall}（权重 2）</p>
                    ) : (
                      <p className="text-destructive">Task 2 未完成</p>
                    )}
                  </>
                ) : (
                  <>
                    {typeof (leg.detail as Record<string, unknown>).accuracy === 'number' && (
                      <p>正确率：{(leg.detail as Record<string, unknown>).accuracy as number}%</p>
                    )}
                    {(leg.detail as Record<string, unknown>).comments != null && (
                      <p>更细的评语和逐题分析，请到对应模块的练习记录里查看。</p>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
