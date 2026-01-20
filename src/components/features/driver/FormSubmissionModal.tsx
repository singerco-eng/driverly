import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { CredentialWithDisplayStatus, FormField } from '@/types/credential';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEnsureDriverCredential,
  useEnsureVehicleCredential,
  useSubmitForm,
} from '@/hooks/useCredentials';

interface FormSubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialWithDisplayStatus;
  driverId: string;
  onSuccess: () => void;
}

type FormValues = Record<string, any>;
type Errors = Record<string, string>;

export function FormSubmissionModal({
  open,
  onOpenChange,
  credential,
  driverId,
  onSuccess,
}: FormSubmissionModalProps) {
  const { user } = useAuth();
  const [formValues, setFormValues] = useState<FormValues>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [reviewMode, setReviewMode] = useState(false);

  const submitForm = useSubmitForm();
  const ensureDriverCredential = useEnsureDriverCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const schema = credential.credentialType.form_schema;
  const fields = schema?.fields ?? [];
  const draftKey = `credential-form-${credential.credentialType.id}-${driverId}`;
  const isVehicle = credential.credentialType.category === 'vehicle';

  useEffect(() => {
    if (!open) return;
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      setFormValues(JSON.parse(draft));
    }
  }, [open, draftKey]);

  const updateValue = (key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): boolean => {
    const nextErrors: Errors = {};
    fields.forEach((field) => {
      const value = formValues[field.key];
      if (field.required && (value === undefined || value === '' || value === null)) {
        nextErrors[field.key] = 'Required';
      }
      if (field.validation?.pattern && value) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          nextErrors[field.key] = field.validation.message || 'Invalid value';
        }
      }
      if (field.type === 'number' && value !== undefined && value !== '') {
        const numeric = Number(value);
        if (Number.isNaN(numeric)) nextErrors[field.key] = 'Must be a number';
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSaveDraft = () => {
    localStorage.setItem(draftKey, JSON.stringify(formValues));
  };

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

  const handleSubmit = async () => {
    if (!user) return;
    const valid = validate();
    if (!valid) return;

    const credentialId = await resolveCredentialId();
    await submitForm.mutateAsync({
      credentialId,
      credentialTable: isVehicle ? 'vehicle_credentials' : 'driver_credentials',
      formData: formValues,
      notes: notes.trim() ? notes.trim() : undefined,
    });

    localStorage.removeItem(draftKey);
    setFormValues({});
    setNotes('');
    setReviewMode(false);
    onSuccess();
  };

  const renderField = (field: FormField) => {
    const value = formValues[field.key];
    const error = errors[field.key];

    if (reviewMode) {
      return (
        <div key={field.key} className="space-y-1">
          <p className="text-xs text-muted-foreground">{field.label}</p>
          <p className="text-sm">{value ? String(value) : '—'}</p>
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-2">
        <Label>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {field.type === 'select' ? (
          <Select
            value={value ?? ''}
            onValueChange={(val) => updateValue(field.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || 'Select'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : field.type === 'textarea' ? (
          <Textarea
            value={value ?? ''}
            onChange={(event) => updateValue(field.key, event.target.value)}
            placeholder={field.placeholder}
          />
        ) : field.type === 'checkbox' ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={Boolean(value)}
              onCheckedChange={(checked) => updateValue(field.key, Boolean(checked))}
            />
            {field.placeholder || 'Yes'}
          </label>
        ) : (
          <Input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={value ?? ''}
            onChange={(event) => updateValue(field.key, event.target.value)}
            placeholder={field.placeholder}
          />
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Complete {credential.credentialType.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {credential.credentialType.description && (
            <p className="text-sm text-muted-foreground">{credential.credentialType.description}</p>
          )}

          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">No form fields configured.</p>
          ) : (
            <div className="space-y-4">{fields.map(renderField)}</div>
          )}

          {!reviewMode && (
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter className="justify-between">
          <div className="flex gap-2">
            {!reviewMode && (
              <Button variant="outline" onClick={handleSaveDraft}>
                Save Draft
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {reviewMode ? (
              <>
                <Button variant="outline" onClick={() => setReviewMode(false)}>
                  Edit
                </Button>
                <Button onClick={handleSubmit} disabled={submitForm.isPending}>
                  {submitForm.isPending ? 'Submitting...' : 'Submit'}
                </Button>
              </>
            ) : (
              <Button onClick={() => validate() && setReviewMode(true)}>
                Review & Submit
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
