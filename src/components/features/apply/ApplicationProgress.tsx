import { cn } from '@/lib/utils';

export interface ApplicationStep {
  id: number;
  label: string;
}

interface ApplicationProgressProps {
  steps: ApplicationStep[];
  currentStep: number;
}

export function ApplicationProgress({ steps, currentStep }: ApplicationProgressProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {steps.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = step.id < currentStep;
        return (
          <div key={step.id} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border',
                isComplete && 'bg-primary-muted text-primary-muted-foreground border-primary-muted',
                isActive && 'bg-primary-muted/10 text-primary-muted border-primary-muted/40',
                !isActive && !isComplete && 'bg-muted text-muted-foreground border-border/40'
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                'text-sm',
                isActive && 'text-foreground font-medium',
                !isActive && 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
