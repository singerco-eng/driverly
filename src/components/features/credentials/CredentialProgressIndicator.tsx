import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface SectionProgress {
  id: string;
  label: string;
  isComplete: boolean;
  isRequired: boolean;
}

interface CredentialProgressIndicatorProps {
  sections: SectionProgress[];
  onSectionClick: (sectionId: string) => void;
  className?: string;
}

/**
 * Vertical progress indicator that sticks to the right side of the viewport.
 * Shows completion status for each section with tooltips.
 * Hidden on mobile (< md breakpoint).
 */
export function CredentialProgressIndicator({
  sections,
  onSectionClick,
  className,
}: CredentialProgressIndicatorProps) {
  // Calculate overall progress (required sections only)
  const requiredSections = sections.filter(s => s.isRequired);
  const completedCount = requiredSections.filter(s => s.isComplete).length;
  const totalCount = requiredSections.length;
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn(
          // Fixed position on right side
          'fixed right-4 top-1/2 -translate-y-1/2 z-40',
          // Card-like container
          'bg-card border border-border rounded-lg shadow-md p-2',
          // Hide on mobile
          'hidden md:flex flex-col items-center gap-1',
          className
        )}
      >
        {/* Progress percentage */}
        <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
          {percentComplete}%
        </div>

        {/* Section dots */}
        <div className="flex flex-col items-center gap-2">
          {sections.map((section) => (
            <Tooltip key={section.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onSectionClick(section.id)}
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center transition-all',
                    'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    section.isComplete
                      ? 'bg-primary-muted text-primary-muted-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                  aria-label={`${section.label}${section.isComplete ? ' (complete)' : ''}`}
                >
                  {section.isComplete ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Circle className="w-2 h-2 fill-current" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="font-medium">{section.label}</p>
                <p className="text-xs text-muted-foreground">
                  {section.isComplete ? 'Complete' : section.isRequired ? 'Required' : 'Optional'}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Bottom progress bar (vertical) */}
        <div className="w-1 h-12 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="w-full bg-primary-muted transition-all duration-300 rounded-full"
            style={{ height: `${percentComplete}%` }}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
