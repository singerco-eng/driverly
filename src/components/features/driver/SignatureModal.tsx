import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import type { CredentialWithDisplayStatus, SignatureData } from '@/types/credential';
import {
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
  useSubmitSignature,
} from '@/hooks/useCredentials';

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialWithDisplayStatus;
  driverId: string;
  onSuccess: () => void;
}

type Step = 'review' | 'sign' | 'confirm';
type SignatureMode = 'typed' | 'drawn';

export function SignatureModal({
  open,
  onOpenChange,
  credential,
  driverId,
  onSuccess,
}: SignatureModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('review');
  const [acknowledged, setAcknowledged] = useState(false);
  const [mode, setMode] = useState<SignatureMode>('typed');
  const [typedName, setTypedName] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const submitSignature = useSubmitSignature();
  const ensureDriverCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const isVehicle = credential.credentialType.category === 'vehicle';

  useEffect(() => {
    if (!open) {
      setStep('review');
      setAcknowledged(false);
      setMode('typed');
      setTypedName('');
      clearCanvas();
    }
  }, [open]);

  const resolveCredentialId = async (): Promise<string> => {
    if (credential.credential.id) return credential.credential.id;
    if (isVehicle) {
      const vehicleId = credential.credential.vehicle_id;
      if (!vehicleId) throw new Error('Missing vehicle id for credential.');
      return ensureVehicleCredential.mutateAsync({
        vehicleId,
        credentialTypeId: credential.credentialType.id,
        companyId: credential.credentialType.company_id,
      });
    }
    return ensureDriverCredential.mutateAsync({
      driverId,
      credentialTypeId: credential.credentialType.id,
      companyId: credential.credentialType.company_id,
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const startDrawing = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    const credentialId = await resolveCredentialId();
    const timestamp = new Date().toISOString();

    let signatureData: SignatureData;
    if (mode === 'typed') {
      if (!typedName.trim()) return;
      signatureData = { type: 'typed', value: typedName.trim(), timestamp };
    } else {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      signatureData = { type: 'drawn', value: dataUrl, timestamp };
    }

    await submitSignature.mutateAsync({
      credentialId,
      credentialTable: isVehicle ? 'vehicle_credentials' : 'driver_credentials',
      signatureData,
    });

    onSuccess();
  };

  const signaturePreview =
    mode === 'typed' ? typedName.trim() : canvasRef.current?.toDataURL('image/png');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Sign {credential.credentialType.name}</DialogTitle>
        </DialogHeader>

        {step === 'review' && (
          <div className="space-y-4">
            {credential.credentialType.signature_document_url ? (
              <iframe
                title="Signature document"
                src={credential.credentialType.signature_document_url}
                className="h-64 w-full rounded border"
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No signature document available.
              </p>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(value) => setAcknowledged(Boolean(value))}
              />
              I have read and understand this document
            </label>
          </div>
        )}

        {step === 'sign' && (
          <div className="space-y-4">
            <Tabs value={mode} onValueChange={(value) => setMode(value as SignatureMode)}>
              <TabsList>
                <TabsTrigger value="typed">Type Name</TabsTrigger>
                <TabsTrigger value="drawn">Draw Signature</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === 'typed' ? (
              <div className="space-y-2">
                <Input
                  placeholder="Type your full name"
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
                {typedName && (
                  <p className="text-2xl font-semibold" style={{ fontFamily: 'cursive' }}>
                    {typedName}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="w-full rounded border bg-white"
                  onMouseDown={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    startDrawing(event.clientX - rect.left, event.clientY - rect.top);
                  }}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    draw(event.clientX - rect.left, event.clientY - rect.top);
                  }}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  onTouchStart={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const touch = event.touches[0];
                    startDrawing(touch.clientX - rect.left, touch.clientY - rect.top);
                  }}
                  onTouchMove={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    const touch = event.touches[0];
                    draw(touch.clientX - rect.left, touch.clientY - rect.top);
                  }}
                  onTouchEnd={endDrawing}
                />
                <Button variant="outline" size="sm" onClick={clearCanvas}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This signature will be legally binding.
            </p>
            {mode === 'typed' ? (
              <p className="text-2xl font-semibold" style={{ fontFamily: 'cursive' }}>
                {typedName}
              </p>
            ) : (
              signaturePreview && (
                <img src={signaturePreview} alt="Signature preview" className="h-32 w-auto border rounded" />
              )
            )}
            <p className="text-xs text-muted-foreground">
              Timestamp: {new Date().toLocaleString()}
            </p>
          </div>
        )}

        <DialogFooter className="justify-between">
          <div className="flex gap-2">
            {step !== 'review' && (
              <Button variant="outline" onClick={() => setStep(step === 'confirm' ? 'sign' : 'review')}>
                Back
              </Button>
            )}
          </div>
          {step === 'review' && (
            <Button onClick={() => setStep('sign')} disabled={!acknowledged}>
              Continue
            </Button>
          )}
          {step === 'sign' && (
            <Button
              onClick={() => setStep('confirm')}
              disabled={mode === 'typed' ? !typedName.trim() : false}
            >
              Sign
            </Button>
          )}
          {step === 'confirm' && (
            <Button onClick={handleSubmit} disabled={submitSignature.isPending}>
              {submitSignature.isPending ? 'Submitting...' : 'Confirm'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
