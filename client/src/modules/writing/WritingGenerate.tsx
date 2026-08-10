import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, FilePenLine, Wand2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input, Textarea } from '@/components/ui/input'
import { generateWritingPreview, saveWritingItem, type WritingGenerateParams } from '@/lib/api'
import Task1Chart from './Task1Chart'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'

const TASK_TYPES = [
  { key: 'task2', label: 'Task 2', hint: '议论文（250字起，40分钟）' },
  { key: 'task1', label: 'Task 1', hint: '图表描述（150字起，20分钟）' },
]

const ESSAY_TYPES = [
  { key: 'opinion', label: 'Opinion', hint: '同意/不同意' },
  { key: 'discussion', label: 'Discussion', hint: '双边讨论' },
  { key: 'problem_solution', label: 'Problem/Solution', hint: '问题与解决方案' },
  { key: 'advantage_disadvantage', label: 'Adv/Disadv', hint: '优缺点分析' },
]

const CHART_TYPES = [
  { key: 'bar', label: 'Bar Chart', hint: '柱状图' },
  { key: 'line', label: 'Line Graph', hint: '折线图' },
  { key: 'pie', label: 'Pie Chart', hint: '饼图' },
  { key: 'table', label: 'Table', hint: '表格' },
]

const DIFFICULTY_OPTIONS = [
  { key: 'easy', label: '简单', hint: 'Band 5-6' },
  { key: 'medium', label: '中等', hint: 'Band 6.5-7' },
  { key: 'hard', label: '困难', hint: 'Band 7.5-8+' },
]

const ESSAY_TYPE_LABEL: Record<string, string> = {
  opinion: 'Opinion',
  discussion: 'Discussion',
  problem_solution: 'Problem/Solution',
  advantage_disadvantage: 'Adv/Disadv',
}

export default function WritingGenerate() {
  const navigate = useNavigate()
  const [taskType, setTaskType] = useState<'task1' | 'task2'>('task2')
  const [essayType, setEssayType] = useState('')
  const [chartType, setChartType] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<{ taskType: 'task1' | 'task2'; content: Record<string, unknown> } | null>(null)
  const [error, setError] = useState('')
  const autosave = useDraftAutosave({
    storageKey: 'draft:writing-generate',
    value: { taskType, essayType, chartType, topic, difficulty, extra },
    enabled: !draft,
    restoreMode: 'manual',
    onLoad: (saved: { taskType: 'task1' | 'task2'; essayType: string; chartType: string; topic: string; difficulty: 'easy' | 'medium' | 'hard' | ''; extra: string }) => {
      setTaskType(saved.taskType || 'task2')
      setEssayType(saved.essayType || '')
      setChartType(saved.chartType || '')
      setTopic(saved.topic || '')
      setDifficulty(saved.difficulty || '')
      setExtra(saved.extra || '')
    },
  })

  const generate = async () => {
    setGenerating(true)
    setError('')
    try {
      const params: WritingGenerateParams = {
        taskType,
        topic: topic || undefined,
        difficulty: difficulty || undefined,
        extraRequirements: extra || undefined,
        ...(taskType === 'task2' ? { essayType: essayType || undefined } : { chartType: chartType || undefined }),
      }
      const result = await generateWritingPreview(params)
      setDraft({ taskType: result.taskType, content: result.content })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const confirmAndStart = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const { id } = await saveWritingItem({ taskType: draft.taskType, content: draft.content, difficulty: difficulty || 'medium' })
      autosave.clear()
      // Store the new item id so the exam page picks it up immediately
      sessionStorage.setItem('writing_generated_id', id)
      navigate(`/writing/${draft.taskType}?generated=${id}`)
    } catch (e) {
      setError((e as Error).message)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 lg:pr-44">
        <Link to="/writing" className="text-sm text-muted-foreground hover:underline">
          ← 返回写作菜单
        </Link>
        {!draft && (
          <div className="flex flex-wrap justify-end gap-2">
            {autosave.hasSavedDraft && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={autosave.restore}>
                恢复上次参数
              </Button>
            )}
            <DraftStatus status={autosave.status} onClear={autosave.hasSavedDraft ? autosave.clear : undefined} compact />
          </div>
        )}
      </div>
      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-xs text-muted-foreground backdrop-blur-xl">
              <Bot className="h-3.5 w-3.5 text-primary" />
              Writing Generator
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">AI 生成写作题目</h1>
              <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                先写要求，系统先给你一个预览；确认后再存入题库并直接进入练习。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: FilePenLine, label: '覆盖范围', value: 'Task 1 / 2', desc: '支持图表题和议论文' },
              { icon: Wand2, label: '工作方式', value: '先预览', desc: '先看题目，再决定是否入库' },
              { icon: Bot, label: '当前状态', value: draft ? '已生成预览' : generating ? '生成中' : '待输入', desc: draft ? '确认后可直接开始写' : generating ? 'AI 正在构造题目' : '先填条件再生成' },
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
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="rounded-[28px]">
            <CardContent className="space-y-6 p-6 sm:p-7">
            {/* Task type */}
            <div>
              <p className="text-sm font-medium mb-2">题型</p>
              <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background/44 p-1.5 backdrop-blur-xl">
                {TASK_TYPES.map((t) => (
                  <Button
                    key={t.key}
                    type="button"
                    variant={taskType === t.key ? 'default' : 'ghost'}
                    onClick={() => { setTaskType(t.key as 'task1' | 'task2'); setEssayType(''); setChartType('') }}
                    className="h-auto min-h-12 rounded-xl px-4 py-2"
                  >
                    <span>{t.label}</span>
                    <span className="ml-1.5 text-xs opacity-70">{t.hint}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Task2: essay type */}
            {taskType === 'task2' && (
              <div>
                <p className="text-sm font-medium mb-2">文章类型（留空随机）</p>
                <div className="flex flex-wrap gap-2">
                  {ESSAY_TYPES.map((t) => (
                    <Button
                      key={t.key}
                      type="button"
                      size="sm"
                      variant={essayType === t.key ? 'default' : 'outline'}
                      className="rounded-full"
                      onClick={() => setEssayType(essayType === t.key ? '' : t.key)}
                    >
                      {t.label}
                      <span className="ml-1 text-xs opacity-70">{t.hint}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Task1: chart type */}
            {taskType === 'task1' && (
              <div>
                <p className="text-sm font-medium mb-2">图表类型（留空随机）</p>
                <div className="flex flex-wrap gap-2">
                  {CHART_TYPES.map((t) => (
                    <Button
                      key={t.key}
                      type="button"
                      size="sm"
                      variant={chartType === t.key ? 'default' : 'outline'}
                      className="rounded-full"
                      onClick={() => setChartType(chartType === t.key ? '' : t.key)}
                    >
                      {t.label}
                      <span className="ml-1 text-xs opacity-70">{t.hint}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Difficulty */}
            <div>
              <p className="text-sm font-medium mb-2">难度（留空中等）</p>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((d) => (
                  <Button
                    key={d.key}
                    type="button"
                    size="sm"
                    variant={difficulty === d.key ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setDifficulty(difficulty === d.key ? '' : d.key as 'easy' | 'medium' | 'hard')}
                  >
                    {d.label}
                    <span className="ml-1 text-xs opacity-70">{d.hint}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Topic */}
            <div>
              <p className="text-sm font-medium mb-2">主题关键词（留空随机出题）</p>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={taskType === 'task2' ? '例如：教育 / 科技 / 城市化 / 环境' : '例如：能源消费 / 大学专业 / 交通方式'}
              />
            </div>

            {/* Extra */}
            <div>
              <p className="text-sm font-medium mb-2">附加要求（留空不附加）</p>
              <Textarea
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={taskType === 'task2'
                  ? '例如：偏社会类话题 / 需要举具体例子 / 不要和技术相关'
                  : '例如：多个时间段对比 / 包含百分比数据 / 三组数据以上'}
                className="min-h-[92px]"
              />
            </div>

            <Button onClick={generate} disabled={generating} className="w-full rounded-full">
              {generating ? '生成中（约 10-30 秒）…' : '生成题目'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card className="h-fit rounded-[28px]">
            <CardHeader>
              <CardTitle className="text-base">生成建议</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>主题词写得越具体，题目越像你想要的方向。</p>
              <p>Task 2 可以只定话题，不定题型，让系统自己随机出更贴近正式考试的问法。</p>
              <p>Task 1 附加要求里写“多个时间段”或“包含百分比”，图表会更有可写性。</p>
            </CardContent>
          </Card>
        </div>
      )}

      {draft && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge>AI生成</Badge>
            <Badge variant="outline">{draft.taskType === 'task2' ? 'Task 2' : 'Task 1'}</Badge>
            {difficulty && <Badge variant="outline">{DIFFICULTY_OPTIONS.find((d) => d.key === difficulty)?.label}</Badge>}
            {draft.taskType === 'task2' && typeof draft.content.essay_type === 'string' && (
              <Badge variant="secondary">{ESSAY_TYPE_LABEL[draft.content.essay_type] || draft.content.essay_type}</Badge>
            )}
            {draft.taskType === 'task1' && typeof draft.content.chartType === 'string' && (
              <Badge variant="secondary">{String(draft.content.chartType)}</Badge>
            )}
          </div>

          {/* Task2 preview */}
          {draft.taskType === 'task2' && (
            <Card className="rounded-[28px] border-primary/15">
              <CardHeader>
                <CardTitle className="text-base">题目</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="leading-8 text-[15px]">{draft.content.prompt as string}</p>
              </CardContent>
            </Card>
          )}

          {/* Task1 preview */}
          {draft.taskType === 'task1' && (
            <Card className="rounded-[28px] border-primary/15">
              <CardHeader>
                <CardTitle className="text-base">题目</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="leading-8 text-[15px]">{draft.content.description as string}</p>
                <Task1Chart content={draft.content as Parameters<typeof Task1Chart>[0]['content']} />
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmAndStart} disabled={saving} className="rounded-full">
              {saving ? '保存中…' : '存入题库并开始练习 →'}
            </Button>
            <Button variant="outline" onClick={generate} disabled={generating} className="rounded-full">
              {generating ? '重新生成中…' : '重新生成'}
            </Button>
            <Button variant="ghost" className="rounded-full" onClick={() => { setDraft(null); setError('') }}>
              修改参数
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}
