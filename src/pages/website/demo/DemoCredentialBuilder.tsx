/**
 * Demo Credential Builder Page
 * 
 * This renders the REAL credential builder with an INLINE slideout panel
 * that stays within the demo container (no portals).
 */

import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Save, Eye, Sparkles, Wand2, Loader2, Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Import REAL components
import { InstructionBuilder } from '@/components/features/admin/credential-builder/InstructionBuilder';

// Import types
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { createEmptyInstructions } from '@/types/instructionBuilder';

// Import mock data
import {
  mockCredentialType,
  mockAIPrompt,
  mockGeneratedConfig,
} from '../demo-data/mockCredentialBuilder';

interface DemoCredentialBuilderProps {
  embedded?: boolean;
}

type DemoStage = 'prompt' | 'generating' | 'preview' | 'builder';

export default function DemoCredentialBuilder({ embedded = false }: DemoCredentialBuilderProps) {
  const [stage, setStage] = useState<DemoStage>('prompt');
  const [instructionConfig, setInstructionConfig] = useState<CredentialTypeInstructions>(
    createEmptyInstructions()
  );
  const sheetContentRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when preview is shown so users see the Apply button
  useEffect(() => {
    if (stage === 'preview' && sheetContentRef.current) {
      // Small delay to allow content to render
      setTimeout(() => {
        sheetContentRef.current?.scrollTo({
          top: sheetContentRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [stage]);

  const handleGenerate = () => {
    setStage('generating');
    // Simulate AI generation delay
    setTimeout(() => {
      setStage('preview');
    }, 2000);
  };

  const handleApply = () => {
    setInstructionConfig(mockGeneratedConfig);
    setStage('builder');
    setShowSheet(false); // Close the AI sheet
  };

  const handleOpenAISheet = () => {
    if (stage === 'builder') {
      // Reset to show the flow again
      setInstructionConfig(createEmptyInstructions());
      setStage('prompt');
    }
  };

  const showSheet = stage !== 'builder';

  return (
    <div className="min-h-[600px] bg-background relative overflow-hidden">
      {/* Scrim/Backdrop - visible overlay between content and sheet */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 z-40 transition-opacity duration-300",
          showSheet ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
      />

      {/* Main Content Area */}
      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* Page Header - Like real CredentialTypeEditor */}
          <div className="flex flex-col gap-4">
            {/* Back link */}
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
              Back to Credential Types
            </div>

            {/* Title row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold">{mockCredentialType.name}</h1>
                  <Badge variant="default">Active</Badge>
                </div>
                <p className="text-muted-foreground text-sm mt-1">
                  {mockCredentialType.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1">
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
                <Button size="sm" className="gap-1">
                  <Save className="w-4 h-4" />
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs - Like real CredentialTypeEditor */}
          <Tabs defaultValue="instructions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="instructions" className="space-y-0">
              {/* THE REAL InstructionBuilder component */}
              <InstructionBuilder
                config={instructionConfig}
                onChange={setInstructionConfig}
                credentialName={mockCredentialType.name}
                readOnly={stage === 'builder'}
              />
            </TabsContent>

            <TabsContent value="requirements" className="space-y-6">
              <div className="p-8 text-center text-muted-foreground">
                Requirements configuration...
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="p-8 text-center text-muted-foreground">
                Advanced settings...
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Slideout Panel - Slides in from right, overlays content */}
      <div className={cn(
        "absolute right-0 top-0 bottom-0 w-[380px] bg-background border-l border-border shadow-2xl transition-transform duration-300 ease-out flex flex-col z-50",
        showSheet ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Create with AI</h2>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => stage === 'builder' ? null : setStage('builder')}
              disabled={stage !== 'preview'}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you need in plain language and AI will build the steps for you.
          </p>
        </div>

        {/* Content */}
        <div ref={sheetContentRef} className="flex-1 overflow-auto px-6 py-4 space-y-6">
          {/* Prompt Input - Read-only prefilled */}
          <div className="space-y-2">
            <Label>Describe your credential requirements</Label>
            <div className="min-h-[140px] p-3 rounded-md border border-input bg-muted/30 text-sm">
              {mockAIPrompt}
            </div>
            <p className="text-xs text-muted-foreground">
              Be specific about what documents, photos, signatures, or information you need to collect.
            </p>
          </div>

          {/* Generate Button - Only show in prompt stage */}
          {stage === 'prompt' && (
            <Button onClick={handleGenerate} className="w-full" size="lg">
              <Wand2 className="w-4 h-4 mr-2" />
              Generate Instructions
            </Button>
          )}

          {/* Loading State */}
          {stage === 'generating' && (
            <div className="flex flex-col items-center py-8 space-y-4">
              <div className="relative">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium">Generating your credential...</p>
                <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
              </div>
            </div>
          )}

          {/* Generated Preview - Show after generation */}
          {stage === 'preview' && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Generated Preview
                  </Label>
                  <Badge variant="secondary">
                    {mockGeneratedConfig.steps.length} steps
                  </Badge>
                </div>

                {/* Step Summary */}
                <div className="space-y-2">
                  {mockGeneratedConfig.steps.map((step, index) => (
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
                          {step.blocks.length} blocks • {step.type.replace('_', ' ')}
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
      </div>
    </div>
  );
}
