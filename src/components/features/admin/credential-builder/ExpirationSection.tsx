import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { CredentialType, CredentialTypeEdits } from '@/types/credential';

interface ExpirationSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
}

export function ExpirationSection({
  credentialType,
  edits,
  onEditChange,
}: ExpirationSectionProps) {
  const expirationType = edits.expiration_type ?? credentialType.expiration_type;
  const intervalDays =
    edits.expiration_interval_days ??
    credentialType.expiration_interval_days ??
    365;
  const warningDays = edits.expiration_warning_days ?? credentialType.expiration_warning_days;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expiration Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={expirationType}
            className="space-y-2"
            onValueChange={(value) => {
              if (value === 'fixed_interval') {
                onEditChange({
                  expiration_type: value as CredentialTypeEdits['expiration_type'],
                  expiration_interval_days: intervalDays || 365,
                });
                return;
              }

              onEditChange({
                expiration_type: value as CredentialTypeEdits['expiration_type'],
                expiration_interval_days: null,
              });
            }}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="never" id="exp-never" />
              <Label htmlFor="exp-never">Never expires (one-time completion)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed_interval" id="exp-fixed" />
              <Label htmlFor="exp-fixed">Fixed interval (valid for set period)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="driver_specified" id="exp-driver" />
              <Label htmlFor="exp-driver">Driver specifies expiration date</Label>
            </div>
          </RadioGroup>

          {expirationType === 'fixed_interval' && (
            <div className="flex items-center gap-2 pt-2 pl-6">
              <span className="text-sm">Valid for</span>
              <Input
                type="number"
                value={intervalDays}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  const nextValue = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
                  onEditChange({ expiration_interval_days: nextValue });
                }}
                className="w-24"
                min={1}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warning Threshold</CardTitle>
          <CardDescription>
            When to start notifying about upcoming expiration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm">Notify when expiring within</span>
            <Input
              type="number"
              value={warningDays}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const nextValue = Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
                onEditChange({ expiration_warning_days: nextValue });
              }}
              className="w-24"
              min={1}
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
