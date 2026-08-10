import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AudioLines, Headphones, NotebookPen, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { listListeningSections, revoiceListeningSection, type ListeningSectionListItem } from '@/lib/api'
import StatePanel from '@/components/StatePanel'
import { cn } from '@/lib/utils'

type Tab = 'all' | 'done' | 'todo'
type SectionTab = 'all' | 'S1' | 'S2' | 'S3' | 'S4'
type SectionGroup = 'S1' | 'S2' | 'S3' | 'S4' | 'unknown'

const SECTION_TABS: SectionTab[] = ['all', 'S1', 'S2', 'S3', 'S4']
const SECTION_COPY: Record<SectionGroup, { title: string; desc: string }> = {
  S1: { title: 'Section 1', desc: '日常对话：预约、咨询、报名、租房等信息定位。' },
  S2: { title: 'Section 2', desc: '生活场景独白：导览、活动介绍、设施说明。' },
  S3: { title: 'Section 3', desc: '学术讨论：学生对话、课程项目、研究方案。' },
  S4: { title: 'Section 4', desc: '学术讲座：连续独白、概念解释、细节填空。' },
  unknown: { title: '未分区材料', desc: '这些材料还没有标注 S1-S4，建议导入页里补上 section。' },
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function sourceLabel(source: string) {
  if (source === 'user_import') return '用户上传'
  if (source === 'ai_generated') return 'AI 生成'
  return source
}

export default function ListeningMenu() {
  const [sections, setSections] = useState<ListeningSectionListItem[] | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [sectionTab, setSectionTab] = useState<SectionTab>('all')
  const [error, setError] = useState('')
  const [revoicingId, setRevoicingId] = useState<string | null>(null)

  useEffect(() => {
    listListeningSections().then(setSections).catch((e) => setError(e.message))
  }, [])

  const statusFiltered = (sections || []).filter((s) => {
    if (tab === 'done') return s.completed
    if (tab === 'todo') return !s.completed
    return true
  })
  const visibleSections = statusFiltered.filter((s) => sectionTab === 'all' || s.section === sectionTab)
  const sectionCounts = SECTION_TABS.reduce((acc, sec) => {
    acc[sec] = sec === 'all' ? statusFiltered.length : statusFiltered.filter((s) => s.section === sec).length
    return acc
  }, {} as Record<SectionTab, number>)
  const hasUnknownSections = visibleSections.some((s) => !['S1', 'S2', 'S3', 'S4'].includes(s.section || ''))
  const activeSectionGroups: SectionGroup[] = sectionTab === 'all'
    ? hasUnknownSections ? ['S1', 'S2', 'S3', 'S4', 'unknown'] : ['S1', 'S2', 'S3', 'S4']
    : [sectionTab]
  const groupedSections = activeSectionGroups.map((sec) => ({
    section: sec,
    items: sec === 'unknown'
      ? visibleSections.filter((s) => !['S1', 'S2', 'S3', 'S4'].includes(s.section || ''))
      : visibleSections.filter((s) => s.section === sec),
  }))

  const handleRevoice = async (id: string) => {
    setRevoicingId(id)
    setError('')
    try {
      await revoiceListeningSection(id)
      const next = await listListeningSections()
      setSections(next)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRevoicingId(null)
    }
  }

  const total = sections?.length ?? 0
  const completed = sections?.filter((s) => s.completed).length ?? 0
  const avgAccuracy = sections && sections.length > 0
    ? Math.round(
        sections.filter((s) => s.lastAccuracy !== null).reduce((sum, s) => sum + (s.lastAccuracy || 0), 0) /
        Math.max(sections.filter((s) => s.lastAccuracy !== null).length, 1)
      )
    : 0

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          <Link to="/listening/import">
            <Button variant="outline" size="sm" className="rounded-full">导入听力题</Button>
          </Link>
          <Link to="/listening/mock">
            <Button size="sm" className="rounded-full">全真模拟（4 Sections）</Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Headphones className="h-3.5 w-3.5 text-primary" />
              IELTS Listening Library
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">听力题库</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                按 S1-S4 分区管理听力题：可以单篇训练、听写复盘，也可以进入整套 4 sections 模拟。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, label: '整套模拟', desc: '按正式考试节奏连续做 4 sections。' },
                { icon: AudioLines, label: '分题练习', desc: '每篇单独练，适合针对某类题型复盘。' },
                { icon: NotebookPen, label: '听写模式', desc: '有 transcript 的材料支持听写训练。' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <p className="mt-1 text-xs leading-6 text-muted-foreground">{item.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: '当前题目', value: String(total), desc: '当前库内的听力材料' },
              { label: '已完成', value: String(completed), desc: '已经做过并交卷的材料' },
              { label: '平均正确率', value: `${avgAccuracy}%`, desc: '基于有成绩的材料统计' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border/70 bg-background/75 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</div>
                <div className="mt-3 text-2xl font-semibold">{stat.value}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && sections !== null && <p className="text-sm text-destructive">{error}</p>}

      <div className="space-y-3">
        <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1.5">
          {([
            ['all', '全部'],
            ['done', '已完成'],
            ['todo', '未完成'],
          ] as [Tab, string][]).map(([key, label]) => (
            <Badge key={key} variant={tab === key ? 'default' : 'outline'} className="cursor-pointer rounded-xl px-3 py-1.5" onClick={() => setTab(key)}>
              {label}
            </Badge>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-5">
          {SECTION_TABS.map((sec) => {
            const active = sectionTab === sec
            return (
              <button
                key={sec}
                onClick={() => setSectionTab(sec)}
                className={cn(
                  'rounded-2xl border p-3 text-left transition-all',
                  active
                    ? 'border-primary/45 bg-primary/10 text-foreground shadow-[0_12px_30px_rgba(15,23,42,0.06)]'
                    : 'border-border/70 bg-card/72 text-muted-foreground hover:border-primary/30 hover:bg-card'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{sec === 'all' ? '全部 Sections' : sec}</span>
                  <Badge variant={active ? 'default' : 'secondary'} className="rounded-full">{sectionCounts[sec]}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5">
                  {sec === 'all' ? '按 S1-S4 分区浏览全部题目。' : SECTION_COPY[sec].desc}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {error && sections === null && (
        <StatePanel
          title="听力题库暂时没打开"
          description={error}
          tone="error"
          backTo="/"
          backLabel="返回首页"
        />
      )}

      {!error && sections === null && (
        <StatePanel
          title="正在读取听力题库"
          description="系统正在整理听力材料、音频时长和完成进度。"
          tone="loading"
          backTo="/"
          backLabel="返回首页"
        />
      )}

      {sections !== null && sections.length === 0 && (
        <StatePanel
          title="听力题库还是空的"
          description="点右上角“导入听力题”，把音频和题目文件拖进去，或者先去做整套模拟。"
          tone="empty"
          backTo="/"
          backLabel="返回首页"
        />
      )}

      {visibleSections.length === 0 && sections && sections.length > 0 && (
        <StatePanel
          title="这个分类下没有题目"
          description="换个完成状态或 Section，或者去导入新的听力材料。"
          tone="empty"
          backTo="/listening"
          backLabel="返回听力题库"
        />
      )}

      <div className="space-y-3">
        {groupedSections.map(({ section, items }) => (
          items.length > 0 && (
            <section key={section} className="space-y-2">
              <div className="flex items-end justify-between gap-3 px-1">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{SECTION_COPY[section].title}</h2>
                  <p className="text-sm text-muted-foreground">{SECTION_COPY[section].desc}</p>
                </div>
                <Badge variant="outline" className="rounded-full">{items.length} 篇</Badge>
              </div>
              <div className="space-y-3">
                {items.map((s) => (
                  <Card key={s.id} className={s.completed ? 'rounded-[28px] border-border/70 bg-card/80 opacity-65 hover:opacity-80' : 'rounded-[28px] border-border/70 bg-card/85 hover:border-primary/40'}>
                    <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <Link to={`/listening/exam/${s.id}`} className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {s.completed && <Badge variant="secondary" className="rounded-full">✓ 已完成</Badge>}
                          <span className="truncate font-medium">{s.title}</span>
                          <Badge variant="outline" className="rounded-full">{s.section || section}</Badge>
                          <Badge variant="outline" className="rounded-full">{sourceLabel(s.source)}</Badge>
                          {s.audioProvider === 'openai'
                            ? <Badge variant="secondary" className="rounded-full">AI 真人感音频</Badge>
                            : s.audioProvider === 'edge'
                              ? <Badge variant="secondary" className="rounded-full">免费神经音频</Badge>
                            : s.source === 'ai_generated'
                              ? <Badge variant="outline" className="rounded-full">机器音频</Badge>
                              : null
                          }
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{s.questionCount} 题</span>
                          {s.durationSec != null && <span>{formatDuration(s.durationSec)} 音频</span>}
                          {s.hasTranscript && <span>支持听写</span>}
                        </div>
                      </Link>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {s.hasTranscript && (
                          <Link to={`/listening/dictation/${s.id}`}>
                            <Button size="sm" variant="outline" className="rounded-full">听写</Button>
                          </Link>
                        )}
                        {s.source === 'ai_generated' && !['openai', 'edge'].includes(s.audioProvider || '') && s.hasTranscript && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() => handleRevoice(s.id)}
                            disabled={revoicingId === s.id}
                          >
                            {revoicingId === s.id ? '重配音中…' : '免费重配音'}
                          </Button>
                        )}
                        {s.lastAccuracy !== null
                          ? <Badge variant="secondary" className="rounded-full px-3">正确率 {s.lastAccuracy}%</Badge>
                          : <Badge variant="secondary" className="rounded-full px-3">开始做题</Badge>
                        }
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )
        ))}
      </div>
    </div>
  )
}
