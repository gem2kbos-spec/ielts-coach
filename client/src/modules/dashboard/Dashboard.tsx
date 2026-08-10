import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AreaChart as AreaChartIcon, Brain, DatabaseBackup, History, NotebookPen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import StatePanel from '@/components/StatePanel'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TAG_LABEL } from '@/lib/tagLabels'
import { heatStyle } from '@/lib/utils'

type Summary = {
  range: { since: string; days: number }
  totalAttempts: number
  byModule: Record<string, { count: number; avgBand: number | null; avgAccuracy: number | null }>
  bySubtype: Record<string, { module: string; label: string; count: number; avgBand: number | null; avgAccuracy: number | null }>
  errorTagFrequency: Record<string, number>
  trend: { date: string; module: string; band?: number; accuracy?: number }[]
}

type Usage = {
  days: number
  totalCostUsd: number
  callCount: number
  byFeature: Record<string, { count: number; costUsd: number }>
}

const MODULE_LABEL: Record<string, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力', writing_expression: '表达训练' }

const FEATURE_LABEL: Record<string, string> = {
  writing_task1_score: '写作Task1评分',
  writing_task2_score: '写作Task2评分',
  speaking_part1_score: '口语Part1评分',
  speaking_part2_score: '口语Part2评分',
  speaking_examiner_feedback: '考官模式总评',
  speaking_examiner_followup: '考官追问',
  vocab_lookup: '词汇释义',
  reading_answer_key: '阅读答案建议',
  reading_error_tag: '阅读错题归因',
  reading_generate: 'AI生成阅读',
  listening_answer_key: '听力答案建议',
  listening_error_tag: '听力错题归因',
  listening_mock_error_tag: '听力模考归因',
}

function pivotTrend(trend: Summary['trend'], metric: 'band' | 'accuracy') {
  const byDate = new Map<string, Record<string, number | string>>()
  for (const t of trend) {
    const value = t[metric]
    if (value === undefined) continue
    if (!byDate.has(t.date)) byDate.set(t.date, { date: t.date })
    byDate.get(t.date)![t.module] = value
  }
  return Array.from(byDate.values())
}

export default function Dashboard() {
  const [days, setDays] = useState(7)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [expressionStats, setExpressionStats] = useState<{ todayCount: number; totalCount: number } | null>(null)
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
    fetch(`/api/dashboard/usage?days=${days}`)
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {})
  }, [days])

  useEffect(() => {
    fetch('/api/expressions/stats')
      .then((r) => r.json())
      .then(setExpressionStats)
      .catch(() => {})
  }, [])

  if (error) return <StatePanel title="仪表板暂时打不开" description={error} tone="error" backTo="/" backLabel="返回首页" />
  if (!summary) return <StatePanel title="正在整理仪表板数据" description="系统正在汇总最近练习、趋势和 AI 使用情况。" tone="loading" backTo="/" backLabel="返回首页" />

  const bandChartData = pivotTrend(summary.trend, 'band')
  const accuracyChartData = pivotTrend(summary.trend, 'accuracy')
  const modules = Object.keys(summary.byModule)
  const bandModules = modules.filter((m) => summary.byModule[m].avgBand !== null)
  const accuracyModules = modules.filter((m) => summary.byModule[m].avgAccuracy !== null)
  const lineColors: Record<string, string> = {
    writing: 'var(--chart-1)',
    speaking: 'var(--chart-2)',
    reading: 'var(--chart-3)',
    listening: 'var(--chart-4)',
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 30].map((d) => (
            <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer rounded-full px-3 py-1.5" onClick={() => setDays(d)}>
              近 {d} 天
            </Badge>
          ))}
          <Link to="/history"><Badge variant="outline" className="rounded-full px-3 py-1.5">练习记录</Badge></Link>
          <Link to="/weakness"><Badge variant="outline" className="rounded-full px-3 py-1.5">弱点聚合本</Badge></Link>
          <Link to="/backup"><Badge variant="outline" className="rounded-full px-3 py-1.5">数据备份</Badge></Link>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <AreaChartIcon className="h-3.5 w-3.5 text-primary" />
              Progress Dashboard
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">仪表板</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                统一查看这段时间里的练习频率、模块表现、弱项标签和 AI 使用成本。现在更适合用来做周复盘，而不只是看原始数据。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: History, label: '练习总次数', value: String(summary.totalAttempts), desc: `近 ${summary.range.days} 天内所有练习` },
              { icon: Activity, label: '活跃模块', value: String(modules.length), desc: '这段时间里有记录的模块' },
              { icon: Brain, label: '表达训练', value: expressionStats ? `${expressionStats.todayCount}/${expressionStats.totalCount}` : '-', desc: '今日练习 / 累计练习' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                  <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {modules.length === 0 && <p className="col-span-4 text-muted-foreground">这段时间还没有练习记录。</p>}
        {modules.map((m) => {
          const mod = summary.byModule[m]
          const usesAccuracy = mod.avgBand === null && mod.avgAccuracy !== null
          const color = lineColors[m] || 'var(--chart-5)'
          return (
            <Card key={m} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <CardContent className="py-5">
                <div className="text-sm text-muted-foreground">{MODULE_LABEL[m] || m}</div>
                <div className="mt-3 text-3xl font-semibold" style={{ color }}>
                  {usesAccuracy ? `${mod.avgAccuracy}%` : mod.avgBand ?? '-'}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {usesAccuracy ? '平均正确率 · ' : ''}
                  {mod.count} 次练习
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {Object.keys(summary.bySubtype).length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">按子类型细分</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(summary.bySubtype)
              .sort((a, b) => a[1].module.localeCompare(b[1].module))
              .map(([key, s]) => {
                const usesAccuracy = s.avgBand === null && s.avgAccuracy !== null
                return (
                  <div key={key} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                    <div className="mt-3 text-xl font-semibold">{usesAccuracy ? `${s.avgAccuracy}%` : s.avgBand ?? '-'}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{s.count} 次</div>
                  </div>
                )
              })}
          </CardContent>
        </Card>
      )}

      {bandChartData.length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">Band 趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={bandChartData}>
                <defs>
                  {bandModules.map((m) => (
                    <linearGradient key={m} id={`grad-band-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColors[m] || 'var(--chart-5)'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={lineColors[m] || 'var(--chart-5)'} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 9]} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 16 }} />
                <Legend />
                {bandModules.map((m) => (
                  <Area
                    key={m}
                    type="monotone"
                    dataKey={m}
                    name={MODULE_LABEL[m] || m}
                    stroke={lineColors[m] || 'var(--chart-5)'}
                    strokeWidth={2}
                    fill={`url(#grad-band-${m})`}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {accuracyChartData.length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">正确率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={accuracyChartData}>
                <defs>
                  {accuracyModules.map((m) => (
                    <linearGradient key={m} id={`grad-acc-${m}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={lineColors[m] || 'var(--chart-5)'} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={lineColors[m] || 'var(--chart-5)'} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis domain={[0, 100]} fontSize={12} unit="%" stroke="var(--muted-foreground)" />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 16 }} />
                <Legend />
                {accuracyModules.map((m) => (
                  <Area
                    key={m}
                    type="monotone"
                    dataKey={m}
                    name={MODULE_LABEL[m] || m}
                    stroke={lineColors[m] || 'var(--chart-5)'}
                    strokeWidth={2}
                    fill={`url(#grad-acc-${m})`}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {Object.keys(summary.errorTagFrequency).length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">弱项标签分布</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(() => {
              const entries = Object.entries(summary.errorTagFrequency).sort((a, b) => b[1] - a[1])
              const maxCount = Math.max(...entries.map(([, c]) => c), 1)
              return entries.map(([tag, count]) => (
                <Badge key={tag} variant="outline" className="rounded-full" style={heatStyle(count, maxCount)}>
                  {TAG_LABEL[tag] || tag} × {count}
                </Badge>
              ))
            })()}
          </CardContent>
        </Card>
      )}

      {usage && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DatabaseBackup className="h-4.5 w-4.5 text-primary" />
              AI 调用花费（近 {usage.days} 天，共 ${usage.totalCostUsd} · {usage.callCount} 次调用）
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.keys(usage.byFeature).length === 0 && (
              <p className="text-sm text-muted-foreground">这段时间没有调用 AI。</p>
            )}
            {Object.entries(usage.byFeature)
              .sort((a, b) => b[1].costUsd - a[1].costUsd)
              .map(([feature, v]) => (
                <Badge key={feature} variant="outline" className="rounded-full">
                  {FEATURE_LABEL[feature] || feature}：${v.costUsd}（{v.count}次）
                </Badge>
              ))}
          </CardContent>
        </Card>
      )}

      {expressionStats && (
        <Link to="/writing/expressions">
          <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)] hover:border-primary/40">
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <NotebookPen className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">表达训练</div>
                  <div className="text-sm text-muted-foreground">今日已练习 {expressionStats.todayCount} · 总共已练习 {expressionStats.totalCount}</div>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-full">继续练习</Badge>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  )
}
