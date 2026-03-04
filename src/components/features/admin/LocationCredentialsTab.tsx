import { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Eye, CalendarIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CredentialRequirementsDisplay } from '@/components/features/credentials/CredentialRequirementsDisplay';
import { DocumentViewer } from '@/components/features/admin/DocumentViewer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { useLocationCredentials, useSubmitLocationCredential } from '@/hooks/useLocationCredentials';
import { useUploadCredentialDocument } from '@/hooks/useCredentials';
import { credentialStatusConfig } from '@/lib/status-configs';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { CredentialDisplayStatus, CredentialType } from '@/types/credential';
import type { LocationCredential } from '@/types/location';
import { format } from 'date-fns';

interface LocationCredentialsTabProps {
  companyId: string;
  locationId: string;
}

interface LocationCredentialDisplay {
  id: string;
  credentialType: CredentialType;
  credential?: LocationCredential;
  displayStatus: CredentialDisplayStatus;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  gracePeriodDueDate?: Date;
}

const actionStatuses: CredentialDisplayStatus[] = [
  'not_submitted',
  'rejected',
  'expired',
  'expiring',
  'grace_period',
  'missing',
];

function buildDisplayItem(
  credentialType: CredentialType,
  credential?: LocationCredential,
): LocationCredentialDisplay {
  const now = new Date();
  const expiresAt = credential?.expires_at ? new Date(credential.expires_at) : null;
  const daysUntilExpiration = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const warningDays = credentialType.expiration_warning_days ?? 0;
  const isExpiringSoon =
    !!credential &&
    credential.status === 'approved' &&
    daysUntilExpiration !== null &&
    daysUntilExpiration >= 0 &&
    warningDays > 0 &&
    daysUntilExpiration <= warningDays;
  const gracePeriodDueDate =
    credential?.grace_period_ends && new Date(credential.grace_period_ends) > now
      ? new Date(credential.grace_period_ends)
      : undefined;

  let displayStatus: CredentialDisplayStatus = 'not_submitted';
  if (credential) {
    if (isExpired) {
      displayStatus = 'expired';
    } else if (isExpiringSoon) {
      displayStatus = 'expiring';
    } else if (credential.status === 'not_submitted' && gracePeriodDueDate) {
      displayStatus = 'grace_period';
    } else {
      displayStatus = credential.status as CredentialDisplayStatus;
    }
  }

  return {
    id: credential?.id || credentialType.id,
    credentialType,
    credential,
    displayStatus,
    isExpiringSoon,
    daysUntilExpiration,
    gracePeriodDueDate,
  };
}

function LocationCredentialCard({
  item,
  onSubmit,
  onView,
}: {
  item: LocationCredentialDisplay;
  onSubmit: () => void;
  onView: () => void;
}) {
  const statusConfig =
    credentialStatusConfig[item.displayStatus] || credentialStatusConfig.not_submitted;
  const hasCredential = Boolean(item.credential);
  const needsAction = actionStatuses.includes(item.displayStatus);
  const actionLabel = hasCredential ? 'Update' : 'Submit';

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>

        <div className="space-y-1">
          <div className="font-medium">{item.credentialType.name}</div>
          <CredentialRequirementsDisplay
            credentialType={item.credentialType}
            showLabels={false}
            showStepCount={true}
            size="sm"
          />
        </div>

        <div className="border-t pt-3 space-y-2 text-sm text-muted-foreground">
          {item.credential?.submitted_at && (
            <div>Submitted {formatDate(item.credential.submitted_at)}</div>
          )}
          {item.credential?.expires_at && (
            <div className={item.isExpiringSoon ? 'text-destructive' : undefined}>
              Expires {formatDate(item.credential.expires_at)}
            </div>
          )}
          {!item.credential?.expires_at &&
            item.credentialType.expiration_type === 'never' &&
            item.displayStatus === 'approved' && <div>Never expires</div>}
          {item.gracePeriodDueDate && (
            <div>Due by {formatDate(item.gracePeriodDueDate)}</div>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onView}
            disabled={!hasCredential}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          <Button size="sm" className="flex-1" onClick={onSubmit}>
            <Upload className="h-4 w-4 mr-2" />
            {needsAction ? actionLabel : 'Update'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LocationCredentialViewModal({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LocationCredentialDisplay | null;
}) {
  const credential = item?.credential;
  const documentPaths = credential?.document_urls || (credential?.document_url ? [credential.document_url] : []);

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.credentialType.name}</DialogTitle>
          <DialogDescription>View submitted documents and details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 text-sm text-muted-foreground">
            <div>Status: {credential ? credential.status.replace('_', ' ') : 'Not submitted'}</div>
            {credential?.submitted_at && (
              <div>Submitted: {formatDate(credential.submitted_at)}</div>
            )}
            {credential?.expires_at && (
              <div>Expires: {formatDate(credential.expires_at)}</div>
            )}
            {credential?.notes && <div>Notes: {credential.notes}</div>}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Documents</h4>
            <DocumentViewer paths={documentPaths} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LocationCredentialSubmitModal({
  open,
  onOpenChange,
  item,
  companyId,
  locationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: LocationCredentialDisplay | null;
  companyId: string;
  locationId: string;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const submitCredential = useSubmitLocationCredential();
  const uploadDocument = useUploadCredentialDocument();

  const [files, setFiles] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [enteredDate, setEnteredDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !item) return;
    setFiles([]);
    setNotes(item.credential?.notes || '');
    setFormData((item.credential?.form_data as Record<string, any>) || {});
    setExpirationDate(
      item.credential?.driver_expiration_date
        ? new Date(item.credential.driver_expiration_date)
        : undefined,
    );
    setEnteredDate(
      item.credential?.entered_date
        ? new Date(item.credential.entered_date)
        : undefined,
    );
  }, [open, item]);

  if (!item) return null;

  const submissionType = item.credentialType.submission_type;
  const isDocumentSubmission = submissionType === 'document_upload' || submissionType === 'photo';
  const isFormSubmission = submissionType === 'form';
  const isDateSubmission = submissionType === 'date_entry';
  const isSupported =
    submissionType === 'document_upload' ||
    submissionType === 'photo' ||
    submissionType === 'form' ||
    submissionType === 'date_entry' ||
    submissionType === 'admin_verified';

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to submit credentials.',
        variant: 'destructive',
      });
      return;
    }

    if (!isSupported) {
      toast({
        title: 'Unsupported credential type',
        description: 'This credential type cannot be submitted from this screen.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let credentialId = item.credential?.id;
      if (!credentialId) {
        const created = await submitCredential.mutateAsync({
          locationId,
          credentialTypeId: item.credentialType.id,
          companyId,
          data: {},
        });
        credentialId = created.id;
      }

      const uploadedPaths: string[] = [];
      if (isDocumentSubmission) {
        if (files.length === 0) {
          toast({
            title: 'Missing documents',
            description: 'Please select at least one document to upload.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
        for (const file of files) {
          const path = await uploadDocument.mutateAsync({
            file,
            userId: user.id,
            credentialId,
          });
          uploadedPaths.push(path);
        }
      }

      if (isDateSubmission && !enteredDate) {
        toast({
          title: 'Missing date',
          description: 'Please select a date before submitting.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      await submitCredential.mutateAsync({
        locationId,
        credentialTypeId: item.credentialType.id,
        companyId,
        data: {
          document_url: uploadedPaths[0],
          document_urls: uploadedPaths.length > 0 ? uploadedPaths : undefined,
          form_data: isFormSubmission ? formData : undefined,
          entered_date: isDateSubmission ? enteredDate?.toISOString() : undefined,
          driver_expiration_date:
            item.credentialType.expiration_type === 'driver_specified'
              ? expirationDate?.toISOString()
              : undefined,
          notes: notes || undefined,
        },
      });

      toast({ title: 'Location credential saved' });
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Unable to submit credential',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSubmissionForm = () => {
    if (!isSupported) {
      return (
        <Card className="p-4 text-sm text-muted-foreground">
          This credential type is not supported for location submissions yet.
        </Card>
      );
    }

    if (isDocumentSubmission) {
      return (
        <div className="space-y-4">
          <FileDropZone
            files={files}
            onFilesChange={setFiles}
            accept={submissionType === 'photo' ? 'image/*' : '.pdf,.jpg,.jpeg,.png'}
            multiple={true}
            maxSizeMB={submissionType === 'photo' ? 10 : 50}
            label={submissionType === 'photo' ? 'Upload Photo' : 'Upload Documents'}
            fileTypeHint={submissionType === 'photo' ? 'JPG, PNG' : 'PDF, JPG, PNG'}
            disabled={isSubmitting}
            onError={(message) =>
              toast({ title: 'Upload error', description: message, variant: 'destructive' })
            }
          />

          {item.credentialType.expiration_type === 'driver_specified' && (
            <div className="space-y-2">
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !selectedDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, 'PPP') : 'Select expiration date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={expirationDate} onSelect={setExpirationDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      );
    }

    if (isFormSubmission) {
      return (
        <div className="space-y-4">
          {item.credentialType.form_schema?.fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              ) : field.type === 'select' ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (isDateSubmission) {
      return (
        <div className="space-y-2">
          <Label>Enter Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {enteredDate ? format(enteredDate, 'PPP') : 'Select a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={enteredDate} onSelect={setEnteredDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    return (
      <Card className="p-4 text-sm text-muted-foreground">
        This credential does not require document submission.
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Location Credential</DialogTitle>
          <DialogDescription>{item.credentialType.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {renderSubmissionForm()}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes for this credential..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isSupported}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Credential
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LocationCredentialsTab({ companyId, locationId }: LocationCredentialsTabProps) {
  const { data: credentials, isLoading: credentialsLoading } = useLocationCredentials(locationId);
  const { data: credentialTypes, isLoading: typesLoading } = useCredentialTypes(companyId);

  const locationCredentialTypes = useMemo(
    () => (credentialTypes || []).filter((type) => type.category === 'location'),
    [credentialTypes],
  );

  const items = useMemo(() => {
    const credentialMap = new Map(
      (credentials || []).map((credential) => [credential.credential_type_id, credential]),
    );
    return locationCredentialTypes.map((type) =>
      buildDisplayItem(type, credentialMap.get(type.id)),
    );
  }, [credentials, locationCredentialTypes]);

  const [selected, setSelected] = useState<LocationCredentialDisplay | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const handleSubmit = (item: LocationCredentialDisplay) => {
    setSelected(item);
    setSubmitOpen(true);
  };

  const handleView = (item: LocationCredentialDisplay) => {
    setSelected(item);
    setViewOpen(true);
  };

  const isLoading = credentialsLoading || typesLoading;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Location Credentials</h3>
        <p className="text-sm text-muted-foreground">
          Compliance documents for this location
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : locationCredentialTypes.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No location credentials configured</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create credential types with category &quot;Location&quot; in Credential Builder
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <LocationCredentialCard
              key={item.id}
              item={item}
              onSubmit={() => handleSubmit(item)}
              onView={() => handleView(item)}
            />
          ))}
        </div>
      )}

      <LocationCredentialSubmitModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        item={selected}
        companyId={companyId}
        locationId={locationId}
      />
      <LocationCredentialViewModal
        open={viewOpen}
        onOpenChange={setViewOpen}
        item={selected}
      />
    </div>
  );
}
