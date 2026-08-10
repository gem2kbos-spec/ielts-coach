import { useEffect, useState } from 'react'

const STORAGE_KEY = 'ielts_focus_mode'
const EVENT_NAME = 'ielts-focus-mode-change'

const FOCUS_ROUTES = [
  '/reading/exam/',
  '/listening/exam/',
  '/listening/mock/exam',
  '/writing/task1',
  '/writing/task2',
  '/writing/expressions/drill',
  '/writing/expressions/batch',
  '/writing/expressions/review',
] as const

function readStoredValue() {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === '1'
}

export function isFocusEligiblePath(pathname: string) {
  return FOCUS_ROUTES.some((route) => pathname.startsWith(route))
}

function emitFocusModeChange(next: boolean) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }))
}

export function setFocusMode(next: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  emitFocusModeChange(next)
}

export function useFocusMode() {
  const [enabled, setEnabled] = useState(readStoredValue)

  useEffect(() => {
    const sync = () => setEnabled(readStoredValue())
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail
      setEnabled(Boolean(detail))
    }

    window.addEventListener('storage', sync)
    window.addEventListener(EVENT_NAME, onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(EVENT_NAME, onCustom as EventListener)
    }
  }, [])

  return {
    enabled,
    setEnabled: (next: boolean) => setFocusMode(next),
    toggle: () => setFocusMode(!enabled),
  }
}
