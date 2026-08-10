import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ExternalLink, FileAudio, Link2, Sparkles, UploadCloud, WandSparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  uploadListeningFiles,
  manualPairListening,
  suggestListeningAnswers,
  importListeningSections,
  generateListeningSections,
  type ListeningSectionDraft,
  type ListeningGenerateParams,
} from '@/lib/api'
import { useDraftAutosave } from '@/hooks/useDraftAutosave'
import DraftStatus from '@/components/DraftStatus'

const TYPE_LABEL: Record<string, string> = {
  fill_blank: '填空',
  multiple_choice: '单选',
  multiple_select: '多选',
  matching: '匹配',
  map_label: '地图标注',
}

function answerToText(a: string | string[] | undefined) {
  if (Array.isArray(a)) return a.join(',')
  return a || ''
}

function textToAnswer(text: string, expectedCount?: number) {
  if (expectedCount) return text.split(',').map((s) => s.trim()).filter(Boolean)
  return text
}

export default function ListeningImport() {
  const navigate = useNavigate()
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [suggestingFor, setSuggestingFor] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [generateMessage, setGenerateMessage] = useState('')
  const [generateForm, setGenerateForm] = useState<ListeningGenerateParams>({
    count: 4,
    section: 'mixed',
    difficulty: 'medium',
    topic: '',
    extraRequirements: '',
    voice: '',
    rate: 150,
  })
  const [previewId, setPreviewId] = useState('')
  const [sections, setSections] = useState<ListeningSectionDraft[]>([])
  const [unpaired, setUnpaired] = useState<{ originalname: string; kind: 'audio' | 'question' }[]>([])
  const [pickAudio, setPickAudio] = useState('')
  const [pickQuestion, setPickQuestion] = useState('')
  const autosave = useDraftAutosave({
    storageKey: 'draft:listening-import',
    value: { previewId, sections, unpaired, pickAudio, pickQuestion },
    enabled: sections.length > 0 || unpaired.length > 0 || !!previewId,
    onLoad: (saved: {
      previewId: string
      sections: ListeningSectionDraft[]
      unpaired: { originalname: string; kind: 'audio' | 'question' }[]
      pickAudio: string
      pickQuestion: string
    }) => {
      setPreviewId(saved.previewId || '')
      setSections(saved.sections || [])
      setUnpaired(saved.unpaired || [])
      setPickAudio(saved.pickAudio || '')
      setPickQuestion(saved.pickQuestion || '')
    },
  })

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const result = await uploadListeningFiles(files)
      setPreviewId(result.previewId)
      setSections([...result.batchSections, ...result.pairedSections])
      setUnpaired(result.unpaired)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const doManualPair = async () => {
    if (!pickAudio || !pickQuestion) return
    setError('')
    try {
      const section = await manualPairListening(previewId, pickAudio, pickQuestion)
      setSections((prev) => [...prev, section])
      setUnpaired((prev) => prev.filter((f) => f.originalname !== pickAudio && f.originalname !== pickQuestion))
      setPickAudio('')
      setPickQuestion('')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const updateSection = (i: number, patch: Partial<ListeningSectionDraft>) => {
    setSections((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  const updateQuestion = (sIdx: number, qIdx: number, patch: Partial<ListeningSectionDraft['questions'][0]>) => {
    setSections((prev) =>
      prev.map((s, idx) =>
        idx === sIdx ? { ...s, questions: s.questions.map((q, j) => (j === qIdx ? { ...q, ...patch } : q)) } : s
      )
    )
  }

  const removeSection = (i: number) => {
    setSections((prev) => prev.filter((_, idx) => idx !== i))
  }

  const aiSuggest = async (sIdx: number) => {
    const sec = sections[sIdx]
    if (!sec.transcript) return
    setSuggestingFor(sIdx)
    setError('')
    try {
      const answers = await suggestListeningAnswers(sec.transcript, sec.questions)
      const byNumber = new Map(answers.map((a) => [a.number, a]))
      setSections((prev) =>
        prev.map((s, idx) =>
          idx === sIdx
            ? { ...s, questions: s.questions.map((q) => ({ ...q, correct_answer: byNumber.get(q.number)?.correct_answer ?? q.correct_answer })) }
            : s
        )
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSuggestingFor(null)
    }
  }

  const confirmImport = async () => {
    setImporting(true)
    setError('')
    try {
      await importListeningSections(sections)
      autosave.clear()
      navigate('/listening')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const updateGenerateForm = (patch: Partial<ListeningGenerateParams>) => {
    setGenerateForm((prev) => ({ ...prev, ...patch }))
  }

  const generateSections = async () => {
    setGenerating(true)
    setError('')
    setGenerateMessage('')
    try {
      const result = await generateListeningSections(generateForm)
      const failedText = result.failed.length > 0 ? `，${result.failed.length} 个失败` : ''
      setGenerateMessage(`已生成 ${result.created.length} 个 section${failedText}，已直接存入听力题库。`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">← 返回听力菜单</Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <UploadCloud className="h-3.5 w-3.5 text-primary" />
              Listening Import
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">导入听力题</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                可以同时拖入音频和题目文件。系统会先自动配对，再给你一个可编辑的预览区，确认没问题后再正式入库。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: FileAudio, label: '预览 Section', value: String(sections.length), desc: '当前待导入的 section 数量' },
              { icon: Link2, label: '待手动配对', value: String(unpaired.length), desc: '自动识别失败的文件会留在这里' },
              { icon: Sparkles, label: '当前状态', value: uploading ? '解析中' : importing ? '导入中' : '待上传', desc: uploading ? '系统正在识别题目结构' : importing ? '正在写入题库' : '拖入文件后开始预览' },
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <WandSparkles className="h-4 w-4 text-primary" />
              AI 批量生成原创听力题
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-xs text-muted-foreground">
                生成数量
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={generateForm.count}
                  onChange={(e) => updateGenerateForm({ count: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm text-foreground"
                />
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                Section
                <select
                  value={generateForm.section}
                  onChange={(e) => updateGenerateForm({ section: e.target.value as ListeningGenerateParams['section'] })}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm text-foreground"
                >
                  <option value="mixed">S1-S4 混合</option>
                  <option value="S1">S1 日常对话</option>
                  <option value="S2">S2 社会场景</option>
                  <option value="S3">S3 学术讨论</option>
                  <option value="S4">S4 学术讲座</option>
                </select>
              </label>
              <label className="space-y-1.5 text-xs text-muted-foreground">
                难度
                <select
                  value={generateForm.difficulty}
                  onChange={(e) => updateGenerateForm({ difficulty: e.target.value as ListeningGenerateParams['difficulty'] })}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm text-foreground"
                >
                  <option value="easy">基础</option>
                  <option value="medium">标准</option>
                  <option value="hard">高难</option>
                </select>
              </label>
            </div>
            <input
              value={generateForm.topic || ''}
              onChange={(e) => updateGenerateForm({ topic: e.target.value })}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm"
              placeholder="主题方向，可空：如 campus accommodation, urban transport, environmental science"
            />
            <textarea
              value={generateForm.extraRequirements || ''}
              onChange={(e) => updateGenerateForm({ extraRequirements: e.target.value })}
              className="min-h-[86px] w-full rounded-[22px] border border-border/70 bg-background/70 p-4 text-sm leading-6"
              placeholder="额外要求，可空：比如多出地图题、增加数字干扰、偏学术讲座、答案更容易混淆等。"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-muted-foreground">
                音频默认使用免费的 Edge 神经语音；S1/S3 会按说话人分配不同英音，S2/S4 使用讲座/播报语调。
              </p>
              <Button className="h-11 rounded-2xl px-5" onClick={generateSections} disabled={generating}>
                {generating ? '生成中…' : '生成并入库'}
              </Button>
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
              生成内容为原创 IELTS-like 练习：每个 section 10 题，自动保存题目、答案、原文和音频。Edge 不可用时才会退回本机占位音。
            </p>
            {generateMessage && <p className="text-sm text-primary">{generateMessage}</p>}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">官方素材入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['British Council Listening practice', 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-english-practice-tests/listening'],
              ['IDP Listening practice tests', 'https://ielts.idp.com/prepare/listening/free-practice-tests'],
              ['IELTS.org sample tasks PDF', 'https://ielts.org/cdn/ielts-sample-tests/ielts-listening-sample-tasks-2023.pdf'],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm hover:border-primary/40"
              >
                <span>{label}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
            <p className="text-xs leading-6 text-muted-foreground">
              官方材料请你在浏览器下载到本机后拖入下方导入区。系统只保存你本地导入的文件，不内置第三方版权内容。
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a href="/api/listening/template" className="text-sm text-muted-foreground hover:underline" download>
          下载 JSON 模板（批量导入用）
        </a>
        <div className="flex items-center gap-2">
          <DraftStatus status={autosave.status} onClear={sections.length > 0 || unpaired.length > 0 ? autosave.clear : undefined} compact />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>

      {sections.length === 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardContent
            className="cursor-pointer rounded-[28px] border-2 border-dashed border-border/80 bg-background/45 py-14 text-center"
            onClick={() => document.getElementById('listening-files-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(Array.from(e.dataTransfer.files))
            }}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-lg font-semibold">{uploading ? '上传解析中…' : '拖入音频和题目文件'}</h2>
            <p className="mx-auto mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              支持 `.mp3 / .m4a / .wav / .pdf / .txt / .json`。同名文件会自动配对；也支持批量 JSON 模板配对应音频。
            </p>
            <input
              id="listening-files-input"
              type="file"
              multiple
              accept=".mp3,.m4a,.wav,.pdf,.txt,.json"
              className="hidden"
              onChange={(e) => handleFiles(Array.from(e.target.files || []))}
            />
          </CardContent>
        </Card>
      )}

      {unpaired.length > 0 && (
        <Card className="rounded-[28px] border-border/70 bg-card/85">
          <CardHeader>
            <CardTitle className="text-base">手动配对</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]">
              <select value={pickAudio} onChange={(e) => setPickAudio(e.target.value)} className="h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm">
                <option value="">选音频文件…</option>
                {unpaired.filter((f) => f.kind === 'audio').map((f) => (
                  <option key={f.originalname} value={f.originalname}>{f.originalname}</option>
                ))}
              </select>
              <span className="self-center text-sm text-muted-foreground">对应</span>
              <select value={pickQuestion} onChange={(e) => setPickQuestion(e.target.value)} className="h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm">
                <option value="">选题目文件…</option>
                {unpaired.filter((f) => f.kind === 'question').map((f) => (
                  <option key={f.originalname} value={f.originalname}>{f.originalname}</option>
                ))}
              </select>
              <Button size="sm" className="h-11 rounded-2xl px-5" onClick={doManualPair} disabled={!pickAudio || !pickQuestion}>配对</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.map((s, sIdx) => (
        <Card key={sIdx} className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 lg:flex-row">
              <input
                value={s.title}
                onChange={(e) => updateSection(sIdx, { title: e.target.value })}
                className="h-11 flex-1 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm font-medium"
              />
              <select
                value={s.section || ''}
                onChange={(e) => updateSection(sIdx, { section: e.target.value })}
                className="h-11 rounded-2xl border border-border/70 bg-background/70 px-4 text-sm"
              >
                <option value="">section?</option>
                {['S1', 'S2', 'S3', 'S4'].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
            <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)}>删除</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {s.audioFilename && <Badge variant="outline" className="rounded-full">音频: {s.audioFilename}</Badge>}
              {s.durationSec != null && <Badge variant="outline" className="rounded-full">{Math.round(s.durationSec)} 秒</Badge>}
              {s.audioMissing && <Badge variant="destructive" className="rounded-full">缺音频文件</Badge>}
              {s.parseError && <Badge variant="destructive" className="rounded-full">{s.parseError}</Badge>}
              {s.mapPageGuess && <Badge variant="secondary" className="rounded-full">检测到地图题（第 {s.mapPageGuess} 页）</Badge>}
              <label className="flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1.5">
                作答时长(分钟)
                <input
                  type="number"
                  min={1}
                  value={Math.round((s.defaultDurationSec ?? 600) / 60)}
                  onChange={(e) => updateSection(sIdx, { defaultDurationSec: Math.max(1, Number(e.target.value)) * 60 })}
                  className="w-12 bg-transparent text-center outline-none"
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs text-muted-foreground">听力原文（可选）</p>
              <textarea
                value={s.transcript || ''}
                onChange={(e) => updateSection(sIdx, { transcript: e.target.value })}
                className="min-h-[110px] w-full rounded-[24px] border border-border/70 bg-background/70 p-4 text-sm leading-7"
                placeholder="粘贴听力原文…"
              />
              {s.transcript && (
                <Button size="sm" variant="outline" className="mt-3 rounded-2xl px-4" onClick={() => aiSuggest(sIdx)} disabled={suggestingFor === sIdx}>
                  {suggestingFor === sIdx ? 'AI 生成中…' : 'AI 辅助填充答案'}
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {s.questions.map((q, qIdx) => (
                <div key={qIdx} className="space-y-3 rounded-[24px] border border-border/70 bg-background/55 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="outline" className="rounded-full">Q{q.number}</Badge>
                    <Badge variant="secondary" className="rounded-full">{TYPE_LABEL[q.type] || q.type}</Badge>
                    {q.expectedCount && <Badge variant="outline" className="rounded-full">选 {q.expectedCount} 个</Badge>}
                  </div>
                  <input
                    value={q.prompt}
                    onChange={(e) => updateQuestion(sIdx, qIdx, { prompt: e.target.value })}
                    className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm"
                  />
                  {q.options && <p className="text-xs leading-6 text-muted-foreground">{q.options.join(' | ')}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="text-xs text-muted-foreground">正确答案{q.expectedCount ? '（逗号分隔）' : ''}</span>
                    <input
                      value={answerToText(q.correct_answer)}
                      onChange={(e) => updateQuestion(sIdx, qIdx, { correct_answer: textToAnswer(e.target.value, q.expectedCount) })}
                      className="h-11 w-full rounded-2xl border border-border/70 bg-background/70 px-4 text-sm sm:max-w-[240px]"
                    />
                  </div>
                </div>
              ))}
              {s.questions.length === 0 && <p className="text-xs text-destructive">没解析到题目，检查一下题目文件格式。</p>}
            </div>
          </CardContent>
        </Card>
      ))}

      {sections.length > 0 && (
        <Button className="rounded-2xl px-5" onClick={confirmImport} disabled={importing}>
          {importing ? '导入中…' : `确认导入这 ${sections.length} 个 section`}
        </Button>
      )}
    </div>
  )
}
