import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="max-w-2xl mx-auto p-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold mt-4 mb-1">题库导入</h1>
      <p className="text-muted-foreground mb-6">
        支持 .txt / .pdf / .mp3(.wav/.m4a) / .json，拖进来或点击选择文件。
      </p>

      <div
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
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
          dragging ? 'border-primary bg-accent' : 'border-border'
        }`}
      >
        <p className="text-sm text-muted-foreground">
          {busy ? '正在导入…' : '把文件拖到这里，或点击选择'}
        </p>
        <input
          id="import-file-input"
          type="file"
          multiple
          className="hidden"
          accept=".txt,.pdf,.mp3,.wav,.m4a,.json"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="mt-6 space-y-2">
        {results.map((r, i) => (
          <Card key={i}>
            <CardContent className="flex items-center justify-between py-3">
              <span className="text-sm">{r.name}</span>
              <Badge variant={r.ok ? 'default' : 'destructive'}>{r.message}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
