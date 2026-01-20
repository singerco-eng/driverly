import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StepProgress } from './StepProgress';
import { StepNavigation } from './StepNavigation';
import { BlockRenderer } from '../blocks/BlockRenderer';
import type { CredentialTypeInstructions, InstructionStep } from '@/types/instructionBuilder';
import type { StepProgressData, StepState } from '@/types/credentialProgress';
import {
  createEmptyProgressData,
  createEmptyStepState,
  getStepState,
  updateStepState as updateStepStateHelper,
  markStepCompleted,
} from '@/types/credentialProgress';

interface InstructionRendererProps {
  config: CredentialTypeInstructions;
  progressData: StepProgressData | null;
  onProgressChange: (data: StepProgressData, currentStepId: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  /** Read-only mode for admin review - shows submitted data without edit capability */
  readOnly?: boolean;
}

/**
 * Renders a multi-step credential instruction flow
 * Handles step navigation, block rendering, and progress tracking
 */
export function InstructionRenderer({
  config,
  progressData: externalProgressData,
  onProgressChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  readOnly = false,
}: InstructionRendererProps) {
  // Use external progress or create empty
  const progressData = externalProgressData ?? createEmptyProgressData();
  
  // Track current step index
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    // Find the first incomplete step or start at 0
    const firstIncomplete = config.steps.findIndex(
      (step) => !progressData.steps[step.id]?.completed
    );
    return firstIncomplete === -1 ? 0 : firstIncomplete;
  });

  const currentStep = config.steps[currentStepIndex];
  const currentStepState = currentStep
    ? getStepState(progressData, currentStep.id)
    : createEmptyStepState();

  // Check if current step can proceed
  const canProceed = useMemo(() => {
    if (!currentStep) return false;
    
    // Check all required blocks in current step
    for (const block of currentStep.blocks) {
      switch (block.type) {
        case 'form_field': {
          const content = block.content as { key: string; required: boolean };
          if (content.required && !currentStepState.formData[content.key]) {
            return false;
          }
          break;
        }
        case 'file_upload': {
          const content = block.content as { required: boolean };
          if (content.required && currentStepState.uploadedFiles.length === 0) {
            return false;
          }
          break;
        }
        case 'signature_pad': {
          const content = block.content as { required: boolean };
          if (content.required && !currentStepState.signatureData) {
            return false;
          }
          break;
        }
        case 'checklist': {
          const content = block.content as { requireAllChecked: boolean; items: { id: string }[] };
          if (content.requireAllChecked) {
            const allChecked = content.items.every(
              (item) => currentStepState.checklistStates[item.id]
            );
            if (!allChecked) return false;
          }
          break;
        }
        case 'external_link': {
          const content = block.content as { requireVisit: boolean };
          if (content.requireVisit && !currentStepState.externalLinksVisited.includes(block.id)) {
            return false;
          }
          break;
        }
        case 'video': {
          const content = block.content as { requireWatch: boolean };
          if (content.requireWatch && !currentStepState.videosWatched[block.id]) {
            return false;
          }
          break;
        }
        case 'quiz_question': {
          const content = block.content as { required: boolean };
          if (content.required && !currentStepState.quizAnswers[block.id]) {
            return false;
          }
          break;
        }
      }
    }
    
    return true;
  }, [currentStep, currentStepState]);

  // Handle step state changes
  const handleStepStateChange = useCallback(
    (updates: Partial<StepState>) => {
      if (disabled || !currentStep) return;

      const newProgressData = updateStepStateHelper(progressData, currentStep.id, updates);
      onProgressChange(newProgressData, currentStep.id);
    },
    [disabled, currentStep, progressData, onProgressChange]
  );

  // Navigate to previous step
  const handlePrevious = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      onProgressChange(progressData, config.steps[newIndex].id);
    }
  }, [currentStepIndex, progressData, config.steps, onProgressChange]);

  // Navigate to next step
  const handleNext = useCallback(() => {
    if (!currentStep || !canProceed) return;

    // Mark current step as completed
    const newProgressData = markStepCompleted(progressData, currentStep.id);
    
    if (currentStepIndex < config.steps.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      onProgressChange(newProgressData, config.steps[newIndex].id);
    }
  }, [currentStep, canProceed, progressData, currentStepIndex, config.steps, onProgressChange]);

  // Handle step click from progress pills
  const handleStepClick = useCallback(
    (index: number) => {
      setCurrentStepIndex(index);
      onProgressChange(progressData, config.steps[index].id);
    },
    [progressData, config.steps, onProgressChange]
  );

  // Handle final submit
  const handleSubmit = useCallback(() => {
    if (!currentStep || !canProceed) return;

    // Mark final step as completed
    const newProgressData = markStepCompleted(progressData, currentStep.id);
    onProgressChange(newProgressData, currentStep.id);
    
    // Trigger submission
    onSubmit();
  }, [currentStep, canProceed, progressData, onProgressChange, onSubmit]);

  // No steps
  if (config.steps.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No instructions configured for this credential.
        </p>
      </Card>
    );
  }

  const isLastStep = currentStepIndex === config.steps.length - 1;
  const canGoPrevious = currentStepIndex > 0;

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <StepProgress
        steps={config.steps}
        currentStepIndex={currentStepIndex}
        progressData={progressData}
        showProgressBar={config.settings.showProgressBar}
        onStepClick={handleStepClick}
      />

      {/* Current Step Content */}
      {currentStep && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{currentStep.title}</CardTitle>
              {currentStep.required && (
                <Badge variant="outline" className="text-xs font-normal">Required</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentStep.blocks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                No content in this step
              </p>
            ) : (
              currentStep.blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  stepState={currentStepState}
                  onStateChange={handleStepStateChange}
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                />
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Step Navigation */}
      <StepNavigation
        currentStepIndex={currentStepIndex}
        totalSteps={config.steps.length}
        canGoNext={canProceed}
        canGoPrevious={canGoPrevious}
        isLastStep={isLastStep}
        isSubmitting={isSubmitting}
        disabled={disabled}
        readOnly={readOnly}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export { StepProgress } from './StepProgress';
export { StepNavigation } from './StepNavigation';
