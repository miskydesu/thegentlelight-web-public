import { cn } from '@/lib/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'article' | 'section'
  clickable?: boolean
}

export function Card({ as: Component = 'div', clickable, className, children, ...props }: CardProps) {
  return (
    <Component
      className={cn(
        'border border-[var(--border)] rounded-[var(--radius-md)] p-4 bg-[var(--surface)]',
        clickable && 'cursor-pointer hover:border-[var(--accent)] transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function CardTitle({ as: Component = 'h3', className, children, ...props }: CardTitleProps) {
  return (
    <Component
      className={cn('font-semibold leading-[1.35] mb-2', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('text-[var(--text)]', className)} {...props}>
      {children}
    </div>
  )
}

export interface CardMetaProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardMeta({ className, children, ...props }: CardMetaProps) {
  return (
    <div
      className={cn('flex gap-2 flex-wrap text-sm text-[var(--muted)]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

