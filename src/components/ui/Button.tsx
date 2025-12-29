import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'
import { forwardRef } from 'react'

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md border text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent)] text-[var(--accent-foreground)] border-[var(--accent)] hover:bg-[var(--accent-hover)]',
        ghost:
          'bg-transparent text-[var(--text)] border-transparent hover:bg-[var(--surface-hover)]',
        subtle:
          'bg-transparent text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:underline underline-offset-4',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'ghost',
      size: 'sm',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, fullWidth, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(button({ variant, size, fullWidth }), className)}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

