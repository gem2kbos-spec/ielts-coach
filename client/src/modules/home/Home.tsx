import { Link } from 'react-router-dom'
import { Compass, Activity, PenLine, BookOpen, Headphones, Mic, BookMarked, BarChart3, Upload } from 'lucide-react'
import Decorations from './Decorations'

const MODULES: {
  to: string
  title: string
  desc: string
  icon: typeof Compass
  color: string
  sub?: { to: string; label: string }[]
}[] = [
  { to: '/nav', title: '智能导航', desc: '说出你想练什么，自动路由到对应模块', icon: Compass, color: '#475569' },
  { to: '/diagnosis', title: '诊断', desc: '基于历史数据找弱项，给训练建议', icon: Activity, color: '#B0202E' },
  {
    to: '/writing',
    title: '写作',
    desc: 'Task1图表描述 + Task2议论文，计时+四项评分',
    icon: PenLine,
    color: '#1D4E89',
    sub: [
      { to: '/writing/task1', label: 'Task 1' },
      { to: '/writing/task2', label: 'Task 2' },
    ],
  },
  {
    to: '/reading',
    title: '阅读',
    desc: 'PDF导入/AI生成文章，机考式做题+自动判分',
    icon: BookOpen,
    color: '#0C7C3E',
  },
  { to: '/listening', title: '听力', desc: '拖拽导入音频+题目，单题练习/全真模拟+自动判分', icon: Headphones, color: '#6B46C1' },
  {
    to: '/speaking/full',
    title: '口语',
    desc: '完整Part1→2→3流程 / 单独练习 / 影子跟读',
    icon: Mic,
    color: '#C2641A',
    sub: [
      { to: '/speaking/full', label: '完整流程' },
      { to: '/speaking/part1', label: 'Part 1' },
      { to: '/speaking/part2', label: 'Part 2' },
      { to: '/speaking/examiner', label: 'Part 3' },
      { to: '/speaking/shadow', label: '影子跟读' },
    ],
  },
  { to: '/vocab', title: '词汇', desc: '中文释义+详解+导出，待巩固标记', icon: BookMarked, color: '#9A8B00' },
  { to: '/dashboard', title: '仪表板', desc: '练习数据可视化', icon: BarChart3, color: '#0E7C86' },
]

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#F3EFE2' }}>
      {/* 柔和的色块光晕，营造"拼色"层次而不喧闹 */}
      <div
        className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full opacity-[0.16] pointer-events-none"
        style={{ background: '#0C7C3E', filter: 'blur(60px)' }}
      />
      <div
        className="absolute -bottom-40 -left-40 w-[420px] h-[420px] rounded-full opacity-[0.14] pointer-events-none"
        style={{ background: '#C2641A', filter: 'blur(60px)' }}
      />

      <Decorations />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight" style={{ color: '#1A1A18' }}>
              雅思全科练习系统
            </h1>
            <div className="w-16 h-1.5 rounded-full mt-3 mb-3" style={{ background: '#0C7C3E' }} />
            <p style={{ color: '#1A1A18', opacity: 0.5 }}>本地运行 · 数据只存在你自己的电脑上</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/mock"
              className="flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-all shrink-0 hover:-translate-y-0.5"
              style={{ background: '#B0202E', color: '#F3EFE2', boxShadow: '0 4px 12px rgba(20,20,15,0.2)' }}
            >
              完整模考
            </Link>
            <Link
              to="/import"
              className="flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-all shrink-0 hover:-translate-y-0.5"
              style={{ background: '#1A1A18', color: '#F3EFE2', boxShadow: '0 4px 12px rgba(20,20,15,0.2)' }}
            >
              <Upload className="w-4 h-4" />
              题库导入
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MODULES.map((m) => {
            const Icon = m.icon
            return (
              <Link key={m.to} to={m.to} className="group">
                <div
                  className="h-full rounded-2xl p-5 transition-all hover:-translate-y-1"
                  style={{
                    background: '#FBF8EF',
                    boxShadow: '0 2px 6px rgba(20,20,15,0.06)',
                    border: '1px solid rgba(20,20,15,0.06)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
                    style={{ background: `${m.color}1A` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: m.color }} />
                  </div>
                  <div className="font-bold" style={{ color: '#1A1A18' }}>
                    {m.title}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#1A1A18', opacity: 0.5 }}>
                    {m.desc}
                  </p>
                  {m.sub && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {m.sub.map((s) => (
                        <span
                          key={s.to}
                          className="text-[11px] rounded-full px-2 py-0.5"
                          style={{ color: m.color, background: `${m.color}14` }}
                        >
                          {s.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
