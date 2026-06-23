import { Link } from 'react-router-dom'

export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="max-w-2xl mx-auto p-8">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← 返回首页
      </Link>
      <h1 className="text-2xl font-semibold mt-4">{title}</h1>
      <p className="text-muted-foreground mt-2">这个模块还没实现，计划在 {phase} 落地。</p>
    </div>
  )
}
