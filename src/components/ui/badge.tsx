import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]',
        secondary: 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]',
        success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        warning: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        destructive: 'border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300',
        outline: 'border-[var(--border)] bg-transparent text-[var(--foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
