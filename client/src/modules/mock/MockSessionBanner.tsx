import { useSearchParams, Link } from 'react-router-dom'

// 完整模考流程里，从模考运行页跳转到某一关(写作/口语/阅读/听力)的链接会带上 ?mockSession=<id>。
// 各个独立模块页面用这个组件检测到这个参数时，顶部多显示一条"返回模考"的链接，
// 不带这个参数时(用户平时单独练习时)什么都不显示，互不影响。
export default function MockSessionBanner() {
  const [params] = useSearchParams()
  const sessionId = params.get('mockSession')
  if (!sessionId) return null
  return (
    <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary shadow-[0_10px_30px_rgba(59,130,246,0.08)]">
      <Link to={`/mock/run/${sessionId}`} className="inline-flex items-center gap-2 font-medium hover:underline">
        <span>←</span>
        <span>这一关做完了？点这里返回模考</span>
      </Link>
    </div>
  )
}
