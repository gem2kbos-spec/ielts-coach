import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const EXAMPLES = ['练口语完整流程', '练写作task1', '看本周数据', '诊断我哪里弱', '生成一篇困难的环境类阅读', '导入PDF', '背单词']

// 顺序有讲究：更具体的关键词要排在通用关键词前面，因为用的是find()命中第一条
const ROUTES: { keywords: string[]; to: string }[] = [
  { keywords: ['完整流程', '完整口语'], to: '/speaking/full' },
  { keywords: ['part1', '热身'], to: '/speaking/part1' },
  { keywords: ['考官', 'part3', '真人对话'], to: '/speaking/examiner' },
  { keywords: ['跟读', '影子'], to: '/speaking/shadow' },
  { keywords: ['part2', '话题卡', '口语'], to: '/speaking/part2' },
  { keywords: ['task1', '图表', '柱状图', '折线图'], to: '/writing/task1' },
  { keywords: ['task2', '议论文'], to: '/writing/task2' },
  { keywords: ['写作'], to: '/writing' },
  { keywords: ['生成', 'ai生成'], to: '/reading/generate' },
  { keywords: ['导入'], to: '/import' },
  { keywords: ['阅读'], to: '/reading' },
  { keywords: ['听力'], to: '/listening' },
  { keywords: ['单词', '词汇', '生词'], to: '/vocab' },
  { keywords: ['诊断', '弱'], to: '/diagnosis' },
  { keywords: ['数据', '进度', '仪表板'], to: '/dashboard' },
]

export default function NavInfo() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [notFound, setNotFound] = useState(false)

  const go = () => {
    const lower = text.trim().toLowerCase()
    if (!lower) return
    const match = ROUTES.find((r) => r.keywords.some((k) => lower.includes(k)))
    if (match) {
      setNotFound(false)
      navigate(match.to)
    } else {
      setNotFound(true)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-8 space-y-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold">智能导航</h1>
      <p className="text-sm text-muted-foreground">
        这个模块本质上是在 <strong>Claude Code 对话里</strong>用自然语言触发的——直接跟 Claude
        说你想做什么，它会自动路由到对应模块（必要时会帮你打开浏览器）。下面这个输入框是个简化的网页版本，方便你不开终端时也能跳转。
      </p>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="说说你想做什么…"
              className="flex-1 rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
            />
            <Button onClick={go}>去</Button>
          </div>
          {notFound && <p className="text-sm text-destructive">没识别出对应模块，换个说法或者直接点首页的卡片。</p>}
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => setText(e)}
                className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1 hover:border-primary"
              >
                {e}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
