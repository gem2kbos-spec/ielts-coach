import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ShieldAlert, Upload } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import FloatingToast from '@/components/FloatingToast'

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
      setError('请在下面输入“恢复”确认，避免误操作覆盖现有数据。')
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
      setMessage(`恢复完成：数据库${data.restoredDb ? '已替换' : '未包含'}，恢复了 ${data.restoredFiles} 个文件。`)
      setConfirmText('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">
        ← 返回仪表板
      </Link>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-primary" />
              Backup & Restore
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">数据备份</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                导出当前数据库、题库文件和录音素材；需要时也可以从备份包恢复。这里属于高风险操作区，所以恢复流程保留了明确确认。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: Download, label: '建议频率', value: '定期导出', desc: '尤其在做了大量练习或导入新题后' },
              { icon: Upload, label: '恢复方式', value: '手动确认', desc: '避免误覆盖本地现有数据' },
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base">导出备份</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              打包当前数据库、导入的阅读 PDF、听力音频文件和口语录音，下载成一个 zip 文件。建议定期导出存到云盘或外接设备。
            </p>
            <a href="/api/backup/export" download>
              <Button className="rounded-full px-5">导出备份</Button>
            </a>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-destructive/25 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <CardHeader>
            <CardTitle className="text-base text-destructive">恢复备份</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              恢复会用备份里的数据库整体替换当前数据库。恢复前会自动保留一份当前数据库副本到 `data` 目录，文件名带 `before-restore`。
            </p>
            <input ref={fileRef} type="file" accept=".zip" className="text-sm" />
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder='输入“恢复”确认'
              className="max-w-[180px]"
            />
            <Button variant="destructive" className="rounded-full px-5" onClick={doRestore} disabled={restoring}>
              {restoring ? '恢复中…' : '恢复备份'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>

      {message && <FloatingToast message={message} tone="success" />}
    </div>
  )
}
