import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listReadingPassages, type ReadingPassageListItem } from '@/lib/api'
import MockSessionBanner from '@/modules/mock/MockSessionBanner'

type Tab = 'all' | 'done' | 'todo' | 'ai' | 'imported'

const DIFFICULTY_LABEL: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }

export default function ReadingMenu() {
  const [passages, setPassages] = useState<ReadingPassageListItem[] | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [error, setError] = useState('')

  useEffect(() => {
    listReadingPassages().then(setPassages).catch((e) => setError(e.message))
  }, [])

  const filtered = (passages || []).filter((p) => {
    if (tab === 'done') return p.completed
    if (tab === 'todo') return !p.completed
    if (tab === 'ai') return p.source === 'ai_generated'
    if (tab === 'imported') return p.source === 'user_import'
    return true
  })

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <MockSessionBanner />
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex gap-2">
          <Link to="/reading/freeread">
            <Button variant="outline" size="sm">
              自由阅读素材
            </Button>
          </Link>
          <Link to="/reading/import">
            <Button variant="outline" size="sm">
              导入 PDF
            </Button>
          </Link>
          <Link to="/reading/generate">
            <Button size="sm">生成新文章</Button>
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-semibold">阅读题库</h1>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        {([
          ['all', '全部'],
          ['done', '已完成'],
          ['todo', '未完成'],
          ['ai', 'AI生成'],
          ['imported', '真题导入'],
        ] as [Tab, string][]).map(([key, label]) => (
          <Badge key={key} variant={tab === key ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTab(key)}>
            {label}
          </Badge>
        ))}
      </div>

      {passages === null && <p className="text-muted-foreground">加载中…</p>}

      {passages !== null && passages.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            题库还是空的。点右上角"导入 PDF"拖一份真题进来，或者"生成新文章"让 AI 写一篇。
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && passages && passages.length > 0 && (
        <p className="text-sm text-muted-foreground">这个分类下没有文章。</p>
      )}

      <div className="space-y-2">
        {filtered.map((p) => (
          <Link key={p.id} to={`/reading/exam/${p.id}`}>
            <Card className={p.completed ? 'opacity-60' : 'hover:border-primary transition-colors'}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {p.completed && <Badge variant="secondary">✓ 已完成</Badge>}
                  <span className="font-medium">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.questionCount} 题</span>
                  {p.difficulty && <Badge variant="outline">{DIFFICULTY_LABEL[p.difficulty] || p.difficulty}</Badge>}
                  <Badge variant="outline">{p.source === 'ai_generated' ? 'AI生成' : '真题导入'}</Badge>
                  {p.topicTag && <Badge variant="outline">{p.topicTag}</Badge>}
                </div>
                {p.lastAccuracy !== null && <Badge variant="outline">正确率 {p.lastAccuracy}%</Badge>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
