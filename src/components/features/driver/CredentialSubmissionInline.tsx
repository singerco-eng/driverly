import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { useToast } from '@/hooks/use-toast';
import {
  useSubmitDocument,
  useSubmitSignature,
  useSubmitForm,
  useSubmitDate,
  useUploadCredentialDocument,
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
} from '@/hooks/useCredentials';
import { useAuth } from '@/contexts/AuthContext';
import type { CredentialWithDisplayStatus } from '@/types/credential';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';
import { cn } from '@/lib/utils';

interface CredentialSubmissionInlineProps {
  credential: CredentialWithDisplayStatus;
  driverId: string;
  vehicleId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CredentialSubmissionInline({
  credential,
  driverId,
  vehicleId,
  onSuccess,
  onCancel,
}: CredentialSubmissionInlineProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { credentialType } = credential;
  const isAdminOnly = isAdminOnlyCredential(credentialType);

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [signature, setSignature] = useState('');
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitDocument = useSubmitDocument();
  const submitSignature = useSubmitSignature();
  const submitForm = useSubmitForm();
  const submitDate = useSubmitDate();
  const uploadDocument = useUploadCredentialDocument();
  const ensureCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const handleFilesChange = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleFileError = (message: string) => {
    toast({ title: 'Error', description: message, variant: 'destructive' });
  };

  const handleSubmit = async () => {
    if (!user?.id || !profile?.company_id) {
      toast({ title: 'Error', description: 'User not authenticated', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure credential record exists
      const credentialId = vehicleId
        ? await ensureVehicleCredential.mutateAsync({
            vehicleId,
            credentialTypeId: credentialType.id,
            companyId: profile.company_id,
          })
        : (await ensureCredential.mutateAsync({
            driverId,
            credentialTypeId: credentialType.id,
            companyId: profile.company_id,
          })).id;

      switch (credentialType.submission_type) {
        case 'document_upload':
        case 'photo': {
          if (files.length === 0) {
            toast({ title: 'Error', description: 'Please select at least one file', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }

          // Upload files
          const uploadedPaths: string[] = [];
          for (const file of files) {
            const path = await uploadDocument.mutateAsync({
              file,
              userId: user.id,
              credentialId,
            });
            uploadedPaths.push(path);
          }

          // Submit credential
          await submitDocument.mutateAsync({
            credentialId,
            credentialTable: vehicleId ? 'vehicle_credentials' : 'driver_credentials',
            documentUrls: uploadedPaths,
            notes: notes || undefined,
            driverExpirationDate: selectedDate?.toISOString(),
          });
          break;
        }

        case 'signature': {
          if (!signature.trim()) {
            toast({ title: 'Error', description: 'Please provide your signature', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }

          await submitSignature.mutateAsync({
            credentialId,
            credentialTable: vehicleId ? 'vehicle_credentials' : 'driver_credentials',
            signatureData: {
              type: signatureType,
              value: signature,
              timestamp: new Date().toISOString(),
            },
            notes: notes || undefined,
          });
          break;
        }

        case 'form': {
          const schema = credentialType.form_schema;
          if (schema) {
            const missingRequired = schema.fields
              .filter((f) => f.required && !formData[f.key])
              .map((f) => f.label);

            if (missingRequired.length > 0) {
              toast({
                title: 'Error',
                description: `Missing required fields: ${missingRequired.join(', ')}`,
                variant: 'destructive',
              });
              setIsSubmitting(false);
              return;
            }
          }

          await submitForm.mutateAsync({
            credentialId,
            credentialTable: vehicleId ? 'vehicle_credentials' : 'driver_credentials',
            formData,
            notes: notes || undefined,
          });
          break;
        }

        case 'date_entry': {
          if (!selectedDate) {
            toast({ title: 'Error', description: 'Please select a date', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }

          await submitDate.mutateAsync({
            credentialId,
            credentialTable: vehicleId ? 'vehicle_credentials' : 'driver_credentials',
            enteredDate: selectedDate.toISOString(),
            notes: notes || undefined,
          });
          break;
        }

        default:
          toast({ title: 'Error', description: 'Unsupported submission type', variant: 'destructive' });
          setIsSubmitting(false);
          return;
      }

      toast({ title: 'Success', description: 'Credential submitted for review' });
      onSuccess();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render form based on submission type
  const renderSubmissionForm = () => {
    switch (credentialType.submission_type) {
      case 'document_upload':
      case 'photo':
        return (
          <div className="space-y-4">
            <FileDropZone
              files={files}
              onFilesChange={handleFilesChange}
              accept={credentialType.submission_type === 'photo' ? 'image/*' : '.pdf,.jpg,.jpeg,.png'}
              multiple={true}
              maxSizeMB={credentialType.submission_type === 'photo' ? 10 : 50}
              label={credentialType.submission_type === 'photo' ? 'Upload Photo' : 'Upload Documents'}
              fileTypeHint={credentialType.submission_type === 'photo' ? 'JPG, PNG' : 'PDF, JPG, PNG'}
              disabled={isSubmitting}
              onError={handleFileError}
            />

            {credentialType.expiration_type === 'driver_specified' && (
              <div className="space-y-2">
                <Label>Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Select expiration date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type Your Signature</Label>
              <Input
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full legal name"
                className="text-lg"
              />
            </div>
            {signature && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Preview</p>
                <p className="text-2xl font-signature italic">{signature}</p>
              </div>
            )}
          </div>
        );

      case 'form':
        return (
          <div className="space-y-4">
            {credentialType.form_schema?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type}
                    value={formData[field.key] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        );

      case 'date_entry':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'PPP') : 'Select a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        );

      default:
        return (
          <p className="text-muted-foreground text-center py-4">
            This credential type cannot be submitted by drivers.
          </p>
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderSubmissionForm()}

      {/* Notes field */}
      {!isAdminOnly && (
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes for the reviewer..."
            rows={3}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
