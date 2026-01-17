'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getLocaleForCountry } from '@/lib/i18n'

export function MorningMessagesRotator(props: {
  messages: Array<{ rank?: number; message: string }> | string[]
  country?: 'jp' | 'us' | 'uk' | 'ca' | string
  intervalMs?: number
  typeMsPerChar?: number
  title?: string
}) {
  const intervalMs = Math.max(1000, Math.trunc(props.intervalMs ?? 5000))
  const typeMsPerChar = Math.max(10, Math.trunc(props.typeMsPerChar ?? 75))
  const blankMs = 1000
  const maxCycles = 2
  const isJa = props.country ? getLocaleForCountry(props.country as any) === 'ja' : false

  const lines = useMemo(() => {
    const raw: any = props.messages
    if (!Array.isArray(raw)) return []
    if (raw.length === 0) return []
    if (typeof raw[0] === 'string') return (raw as string[]).map((s) => String(s)).filter(Boolean).slice(0, 3)
    return (raw as Array<{ message: string }>).map((x) => String(x?.message || '')).filter(Boolean).slice(0, 3)
  }, [props.messages])

  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [isPlaying, setIsPlaying] = useState(true)
  const [cyclesCompleted, setCyclesCompleted] = useState(0)
  const [maxMessageHeight, setMaxMessageHeight] = useState<number | null>(null)
  const messageRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIdx(0)
    setTyped('')
    setIsPlaying(true)
    setCyclesCompleted(0)
    setMaxMessageHeight(null)
  }, [lines.join('\n')])

  // Typewriter + cycle control:
  // type → (hold to satisfy intervalMs) → clear → wait 1s → next
  useEffect(() => {
    let cancelled = false
    const timeouts: Array<ReturnType<typeof setTimeout>> = []
    const line = lines[idx] ?? ''
    const lastIdx = Math.max(0, lines.length - 1)

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(), Math.max(0, Math.trunc(ms)))
        timeouts.push(t)
      })

    const run = async () => {
      if (!isPlaying) return
      setTyped('')
      if (!line) return

      const startedAt = Date.now()

      // type
      for (let i = 1; i <= line.length; i++) {
        if (cancelled) return
        if (!isPlaying) return
        setTyped(line.slice(0, i))
        await sleep(typeMsPerChar)
      }

      // Stop after 2 cycles (show each line twice). Keep the final line visible.
      if (lines.length <= 1) {
        setCyclesCompleted(maxCycles)
        setIsPlaying(false)
        return
      }
      if (idx === lastIdx && cyclesCompleted >= maxCycles - 1) {
        setCyclesCompleted(maxCycles)
        setIsPlaying(false)
        return
      }

      // hold (keep full text visible) to satisfy intervalMs before clearing
      const elapsed = Date.now() - startedAt
      const holdAfterCompleteMs = Math.max(0, intervalMs - elapsed - blankMs)
      if (holdAfterCompleteMs > 0) {
        await sleep(holdAfterCompleteMs)
        if (cancelled) return
        if (!isPlaying) return
      }

      // clear then wait 1s before next starts
      setTyped('')
      await sleep(blankMs)
      if (cancelled) return
      if (!isPlaying) return

      if (lines.length > 1) {
        setIdx((x) => {
          const next = (x + 1) % lines.length
          if (x === lastIdx && next === 0) {
            setCyclesCompleted((c) => c + 1)
          }
          return next
        })
      }
    }

    void run()
    return () => {
      cancelled = true
      for (const t of timeouts) clearTimeout(t)
    }
  }, [lines.join('\n'), idx, typeMsPerChar, intervalMs, isPlaying, cyclesCompleted])

  const canToggle = lines.length > 0
  const onToggle = () => {
    if (!canToggle) return
    if (isPlaying) {
      setIsPlaying(false)
      return
    }
    // Restart if already completed 2 cycles
    if (cyclesCompleted >= maxCycles) {
      setCyclesCompleted(0)
      setIdx(0)
      setTyped('')
    }
    setIsPlaying(true)
  }

  const defaultTitle = isJa ? '朝刊メッセージ' : 'Morning messages'
  const title = String(props.title || '').trim() || defaultTitle

  useEffect(() => {
    const el = messageRef.current
    if (!el) return
    const height = el.scrollHeight
    if (height <= 0) return
    setMaxMessageHeight((prev) => (prev === null || height > prev ? height : prev))
  }, [typed])

  if (!lines.length) return null

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        background: '#fff',
        borderRadius: 12,
        padding: '12px 14px',
        lineHeight: 1.7,
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={isPlaying ? (isJa ? '停止' : 'Pause') : isJa ? '再生' : 'Play'}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          border: '1px solid rgba(0,0,0,0.12)',
          background: '#fff',
          borderRadius: 10,
          width: 32,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'rgba(0,0,0,0.6)',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{title}</div>
      <div
        ref={messageRef}
        style={{
          fontSize: 16,
          fontWeight: 700,
          whiteSpace: 'pre-wrap',
          minHeight: 28,
          height: maxMessageHeight ? `${maxMessageHeight}px` : 'auto',
        }}
      >
        {typed}
      </div>
    </div>
  )
}


