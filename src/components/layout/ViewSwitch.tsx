'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getGentleFromUrl, getGentleSwitchedUrl, setPreferredGentle } from '@/lib/view-switch'
import { cn } from '@/lib/cn'

export interface ViewSwitchProps {
  className?: string
}

/**
 * ViewSwitch: gentleモード切替UI（クエリパラメータ方式）
 * gentle=1 のとき「穏やかに読める範囲」を優先（重要度×heartwarming_score で絞り込み）
 */
export function ViewSwitch({ className }: ViewSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const gentle = getGentleFromUrl(`${pathname}?${searchParams.toString()}`)
  
  const handleToggle = (nextGentle: boolean) => {
    if (nextGentle === gentle) return
    
    const currentPath = `${pathname}?${searchParams.toString()}`
    const newUrl = getGentleSwitchedUrl(currentPath, nextGentle)
    
    setPreferredGentle(nextGentle)
    // window.location.hrefを使って完全にリロード
    // これによりサーバーコンポーネントが確実に再レンダリングされ、リストアップ基準も変わる
    window.location.href = newUrl
  }

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <button
        onClick={() => handleToggle(true)}
        className={cn(
          'text-sm transition-colors',
          gentle
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
        title="gentleモード ON（重要度×heartwarming_scoreで絞り込み）"
      >
        Gentle ON
      </button>
      <span className="text-[var(--muted)] opacity-60">|</span>
      <button
        onClick={() => handleToggle(false)}
        className={cn(
          'text-sm transition-colors',
          !gentle
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
        title="gentleモード OFF（スコアに関係なく表示）"
      >
        Gentle OFF
      </button>
    </div>
  )
}

