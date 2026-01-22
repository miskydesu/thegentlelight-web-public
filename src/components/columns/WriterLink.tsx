'use client'

import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

export function WriterLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()

  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        router.push(href)
      }}
    >
      {children}
    </button>
  )
}
