import type { ExternalLinkBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Button } from '@/components/ui/button';
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
  const isDisabled = disabled || readOnly;

  const handleClick = () => {
    if (isDisabled) return;

    // Track visit if enabled
    if (content.trackVisit && !isVisited) {
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
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="p-1.5 rounded bg-muted">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">
            {content.title || 'External Link'}
          </h4>
          {isVisited && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="w-3 h-3" />
              Visited
            </span>
          )}
        </div>
        {content.description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {content.description}
          </p>
        )}
        <Button
          size="sm"
          variant="outline"
          className={cn('mt-2', isDisabled && 'pointer-events-none opacity-50')}
          onClick={handleClick}
          disabled={isDisabled}
        >
          {content.buttonText || 'Open Link'}
          <ExternalLink className="w-3 h-3 ml-1.5" />
        </Button>
      </div>

      {!readOnly && content.requireVisit && !isVisited && (
        <p className="text-xs text-muted-foreground">Required</p>
      )}
    </div>
  );
}
