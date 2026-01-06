import { cn } from '@/lib/cn'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
}

/**
 * Skeleton: ローディング中のスケルトン表示
 * - 一覧はカード単位スケルトン
 * - ページ全体のスケルトンは避ける
 */
export function Skeleton({ variant = 'rectangular', className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-[var(--surface-hover)]',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-[var(--radius-md)]',
        className
      )}
      {...props}
    />
  )
}

export interface SkeletonCardProps {
  className?: string
}

/**
 * SkeletonCard: 記事カード用のスケルトン
 * - タイトル2行 / 要約2行 / メタ1行
 */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'border border-[var(--border)] rounded-[var(--radius-md)] p-4 bg-[var(--surface)]',
        className
      )}
    >
      <Skeleton variant="text" className="h-5 w-3/4 mb-2" />
      <Skeleton variant="text" className="h-5 w-1/2 mb-3" />
      <Skeleton variant="text" className="h-4 w-full mb-1" />
      <Skeleton variant="text" className="h-4 w-5/6 mb-3" />
      <Skeleton variant="text" className="h-4 w-1/3" />
    </div>
  )
}

export interface SkeletonListProps {
  count?: number
  className?: string
}

/**
 * SkeletonList: 一覧用のスケルトン（6〜8件）
 */
export function SkeletonList({ count = 6, className }: SkeletonListProps) {
  return (
    <div className={cn('grid gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

