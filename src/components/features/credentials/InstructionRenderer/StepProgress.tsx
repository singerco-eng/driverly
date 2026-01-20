import { Check } from 'lucide-react';
import type { InstructionStep } from '@/types/instructionBuilder';
import type { StepProgressData } from '@/types/credentialProgress';
import { cn } from '@/lib/utils';

interface StepProgressProps {
  steps: InstructionStep[];
  currentStepIndex: number;
  progressData: StepProgressData;
  showProgressBar: boolean;
  onStepClick?: (index: number) => void;
}

export function StepProgress({
  steps,
  currentStepIndex,
  progressData,
  onStepClick,
}: StepProgressProps) {
  // Single progress display - no redundant indicators
  if (steps.length <= 1) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const isCompleted = progressData.steps[step.id]?.completed;
        const isCurrent = index === currentStepIndex;
        const isPast = index < currentStepIndex;
        const canClick = isCompleted || isPast;

        return (
          <button
            key={step.id}
            onClick={() => canClick && onStepClick?.(index)}
            disabled={!canClick}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm whitespace-nowrap transition-colors border',
              // Current step - subtle primary indicator
              isCurrent && 'bg-primary/10 text-foreground border-primary/30',
              // Completed - neutral muted
              isCompleted && !isCurrent && 'bg-muted/50 text-muted-foreground border-transparent',
              // Future incomplete - very subtle
              !isCurrent && !isCompleted && 'bg-transparent text-muted-foreground/60 border-transparent',
              // Clickable states
              canClick && !isCurrent && 'hover:bg-muted cursor-pointer',
              !canClick && 'cursor-default'
            )}
          >
            {isCompleted ? (
              <Check className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <span className={cn(
                'w-5 h-5 flex items-center justify-center text-xs font-medium rounded-full',
                isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline max-w-[100px] truncate">
              {step.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
