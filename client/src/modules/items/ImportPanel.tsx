import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { FileUp, Files, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { importFile } from '@/lib/api'

type Result = { name: string; ok: boolean; message: string }

export default function ImportPanel() {
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)

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
                支持 `.txt / .pdf / .mp3 / .wav / .m4a / .json`。把资料拖进来后，系统会自动识别并入库到对应模块。
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
