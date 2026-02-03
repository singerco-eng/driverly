import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CredentialType } from '@/types/credential';
import { formatDate } from '@/lib/formatters';

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType: CredentialType;
  onPublish: (effectiveDate?: Date) => Promise<void>;
  title?: string;
  confirmLabel?: string;
}

type PublishMode = 'now' | 'schedule';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function PublishDialog({
  open,
  onOpenChange,
  credentialType,
  onPublish,
  title = 'Publish Credential',
  confirmLabel = 'Publish',
}: PublishDialogProps) {
  const [mode, setMode] = useState<PublishMode>('now');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (credentialType.status === 'scheduled' && credentialType.effective_date) {
      const existingDate = new Date(credentialType.effective_date);
      setMode('schedule');
      setScheduledDate(existingDate);
      return;
    }
    setMode('now');
    setScheduledDate(undefined);
  }, [open, credentialType.status, credentialType.effective_date]);

  const effectiveDate = mode === 'schedule' ? scheduledDate : new Date();
  const gracePeriodDays = credentialType.grace_period_days ?? 0;

  const dueDate = useMemo(() => {
    if (!effectiveDate || !gracePeriodDays) return null;
    return addDays(effectiveDate, gracePeriodDays);
  }, [effectiveDate, gracePeriodDays]);

  const isScheduleInvalid =
    mode === 'schedule' &&
    (!scheduledDate || scheduledDate.getTime() <= new Date().getTime());

  const handlePublish = async () => {
    if (isScheduleInvalid) return;
    setIsSubmitting(true);
    try {
      await onPublish(mode === 'schedule' ? scheduledDate : undefined);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">When should this credential become active?</Label>
            <RadioGroup value={mode} onValueChange={(value) => setMode(value as PublishMode)}>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="now" id="publish-now" />
                <div className="space-y-1">
                  <Label htmlFor="publish-now">Publish Now</Label>
                  <p className="text-sm text-muted-foreground">Drivers will see this immediately.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="schedule" id="publish-schedule" />
                <div className="flex-1 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="publish-schedule">Schedule for later</Label>
                    <p className="text-sm text-muted-foreground">Pick a future date to go live.</p>
                  </div>
                  {mode === 'schedule' && (
                    <DatePicker
                      date={scheduledDate}
                      onDateChange={setScheduledDate}
                      placeholder="Pick a date"
                    />
                  )}
                  {isScheduleInvalid && (
                    <p className="text-xs text-destructive">Select a future date.</p>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Grace Period: {gracePeriodDays} days.
              {dueDate
                ? ` Existing drivers will have until ${formatDate(dueDate)} to comply.`
                : ' No grace period is configured.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handlePublish} disabled={isSubmitting || isScheduleInvalid}>
            {isSubmitting ? 'Saving...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
