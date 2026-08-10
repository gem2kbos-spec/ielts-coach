import { Link } from 'react-router-dom'
import { PenSquare, Sparkles, TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import ScoreRadarChart from '@/components/ScoreRadarChart'

export type GradeResult = {
  attemptId: string
  wordCount: number
  scores: { ta: number; cc: number; lr: number; gra: number }
  band_overall: number
  comments: { ta: string; cc: string; lr: string; gra: string }
  chinglish: { phrase: string; issue: string; suggestion: string }[]
  rewrite_band7: string
  rewrite_band9: string
  expressionSuggestions?: { chinglishPhrase: string; itemId: string; chinese: string; standard: string }[]
}

const CRITERIA = [
  { key: 'ta', label: 'TA 任务回应' },
  { key: 'cc', label: 'CC 连贯衔接' },
  { key: 'lr', label: 'LR 词汇资源' },
  { key: 'gra', label: 'GRA 语法范围' },
] as const

export default function ReviewPanel({ result, essayText }: { result: GradeResult; essayText: string }) {
  const visibleChinglish = result.chinglish.slice(0, 3)

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <PenSquare className="h-3.5 w-3.5 text-primary" />
              Writing Review
            </div>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold text-primary [text-shadow:var(--glow-primary-strong)]">
                Band {result.band_overall}
              </span>
              <Badge variant="secondary" className="rounded-full px-3 py-1.5">{result.wordCount} 词</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CRITERIA.map((c) => (
                <div key={c.key} className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{c.label}</div>
                  <div className="mt-3 text-2xl font-semibold">{result.scores[c.key]}</div>
                  <p className="mt-2 max-h-12 overflow-hidden text-sm leading-6 text-muted-foreground">{result.comments[c.key]}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/75 p-4">
            <div className="mb-3 text-sm font-semibold">四项结构</div>
            <ScoreRadarChart
              scores={result.scores}
              labels={{ ta: 'TA', cc: 'CC', lr: 'LR', gra: 'GRA' }}
            />
          </div>
        </CardContent>
      </Card>

      {visibleChinglish.length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4.5 w-4.5 text-destructive" />
              中式英语 / 自杀式表达
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleChinglish.map((c, i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-background/65 p-3.5">
                <p className="text-sm">
                  <Badge variant="destructive" className="mr-2 rounded-full">
                    {c.phrase}
                  </Badge>
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.issue}</p>
                <p className="mt-1.5 text-sm leading-6">
                  建议：<span className="font-medium">{c.suggestion}</span>
                </p>
                {result.expressionSuggestions
                  ?.filter((s) => s.chinglishPhrase === c.phrase)
                  .map((s) => (
                    <div key={s.itemId} className="mt-3 rounded-xl border border-border/70 bg-card p-3 text-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="text-muted-foreground">
                          练一下：{s.chinese} → {s.standard}
                        </div>
                        <Link to={`/writing/expressions/drill?id=${s.itemId}`}>
                          <Button size="sm" variant="outline" className="rounded-full">加入今日练习</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                {i < visibleChinglish.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            {result.chinglish.length > visibleChinglish.length && (
              <p className="text-xs text-muted-foreground">已只显示最关键的 {visibleChinglish.length} 条，避免报告过长。</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.05)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            三档对照
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mine">
            <TabsList className="mb-4 h-auto flex-wrap rounded-2xl border border-border/70 bg-muted/40 p-1.5">
              <TabsTrigger value="mine" className="rounded-xl px-4">我的原文</TabsTrigger>
              <TabsTrigger value="band7" className="rounded-xl px-4">Band 7 版本</TabsTrigger>
              <TabsTrigger value="band9" className="rounded-xl px-4">Band 9 版本</TabsTrigger>
            </TabsList>
            <TabsContent value="mine" className="rounded-2xl border border-border/70 bg-background/65 p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">{essayText}</p>
            </TabsContent>
            <TabsContent value="band7" className="rounded-2xl border border-border/70 bg-background/65 p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">{result.rewrite_band7}</p>
            </TabsContent>
            <TabsContent value="band9" className="rounded-2xl border border-border/70 bg-background/65 p-4">
              <p className="whitespace-pre-wrap text-sm leading-8">{result.rewrite_band9}</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
