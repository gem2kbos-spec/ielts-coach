import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  uploadListeningFiles,
  manualPairListening,
  suggestListeningAnswers,
  importListeningSections,
  type ListeningSectionDraft,
} from '@/lib/api'

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
  const [suggestingFor, setSuggestingFor] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [sections, setSections] = useState<ListeningSectionDraft[]>([])
  const [unpaired, setUnpaired] = useState<{ originalname: string; kind: 'audio' | 'question' }[]>([])
  const [pickAudio, setPickAudio] = useState('')
  const [pickQuestion, setPickQuestion] = useState('')

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
      navigate('/listening')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-4">
      <Link to="/listening" className="text-sm text-muted-foreground hover:underline">
        ← 返回听力菜单
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">导入听力题</h1>
        <a href="/api/listening/template" className="text-sm text-muted-foreground hover:underline" download>
          下载JSON模板（批量导入用）
        </a>
      </div>

      {sections.length === 0 && (
        <Card>
          <CardContent
            className="py-12 text-center cursor-pointer border-2 border-dashed border-border rounded-lg"
            onClick={() => document.getElementById('listening-files-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(Array.from(e.dataTransfer.files))
            }}
          >
            <p className="text-sm text-muted-foreground">
              {uploading
                ? '上传解析中…'
                : '把音频(mp3/m4a/wav)和题目文件(pdf/txt/json)一起拖进来，同名文件会自动配对；也可以拖入批量JSON模板+对应音频'}
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      {unpaired.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">这些文件没有自动配对成功，手动指定一下</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 items-center">
              <select value={pickAudio} onChange={(e) => setPickAudio(e.target.value)} className="rounded-md border border-border bg-transparent px-2 py-1 text-sm flex-1">
                <option value="">选音频文件…</option>
                {unpaired.filter((f) => f.kind === 'audio').map((f) => (
                  <option key={f.originalname} value={f.originalname}>{f.originalname}</option>
                ))}
              </select>
              <span className="text-sm text-muted-foreground">对应</span>
              <select value={pickQuestion} onChange={(e) => setPickQuestion(e.target.value)} className="rounded-md border border-border bg-transparent px-2 py-1 text-sm flex-1">
                <option value="">选题目文件…</option>
                {unpaired.filter((f) => f.kind === 'question').map((f) => (
                  <option key={f.originalname} value={f.originalname}>{f.originalname}</option>
                ))}
              </select>
              <Button size="sm" onClick={doManualPair} disabled={!pickAudio || !pickQuestion}>配对</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sections.map((s, sIdx) => (
        <Card key={sIdx}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <input
              value={s.title}
              onChange={(e) => updateSection(sIdx, { title: e.target.value })}
              className="text-base font-semibold rounded-md border border-border bg-transparent px-2 py-1 flex-1"
            />
            <select
              value={s.section || ''}
              onChange={(e) => updateSection(sIdx, { section: e.target.value })}
              className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
            >
              <option value="">section?</option>
              {['S1', 'S2', 'S3', 'S4'].map((s2) => (
                <option key={s2} value={s2}>{s2}</option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => removeSection(sIdx)}>删除</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {s.audioFilename && <Badge variant="outline">音频: {s.audioFilename}</Badge>}
              {s.durationSec != null && <Badge variant="outline">{Math.round(s.durationSec)}秒</Badge>}
              {s.audioMissing && <Badge variant="destructive">缺音频文件</Badge>}
              {s.parseError && <Badge variant="destructive">{s.parseError}</Badge>}
              {s.mapPageGuess && <Badge variant="secondary">检测到地图/示意图题(第{s.mapPageGuess}页)</Badge>}
              <label className="flex items-center gap-1">
                作答时长(分钟):
                <input
                  type="number"
                  min={1}
                  value={Math.round((s.defaultDurationSec ?? 600) / 60)}
                  onChange={(e) => updateSection(sIdx, { defaultDurationSec: Math.max(1, Number(e.target.value)) * 60 })}
                  className="w-14 rounded-md border border-border bg-transparent px-1 py-0.5 text-xs"
                />
              </label>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">听力原文(可选，粘贴后可点"AI辅助填充答案"，做完题后也会用来高亮答案句)</p>
              <textarea
                value={s.transcript || ''}
                onChange={(e) => updateSection(sIdx, { transcript: e.target.value })}
                className="w-full min-h-[80px] rounded-md border border-border bg-transparent p-2 text-sm leading-relaxed"
                placeholder="粘贴听力原文…"
              />
              {s.transcript && (
                <Button size="sm" variant="outline" className="mt-1" onClick={() => aiSuggest(sIdx)} disabled={suggestingFor === sIdx}>
                  {suggestingFor === sIdx ? 'AI生成中…' : 'AI辅助填充答案'}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {s.questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-border rounded-md p-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">Q{q.number}</Badge>
                    <Badge variant="secondary">{TYPE_LABEL[q.type] || q.type}</Badge>
                    {q.expectedCount && <Badge variant="outline">选{q.expectedCount}个</Badge>}
                  </div>
                  <input
                    value={q.prompt}
                    onChange={(e) => updateQuestion(sIdx, qIdx, { prompt: e.target.value })}
                    className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                  />
                  {q.options && <p className="text-xs text-muted-foreground">{q.options.join(' | ')}</p>}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">正确答案{q.expectedCount ? '(逗号分隔)' : ''}：</span>
                    <input
                      value={answerToText(q.correct_answer)}
                      onChange={(e) => updateQuestion(sIdx, qIdx, { correct_answer: textToAnswer(e.target.value, q.expectedCount) })}
                      className="rounded-md border border-border bg-transparent px-2 py-1 text-sm w-40"
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
        <Button onClick={confirmImport} disabled={importing}>
          {importing ? '导入中…' : `确认导入这 ${sections.length} 个section`}
        </Button>
      )}
    </div>
  )
}
