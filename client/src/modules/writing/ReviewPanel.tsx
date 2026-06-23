import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

export type GradeResult = {
  attemptId: string
  wordCount: number
  scores: { ta: number; cc: number; lr: number; gra: number }
  band_overall: number
  comments: { ta: string; cc: string; lr: string; gra: string }
  chinglish: { phrase: string; issue: string; suggestion: string }[]
  rewrite_band7: string
  rewrite_band9: string
}

const CRITERIA = [
  { key: 'ta', label: 'TA 任务回应' },
  { key: 'cc', label: 'CC 连贯衔接' },
  { key: 'lr', label: 'LR 词汇资源' },
  { key: 'gra', label: 'GRA 语法范围' },
] as const

export default function ReviewPanel({ result, essayText }: { result: GradeResult; essayText: string }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span>总分 Band {result.band_overall}</span>
            <Badge variant="secondary">{result.wordCount} 词</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CRITERIA.map((c) => (
              <div key={c.key}>
                <div className="text-sm text-muted-foreground">{c.label}</div>
                <div className="text-2xl font-semibold">{result.scores[c.key]}</div>
                <p className="text-xs text-muted-foreground mt-1">{result.comments[c.key]}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {result.chinglish.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>中式英语 / 自杀式表达</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {result.chinglish.map((c, i) => (
              <div key={i}>
                <p className="text-sm">
                  <Badge variant="destructive" className="mr-2">
                    {c.phrase}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground mt-1">{c.issue}</p>
                <p className="text-sm mt-1">
                  建议：<span className="font-medium">{c.suggestion}</span>
                </p>
                {i < result.chinglish.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>三档对照</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mine">
            <TabsList>
              <TabsTrigger value="mine">我的原文</TabsTrigger>
              <TabsTrigger value="band7">Band 7 版本</TabsTrigger>
              <TabsTrigger value="band9">Band 9 版本</TabsTrigger>
            </TabsList>
            <TabsContent value="mine">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{essayText}</p>
            </TabsContent>
            <TabsContent value="band7">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.rewrite_band7}</p>
            </TabsContent>
            <TabsContent value="band9">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.rewrite_band9}</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
