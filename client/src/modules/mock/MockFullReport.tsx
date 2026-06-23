import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getMockReport, type MockReport } from '@/lib/api'

export default function MockFullReport() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<MockReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getMockReport(id).then(setReport).catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="p-8 text-destructive">{error}</p>
  if (!report) return <p className="p-8 text-muted-foreground">加载中…</p>

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">模考报告</h1>

      <Card>
        <CardHeader>
          <CardTitle>总体估计 Band {report.overallBand ?? '-'}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          四项里有几项跳过的话，总体估计只是用做了的那几项算的平均值，不代表完整四科的真实水平。
        </CardContent>
      </Card>

      {report.legs.map((leg) => (
        <Card key={leg.stage}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{leg.label}</CardTitle>
            {leg.skipped ? (
              <Badge variant="outline">跳过</Badge>
            ) : (
              <Badge>
                Band {leg.band ?? '-'}
                {leg.approxBand ? '（估计值）' : ''}
              </Badge>
            )}
          </CardHeader>
          {!leg.skipped && leg.detail && (
            <CardContent className="text-sm text-muted-foreground space-y-1">
              {leg.stage === 'writing' ? (
                <>
                  {(leg.detail as { task1?: { band_overall: number } }).task1 && (
                    <p>Task1 Band {(leg.detail as { task1: { band_overall: number } }).task1.band_overall}（权重1）</p>
                  )}
                  {(leg.detail as { task2?: { band_overall: number } }).task2 && (
                    <p>Task2 Band {(leg.detail as { task2: { band_overall: number } }).task2.band_overall}（权重2）</p>
                  )}
                  {!(leg.detail as { task1?: unknown }).task1 && <p className="text-destructive">没做Task1</p>}
                  {!(leg.detail as { task2?: unknown }).task2 && <p className="text-destructive">没做Task2</p>}
                </>
              ) : (
                <>
                  {typeof (leg.detail as Record<string, unknown>).accuracy === 'number' && (
                    <p>正确率 {(leg.detail as Record<string, unknown>).accuracy as number}%</p>
                  )}
                  {(leg.detail as Record<string, unknown>).comments != null && <p>详细评语请到对应模块的练习记录里查看。</p>}
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  )
}
