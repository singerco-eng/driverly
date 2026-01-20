import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Circle, RotateCcw } from 'lucide-react';
import { InstructionRenderer } from '@/components/features/credentials/InstructionRenderer';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import type { StepProgressData } from '@/types/credentialProgress';
import { createEmptyProgressData } from '@/types/credentialProgress';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CredentialTypeInstructions;
  credentialName: string;
}

export function PreviewModal({
  open,
  onOpenChange,
  config,
  credentialName,
}: PreviewModalProps) {
  // Local progress state for preview (not persisted)
  const [previewProgress, setPreviewProgress] = useState<StepProgressData>(
    createEmptyProgressData()
  );

  // Handle progress changes in preview
  const handleProgressChange = useCallback(
    (data: StepProgressData, _currentStepId: string) => {
      setPreviewProgress(data);
    },
    []
  );

  // Reset preview state
  const handleReset = useCallback(() => {
    setPreviewProgress(createEmptyProgressData());
  }, []);

  // Handle mock submit
  const handleSubmit = useCallback(() => {
    // In preview mode, just show a toast or something
    console.log('Preview submit - would submit credential');
  }, []);

  const hasSteps = config.steps.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-row items-start justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              {credentialName}
              <Badge variant="outline" className="ml-2">
                Preview
              </Badge>
            </DialogTitle>
            <DialogDescription>
              This is how drivers will see this credential. Interactions work but are not saved.
            </DialogDescription>
          </div>
          {hasSteps && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="shrink-0"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            {!hasSteps ? (
              <div className="py-16 text-center">
                <Circle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Steps Yet</h3>
                <p className="text-muted-foreground">
                  Add steps to your credential to see a preview here.
                </p>
              </div>
            ) : (
              <InstructionRenderer
                config={config}
                progressData={previewProgress}
                onProgressChange={handleProgressChange}
                onSubmit={handleSubmit}
                disabled={false}
                isSubmitting={false}
              />
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Preview mode — Progress is not saved
          </p>
          <Button onClick={() => onOpenChange(false)}>Close Preview</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
