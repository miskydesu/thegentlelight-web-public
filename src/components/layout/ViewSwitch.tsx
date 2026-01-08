'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { getGentleFromUrl, getGentleSwitchedUrl, setPreferredGentle } from '@/lib/view-switch'
import { cn } from '@/lib/cn'
import styles from './ViewSwitch.module.css'

export interface ViewSwitchProps {
  className?: string
}

/**
 * ViewSwitch: gentleモード切替UI（クエリパラメータ方式）
 * gentle=1 のとき「穏やかに読める範囲」を優先（重要度×heartwarming_score で絞り込み）
 */
export function ViewSwitch({ className }: ViewSwitchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const gentle = getGentleFromUrl(`${pathname || ''}?${searchParams?.toString() || ''}`)
  
  const handleToggle = (nextGentle: boolean) => {
    if (nextGentle === gentle) return
    
    const currentPath = `${pathname || ''}?${searchParams?.toString() || ''}`
    const newUrl = getGentleSwitchedUrl(currentPath, nextGentle)
    
    setPreferredGentle(nextGentle)
    // window.location.hrefを使って完全にリロード
    // これによりサーバーコンポーネントが確実に再レンダリングされ、リストアップ基準も変わる
    window.location.href = newUrl
  }

  return (
    <div className={cn(styles.wrap, className)}>
      <span className={styles.label}>Gentle Mode</span>
      <button
        type="button"
        role="switch"
        aria-checked={gentle}
        aria-label={gentle ? 'Gentle mode on' : 'Gentle mode off'}
        title={
          gentle
            ? 'gentleモード ON（重要度×heartwarming_scoreで絞り込み）'
            : 'gentleモード OFF（スコアに関係なく表示）'
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

