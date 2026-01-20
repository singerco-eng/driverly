import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  Loader2,
  Wand2,
  FileUp,
  PenTool,
  FileText,
  CheckSquare,
  ExternalLink,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

interface AIGeneratorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialName: string;
  onApply: (config: CredentialTypeInstructions) => void;
}

const EXAMPLE_PROMPTS = [
  {
    icon: FileUp,
    label: 'Document Upload',
    prompt: 'I need drivers to upload their commercial driver\'s license, both front and back photos. Include an expiration date field.',
  },
  {
    icon: PenTool,
    label: 'Agreement Signature',
    prompt: 'Create a safety policy acknowledgment where drivers read the policy text, check that they understand each section, and sign at the end.',
  },
  {
    icon: FileText,
    label: 'Form Entry',
    prompt: 'Collect driver background check information: full legal name, date of birth, SSN last 4 digits, current address, and 3 years of employment history.',
  },
  {
    icon: CheckSquare,
    label: 'Training Checklist',
    prompt: 'A vehicle inspection training with a YouTube video to watch, a checklist of items they need to understand, and a quiz with 3 multiple choice questions.',
  },
  {
    icon: ExternalLink,
    label: 'External Action',
    prompt: 'Driver needs to complete a third-party background check at checkr.com. Show instructions, provide the link, and have them confirm when complete.',
  },
];

export function AIGeneratorSheet({
  open,
  onOpenChange,
  credentialName,
  onApply,
}: AIGeneratorSheetProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<CredentialTypeInstructions | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.trim().length < 10) {
      setError('Please provide a more detailed description (at least 10 characters)');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedConfig(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        {
          body: { prompt, credentialName },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate instructions');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.config) {
        throw new Error('No configuration returned');
      }

      setGeneratedConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate instructions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedConfig) {
      onApply(generatedConfig);
      onOpenChange(false);
      // Reset state
      setPrompt('');
      setGeneratedConfig(null);
      setError(null);
    }
  };

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setGeneratedConfig(null);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setPrompt('');
      setGeneratedConfig(null);
      setError(null);
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create with AI
          </SheetTitle>
          <SheetDescription>
            Describe what you need in plain language and AI will build the steps for you.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Describe your credential requirements</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Example: I need drivers to upload their CDL license (front and back photos), enter the expiration date, and sign an acknowledgment that it's valid..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Be specific about what documents, photos, signatures, or information you need to collect.
              </p>
            </div>

            {/* Example Prompts */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Quick examples</Label>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_PROMPTS.map((example) => (
                  <Badge
                    key={example.label}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleExampleClick(example.prompt)}
                  >
                    <example.icon className="w-3 h-3 mr-1" />
                    {example.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Instructions
                </>
              )}
            </Button>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Generated Preview */}
            {generatedConfig && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Generated Preview
                    </Label>
                    <Badge variant="secondary">
                      {generatedConfig.steps.length} step{generatedConfig.steps.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Step Summary */}
                  <div className="space-y-2">
                    {generatedConfig.steps.map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{step.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {step.blocks.length} block{step.blocks.length !== 1 ? 's' : ''} •{' '}
                            {step.type.replace('_', ' ')}
                          </p>
                        </div>
                        {step.required && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            Required
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <Button onClick={handleApply} className="w-full" variant="default">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Apply to Credential
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    You can edit and customize the steps after applying
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
