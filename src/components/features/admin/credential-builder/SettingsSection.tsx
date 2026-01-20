import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CredentialType, CredentialTypeEdits } from '@/types/credential';
import type { InstructionSettings } from '@/types/instructionBuilder';

interface SettingsSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
  instructionSettings?: InstructionSettings;
  onInstructionSettingsChange?: (updates: Partial<InstructionSettings>) => void;
}

export function SettingsSection({
  credentialType,
  edits,
  onEditChange,
  instructionSettings,
  onInstructionSettingsChange,
}: SettingsSectionProps) {
  const isActive = edits.is_active ?? credentialType.is_active;
  const requiresDriverAction =
    edits.requires_driver_action ?? credentialType.requires_driver_action ?? true;
  const showProgressBar = instructionSettings?.showProgressBar ?? true;
  const allowStepSkip = instructionSettings?.allowStepSkip ?? false;

  return (
    <div className="space-y-6">
      {/* Instruction Behavior - only show if we have instruction settings */}
      {instructionSettings && onInstructionSettingsChange && (
        <Card>
          <CardHeader>
            <CardTitle>Instruction Behavior</CardTitle>
            <CardDescription>
              Configure how drivers experience the step-by-step credential process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Progress Bar</Label>
                <p className="text-sm text-muted-foreground">
                  Display a progress indicator showing how many steps remain
                </p>
              </div>
              <Switch
                checked={showProgressBar}
                onCheckedChange={(value) => onInstructionSettingsChange({ showProgressBar: value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Step Skip</Label>
                <p className="text-sm text-muted-foreground">
                  Let drivers skip optional steps and return to them later
                </p>
              </div>
              <Switch
                checked={allowStepSkip}
                onCheckedChange={(value) => onInstructionSettingsChange({ allowStepSkip: value })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">
                {isActive
                  ? 'This credential is visible and required for applicable drivers/vehicles.'
                  : 'This credential is hidden and not enforced.'}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={(value) => onEditChange({ is_active: value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Driver Action Required</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Requires Driver Submission</Label>
              <p className="text-sm text-muted-foreground">
                {requiresDriverAction
                  ? 'Drivers must complete and submit this credential themselves.'
                  : 'Admin-only credential. Managed entirely by administrators.'}
              </p>
            </div>
            <Switch
              checked={requiresDriverAction}
              onCheckedChange={(value) => onEditChange({ requires_driver_action: value })}
            />
          </div>

          {!requiresDriverAction && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                This credential won't appear in the driver's credential list. Admins will manage it
                from the driver/vehicle detail pages.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{new Date(credentialType.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Last Updated</span>
            <span>{new Date(credentialType.updated_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ID</span>
            <span className="font-mono text-xs">{credentialType.id}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
