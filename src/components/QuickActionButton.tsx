import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionButtonProps {
  text: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
  loading?: boolean;
}

export function QuickActionButton({
  text,
  onClick,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
}: QuickActionButtonProps) {
  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white border-blue-700',
    secondary: 'bg-green-500 hover:bg-green-600 text-white border-green-700',
    accent: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-700',
  };

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'group relative h-auto py-3 px-5 font-bold text-sm',
        'border-3 rounded-xl',
        'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
        'hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]',
        'hover:-translate-x-[2px] hover:-translate-y-[2px]',
        'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]',
        'active:translate-x-[2px] active:translate-y-[2px]',
        'transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'disabled:hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]',
        'disabled:hover:translate-x-0 disabled:hover:translate-y-0',
        variantStyles[variant]
      )}
    >
      <span className="flex items-center gap-2">
        {Icon && (
          <Icon className={cn('w-4 h-4', loading && 'animate-spin')} />
        )}
        <span>{text}</span>
      </span>
    </Button>
  );
}
