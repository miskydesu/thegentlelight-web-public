'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getViewFromUrl, getViewSwitchedUrl, setPreferredView, type View } from '@/lib/view-switch'
import { cn } from '@/lib/cn'

export interface ViewSwitchProps {
  className?: string
}

/**
 * ViewSwitch: 優しさ段階切替UI（クエリパラメータ方式）
 * soft / calm / near の3段階を切り替え
 * デフォルトはcalm（SEO canonicalもcalmを使用）
 */
export function ViewSwitch({ className }: ViewSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentView = getViewFromUrl(`${pathname}?${searchParams.toString()}`)
  
  const handleViewChange = (targetView: View) => {
    if (targetView === currentView) return
    
    const currentPath = `${pathname}?${searchParams.toString()}`
    const newUrl = getViewSwitchedUrl(currentPath, targetView)
    
    setPreferredView(targetView)
    // window.location.hrefを使って完全にリロード
    // これによりサーバーコンポーネントが確実に再レンダリングされ、リストアップ基準も変わる
    window.location.href = newUrl
  }

  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <button
        onClick={() => handleViewChange('soft')}
        className={cn(
          'text-sm transition-colors',
          currentView === 'soft'
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
        title="やわらかく"
      >
        Soft
      </button>
      <span className="text-[var(--muted)] opacity-60">|</span>
      <button
        onClick={() => handleViewChange('calm')}
        className={cn(
          'text-sm transition-colors',
          currentView === 'calm'
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
        title="静かに（デフォルト）"
      >
        Calm
      </button>
      <span className="text-[var(--muted)] opacity-60">|</span>
      <button
        onClick={() => handleViewChange('near')}
        className={cn(
          'text-sm transition-colors',
          currentView === 'near'
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
        title="原文に近く"
      >
        Near
      </button>
    </div>
  )
}

