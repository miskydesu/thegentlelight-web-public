'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getPreferredGentle, hasEverEnabledGentle, setPreferredGentle } from '@/lib/view-switch'
import { getUserToken, updateGentleMode } from '@/lib/userAuth'
import { cn } from '@/lib/cn'
import styles from './ViewSwitch.module.css'

export interface ViewSwitchProps {
  className?: string
  labelJa?: string
}

/**
 * ViewSwitch: gentleモード切替UI（クエリパラメータ方式）
 * gentle=1 のとき「穏やかに読める範囲」を優先（重要度×heartwarming_score で絞り込み）
 */
export function ViewSwitch({ className, labelJa }: ViewSwitchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isJa = (pathname || '').startsWith('/jp')
  
  const [gentle, setGentle] = useState(false)
  // Hydration mismatch対策:
  // - getUserToken()/hasEverEnabledGentle()/getPreferredGentle() は localStorage/cookie に依存し、SSRと初回CSRで差が出やすい
  // - mount後にまとめて反映する
  const [clientHints, setClientHints] = useState<{ loggedIn: boolean; everEnabled: boolean } | null>(null)
  useEffect(() => {
    setGentle(getPreferredGentle() === true)
    setClientHints({ loggedIn: Boolean(getUserToken()), everEnabled: hasEverEnabledGentle() })
  }, [])

  const loggedIn = clientHints?.loggedIn || false
  const show = gentle || loggedIn || (clientHints?.everEnabled || false)
  if (!show) return null
  
  const handleToggle = (nextGentle: boolean) => {
    if (nextGentle === gentle) return
    
    setPreferredGentle(nextGentle)
    setGentle(nextGentle)
    // ログイン中はユーザー設定にも保存（非ログイン時はCookie/localStorageのみ）
    if (Boolean(getUserToken())) {
      void updateGentleMode(nextGentle).catch(() => {
        // ignore (guest / network / unauthorized)
      })
    }
    // gentle=1 をURLに載せず、cookie/localStorageの状態で再描画
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('gentle')
    params.delete('allow_important')
    const basePath = pathname || ''
    const nextUrl = params.toString() ? `${basePath}?${params.toString()}` : basePath
    window.location.href = nextUrl
  }

  return (
    <div className={cn(styles.wrap, className)}>
      <span className={styles.label}>{isJa ? labelJa || '負担を減らす' : 'Gentle Mode'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={gentle}
        aria-label={isJa ? (gentle ? '負担を減らす：オン' : '負担を減らす：オフ') : gentle ? 'Gentle mode on' : 'Gentle mode off'}
        title={
          isJa
            ? gentle
              ? '負担を減らす：ON（負担になりうる話題を非表示）'
              : '負担を減らす：OFF（すべて表示）'
            : gentle
              ? 'Gentle mode ON'
              : 'Gentle mode OFF'
        }
        className={cn(styles.switch, gentle && styles.switchOn)}
        onClick={() => handleToggle(!gentle)}
      >
        <span className={cn(styles.knob, gentle && styles.knobOn)} />
        <span className={styles.srOnly}>{gentle ? 'ON' : 'OFF'}</span>
      </button>
      <span className={styles.stateText}>{gentle ? 'ON' : 'OFF'}</span>
    </div>
  )
}

