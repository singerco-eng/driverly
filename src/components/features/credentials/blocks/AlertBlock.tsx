import type { AlertBlockContent } from '@/types/instructionBuilder';
import { Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertBlockProps {
  content: AlertBlockContent;
  blockId: string;
}

const variantConfig = {
  info: {
    icon: Info,
    containerClass: 'bg-blue-500/10 border-blue-500/30',
    iconClass: 'text-blue-600',
    titleClass: 'text-blue-700 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-yellow-500/10 border-yellow-500/30',
    iconClass: 'text-yellow-600',
    titleClass: 'text-yellow-700 dark:text-yellow-400',
  },
  success: {
    icon: CheckCircle2,
    containerClass: 'bg-green-500/10 border-green-500/30',
    iconClass: 'text-green-600',
    titleClass: 'text-green-700 dark:text-green-400',
  },
  error: {
    icon: AlertCircle,
    containerClass: 'bg-red-500/10 border-red-500/30',
    iconClass: 'text-red-600',
    titleClass: 'text-red-700 dark:text-red-400',
  },
};

export function AlertBlock({ content }: AlertBlockProps) {
  const config = variantConfig[content.variant] ?? variantConfig.info;
  const Icon = config.icon;

  return (
    <div className={cn('p-4 rounded-lg border flex gap-3', config.containerClass)}>
      <Icon className={cn('w-5 h-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        {content.title && (
          <h4 className={cn('font-medium', config.titleClass)}>
            {content.title}
          </h4>
        )}
        {content.message && (
          <p className="text-sm mt-1 text-foreground/80">
            {content.message}
          </p>
        )}
      </div>
    </div>
  );
}
