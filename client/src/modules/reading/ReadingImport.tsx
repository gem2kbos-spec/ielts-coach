import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  parseReadingPdf,
  reparseReadingManualRange,
  importReadingPassages,
  type ReadingPassageDraft,
} from '@/lib/api'

type ManualRange = { title: string; startPage: number; endPage: number }

const TYPE_LABEL: Record<string, string> = {
  true_false_ng: 'T/F/NG',
  multiple_choice: '选择题',
  short_answer: '简答',
}

export default function ReadingImport() {
  const navigate = useNavigate()
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const [previewId, setPreviewId] = useState('')
  const [confidence, setConfidence] = useState<'high' | 'low' | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [passages, setPassages] = useState<ReadingPassageDraft[]>([])
  const [manualRanges, setManualRanges] = useState<ManualRange[]>([])
  const [showManual, setShowManual] = useState(false)

  const handleFile = async (file: File) => {
    setParsing(true)
    setError('')
    try {
      const result = await parseReadingPdf(file)
      setPreviewId(result.previewId)
      setConfidence(result.confidence)
      setPageCount(result.pageCount)
      setPassages(result.passages)
      setShowManual(result.confidence === 'low')
      setManualRanges([{ title: '', startPage: 1, endPage: result.pageCount }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const reparseManually = async () => {
    setParsing(true)
    setError('')
    try {
      const result = await reparseReadingManualRange(previewId, manualRanges)
      setPassages(result)
      setConfidence('high')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setParsing(false)
    }
  }

  const updatePassage = (i: number, patch: Partial<ReadingPassageDraft>) => {
    setPassages((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  const updateQuestion = (pIdx: number, qIdx: number, patch: Partial<ReadingPassageDraft['questions'][0]>) => {
    setPassages((prev) =>
      prev.map((p, idx) =>
        idx === pIdx ? { ...p, questions: p.questions.map((q, j) => (j === qIdx ? { ...q, ...patch } : q)) } : p
      )
    )
  }

  const removePassage = (i: number) => {
    setPassages((prev) => prev.filter((_, idx) => idx !== i))
  }

  const confirmImport = async () => {
    setImporting(true)
    setError('')
    try {
      await importReadingPassages(passages, previewId)
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
      <h1 className="text-2xl font-semibold">导入 PDF 阅读题</h1>

      {passages.length === 0 && (
        <Card>
          <CardContent
            className="py-12 text-center cursor-pointer border-2 border-dashed border-border rounded-lg"
            onClick={() => document.getElementById('reading-pdf-input')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFile(f)
            }}
          >
            <p className="text-sm text-muted-foreground">
              {parsing ? '解析中（包含 AI 生成建议答案，可能要等 10-60 秒）…' : '把含多篇阅读理解的 PDF 拖到这里，或点击选择'}
            </p>
            <input
              id="reading-pdf-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {passages.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant={confidence === 'high' ? 'default' : 'destructive'}>
              {confidence === 'high' ? '自动解析置信度：高' : '自动解析置信度：低，建议检查或手动切分'}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setShowManual((v) => !v)}>
              {showManual ? '收起手动切分' : '手动切分（按页码范围）'}
            </Button>
          </div>

          {showManual && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">按页码范围手动切分（共 {pageCount} 页）</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {manualRanges.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      placeholder={`标题（留空用"第${i + 1}篇"）`}
                      value={r.title}
                      onChange={(e) =>
                        setManualRanges((prev) => prev.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))
                      }
                      className="flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">第</span>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={r.startPage}
                      onChange={(e) =>
                        setManualRanges((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, startPage: Number(e.target.value) } : x))
                        )
                      }
                      className="w-16 rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">到</span>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={r.endPage}
                      onChange={(e) =>
                        setManualRanges((prev) =>
                          prev.map((x, idx) => (idx === i ? { ...x, endPage: Number(e.target.value) } : x))
                        )
                      }
                      className="w-16 rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">页</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setManualRanges((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      删除
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setManualRanges((prev) => [...prev, { title: '', startPage: 1, endPage: pageCount }])}
                  >
                    + 加一段
                  </Button>
                  <Button size="sm" onClick={reparseManually} disabled={parsing}>
                    {parsing ? '重新切分中…' : '按上面的范围重新切分'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-sm text-muted-foreground">下面预览解析结果，确认无误（尤其是 AI 建议的答案）再导入。</p>

          {passages.map((p, pIdx) => (
            <Card key={pIdx}>
              <CardHeader className="flex flex-row items-center justify-between">
                <input
                  value={p.title}
                  onChange={(e) => updatePassage(pIdx, { title: e.target.value })}
                  className="text-base font-semibold rounded-md border border-border bg-transparent px-2 py-1 flex-1 mr-2"
                />
                <Button variant="ghost" size="sm" onClick={() => removePassage(pIdx)}>
                  删除这篇
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  value={p.passageText}
                  onChange={(e) => updatePassage(pIdx, { passageText: e.target.value })}
                  className="w-full min-h-[120px] rounded-md border border-border bg-transparent p-2 text-sm leading-relaxed"
                />
                <div className="space-y-2">
                  {p.questions.map((q, qIdx) => (
                    <div key={qIdx} className="border border-border rounded-md p-2 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant="outline">Q{q.number}</Badge>
                        <Badge variant="secondary">{TYPE_LABEL[q.type] || q.type}</Badge>
                        {q.answer_confidence === 'low' && <Badge variant="destructive">AI答案建议置信度低</Badge>}
                      </div>
                      <input
                        value={q.prompt}
                        onChange={(e) => updateQuestion(pIdx, qIdx, { prompt: e.target.value })}
                        className="w-full rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                      />
                      {q.options && (
                        <p className="text-xs text-muted-foreground">{q.options.join(' | ')}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">正确答案：</span>
                        <input
                          value={q.correct_answer || ''}
                          onChange={(e) => updateQuestion(pIdx, qIdx, { correct_answer: e.target.value })}
                          className="rounded-md border border-border bg-transparent px-2 py-1 text-sm w-40"
                        />
                      </div>
                    </div>
                  ))}
                  {p.questions.length === 0 && (
                    <p className="text-xs text-destructive">没解析到题目，建议用手动切分或检查PDF排版。</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          <Button onClick={confirmImport} disabled={importing}>
            {importing ? '导入中…' : `确认导入这 ${passages.length} 篇`}
          </Button>
        </>
      )}
    </div>
  )
}
