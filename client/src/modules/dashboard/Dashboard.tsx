import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TAG_LABEL } from '@/lib/tagLabels'

type Summary = {
  range: { since: string; days: number }
  totalAttempts: number
  byModule: Record<string, { count: number; avgBand: number | null; avgAccuracy: number | null }>
  errorTagFrequency: Record<string, number>
  trend: { date: string; module: string; band?: number; accuracy?: number }[]
}

type Usage = {
  days: number
  totalCostUsd: number
  callCount: number
  byFeature: Record<string, { count: number; costUsd: number }>
}

const MODULE_LABEL: Record<string, string> = { writing: '写作', speaking: '口语', reading: '阅读', listening: '听力' }

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
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/dashboard/summary?days=${days}`)
      .then((r) => r.json())
      .then(setSummary)
      .catch((e) => setError(e.message))
    fetch(`/api/dashboard/usage?days=${days}`)
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => {})
  }, [days])

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!summary) return <p className="p-8 text-muted-foreground">加载中…</p>

  const bandChartData = pivotTrend(summary.trend, 'band')
  const accuracyChartData = pivotTrend(summary.trend, 'accuracy')
  const modules = Object.keys(summary.byModule)
  const bandModules = modules.filter((m) => summary.byModule[m].avgBand !== null)
  const accuracyModules = modules.filter((m) => summary.byModule[m].avgAccuracy !== null)
  const lineColors: Record<string, string> = { writing: '#2563eb', speaking: '#dc2626', reading: '#16a34a', listening: '#9333ea' }

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2 items-center">
          {[7, 30].map((d) => (
            <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDays(d)}>
              近{d}天
            </Badge>
          ))}
          <Link to="/backup" className="text-sm text-muted-foreground hover:underline ml-2">
            数据备份
          </Link>
        </div>
      </div>
      <h1 className="text-2xl font-semibold">仪表板</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {modules.length === 0 && <p className="text-muted-foreground col-span-4">这段时间还没有练习记录。</p>}
        {modules.map((m) => {
          const mod = summary.byModule[m]
          const usesAccuracy = mod.avgBand === null && mod.avgAccuracy !== null
          return (
            <Card key={m}>
              <CardContent className="py-4">
                <div className="text-sm text-muted-foreground">{MODULE_LABEL[m] || m}</div>
                <div className="text-2xl font-semibold">{usesAccuracy ? `${mod.avgAccuracy}%` : mod.avgBand ?? '-'}</div>
                <div className="text-xs text-muted-foreground">
                  {usesAccuracy ? '平均正确率 · ' : ''}
                  {mod.count} 次练习
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {bandChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Band 趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={bandChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 9]} fontSize={12} />
                <Tooltip />
                <Legend />
                {bandModules.map((m) => (
                  <Line key={m} type="monotone" dataKey={m} name={MODULE_LABEL[m] || m} stroke={lineColors[m] || '#888'} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {accuracyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">正确率趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={accuracyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} unit="%" />
                <Tooltip />
                <Legend />
                {accuracyModules.map((m) => (
                  <Line key={m} type="monotone" dataKey={m} name={MODULE_LABEL[m] || m} stroke={lineColors[m] || '#888'} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {Object.keys(summary.errorTagFrequency).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">弱项标签分布</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(summary.errorTagFrequency)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, count]) => (
                <Badge key={tag} variant="outline">
                  {TAG_LABEL[tag] || tag} × {count}
                </Badge>
              ))}
          </CardContent>
        </Card>
      )}

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              AI 调用花费（近{usage.days}天，共 ${usage.totalCostUsd} · {usage.callCount} 次调用）
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.keys(usage.byFeature).length === 0 && (
              <p className="text-sm text-muted-foreground">这段时间没有调用AI。</p>
            )}
            {Object.entries(usage.byFeature)
              .sort((a, b) => b[1].costUsd - a[1].costUsd)
              .map(([feature, v]) => (
                <Badge key={feature} variant="outline">
                  {FEATURE_LABEL[feature] || feature}：${v.costUsd}（{v.count}次）
                </Badge>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
