import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-9 w-9 rounded-xl border border-border/70 bg-card/78 text-muted-foreground shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur hover:bg-background/80 hover:text-foreground',
        className
      )}
      onClick={toggle}
      aria-label="切换明暗模式"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}
