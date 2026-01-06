import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const badge = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs leading-5 select-none',
  {
    variants: {
      variant: {
        tone: 'bg-[var(--badge-tone-bg)] text-[var(--text)] border-[var(--border)]',
        info: 'bg-[var(--badge-info-bg)] text-[var(--text)] border-[var(--border)]',
        time: 'bg-transparent text-[var(--muted)] border-[var(--border)]',
      },
      emphasis: {
        soft: '',
        outline: 'bg-transparent',
      },
      size: {
        sm: 'px-2',
      },
    },
    defaultVariants: {
      variant: 'info',
      emphasis: 'soft',
      size: 'sm',
    },
  }
)

export interface BadgeProps extends VariantProps<typeof badge> {
  children: React.ReactNode
  className?: string
}

export function Badge({ variant, emphasis, size, children, className }: BadgeProps) {
  return (
    <span className={cn(badge({ variant, emphasis, size }), className)}>
      {children}
    </span>
  )
}

