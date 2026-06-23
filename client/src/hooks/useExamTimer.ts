import { useCallback, useEffect, useRef, useState } from 'react'

export type ExamPhase = { key: string; label: string; seconds: number }

export function useExamTimer(phases: ExamPhase[]) {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [remaining, setRemaining] = useState(phases[0]?.seconds ?? 0)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => r - 1)
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [running])

  useEffect(() => {
    if (remaining > 0) return
    if (phaseIndex < phases.length - 1) {
      setPhaseIndex((i) => i + 1)
      setRemaining(phases[phaseIndex + 1].seconds)
    } else {
      setRunning(false)
      setDone(true)
    }
  }, [remaining, phaseIndex, phases])

  const start = useCallback(() => setRunning(true), [])
  const pause = useCallback(() => setRunning(false), [])
  const skipToNext = useCallback(() => {
    if (phaseIndex < phases.length - 1) {
      setPhaseIndex((i) => i + 1)
      setRemaining(phases[phaseIndex + 1].seconds)
    } else {
      setRunning(false)
      setDone(true)
    }
  }, [phaseIndex, phases])
  const reset = useCallback(() => {
    setPhaseIndex(0)
    setRemaining(phases[0]?.seconds ?? 0)
    setRunning(false)
    setDone(false)
  }, [phases])

  return {
    phase: phases[phaseIndex],
    phaseIndex,
    remaining,
    running,
    done,
    start,
    pause,
    skipToNext,
    reset,
  }
}
