import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  Upload,
} from 'lucide-react'
import ThemeToggle from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const MODULES: {
  to: string
  title: string
  desc: string
  meta: string
  span: string
  panel: string
  icon: typeof Activity
  dark?: boolean
  actions?: string[]
}[] = [
  {
    to: '/writing',
    title: '写作',
    desc: 'Task 1 / Task 2 作答、计时、批改和复盘。',
    meta: 'Writing',
    span: 'xl:col-span-5 xl:row-span-2',
    panel: 'bg-[#15221d]/88 text-white border-white/10 shadow-[0_28px_70px_rgba(21,34,29,0.22)] backdrop-blur-2xl',
    icon: PenLine,
    dark: true,
    actions: ['Task 1', 'Task 2', '生成题目'],
  },
  {
    to: '/reading',
    title: '阅读',
    desc: '文章生成、题库管理、删除恢复和机考式作答。',
    meta: 'Reading',
    span: 'xl:col-span-4 xl:row-span-2',
    panel: 'bg-[#f0e2cc]/62 text-[#2b2117] border-white/45 shadow-[0_24px_58px_rgba(126,84,39,0.14)] backdrop-blur-2xl',
    icon: BookOpen,
    actions: ['题库', '生成文章', '历史记录'],
  },
  {
    to: '/speaking',
    title: '口语',
    desc: '完整流程、分 Part 练习和影子跟读。',
    meta: 'Speaking',
    span: 'xl:col-span-3',
    panel: 'bg-[#dce8e4]/58 text-[#17251f] border-white/45 shadow-[0_18px_42px_rgba(60,93,80,0.12)] backdrop-blur-2xl',
    icon: Mic,
    actions: ['Part 1', 'Part 2', 'Part 3'],
  },
  {
    to: '/vocab',
    title: '词汇',
    desc: '生词库、上下文、待巩固词汇和来源回看。',
    meta: 'Vocabulary',
    span: 'xl:col-span-5',
    panel: 'bg-[#eef1dc]/58 text-[#252818] border-white/45 shadow-[0_18px_46px_rgba(92,101,51,0.12)] backdrop-blur-2xl',
    icon: BookMarked,
    actions: ['生词库', '待巩固', '上下文'],
  },
  {
    to: '/diagnosis',
    title: '诊断',
    desc: '看薄弱点、近期表现和下一步训练方向。',
    meta: 'Diagnosis',
    span: 'xl:col-span-4',
    panel: 'bg-[#f4f0ea]/62 text-[#22201d] border-white/50 shadow-[0_18px_42px_rgba(46,38,28,0.10)] backdrop-blur-2xl',
    icon: Activity,
    actions: ['弱点', '趋势'],
  },
  {
    to: '/listening',
    title: '听力',
    desc: '导入音频和题目，做单题训练或整套模拟。',
    meta: 'Listening',
    span: 'xl:col-span-3',
    panel: 'bg-[#26323b]/86 text-white border-white/10 shadow-[0_20px_52px_rgba(38,50,59,0.18)] backdrop-blur-2xl',
    icon: Headphones,
    dark: true,
    actions: ['音频', '套题'],
  },
]

const QUICK_ACTIONS = [
  { to: '/writing/generate', label: '生成写作题目', icon: PenLine },
  { to: '/reading/generate', label: '生成阅读文章', icon: BookOpen },
  { to: '/writing/expressions', label: '表达训练', icon: Sparkles },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(142,197,173,0.24),transparent_28rem),radial-gradient(circle_at_88%_2%,rgba(208,163,111,0.18),transparent_30rem),linear-gradient(180deg,#faf8f2_0%,#f1eee6_100%)] text-[#171a17]">
      <div className="mx-auto flex min-h-screen max-w-[1360px] flex-col px-5 py-4 sm:px-7 lg:px-9">
        <header className="mb-4 flex flex-col gap-4 border-b border-black/10 pb-4 lg:flex-row lg:items-center lg:justify-between lg:pr-44">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/12 bg-[#15221d]/88 text-white shadow-[0_16px_36px_rgba(21,34,29,0.18)] backdrop-blur-2xl">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-[0.02em] sm:text-4xl">G2Band</h1>
              <p className="mt-1 text-sm text-black/50">Focused IELTS practice</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle className="border-black/10 bg-white/70 text-black/55 hover:bg-white hover:text-black" />
            <Link
              to="/mock"
              className="inline-flex h-10 items-center rounded-full border border-white/45 bg-white/48 px-4 text-sm font-medium text-[#8b3a2d] shadow-[inset_0_1px_0_rgba(255,255,255,0.42)] backdrop-blur-xl hover:-translate-y-0.5 hover:border-[#c5896f]/50 hover:bg-white/62"
            >
              完整模考
            </Link>
            <Link
              to="/import"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-[#15221d]/88 px-4 text-sm font-medium text-white shadow-[0_14px_34px_rgba(21,34,29,0.18)] backdrop-blur-xl hover:-translate-y-0.5"
            >
              <Upload className="h-4 w-4" />
              题库导入
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <section className="glass-surface mb-4 flex flex-col gap-3 rounded-[24px] border border-white/45 bg-white/48 p-2.5 shadow-[0_14px_36px_rgba(29,32,28,0.07)] sm:flex-row sm:items-center sm:justify-between">
            <div className="px-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/34">Start here</div>
              <div className="mt-1 text-base font-semibold">选择训练模块，或直接生成题目。</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-[#171a17]/88 px-4 text-sm font-medium text-white shadow-[0_10px_22px_rgba(23,26,23,0.10)] backdrop-blur-xl hover:-translate-y-0.5"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:auto-rows-[160px] xl:grid-cols-12 xl:grid-flow-dense">
            {MODULES.map((module) => {
              const Icon = module.icon
              const featured = module.span.includes('row-span-2')
              return (
                <Link key={module.to} to={module.to} className={module.span}>
                  <article
                    className={cn(
                      'group relative h-full min-h-[210px] overflow-hidden rounded-[30px] border p-5 transition-all duration-150 hover:-translate-y-0.5 xl:min-h-0',
                      module.panel
                    )}
                  >
                    <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
                            module.dark ? 'border-white/12 bg-white/8' : 'border-black/8 bg-white/52'
                          )}
                        >
                          <Icon className={cn('h-5 w-5', module.dark ? 'text-white' : 'text-[#2f6a57]')} />
                        </div>
                        <span
                          className={cn(
                            'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                            module.dark ? 'bg-white/8 text-white/58' : 'bg-black/5 text-black/45'
                          )}
                        >
                          {module.meta}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <h3 className={cn('font-semibold tracking-[0.01em]', featured ? 'text-3xl' : 'text-[1.7rem]')}>{module.title}</h3>
                          <ArrowRight className={cn('h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1', module.dark ? 'text-white/50' : 'text-black/35')} />
                        </div>
                        <p
                          className={cn(
                            'mt-3 max-w-md text-sm leading-7',
                            !featured && 'xl:hidden',
                            module.dark ? 'text-white/64' : 'text-black/55'
                          )}
                        >
                          {module.desc}
                        </p>

                        {module.actions && featured && (
                          <div className="mt-5 flex flex-wrap gap-1.5">
                            {module.actions.map((action) => (
                              <span
                                key={action}
                                className={cn(
                                  'rounded-full px-2.5 py-1 text-[11px] font-medium',
                                  module.dark ? 'bg-white/9 text-white/70' : 'bg-white/56 text-black/48'
                                )}
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      className={cn(
                        'pointer-events-none absolute -right-5 -top-8 font-black leading-none opacity-[0.04]',
                        featured ? 'text-[8rem]' : 'text-[6.5rem]',
                        module.dark ? 'text-white' : 'text-black'
                      )}
                    >
                      {module.title}
                    </div>
                  </article>
                </Link>
              )
            })}

            <Link to="/dashboard" className="xl:col-span-3">
              <article className="group relative h-full min-h-[210px] overflow-hidden rounded-[30px] border border-white/45 bg-[#e5eee7]/58 p-5 text-[#17251f] shadow-[0_22px_56px_rgba(59,89,72,0.13)] backdrop-blur-2xl transition-all duration-150 hover:-translate-y-0.5 hover:border-[#adc4b5]/60 xl:min-h-0">
                <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-black/8 bg-white/55 text-[#2f6a57] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/45">Dashboard</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-3xl font-semibold tracking-[0.01em]">仪表板</h3>
                      <ArrowRight className="h-5 w-5 text-black/35 transition-transform group-hover:translate-x-1" />
                    </div>
                    <p className="mt-3 max-w-md text-sm leading-7 text-black/55 xl:hidden">历史、趋势、AI 使用量。</p>
                  </div>
                </div>
              </article>
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}
