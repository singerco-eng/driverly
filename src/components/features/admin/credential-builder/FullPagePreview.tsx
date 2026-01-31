import { useState, useCallback } from 'react';
import { ArrowLeft, Circle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InstructionRenderer } from '@/components/features/credentials/InstructionRenderer';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import type { StepProgressData } from '@/types/credentialProgress';
import { createEmptyProgressData } from '@/types/credentialProgress';

interface FullPagePreviewProps {
  config: CredentialTypeInstructions;
  credentialName: string;
  onClose: () => void;
}

/**
 * Full-page preview of credential instructions
 * Mimics exactly what drivers will see
 */
export function FullPagePreview({
  config,
  credentialName,
  onClose,
}: FullPagePreviewProps) {
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

  // Handle mock submit
  const handleSubmit = useCallback(() => {
    console.log('Preview submit - would submit credential');
  }, []);

  const hasSteps = config.steps.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - mimics driver credential header */}
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{credentialName}</h1>
                  <Badge variant="outline" className="text-xs">
                    Preview
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  This is how drivers will see this credential
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={onClose}
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Content - constrained width like driver credential detail */}
      <div className="p-6 pb-24">
        <div className="max-w-4xl mx-auto">
        {!hasSteps ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Circle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Steps Yet</h3>
              <p className="text-muted-foreground mb-6">
                Add steps to your credential to see a preview here.
              </p>
              <Button onClick={onClose}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Editor
              </Button>
            </CardContent>
          </Card>
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
      </div>

      {/* Footer notice - starts after sidebar on desktop, matches sidebar footer height */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-muted/95 backdrop-blur border-t z-10">
        <div className="px-6 py-4 flex items-center justify-between min-h-[60px]">
          <p className="text-sm text-muted-foreground">
            Preview mode — This is how drivers will see this credential
          </p>
          <Button size="sm" onClick={onClose}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Credential
          </Button>
        </div>
      </div>
    </div>
  );
}
