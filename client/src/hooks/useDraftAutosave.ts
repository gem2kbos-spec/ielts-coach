import { useEffect, useRef, useState } from 'react'

type DraftAutosaveOptions<T> = {
  storageKey: string
  value: T
  onLoad: (value: T) => void
  enabled?: boolean
  debounceMs?: number
  serialize?: (value: T) => string
  deserialize?: (raw: string) => T
  restoreMode?: 'auto' | 'manual'
}

type DraftStatus = 'idle' | 'saving' | 'saved'

export function useDraftAutosave<T>({
  storageKey,
  value,
  onLoad,
  enabled = true,
  debounceMs = 700,
  serialize = JSON.stringify,
  deserialize = JSON.parse as (raw: string) => T,
  restoreMode = 'auto',
}: DraftAutosaveOptions<T>) {
  const [status, setStatus] = useState<DraftStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [hasSavedDraft, setHasSavedDraft] = useState(false)
  const hydratedRef = useRef(false)
  const lastSerializedRef = useRef('')
  const onLoadRef = useRef(onLoad)
  const deserializeRef = useRef(deserialize)
  const serializeRef = useRef(serialize)

  useEffect(() => {
    onLoadRef.current = onLoad
  }, [onLoad])

  useEffect(() => {
    deserializeRef.current = deserialize
  }, [deserialize])

  useEffect(() => {
    serializeRef.current = serialize
  }, [serialize])

  useEffect(() => {
    if (!enabled) {
      hydratedRef.current = false
      setStatus('idle')
      setHasSavedDraft(false)
      return
    }

    let restored = ''
    try {
      restored = window.localStorage.getItem(storageKey) || ''
      if (restored) {
        setHasSavedDraft(true)
        if (restoreMode === 'auto') {
          onLoadRef.current(deserializeRef.current(restored))
          setLastSavedAt(Date.now())
          setStatus('saved')
        } else {
          setStatus('idle')
        }
      } else {
        setStatus('idle')
        setHasSavedDraft(false)
      }
    } catch {
      setStatus('idle')
      setHasSavedDraft(false)
    }
    lastSerializedRef.current = restored
    hydratedRef.current = true
  }, [storageKey, enabled, restoreMode])

  useEffect(() => {
    if (!enabled || !hydratedRef.current) return

    let serialized = ''
    try {
      serialized = serializeRef.current(value)
    } catch {
      return
    }

    if (serialized === lastSerializedRef.current) return

    setStatus('saving')
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, serialized)
        lastSerializedRef.current = serialized
        setHasSavedDraft(!(serialized === '""' || serialized === '[]' || serialized === '{}'))
        setLastSavedAt(Date.now())
        setStatus(serialized === '""' || serialized === '[]' || serialized === '{}' ? 'idle' : 'saved')
      } catch {
        setStatus('idle')
      }
    }, debounceMs)

    return () => window.clearTimeout(timer)
  }, [storageKey, value, enabled, debounceMs])

  const clear = () => {
    window.localStorage.removeItem(storageKey)
    lastSerializedRef.current = ''
    setLastSavedAt(null)
    setStatus('idle')
    setHasSavedDraft(false)
  }

  const restore = () => {
    try {
      const restored = window.localStorage.getItem(storageKey) || ''
      if (!restored) {
        setHasSavedDraft(false)
        return false
      }
      onLoadRef.current(deserializeRef.current(restored))
      lastSerializedRef.current = restored
      setLastSavedAt(Date.now())
      setStatus('saved')
      setHasSavedDraft(true)
      return true
    } catch {
      return false
    }
  }

  return { status, lastSavedAt, hasSavedDraft, clear, restore }
}
