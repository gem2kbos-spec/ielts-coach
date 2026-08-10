import { useEffect, useMemo, useState } from 'react'
import { Focus, Maximize2, Minimize2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { isFocusEligiblePath, useFocusMode } from '@/hooks/useFocusMode'

export default function UserBar() {
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

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-1.5 rounded-2xl border border-white/35 bg-white/40 p-1.5 text-[#17251f] shadow-[0_18px_42px_rgba(15,23,42,0.14)] backdrop-blur-2xl sm:right-4 sm:top-4">
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
    </div>
  )
}
