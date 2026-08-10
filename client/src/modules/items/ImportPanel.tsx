import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardPaste, Eye, FileUp, Files, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  importFile,
  importPastedQuestions,
  previewPastedQuestions,
  type PastedQuestionPreview,
} from '@/lib/api'

type Result = { name: string; ok: boolean; message: string }

export default function ImportPanel() {
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteBusy, setPasteBusy] = useState(false)
  const [pasteError, setPasteError] = useState('')
  const [pastePreview, setPastePreview] = useState<PastedQuestionPreview | null>(null)
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setBusy(true)
    const next: Result[] = []
    for (const file of Array.from(files)) {
      try {
        const created = await importFile(file)
        next.push({
          name: file.name,
          ok: true,
          message: `已入库 ${created.length} 条（module=${created[0]?.module}, subtype=${created[0]?.subtype}）`,
        })
      } catch (err) {
        next.push({ name: file.name, ok: false, message: (err as Error).message })
      }
    }
    setResults((prev) => [...next, ...prev])
    setBusy(false)
  }, [])

  const previewPaste = async () => {
    setPasteBusy(true)
    setPasteError('')
    try {
      setPastePreview(await previewPastedQuestions(pasteText))
    } catch (err) {
      setPastePreview(null)
      setPasteError((err as Error).message)
    } finally {
      setPasteBusy(false)
    }
  }

  const importPaste = async () => {
    setPasteBusy(true)
    setPasteError('')
    try {
      const imported = await importPastedQuestions(pasteText, difficulty)
      setResults((prev) => [
        {
          name: pastePreview?.title || '粘贴题库',
          ok: true,
          message: `已导入 ${imported.questionCount} 道题，可在阅读题库的“真题导入”中开始作答`,
        },
        ...prev,
      ])
      setPastePreview(null)
      setPasteText('')
    } catch (err) {
      setPasteError((err as Error).message)
    } finally {
      setPasteBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <FileUp className="h-3.5 w-3.5 text-primary" />
              Import Center
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">题库导入</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                可以直接粘贴题目文字，也支持 `.txt / .pdf / .mp3 / .wav / .m4a / .json` 文件。文字题会先解析预览，确认格式完整后才入库。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: Files, label: '支持格式', value: '6 类', desc: '文本、PDF、音频和 JSON' },
              { icon: Sparkles, label: '最近导入', value: String(results.length), desc: '本次页面里已处理的文件数' },
              { icon: FileUp, label: '当前状态', value: busy ? '处理中' : '待上传', desc: busy ? '正在逐个解析并写入题库' : '可以继续拖拽或点选文件' },
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

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardContent className="space-y-5 p-6 sm:p-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <ClipboardPaste className="h-4 w-4" />
                直接粘贴题目
              </div>
              <h2 className="mt-2 text-xl font-semibold">粘贴后自动拆分题干、选项、答案和解析</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                每题用“1. 题干”开头；选项使用 A./B./C./D.；答案写“答案：B”；解析可写一行或多行。文章内容可以放在第 1 题之前。
              </p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
              难度
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="h-10 rounded-xl border border-border bg-background px-3 text-foreground outline-none focus:border-primary"
              >
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </label>
          </div>

          <textarea
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value)
              setPastePreview(null)
              setPasteError('')
            }}
            placeholder={`标题：可选的题组名称\n\n1. What is the main purpose of the passage?\nA. To explain a change\nB. To compare two methods\nC. To describe an experiment\nD. To criticise a policy\n答案：A\n解析：原文第一段明确说明……`}
            className="min-h-[280px] w-full resize-y rounded-2xl border border-border bg-background/75 p-4 font-mono text-sm leading-7 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">已输入 {pasteText.length.toLocaleString()} 个字符 · 单次最多约 12 万字符</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={previewPaste} disabled={pasteBusy || !pasteText.trim()} className="rounded-full">
                <Eye className="mr-2 h-4 w-4" />
                {pasteBusy ? '正在解析…' : '解析并预览'}
              </Button>
              <Button onClick={importPaste} disabled={pasteBusy || !pastePreview?.canImport} className="rounded-full">
                <FileUp className="mr-2 h-4 w-4" />
                确认导入
              </Button>
            </div>
          </div>

          {pasteError && <div className="rounded-2xl border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive">{pasteError}</div>}

          {pastePreview && (
            <div className="space-y-4 rounded-2xl border border-border bg-background/55 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{pastePreview.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">识别到 {pastePreview.questions.length} 道题</div>
                </div>
                <Badge variant={pastePreview.canImport ? 'default' : 'destructive'} className="rounded-full">
                  {pastePreview.canImport ? '格式完整，可以导入' : `需要修正 ${pastePreview.warnings.length} 处`}
                </Badge>
              </div>
              {pastePreview.warnings.length > 0 && (
                <ul className="space-y-1 rounded-xl bg-destructive/8 p-3 text-sm text-destructive">
                  {pastePreview.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                </ul>
              )}
              <div className="grid gap-3 lg:grid-cols-2">
                {pastePreview.questions.slice(0, 6).map((q) => (
                  <div key={q.number} className="rounded-xl border border-border/70 bg-card p-4">
                    <div className="text-sm font-medium">{q.number}. {q.prompt}</div>
                    {q.options && <div className="mt-2 text-xs leading-6 text-muted-foreground">{q.options.join(' · ')}</div>}
                    <div className="mt-2 text-xs text-primary">答案：{q.correct_answer || '缺失'}</div>
                  </div>
                ))}
              </div>
              {pastePreview.questions.length > 6 && <p className="text-xs text-muted-foreground">其余 {pastePreview.questions.length - 6} 道题将在导入时一并保存。</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardContent
          className={`cursor-pointer rounded-[28px] border-2 border-dashed p-10 text-center transition-colors sm:p-14 ${
            dragging ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/45'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => document.getElementById('import-file-input')?.click()}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileUp className="h-6 w-6" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">{busy ? '正在导入文件…' : '把文件拖到这里，或点击选择'}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            单次可以丢多个文件进来。导入结果会按时间顺序出现在下方，方便你检查哪些文件成功入库，哪些还需要重试。
          </p>
          <input
            id="import-file-input"
            type="file"
            multiple
            className="hidden"
            accept=".txt,.pdf,.mp3,.wav,.m4a,.json"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </CardContent>
      </Card>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((r, i) => (
            <Card key={`${r.name}-${i}`} className="rounded-[24px] border-border/70 bg-card/85">
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.name}</div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{r.message}</p>
                </div>
                <Badge variant={r.ok ? 'default' : 'destructive'} className="rounded-full px-3 py-1">
                  {r.ok ? '已导入' : '失败'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
