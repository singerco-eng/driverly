import { useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BlockRenderer } from '../blocks/BlockRenderer';
import type {
  ChecklistBlockContent,
  CredentialTypeInstructions,
  ExternalLinkBlockContent,
  FileUploadBlockContent,
  FormFieldBlockContent,
  HeadingBlockContent,
  InstructionStep,
  QuizQuestionBlockContent,
  SignaturePadBlockContent,
  VideoBlockContent,
} from '@/types/instructionBuilder';
import type { StepProgressData, StepState } from '@/types/credentialProgress';
import {
  createEmptyProgressData,
  getStepState,
  updateStepState as updateStepStateHelper,
  markStepCompleted,
} from '@/types/credentialProgress';
import type { SectionProgress } from '../CredentialProgressIndicator';

interface InstructionRendererProps {
  config: CredentialTypeInstructions;
  progressData: StepProgressData | null;
  onProgressChange: (data: StepProgressData, currentStepId: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  /** Read-only mode for admin review - shows submitted data without edit capability */
  readOnly?: boolean;
  /** Custom label for the submit button */
  submitLabel?: string;
  /** Callback to receive section progress info for external progress indicator */
  onSectionInfoChange?: (sections: SectionProgress[]) => void;
  /** Callback to receive ref map for scrolling to sections */
  onSectionRefsReady?: (refs: Map<string, HTMLElement>) => void;
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
  submitLabel,
  onSectionInfoChange,
  onSectionRefsReady,
}: InstructionRendererProps) {
  // Use external progress or create empty
  const progressData = externalProgressData ?? createEmptyProgressData();

  // Check if ALL required steps can proceed (for submit button)
  const canSubmit = useMemo(() => {
    return config.steps.every((step) => {
      if (!step.required) return true;
      const stepState = getStepState(progressData, step.id);
      return isSectionComplete(step, stepState);
    });
  }, [config.steps, progressData]);

  // Extract section info with labels from first heading block
  const sectionInfo: SectionProgress[] = useMemo(() => {
    return config.steps.map((step, index) => {
      // Find first heading block to use as label
      const headingBlock = step.blocks.find(b => b.type === 'heading');
      const label = headingBlock 
        ? (headingBlock.content as HeadingBlockContent).text 
        : `Section ${index + 1}`;
      const isComplete = isSectionComplete(step, getStepState(progressData, step.id));
      return {
        id: step.id,
        label,
        isComplete,
        isRequired: step.required,
      };
    });
  }, [config.steps, progressData]);

  // Refs for scrolling to sections
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Notify parent of section info changes
  useEffect(() => {
    onSectionInfoChange?.(sectionInfo);
  }, [sectionInfo, onSectionInfoChange]);

  // Notify parent when refs are ready
  useEffect(() => {
    if (sectionRefs.current.size > 0) {
      onSectionRefsReady?.(sectionRefs.current);
    }
  }, [config.steps.length, onSectionRefsReady]);


  // Handle step state changes
  const handleStepStateChange = useCallback(
    (stepId: string, updates: Partial<StepState>) => {
      if (disabled || readOnly) return;
      const newProgressData = updateStepStateHelper(progressData, stepId, updates);
      onProgressChange(newProgressData, stepId);
    },
    [disabled, readOnly, progressData, onProgressChange]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    // Mark all steps as completed
    let newProgressData = progressData;
    config.steps.forEach((step) => {
      newProgressData = markStepCompleted(newProgressData, step.id);
    });
    onProgressChange(newProgressData, config.steps[config.steps.length - 1]?.id ?? '');

    onSubmit();
  }, [canSubmit, progressData, config.steps, onProgressChange, onSubmit]);

  // No steps
  if (config.steps.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No instructions configured for this credential.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Soft Section Groups - each section feels like a distinct step */}
      {config.steps.map((step) => (
        <section
          key={step.id}
          ref={(el) => {
            if (el) sectionRefs.current.set(step.id, el);
          }}
          className="bg-card/50 border border-border/40 rounded-xl p-8 shadow-sm scroll-mt-24"
        >
          <div className="space-y-6">
            {step.blocks.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No content in this section.
              </p>
            ) : (
              step.blocks.map((block) => (
                <BlockRenderer
                  key={block.id}
                  block={block}
                  stepState={getStepState(progressData, step.id)}
                  onStateChange={(updates) => handleStepStateChange(step.id, updates)}
                  disabled={disabled || readOnly}
                  readOnly={readOnly}
                />
              ))
            )}
          </div>
        </section>
      ))}

      {/* Submit Button */}
      {!readOnly && (
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={disabled || !canSubmit || isSubmitting}
            size="default"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitLabel || 'Submit for Review'}
          </Button>
        </div>
      )}
    </div>
  );
}

export { StepProgress } from './StepProgress';
export { StepNavigation } from './StepNavigation';

function isSectionComplete(step: InstructionStep, stepState: StepState): boolean {
  for (const block of step.blocks) {
    switch (block.type) {
      case 'form_field': {
        const content = block.content as FormFieldBlockContent;
        if (content.required && !stepState.formData[content.key]) {
          return false;
        }
        break;
      }
      case 'file_upload': {
        const content = block.content as FileUploadBlockContent;
        if (content.required && stepState.uploadedFiles.length === 0) {
          return false;
        }
        break;
      }
      case 'signature_pad': {
        const content = block.content as SignaturePadBlockContent;
        if (content.required && !stepState.signatureData) {
          return false;
        }
        break;
      }
      case 'checklist': {
        const content = block.content as ChecklistBlockContent;
        if (content.requireAllChecked) {
          const allChecked = content.items.every(
            (item) => stepState.checklistStates[item.id]
          );
          if (!allChecked) return false;
        }
        break;
      }
      case 'external_link': {
        const content = block.content as ExternalLinkBlockContent;
        if (content.requireVisit && !stepState.externalLinksVisited.includes(block.id)) {
          return false;
        }
        break;
      }
      case 'video': {
        const content = block.content as VideoBlockContent;
        if (content.requireWatch && !stepState.videosWatched[block.id]) {
          return false;
        }
        break;
      }
      case 'quiz_question': {
        const content = block.content as QuizQuestionBlockContent;
        if (content.required && !stepState.quizAnswers[block.id]) {
          return false;
        }
        break;
      }
    }
  }
  return true;
}
