import { cn } from '@/lib/utils';

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'outline';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'outline' ? 'border border-slate-700 text-slate-200' : 'border border-slate-700 bg-slate-800 text-slate-200',
        className,
      )}
      {...props}
    />
  );
}
