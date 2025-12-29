import { Button } from './Button'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
}

/**
 * EmptyState: 検索0件 / カテゴリ0件 / 未翻訳 などの空状態を表示
 * - 1行目：状況説明（短く）
 * - 2行目：やさしい補足（任意）
 * - 1アクション：次の行動（リンク/ボタン1つ）
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-8 px-4', className)}>
      <p className="text-[var(--text)] font-medium mb-2">{title}</p>
      {description && (
        <p className="text-[var(--muted)] text-sm mb-4">{description}</p>
      )}
      {action && (
        <div>
          {action.href ? (
            <a href={action.href}>
              <Button variant="primary" size="sm">
                {action.label}
              </Button>
            </a>
          ) : (
            <Button variant="primary" size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

