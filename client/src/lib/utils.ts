import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 弱项热力着色：出现次数越高，背景颜色越深/越亮——用在仪表板的弱项标签和弱点聚合本的
// 中式表达/发音风险词徽章上，保持同一套"频率越高越显眼"的视觉语言。
export function heatStyle(count: number, maxCount: number) {
  const intensity = 0.1 + (count / Math.max(maxCount, 1)) * 0.75
  return {
    backgroundColor: `color-mix(in oklch, var(--destructive) ${Math.round(intensity * 100)}%, transparent)`,
    borderColor: 'transparent',
    color: intensity > 0.4 ? 'white' : undefined,
  }
}
