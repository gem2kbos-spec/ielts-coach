import { useEffect, useMemo, useState } from 'react'
import { Focus, LogOut, Maximize2, Minimize2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { isFocusEligiblePath, useFocusMode } from '@/hooks/useFocusMode'

export default function UserBar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const focusMode = useFocusMode()
  const focusEligible = useMemo(() => isFocusEligiblePath(location.pathname), [location.pathname])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (!user) return null
  const emailPrefix = user.email.split('@')[0]

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-2xl border border-white/35 bg-white/40 p-1.5 text-[#17251f] shadow-[0_18px_42px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:right-4 sm:top-4">
      {!focusMode.enabled && (
        <Badge
          variant="outline"
          title={user.email}
          className="hidden max-w-[136px] rounded-xl border-white/35 bg-white/38 px-3 py-1 text-[12px] font-medium text-[#17251f]/72 backdrop-blur-xl min-[1440px]:inline-flex"
        >
          {emailPrefix}
        </Badge>
      )}
      {focusEligible && (
        <Button
          variant={focusMode.enabled ? 'default' : 'ghost'}
          size="icon"
          className="h-9 w-9 rounded-xl"
          onClick={focusMode.toggle}
          title={focusMode.enabled ? '退出专注模式' : '进入专注模式'}
        >
          <Focus className="size-4" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl text-[#17251f]/65 hover:bg-white/42 hover:text-[#17251f]"
        onClick={toggleFullscreen}
        title={isFullscreen ? '退出全屏' : '全屏'}
      >
        {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl text-[#17251f]/65 hover:bg-destructive/10 hover:text-destructive"
        onClick={logout}
        title="退出登录"
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}
