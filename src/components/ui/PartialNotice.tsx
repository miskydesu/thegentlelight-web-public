import Link from 'next/link'
import { cn } from '@/lib/cn'
import { useTranslations, type Country } from '@/lib/i18n'

export interface PartialNoticeProps {
  country: Country
  className?: string
}

/**
 * PartialNotice: partial表示（末尾に静かな注記＋latest導線）
 * - ページ上部の目立つ警告はしない
 * - リスト/セクション末尾に小さく注記する
 * - 文言は「不足」より「更新中」「一部反映遅れ」など柔らかく
 */
export function PartialNotice({ country, className }: PartialNoticeProps) {
  const t = useTranslations(country)
  
  return (
    <div
      className={cn(
        'mt-4 pt-4 border-t border-[var(--border)] text-sm text-[var(--muted)]',
        className
      )}
    >
      <p className="mb-2">
        {t.partial.notice}
      </p>
      <Link
        href={`/${country}/latest`}
        className="text-[var(--accent)] hover:underline underline-offset-4"
      >
        {t.partial.seeLatest}
      </Link>
    </div>
  )
}

