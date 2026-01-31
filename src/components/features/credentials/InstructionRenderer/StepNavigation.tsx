import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface StepNavigationProps {
  currentStepIndex: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  submitLabel?: string;
  simple?: boolean;
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
  readOnly = false,
  submitLabel,
  simple = false,
  onPrevious,
  onNext,
  onSubmit,
}: StepNavigationProps) {
  if (readOnly) return null;

  if (simple) {
    return (
      <div className="flex justify-end pt-4">
        <Button
          onClick={onSubmit}
          disabled={disabled || !canGoNext || isSubmitting}
          size="default"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {submitLabel || 'Submit for Review'}
        </Button>
      </div>
    );
  }

  const isSingleStep = totalSteps === 1;

  return (
    <div className="flex items-center justify-between pt-3 mt-2 border-t">
      {/* Previous Button */}
      <div className="w-24">
        {canGoPrevious && (
          <Button
            variant="outline"
            onClick={onPrevious}
            disabled={disabled}
            size="sm"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>
        )}
      </div>

      {/* Step Counter - hide for single step */}
      {!isSingleStep && (
        <span className="text-xs text-muted-foreground">
          {currentStepIndex + 1} of {totalSteps}
        </span>
      )}

      {/* Next/Submit Button */}
      <div className="w-24 flex justify-end">
        {isLastStep ? (
          <Button
            onClick={onSubmit}
            disabled={disabled || !canGoNext || isSubmitting}
            size="sm"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitLabel || 'Submit'}
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={disabled || !canGoNext}
            size="sm"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
