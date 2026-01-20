import { useState } from 'react';
import type { SignaturePadBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PenTool, Type, X } from 'lucide-react';

interface SignatureBlockProps {
  content: SignaturePadBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function SignatureBlock({
  content,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: SignatureBlockProps) {
  const [typedValue, setTypedValue] = useState(
    stepState.signatureData?.type === 'typed' ? stepState.signatureData.value : ''
  );

  const hasSigned = stepState.signatureData !== null;
  const showBothOptions = content.allowTyped && content.allowDrawn;

  const handleTypedSign = () => {
    if (disabled || !typedValue.trim()) return;

    onStateChange({
      signatureData: {
        type: 'typed',
        value: typedValue.trim(),
        timestamp: new Date().toISOString(),
      },
    });
  };

  const handleClearSignature = () => {
    if (disabled) return;

    onStateChange({
      signatureData: null,
    });
    setTypedValue('');
  };

  // If already signed, show the signature
  if (hasSigned && stepState.signatureData) {
    return (
      <div className="space-y-3">
        <Label>{content.label}</Label>

        <div className="p-4 border rounded-lg bg-muted/50">
          {stepState.signatureData.type === 'typed' ? (
            <p className="text-2xl font-signature italic text-center">
              {stepState.signatureData.value}
            </p>
          ) : (
            <img
              src={stepState.signatureData.value}
              alt="Signature"
              className="max-h-24 mx-auto"
            />
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">
            Signed {new Date(stepState.signatureData.timestamp).toLocaleDateString()}
          </p>
        </div>

        {!disabled && !readOnly && (
          <Button variant="ghost" size="sm" onClick={handleClearSignature}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    );
  }

  // Not signed yet - show signature input
  return (
    <div className="space-y-3">
      <Label>
        {content.label}
        {content.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {content.agreementText && (
        <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
          {content.agreementText}
        </p>
      )}

      {disabled || readOnly ? (
        <div className="p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground">
          {readOnly ? 'No signature provided' : 'Signature disabled'}
        </div>
      ) : showBothOptions ? (
        <Tabs defaultValue="typed" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="typed" disabled={!content.allowTyped}>
              <Type className="w-4 h-4 mr-2" />
              Type
            </TabsTrigger>
            <TabsTrigger value="drawn" disabled={!content.allowDrawn}>
              <PenTool className="w-4 h-4 mr-2" />
              Draw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="typed" className="space-y-3">
            <Input
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder="Type your full legal name"
              className="text-lg"
            />
            {typedValue && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Preview</p>
                <p className="text-2xl font-signature italic">{typedValue}</p>
              </div>
            )}
            <Button
              onClick={handleTypedSign}
              disabled={!typedValue.trim()}
              className="w-full"
            >
              Sign with Typed Name
            </Button>
          </TabsContent>

          <TabsContent value="drawn" className="space-y-3">
            <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PenTool className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">Drawing pad coming soon</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : content.allowTyped ? (
        <div className="space-y-3">
          <Input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder="Type your full legal name"
            className="text-lg"
          />
          {typedValue && (
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <p className="text-2xl font-signature italic">{typedValue}</p>
            </div>
          )}
          <Button
            onClick={handleTypedSign}
            disabled={!typedValue.trim()}
            className="w-full"
          >
            Sign with Typed Name
          </Button>
        </div>
      ) : (
        <div className="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <PenTool className="w-6 h-6 mx-auto mb-2" />
            <p className="text-sm">Drawing pad coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
