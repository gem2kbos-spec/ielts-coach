import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BackupPage() {
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const doRestore = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    if (confirmText !== '恢复') {
      setError('请在下面输入"恢复"两个字确认，避免误操作覆盖现有数据')
      return
    }
    setRestoring(true)
    setError('')
    setMessage('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/backup/import', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '恢复失败')
      setMessage(`恢复完成：数据库${data.restoredDb ? '已替换' : '未包含'}，恢复了 ${data.restoredFiles} 个文件。刷新一下其他页面看看数据是否回来了。`)
      setConfirmText('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 返回仪表板
      </Link>
      <h1 className="text-2xl font-semibold">数据备份</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导出备份</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            打包当前数据库(所有练习记录/题库/词汇) + 导入的阅读PDF/听力音频文件 + 口语录音，下载成一个zip文件。建议定期导出存到云盘或U盘，电脑本身没有自动备份。
          </p>
          <a href="/api/backup/export" download>
            <Button>导出备份</Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">恢复备份</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            会用备份里的数据库整体替换当前数据库（替换前会自动留一份当前数据库的副本在 data 目录，文件名带"before-restore"，万一恢复错了可以手动找回）。题库/录音文件是补充式恢复，不会删除现有文件。
          </p>
          <input ref={fileRef} type="file" accept=".zip" className="text-sm" />
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder='输入"恢复"确认'
            className="block rounded-md border border-border bg-transparent px-2 py-1 text-sm w-40"
          />
          <Button variant="destructive" onClick={doRestore} disabled={restoring}>
            {restoring ? '恢复中…' : '恢复备份'}
          </Button>
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
