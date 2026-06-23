import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listListeningSections, type ListeningSectionListItem } from '@/lib/api'

type Tab = 'all' | 'done' | 'todo'

export default function ListeningMenu() {
  const [sections, setSections] = useState<ListeningSectionListItem[] | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    listListeningSections().then(setSections).catch((e) => setError(e.message))
  }, [])

  const filtered = (sections || []).filter((s) => {
    if (tab === 'done') return s.completed
    if (tab === 'todo') return !s.completed
    return true
  })

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          <Link to="/listening/import">
            <Button variant="outline" size="sm">导入听力题</Button>
          </Link>
          <Link to="/listening/mock">
            <Button size="sm">全真模拟(4 Sections)</Button>
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">听力题库</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        {([
          ['all', '全部'],
          ['done', '已完成'],
          ['todo', '未完成'],
        ] as [Tab, string][]).map(([key, label]) => (
          <Badge key={key} variant={tab === key ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTab(key)}>
            {label}
          </Badge>
        ))}
      </div>

      {sections === null && <p className="text-muted-foreground">加载中…</p>}

      {sections !== null && sections.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            题库还是空的。点右上角"导入听力题"，把音频和题目文件拖进去。
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && sections && sections.length > 0 && (
        <p className="text-sm text-muted-foreground">这个分类下没有题目。</p>
      )}

      <div className="space-y-2">
        {filtered.map((s) => (
          <Link key={s.id} to={`/listening/exam/${s.id}`}>
            <Card className={s.completed ? 'opacity-60' : 'hover:border-primary transition-colors'}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {s.completed && <Badge variant="secondary">✓ 已完成</Badge>}
                  <span className="font-medium">{s.title}</span>
                  {s.section && <Badge variant="outline">{s.section}</Badge>}
                  <span className="text-xs text-muted-foreground">{s.questionCount} 题</span>
                  {s.durationSec != null && <span className="text-xs text-muted-foreground">{Math.round(s.durationSec)}秒音频</span>}
                  <Badge variant="outline">{s.source === 'user_import' ? '用户上传' : s.source}</Badge>
                </div>
                {s.lastAccuracy !== null && <Badge variant="outline">正确率 {s.lastAccuracy}%</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
