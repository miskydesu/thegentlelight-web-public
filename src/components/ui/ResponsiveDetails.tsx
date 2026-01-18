"use client"

import { useEffect, useState } from 'react'

export function ResponsiveDetails({
  defaultOpenMinWidthPx,
  className,
  summaryClassName,
  summary,
  children,
}: {
  defaultOpenMinWidthPx: number
  className?: string
  summaryClassName?: string
  summary: React.ReactNode
  children: React.ReactNode
}) {
  // SSRでは閉じた状態にしておき、クライアントで画面幅を見て「PCだけ初期open」にする
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const m = window.matchMedia(`(min-width: ${defaultOpenMinWidthPx}px)`)
    setOpen(m.matches)
    // 初期決定だけでOK（リサイズ追従で勝手に開閉されるとUXが崩れるため）
  }, [defaultOpenMinWidthPx])

  return (
    <details
      className={className}
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  )
}

