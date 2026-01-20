import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { CredentialType, CredentialTypeEdits } from '@/types/credential';

interface RequirementsSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
}

export function RequirementsSection({
  credentialType,
  edits,
  onEditChange,
}: RequirementsSectionProps) {
  const requirement = edits.requirement ?? credentialType.requirement;
  const employmentType = edits.employment_type ?? credentialType.employment_type;
  const gracePeriod = edits.grace_period_days ?? credentialType.grace_period_days;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Requirement Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={requirement}
            className="space-y-2"
            onValueChange={(value) => onEditChange({ requirement: value as CredentialTypeEdits['requirement'] })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="required" id="req-required" />
              <Label htmlFor="req-required">Required - Must be completed to be eligible</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recommended" id="req-recommended" />
              <Label htmlFor="req-recommended">
                Recommended - Shows warning but doesn't block
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="optional" id="req-optional" />
              <Label htmlFor="req-optional">Optional - Nice to have</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {credentialType.category === 'driver' && (
        <Card>
          <CardHeader>
            <CardTitle>Employment Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={employmentType}
              className="space-y-2"
              onValueChange={(value) =>
                onEditChange({ employment_type: value as CredentialTypeEdits['employment_type'] })
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="emp-both" />
                <Label htmlFor="emp-both">Both W2 and 1099</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="w2_only" id="emp-w2" />
                <Label htmlFor="emp-w2">W2 Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="1099_only" id="emp-1099" />
                <Label htmlFor="emp-1099">1099 Only</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Grace Period</CardTitle>
          <CardDescription>
            Time allowed for existing drivers to submit this credential after it's created
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={gracePeriod}
              onChange={(event) => {
                const parsed = Number.parseInt(event.target.value, 10);
                const nextValue = Number.isNaN(parsed) ? 0 : Math.min(365, Math.max(0, parsed));
                onEditChange({ grace_period_days: nextValue });
              }}
              className="w-24"
              min={0}
              max={365}
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
