import type { AlertBlockContent } from '@/types/instructionBuilder';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface AlertBlockProps {
  content: AlertBlockContent;
  blockId: string;
  readOnly?: boolean;
}

/** Map AlertBlock variants to DS Alert variants */
function getAlertVariant(variant: AlertBlockContent['variant']): 'default' | 'destructive' | 'warning' {
  switch (variant) {
    case 'error':
      return 'destructive';
    case 'warning':
      return 'warning';
    case 'info':
    case 'success':
    default:
      return 'default';
  }
}

/** Get icon for variant */
function getIcon(variant: AlertBlockContent['variant']) {
  switch (variant) {
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    case 'success':
      return CheckCircle2;
    case 'info':
    default:
      return Info;
  }
}

export function AlertBlock({ content }: AlertBlockProps) {
  const Icon = getIcon(content.variant);

  return (
    <Alert variant={getAlertVariant(content.variant)}>
      <Icon className="h-4 w-4" />
      {content.title && <AlertTitle>{content.title}</AlertTitle>}
      {content.message && <AlertDescription>{content.message}</AlertDescription>}
    </Alert>
  );
}
