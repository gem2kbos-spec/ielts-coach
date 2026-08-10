import StatePanel from '@/components/StatePanel'

export default function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <StatePanel
      title={title}
      description={`这个模块还没实现，计划在 ${phase} 落地。`}
      tone="empty"
      backTo="/"
      backLabel="返回首页"
    />
  )
}
