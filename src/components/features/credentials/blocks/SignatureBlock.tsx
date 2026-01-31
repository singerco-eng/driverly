import { useState, useRef, useEffect, useCallback } from 'react';
import type { SignaturePadBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PenTool, Type, X, Check, Eraser } from 'lucide-react';

// Format signature timestamp
function formatSignatureTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

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
      <div className="space-y-2">
        <Label>{content.label}</Label>

        <div className={readOnly ? 'p-4 border rounded-lg bg-card' : 'p-4 border rounded-lg bg-muted/30'}>
          {stepState.signatureData.type === 'typed' ? (
            <p className="text-xl font-signature italic text-center text-foreground">
              {stepState.signatureData.value}
            </p>
          ) : (
            <img
              src={stepState.signatureData.value}
              alt="Signature"
              className="max-h-24 mx-auto"
            />
          )}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-green-500" />
            <span>Signed on {formatSignatureTime(stepState.signatureData.timestamp)}</span>
          </div>
        </div>

        {!disabled && !readOnly && (
          <Button variant="ghost" size="sm" onClick={handleClearSignature} className="text-muted-foreground">
            <X className="w-3.5 h-3.5 mr-1" />
            Clear signature
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
        <div className="p-4 border rounded-lg text-center text-muted-foreground text-sm">
          {readOnly ? 'No signature provided' : 'Signature disabled'}
        </div>
      ) : (
        <SignatureInput
          content={content}
          typedValue={typedValue}
          setTypedValue={setTypedValue}
          onTypedSign={handleTypedSign}
          onDrawnSign={(dataUrl) => {
            onStateChange({
              signatureData: {
                type: 'drawn',
                value: dataUrl,
                timestamp: new Date().toISOString(),
              },
            });
          }}
          showBothOptions={showBothOptions}
        />
      )}
    </div>
  );
}

// Drawing pad component
function DrawingPad({ onApply }: { onApply: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Get canvas context
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // Get position from event
  const getPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Start drawing
  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const ctx = getContext();
    if (!ctx) return;

    const { x, y } = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [getContext, getPosition]);

  // Draw
  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const ctx = getContext();
    if (!ctx) return;

    const { x, y } = getPosition(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  }, [isDrawing, getContext, getPosition]);

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear canvas
  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, [getContext]);

  // Apply signature
  const applySignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL('image/png');
    onApply(dataUrl);
  }, [hasDrawn, onApply]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="w-full h-32 border border-border rounded-lg bg-muted/30 cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-sm text-muted-foreground">Draw your signature here</p>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button
          onClick={clearCanvas}
          size="sm"
          variant="ghost"
          disabled={!hasDrawn}
          className="text-muted-foreground"
        >
          <Eraser className="w-4 h-4 mr-1.5" />
          Clear
        </Button>
        <Button
          onClick={applySignature}
          disabled={!hasDrawn}
          size="sm"
          variant="secondary"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Apply Signature
        </Button>
      </div>
    </div>
  );
}

// Separate component for signature input to keep main component clean
function SignatureInput({
  content,
  typedValue,
  setTypedValue,
  onTypedSign,
  onDrawnSign,
  showBothOptions,
}: {
  content: SignaturePadBlockContent;
  typedValue: string;
  setTypedValue: (value: string) => void;
  onTypedSign: () => void;
  onDrawnSign: (dataUrl: string) => void;
  showBothOptions: boolean;
}) {
  const [mode, setMode] = useState<'typed' | 'drawn'>('typed');

  // Only typed available
  if (!showBothOptions && content.allowTyped) {
    return (
      <div className="space-y-3">
        <Input
          value={typedValue}
          onChange={(e) => setTypedValue(e.target.value)}
          placeholder="Type your full legal name"
        />
        {typedValue && (
          <div className="p-3 bg-muted/30 rounded-lg text-center border border-border/50">
            <p className="text-xl font-signature italic text-foreground">{typedValue}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={onTypedSign}
            disabled={!typedValue.trim()}
            size="sm"
            variant="secondary"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Apply Signature
          </Button>
        </div>
      </div>
    );
  }

  // Only drawn available
  if (!showBothOptions && content.allowDrawn) {
    return <DrawingPad onApply={onDrawnSign} />;
  }

  // Both options - use radio toggle instead of tabs
  return (
    <div className="space-y-4">
      {/* Simple radio toggle */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => setMode(v as 'typed' | 'drawn')}
        className="flex gap-4"
      >
        <Label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="typed" />
          <Type className="w-4 h-4" />
          <span>Type</span>
        </Label>
        <Label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="drawn" />
          <PenTool className="w-4 h-4" />
          <span>Draw</span>
        </Label>
      </RadioGroup>

      {/* Content based on mode */}
      {mode === 'typed' ? (
        <div className="space-y-3">
          <Input
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder="Type your full legal name"
          />
          {typedValue && (
            <div className="p-3 bg-muted/30 rounded-lg text-center border border-border/50">
              <p className="text-xl font-signature italic text-foreground">{typedValue}</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={onTypedSign}
              disabled={!typedValue.trim()}
              size="sm"
              variant="secondary"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Apply Signature
            </Button>
          </div>
        </div>
      ) : (
        <DrawingPad onApply={onDrawnSign} />
      )}
    </div>
  );
}
