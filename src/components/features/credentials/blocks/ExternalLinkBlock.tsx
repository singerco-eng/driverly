import type { ExternalLinkBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ExternalLink, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExternalLinkBlockProps {
  content: ExternalLinkBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ExternalLinkBlock({
  content,
  blockId,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: ExternalLinkBlockProps) {
  const isVisited = stepState.externalLinksVisited.includes(blockId);
  const isDisabled = disabled;

  const handleClick = () => {
    if (isDisabled) return;

    // Track visit if enabled
    if (!readOnly && content.trackVisit && !isVisited) {
      onStateChange({
        externalLinksVisited: [...stepState.externalLinksVisited, blockId],
      });
    }

    // Open link
    if (content.opensInNewTab) {
      window.open(content.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = content.url;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="flex items-center gap-2">
          {content.title || 'External Link'}
          {!readOnly && content.requireVisit && !isVisited && (
            <span className="text-destructive">*</span>
          )}
        </Label>
        {isVisited && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600">
            <Check className="w-3 h-3" />
            Visited
          </span>
        )}
      </div>
      
      {content.description && (
        <p className="text-sm text-muted-foreground">
          {content.description}
        </p>
      )}
      
      <Button
        size="sm"
        variant="outline"
        className={cn(isDisabled && 'pointer-events-none opacity-50')}
        onClick={handleClick}
        disabled={isDisabled}
      >
        {content.buttonText || 'Open Link'}
        <ExternalLink className="w-3 h-3 ml-1.5" />
      </Button>
    </div>
  );
}
