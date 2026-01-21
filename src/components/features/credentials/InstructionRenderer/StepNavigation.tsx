import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';

interface StepNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function StepNavigation({
  currentStepIndex,
  totalSteps,
  canGoNext,
  canGoPrevious,
  isLastStep,
  isSubmitting,
  disabled,
  readOnly,
  onPrevious,
  onNext,
  onSubmit,
}: StepNavigationProps) {
  const isSingleStep = totalSteps === 1;

  return (
    <div className="flex items-center justify-between pt-4 mt-4 border-t">
      {/* Left: Previous button or placeholder (hidden for single step) */}
      {!isSingleStep && (
        <div className="w-24">
          {canGoPrevious && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={disabled || isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      )}

      {/* Center: Step counter (hidden for single step) */}
      {!isSingleStep && (
        <span className="text-xs text-muted-foreground">
          {currentStepIndex + 1} of {totalSteps}
        </span>
      )}

      {/* Spacer for single step to push button to right */}
      {isSingleStep && <div className="flex-1" />}

      {/* Right: Next/Submit button */}
      <div className={isSingleStep ? '' : 'w-24 flex justify-end'}>
        {isLastStep ? (
          readOnly ? null : (
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={disabled || !canGoNext || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Submitting
                </>
              ) : (
                <>
                  Submit
                  <Send className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          )
        ) : (
          <Button
            variant={readOnly ? 'ghost' : 'default'}
            size="sm"
            onClick={onNext}
            disabled={disabled || (!readOnly && !canGoNext) || isSubmitting}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
