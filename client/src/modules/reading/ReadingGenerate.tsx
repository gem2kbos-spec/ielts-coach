import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  generateReadingPreview,
  importReadingPassages,
  type ReadingGenerateParams,
  type ReadingPassageDraft,
} from '@/lib/api'

const DIFFICULTY_OPTIONS: { key: 'easy' | 'medium' | 'hard'; label: string; hint: string }[] = [
  { key: 'easy', label: '简单', hint: 'band 5-6，词汇基础，逻辑直接' },
  { key: 'medium', label: '中等', hint: 'band 6.5-7，有一定干扰项' },
  { key: 'hard', label: '困难', hint: 'band 7.5-8+，长难句多，题目陷阱多' },
]

const QUESTION_TYPE_OPTIONS: { key: string; label: string }[] = [
  { key: 'true_false_ng', label: 'T/F/NG' },
  { key: 'matching_heading', label: 'Matching Headings' },
  { key: 'summary_completion', label: 'Summary Completion' },
  { key: 'sentence_completion', label: 'Sentence Completion' },
  { key: 'multiple_choice', label: 'Multiple Choice' },
  { key: 'short_answer', label: 'Short Answer' },
  { key: 'matching_information', label: 'Matching Information' },
  { key: 'table_completion', label: 'Note/Table/Flow-chart Completion' },
]

export default function ReadingGenerate() {
  const navigate = useNavigate()
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('')
  const [topic, setTopic] = useState('')
  const [types, setTypes] = useState<string[]>([])
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [draft, setDraft] = useState<ReadingPassageDraft | null>(null)
  const [meta, setMeta] = useState<{ weakTypesUsed: string[]; reinforcementWordsUsed: string[] } | null>(null)
  const [error, setError] = useState('')

  const toggleType = (key: string) => {
    setTypes((prev) => (prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]))
  }

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const params: ReadingGenerateParams = {
        difficulty: difficulty || undefined,
        topic: topic || undefined,
        questionTypes: types.length ? types : undefined,
        extraRequirements: extra || undefined,
      }
      const result = await generateReadingPreview(params)
      setDraft(result.draft)
      setMeta({ weakTypesUsed: result.weakTypesUsed, reinforcementWordsUsed: result.reinforcementWordsUsed })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const confirmImport = async () => {
    if (!draft) return
    setImporting(true)
    setError('')
    try {
      await importReadingPassages([draft])
      navigate('/reading')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      <Link to="/reading" className="text-sm text-muted-foreground hover:underline">
        ← 返回阅读菜单
      </Link>
      <h1 className="text-2xl font-semibold">AI 生成阅读文章</h1>

      {!draft && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div>
              <p className="text-sm font-medium mb-2">难度（留空自动决定）</p>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <Button
                    key={d.key}
                    type="button"
                    variant={difficulty === d.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDifficulty(difficulty === d.key ? '' : d.key)}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
              {difficulty && <p className="text-xs text-muted-foreground mt-1">{DIFFICULTY_OPTIONS.find((d) => d.key === difficulty)?.hint}</p>}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">主题关键词（留空随机选题）</p>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：人工智能 / 气候变化 / 古罗马建筑"
                className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">题型偏好（留空按你的弱项自动分配，多选）</p>
              <div className="flex flex-wrap gap-2">
                {QUESTION_TYPE_OPTIONS.map((t) => (
                  <Badge
                    key={t.key}
                    variant={types.includes(t.key) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleType(t.key)}
                  >
                    {t.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">附加要求（自由输入，留空不附加）</p>
              <textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="例如：多出现学术词汇 / 句子不要太长 / 多考推断题"
                className="w-full min-h-[60px] rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
              />
            </div>

            <Button onClick={generate} disabled={generating} className="w-full">
              {generating ? '生成中（预计10-90秒，正文较长会偏慢）…' : '生成'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      {draft && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>AI生成</Badge>
            <Badge variant="outline">难度：{draft.difficulty}</Badge>
            {draft.topicTag && <Badge variant="outline">主题：{draft.topicTag}</Badge>}
            {meta?.weakTypesUsed && meta.weakTypesUsed.length > 0 && (
              <Badge variant="secondary">已针对薄弱题型：{meta.weakTypesUsed.join('、')}</Badge>
            )}
            {meta?.reinforcementWordsUsed && meta.reinforcementWordsUsed.length > 0 && (
              <Badge variant="secondary">植入待巩固词：{meta.reinforcementWordsUsed.join('、')}</Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{draft.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{draft.passageText}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">题目预览（{draft.questions.length} 题）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {draft.questions.map((q) => (
                <div key={q.number} className="border-b border-border pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">Q{q.number}</Badge>
                    <Badge variant="secondary">{q.type}</Badge>
                  </div>
                  <p className="text-sm">{q.prompt}</p>
                  {q.options && <p className="text-xs text-muted-foreground mt-1">{q.options.join(' | ')}</p>}
                  <p className="text-xs mt-1">
                    正确答案：<span className="font-medium">{q.correct_answer}</span>
                  </p>
                  {q.explanation && <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={confirmImport} disabled={importing}>
              {importing ? '导入中…' : '确认入库'}
            </Button>
            <Button variant="outline" onClick={generate} disabled={generating}>
              {generating ? '重新生成中…' : '重新生成（保留参数）'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null)
                setMeta(null)
              }}
            >
              修改参数
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}
