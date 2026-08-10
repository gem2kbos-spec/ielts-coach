import { useEffect, useRef, useState } from 'react'

export type WritingTimerResult = {
  remaining: number
  overtime: number
  isOvertime: boolean
  started: boolean
  paused: boolean
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  getElapsed: () => number
  formatDisplay: () => string
  colorClass: string
}

export function useWritingTimer(standardSeconds: number): WritingTimerResult {
  const [resetKey, setResetKey] = useState(0)
  const [remaining, setRemaining] = useState(standardSeconds)
  const [overtime, setOvertime] = useState(0)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    setRemaining(standardSeconds)
    setOvertime(0)
    setStarted(false)
    setPaused(false)
    pausedRef.current = true  // paused until user clicks start

    const t = setInterval(() => {
      if (pausedRef.current) return
      setRemaining((r) => {
        if (r > 0) return r - 1
        setOvertime((o) => o + 1)
        return 0
      })
    }, 1000)
    return () => clearInterval(t)
  }, [resetKey, standardSeconds])

  const start = () => { pausedRef.current = false; setStarted(true); setPaused(false) }
  const pause = () => { pausedRef.current = true; setPaused(true) }
  const resume = () => { pausedRef.current = false; setPaused(false) }
  const reset = () => { pausedRef.current = true; setResetKey((k) => k + 1) }

  const isOvertime = remaining === 0 && overtime > 0

  const getElapsed = () => standardSeconds - remaining + overtime

  const formatDisplay = (): string => {
    if (remaining > 0) {
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    const m = Math.floor(overtime / 60)
    const s = overtime % 60
    return overtime > 0
      ? `+${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : '00:00'
  }

  let colorClass = 'text-foreground'
  if (isOvertime) {
    if (overtime > 300) colorClass = 'text-red-500 animate-pulse'
    else if (overtime > 120) colorClass = 'text-orange-400'
    else colorClass = 'text-yellow-400'
  } else if (remaining <= 60) {
    colorClass = 'text-red-400'
  } else if (remaining <= 300) {
    colorClass = 'text-yellow-400'
  }

  return { remaining, overtime, isOvertime, started, paused, start, pause, resume, reset, getElapsed, formatDisplay, colorClass }
}
