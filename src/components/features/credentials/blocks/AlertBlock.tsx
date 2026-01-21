import type { AlertBlockContent } from '@/types/instructionBuilder';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface AlertBlockProps {
  content: AlertBlockContent;
  blockId: string;
}

const variantConfig = {
  info: {
    icon: Info,
    alertVariant: 'default' as const,
  },
  warning: {
    icon: AlertTriangle,
    alertVariant: 'default' as const,
  },
  success: {
    icon: CheckCircle2,
    alertVariant: 'default' as const,
  },
  error: {
    icon: AlertCircle,
    alertVariant: 'destructive' as const,
  },
};

export function AlertBlock({ content }: AlertBlockProps) {
  const config = variantConfig[content.variant] ?? variantConfig.info;
  const Icon = config.icon;

  return (
    <Alert variant={config.alertVariant}>
      <Icon className="h-4 w-4" />
      {content.title && <AlertTitle>{content.title}</AlertTitle>}
      {content.message && <AlertDescription>{content.message}</AlertDescription>}
    </Alert>
  );
}
