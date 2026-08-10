import { useEffect, useRef, useState } from 'react'

const HISTORY_LENGTH = 24

// 录音时的实时音量条历史(0-1)，给Waveform组件画声波动效用。
// 拿到stream后挂一个AnalyserNode，每帧读时域数据算个简单的均方根音量，
// 不需要精确的声学分析，只是要一个"跟着说话声音大小起伏"的视觉信号。
export function useAudioLevel(stream: MediaStream | null) {
  const [history, setHistory] = useState<number[]>(() => new Array(HISTORY_LENGTH).fill(0))
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!stream) {
      setHistory(new Array(HISTORY_LENGTH).fill(0))
      return
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioCtx = new AudioContextClass()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteTimeDomainData(data)
      let sumSquares = 0
      for (let i = 0; i < data.length; i++) {
        const normalized = (data[i] - 128) / 128
        sumSquares += normalized * normalized
      }
      const rms = Math.sqrt(sumSquares / data.length)
      const level = Math.min(1, rms * 4)
      setHistory((prev) => [...prev.slice(1), level])
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      source.disconnect()
      audioCtx.close()
    }
  }, [stream])

  return history
}
