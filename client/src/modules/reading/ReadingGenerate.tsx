import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import {
  generateReadingPreview,
  importReadingPassages,
  type ReadingGenerateParams,
  type ReadingPassageDraft,
} from '@/lib/api'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'
import { Bot, BookOpen, ListChecks, Sparkles } from 'lucide-react'

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
  const autosave = useDraftAutosave({
    storageKey: 'draft:reading-generate',
    value: { difficulty, topic, types, extra },
    enabled: !draft,
    restoreMode: 'manual',
    onLoad: (saved: { difficulty: 'easy' | 'medium' | 'hard' | ''; topic: string; types: string[]; extra: string }) => {
      setDifficulty(saved.difficulty || '')
      setTopic(saved.topic || '')
      setTypes(saved.types || [])
      setExtra(saved.extra || '')
    },
  })

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
      autosave.clear()
      navigate('/reading')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between lg:pr-44">
        <Link to="/reading" className="text-sm text-muted-foreground hover:underline">
          ← 返回阅读题库
        </Link>
        {!draft && (
          <div className="flex justify-end gap-2">
            {autosave.hasSavedDraft && (
              <Button variant="outline" size="sm" onClick={autosave.restore}>
                恢复上次参数
              </Button>
            )}
            <DraftStatus status={autosave.status} onClear={autosave.hasSavedDraft ? autosave.clear : undefined} compact />
          </div>
        )}
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Reading Generator
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">AI 生成阅读文章</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                输入主题、题型和难度，先预览文章和题目，再决定是否存入题库。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: BookOpen, label: '文章', value: draft ? '已生成' : '待生成', desc: '生成完整 passage 与题目' },
              { icon: ListChecks, label: '题型', value: types.length ? String(types.length) : '自动', desc: '可手动指定或按弱项分配' },
              { icon: Sparkles, label: '模式', value: '先预览', desc: '确认后再写入题库' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/48 p-4 backdrop-blur-xl">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-border/70 bg-card/55 text-primary">
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

      {!draft && (
        <Card className="rounded-[28px]">
          <CardContent className="space-y-5 p-6 sm:p-7">
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
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例如：人工智能 / 气候变化 / 古罗马建筑"
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
              <Textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="例如：多出现学术词汇 / 句子不要太长 / 多考推断题"
                className="min-h-[86px]"
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
                  {q.instructions && <p className="mb-1 text-xs leading-5 text-muted-foreground">{q.instructions}</p>}
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
