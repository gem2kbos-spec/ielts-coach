import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpenCheck, Languages, Mic, PenSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWeaknessNotebook, type WeaknessNotebook as WeaknessData } from '@/lib/api'
import { heatStyle } from '@/lib/utils'
import { TAG_LABEL } from '@/lib/tagLabels'
import StatePanel from '@/components/StatePanel'

export default function WeaknessNotebook() {
  const [days, setDays] = useState(90)
  const [data, setData] = useState<WeaknessData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getWeaknessNotebook(days).then(setData).catch((e) => setError(e.message))
  }, [days])

  if (error) return <StatePanel title="弱点聚合本暂时打不开" description={error} tone="error" backTo="/" backLabel="返回首页" />
  if (!data) return <StatePanel title="正在整理弱点聚合本" description="系统正在汇总写作、口语、表达训练和词汇里的高频薄弱点。" tone="loading" backTo="/" backLabel="返回首页" />

  const needsReinforcement = data.vocab.filter((v) => v.needs_reinforcement)

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-5 pb-8 pt-14 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 pr-16 sm:pr-20">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
        <div className="flex flex-wrap justify-end gap-2">
          {[30, 90, 365].map((d) => (
            <Badge key={d} variant={days === d ? 'default' : 'outline'} className="cursor-pointer rounded-full px-3 py-1.5" onClick={() => setDays(d)}>
              近 {d} 天
            </Badge>
          ))}
        </div>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <BookOpenCheck className="h-3.5 w-3.5 text-primary" />
              Weakness Notebook
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">弱点聚合本</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                把写作里的中式表达、口语里的发音风险词、表达训练里反复出错的题，以及阅读听力里待巩固的生词放到一起，按重复出现次数排序。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: PenSquare, label: '写作问题', value: String(data.chinglish.length), desc: '反复出现的中式表达' },
              { icon: Mic, label: '口语风险词', value: String(data.pronunciation.length), desc: '启发式标记的发音风险词' },
              { icon: Languages, label: '待巩固生词', value: String(needsReinforcement.length), desc: '阅读/听力里需要继续复盘的词' },
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
        <CardHeader>
          <CardTitle className="text-base">写作 · 反复出现的中式表达</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.chinglish.length === 0 && <p className="text-sm text-muted-foreground">这段时间没有检测到中式表达，或者还没写过作文。</p>}
          {(() => {
            const maxCount = Math.max(...data.chinglish.map((c) => c.count), 1)
            return data.chinglish.map((c) => (
              <div key={c.phrase} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.phrase}</span>
                  <Badge variant="outline" className="rounded-full" style={heatStyle(c.count, maxCount)}>
                    出现 {c.count} 次
                  </Badge>
                </div>
                {c.issue && <p className="mt-2 text-xs leading-6 text-muted-foreground">{c.issue}</p>}
                {c.suggestion && <p className="text-xs leading-6 text-muted-foreground">建议：{c.suggestion}</p>}
              </div>
            ))
          })()}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">口语 · 反复被标记的发音风险词</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pronunciation.length === 0 && <p className="text-sm text-muted-foreground">这段时间没有反复出现的发音风险词，或者还没练过口语。</p>}
          <div className="flex flex-wrap gap-2">
            {(() => {
              const maxCount = Math.max(...data.pronunciation.map((p) => p.count), 1)
              return data.pronunciation.map((p) => (
                <Badge key={`${p.word}:${p.category}`} variant="outline" className="rounded-full" style={heatStyle(p.count, maxCount)}>
                  {p.word}（{p.categoryLabel}）× {p.count}
                </Badge>
              ))
            })()}
          </div>
          <p className="text-xs leading-6 text-muted-foreground">
            这是按拼写规则和识别置信度做的启发式标记，不是真实声学测量。出现次数高的词更值得单独拿出来反复练。
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">表达训练 · 反复答错/半对的题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.expressionMistakes.length === 0 && <p className="text-sm text-muted-foreground">这段时间没有答错/半对的表达训练题，或者还没练过。</p>}
          {(() => {
            const maxCount = Math.max(...data.expressionMistakes.map((m) => m.count), 1)
            return data.expressionMistakes.map((m) => (
              <div key={m.itemId} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{m.chinese}</span>
                  <Badge variant="outline" className="rounded-full" style={heatStyle(m.count, maxCount)}>
                    出现 {m.count} 次
                  </Badge>
                  <Link to={`/writing/expressions/drill?id=${m.itemId}`} className="text-xs text-muted-foreground hover:underline">
                    去练这道题 →
                  </Link>
                </div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">参考答案：{m.standard}</p>
                {m.errorTypes.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {m.errorTypes.map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full text-xs">{TAG_LABEL[t] || t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))
          })()}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <CardHeader>
          <CardTitle className="text-base">
            阅读/听力 · 待巩固生词（{needsReinforcement.length}/{data.vocab.length}）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.vocab.length === 0 && <p className="text-sm text-muted-foreground">还没有标记过生词。</p>}
          <div className="flex flex-wrap gap-2">
            {needsReinforcement.slice(0, 30).map((v) => (
              <Badge key={v.id} variant="secondary" className="rounded-full">
                {v.word}
              </Badge>
            ))}
          </div>
          <Link to="/vocab" className="inline-block text-xs text-muted-foreground hover:underline">
            去词汇库管理全部 →
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
