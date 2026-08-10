import { Link } from 'react-router-dom'
import { Mic, MessageCircleMore, PanelsTopLeft, PlayCircle, Repeat2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function SpeakingMenu() {
  const entries = [
    {
      to: '/speaking/full',
      title: '完整流程',
      desc: '按真实考试顺序完成 Part 1、Part 2、Part 3，最后得到一个综合口语分。',
      tags: ['综合评分', '完整流程', '正式练习'],
    },
    {
      to: '/speaking/part1',
      title: 'Part 1',
      desc: '热身问答，适合快速开口和积累高频生活话题表达。',
      tags: ['短答', '热身', '高频话题'],
    },
    {
      to: '/speaking/part2',
      title: 'Part 2',
      desc: '话题卡独立陈述，包含准备和展开输出的节奏训练。',
      tags: ['话题卡', '独立陈述', '延展表达'],
    },
    {
      to: '/speaking/examiner',
      title: 'Part 3',
      desc: '考官追问与深入讨论，适合训练抽象观点、比较和论证。',
      tags: ['追问', '深入讨论', '抽象表达'],
    },
    {
      to: '/speaking/shadow',
      title: '影子跟读',
      desc: '跟读原文、模仿节奏和语音连接，提升流利度和语音自然度。',
      tags: ['跟读', '语音语调', '流利度'],
    },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← 返回首页
        </Link>
      </div>

      <Card className="overflow-hidden rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <CardContent className="grid gap-5 p-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-xs text-muted-foreground">
              <Mic className="h-3.5 w-3.5 text-primary" />
              IELTS Speaking Practice
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">口语训练</h1>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                把完整流程、单独分题和影子跟读放到同一入口里，按你今天想练的口语能力直接切进去。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { icon: PanelsTopLeft, label: '训练模式', value: '5', desc: '完整流程、Part1、Part2、Part3、影子跟读' },
              { icon: MessageCircleMore, label: '输出类型', value: '问答 + 陈述', desc: '短答、长答和追问组合训练' },
              { icon: Repeat2, label: '目标', value: '开口更稳', desc: '兼顾内容、流利度和语音自然度' },
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

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Link key={entry.to} to={entry.to}>
            <Card className="h-full rounded-[28px] border-border/70 bg-card/85 shadow-[0_18px_40px_rgba(15,23,42,0.04)] hover:border-primary/40">
              <CardContent className="p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div className="text-lg font-semibold">{entry.title}</div>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{entry.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="rounded-full">{tag}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="flex justify-end">
        <Link to="/speaking/full">
          <Button className="rounded-full px-5">直接开始完整流程</Button>
        </Link>
      </div>
    </div>
  )
}
