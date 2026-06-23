// 把装饰图标装进一个"臂章/徽章"底座里——白底+彩色描边+柔和阴影，
// 比裸露的线稿图标更有"做工感"，呼应更衣室墙上挂的徽章/胸章。
import type { ReactNode } from 'react'

export default function Patch({
  color,
  size = 80,
  className,
  children,
}: {
  color: string
  size?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#FBF8EF',
        border: `2.5px solid ${color}`,
        boxShadow: '0 6px 16px rgba(20,20,15,0.12), 0 2px 4px rgba(20,20,15,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: size * 0.18,
      }}
    >
      {children}
    </div>
  )
}
