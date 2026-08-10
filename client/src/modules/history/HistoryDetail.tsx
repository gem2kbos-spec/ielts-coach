import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock3, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getHistoryDetail, type AttemptDetail } from '@/lib/api'
import ReviewPanel, { type GradeResult } from '@/modules/writing/ReviewPanel'
import ReadingResult, { type GradedResult } from '@/modules/reading/ReadingResult'
import ListeningResult, { type ListeningGradedResult } from '@/modules/listening/ListeningResult'
import ListeningMockResult, { type ListeningMockGradedResult } from '@/modules/listening/ListeningMockResult'
import ComparisonCard from './ComparisonCard'
import { TAG_LABEL } from '@/lib/tagLabels'
import StatePanel from '@/components/StatePanel'

const SCORE_LABEL: Record<string, string> = { fc: 'FC 流利度', lr: 'LR 词汇', gra: 'GRA 语法', pron: 'PRON 发音' }

export default function HistoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<AttemptDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getHistoryDetail(id).then(setDetail).catch((e) => setError(e.message))
  }, [id])

  if (error) return <StatePanel title="练习详情暂时打不开" description={error} tone="error" backTo="/history" backLabel="返回练习记录" />
  if (!detail) return <StatePanel title="正在载入练习详情" description="系统正在读取这次练习的原始结果、对比和模块明细。" tone="loading" backTo="/history" backLabel="返回练习记录" />

  const backLink = (
    <div className="mb-5 rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Link to="/history" className="text-sm text-muted-foreground hover:underline">
            ← 返回练习记录
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            History Detail
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="rounded-full">{detail.label.label}</Badge>
          <Badge variant="outline" className="rounded-full inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {detail.created_at}
          </Badge>
        </div>
      </div>
    </div>
  )

  if (detail.module === 'writing') {
    const rawResponse = detail.raw_response as { essayText?: string; wordCount?: number } | null
    const result: GradeResult = {
      attemptId: detail.id,
      wordCount: rawResponse?.wordCount || 0,
      ...(detail.score as Omit<GradeResult, 'attemptId' | 'wordCount'>),
    }
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
        {backLink}
        <ComparisonCard previous={detail.previous} delta={detail.delta} />
        <ReviewPanel result={result} essayText={rawResponse?.essayText || ''} />
      </div>
    )
  }

  if (detail.module === 'reading') {
    const score = detail.score as { accuracy: number; correctCount: number; total: number; perQuestion: GradedResult['perQuestion'] }
    const result: GradedResult = {
      attemptId: detail.id,
      accuracy: score.accuracy,
      correctCount: score.correctCount,
      total: score.total,
      perQuestion: score.perQuestion,
      errorTags: detail.error_tags,
      perQuestionTags: [],
    }
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
        {backLink}
        <ComparisonCard previous={detail.previous} delta={detail.delta} />
        <ReadingResult result={result} onRetry={() => navigate(detail.item ? `/reading/exam/${detail.item.id}` : '/reading')} />
      </div>
    )
  }

  if (detail.module === 'listening') {
    const score = detail.score as Record<string, unknown>
    if (score.mock) {
      const result: ListeningMockGradedResult = {
        attemptId: detail.id,
        totalCorrect: score.correctCount as number,
        totalQuestions: score.total as number,
        band: score.band as number,
        perSection: score.perSection as ListeningMockGradedResult['perSection'],
        errorTags: detail.error_tags,
      }
      return (
        <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
          {backLink}
          <ComparisonCard previous={detail.previous} delta={detail.delta} />
          <ListeningMockResult result={result} />
        </div>
      )
    }
    const result: ListeningGradedResult = {
      attemptId: detail.id,
      accuracy: score.accuracy as number,
      correctCount: score.correctCount as number,
      total: score.total as number,
      perQuestion: score.perQuestion as ListeningGradedResult['perQuestion'],
      errorTags: detail.error_tags,
      perQuestionTags: [],
      transcript: detail.transcript,
    }
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
        {backLink}
        <ComparisonCard previous={detail.previous} delta={detail.delta} />
        <ListeningResult result={result} onRetry={() => navigate(detail.item ? `/listening/exam/${detail.item.id}` : '/listening')} />
      </div>
    )
  }

  if (detail.module === 'speaking') {
    const rawResponse = detail.raw_response as Record<string, unknown> | null
    if (rawResponse?.combined) {
      const parts = ['part1', 'part2', 'part3'] as const
      return (
        <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
          {backLink}
          <ComparisonCard previous={detail.previous} delta={detail.delta} />
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-primary [text-shadow:var(--glow-primary-strong)]">
                综合 Band {detail.band_overall}
              </CardTitle>
            </CardHeader>
          </Card>
          {parts.map((p) => {
            const sub = rawResponse[p] as { scores?: Record<string, number>; band_overall?: number } | null
            if (!sub) return null
            return (
              <Card key={p}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">{{ part1: 'Part 1 热身', part2: 'Part 2 话题卡', part3: 'Part 3 深入讨论' }[p]}</CardTitle>
                  <Badge>Band {sub.band_overall}</Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-4 gap-2 text-sm">
                  {sub.scores &&
                    Object.entries(sub.scores).map(([k, v]) => (
                      <div key={k}>
                        <div className="text-xs text-muted-foreground">{SCORE_LABEL[k] || k}</div>
                        <div className="font-semibold">{v}</div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )
    }

    const score = detail.score as { scores?: Record<string, number>; band_overall?: number; comments?: Record<string, string>; suggestions?: string[] } | null
    return (
        <div className="mx-auto max-w-5xl space-y-4 px-8 pb-8 pt-14">
        {backLink}
        <ComparisonCard previous={detail.previous} delta={detail.delta} />
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-primary [text-shadow:var(--glow-primary-strong)]">
              总分 Band {score?.band_overall ?? detail.band_overall}
            </CardTitle>
          </CardHeader>
          {score?.scores && (
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(score.scores).map(([k, v]) => (
                <div key={k}>
                  <div className="text-sm text-muted-foreground">{SCORE_LABEL[k] || k}</div>
                  <div className="text-2xl font-semibold">{v}</div>
                  {score.comments?.[k] && <p className="text-xs text-muted-foreground mt-1">{score.comments[k]}</p>}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
        {detail.transcript && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">转写</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">{detail.transcript}</p>
            </CardContent>
          </Card>
        )}
        {score?.suggestions && score.suggestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">改进建议</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {score.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (detail.module === 'writing_expression') {
    const rawResponse = detail.raw_response as { answer?: string } | null
    const score = detail.score as { result?: string; accuracy?: number } | null
    const resultLabel = score?.result === 'correct' ? '完全正确' : score?.result === 'partial' ? '基本正确' : '有误'
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-4">
        {backLink}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{detail.item?.content.chinese as string}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge>{resultLabel}</Badge>
            <div>
              <div className="text-xs text-muted-foreground">你的回答</div>
              <p className="text-sm">{rawResponse?.answer}</p>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">标准答案</div>
              <p className="text-sm">{detail.item?.content.standard as string}</p>
            </div>
            {detail.error_tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {detail.error_tags.map((t) => (
                  <Badge key={t} variant="outline">{TAG_LABEL[t] || t}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      {backLink}
      <p className="text-muted-foreground">暂不支持这个模块的详情展示。</p>
    </div>
  )
}
