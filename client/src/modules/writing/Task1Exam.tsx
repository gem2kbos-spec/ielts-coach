import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useExamTimer, type ExamPhase } from '@/hooks/useExamTimer'
import { countWords } from '@/lib/wordCount'
import { getRandomTask1, gradeTask1, type Task1Item } from '@/lib/api'
import ReviewPanel, { type GradeResult } from './ReviewPanel'
import Task1Chart from './Task1Chart'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

const PHASES: ExamPhase[] = [
  { key: 'analyze', label: '审题', seconds: 2 * 60 },
  { key: 'outline', label: '大纲', seconds: 3 * 60 },
  { key: 'writing', label: '写作', seconds: 13 * 60 },
  { key: 'check', label: '检查', seconds: 2 * 60 },
]

function formatTime(sec: number) {
  const m = Math.floor(Math.max(sec, 0) / 60)
  const s = Math.max(sec, 0) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Task1Exam() {
  const [item, setItem] = useState<Task1Item | null>(null)
  const [essayText, setEssayText] = useState('')
  const [grading, setGrading] = useState(false)
  const [result, setResult] = useState<GradeResult | null>(null)
  const [error, setError] = useState('')
  const timer = useExamTimer(PHASES)

  const loadNewPrompt = () => {
    setItem(null)
    setResult(null)
    setEssayText('')
    timer.reset()
    getRandomTask1().then(setItem).catch((e) => setError(e.message))
  }

  useEffect(() => {
    loadNewPrompt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const wordCount = countWords(essayText)
  const totalElapsed = PHASES.reduce((sum, p, i) => {
    if (i < timer.phaseIndex) return sum + p.seconds
    if (i === timer.phaseIndex) return sum + (p.seconds - timer.remaining)
    return sum
  }, 0)

  const handleSubmit = async () => {
    if (!item) return
    setGrading(true)
    setError('')
    timer.pause()
    try {
      const data = await gradeTask1({ itemId: item.id, essayText, durationSec: totalElapsed })
      setResult(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGrading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <MockSessionBanner />
        <div className="flex items-center justify-between mb-4">
          <Link to="/writing" className="text-sm text-muted-foreground hover:underline">
            ← 返回写作菜单
          </Link>
          <Button variant="outline" onClick={loadNewPrompt}>
            换一题再练
          </Button>
        </div>
        <ReviewPanel result={result} essayText={essayText} />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <MockSessionBanner />
      <Link to="/writing" className="text-sm text-muted-foreground hover:underline">
        ← 返回写作菜单
      </Link>

      <div className="flex items-center justify-between mt-4 mb-2">
        <h1 className="text-2xl font-semibold">写作 Task 1</h1>
        <div className="flex items-center gap-2">
          {PHASES.map((p, i) => (
            <Badge key={p.key} variant={i === timer.phaseIndex ? 'default' : 'outline'}>
              {p.label}
            </Badge>
          ))}
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <div className="text-sm text-muted-foreground">当前阶段：{timer.phase?.label}</div>
            <div className="text-3xl font-mono">{formatTime(timer.remaining)}</div>
          </div>
          <div className="flex gap-2">
            {!timer.running ? (
              <Button onClick={timer.start}>开始计时</Button>
            ) : (
              <Button variant="outline" onClick={timer.pause}>
                暂停
              </Button>
            )}
            <Button variant="ghost" onClick={timer.skipToNext}>
              下一阶段
            </Button>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <Progress value={((timer.phase.seconds - timer.remaining) / timer.phase.seconds) * 100} />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">题目</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item ? (
            <>
              <p className="leading-relaxed">{item.content.description}</p>
              <Task1Chart content={item.content} />
            </>
          ) : (
            <p className="text-muted-foreground">加载中…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <textarea
            value={essayText}
            onChange={(e) => setEssayText(e.target.value)}
            placeholder="在这里写你的回答…"
            className="w-full min-h-[280px] resize-y rounded-md border border-border bg-transparent p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center justify-between mt-3">
            <Badge variant={wordCount >= 150 ? 'default' : 'secondary'}>{wordCount} / 150 词</Badge>
            <Button onClick={handleSubmit} disabled={grading || wordCount < 40}>
              {grading ? '评分中…（约 30-90 秒）' : '提交评分'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive mt-2">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
