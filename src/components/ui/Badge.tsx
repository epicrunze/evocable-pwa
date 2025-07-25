import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80',
        destructive: 'border-transparent bg-red-500 text-gray-50 hover:bg-red-500/80',
        outline: 'text-gray-950 border-gray-200',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
        error: 'border-transparent bg-red-100 text-red-800',
        info: 'border-transparent bg-blue-100 text-blue-800',
        processing: 'border-transparent bg-[#129990]/10 text-[#129990]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants }; 