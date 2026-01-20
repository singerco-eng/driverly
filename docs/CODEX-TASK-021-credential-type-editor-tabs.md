# CODEX-TASK-021: Credential Type Editor - Requirements, Expiration, Settings Tabs

## Status: PLANNED

## Overview

Enable full editing functionality for the Requirements, Expiration, and Settings tabs in the Credential Type Editor. Currently these tabs display read-only data with "(Editing coming in future phase)" placeholders.

## Background

The Credential Type Editor has four tabs:
1. **Instructions** - ✅ Fully functional (step/block builder)
2. **Requirements** - ❌ Read-only, needs editing
3. **Expiration** - ❌ Read-only, needs editing
4. **Settings** - ❌ Read-only, needs editing + new toggle

## Goals

1. Make all three tabs fully editable with proper save functionality
2. Add "Requires Driver Action" toggle to Settings tab (per CODEX-020)
3. Integrate with existing save flow (Save Changes button in header)
4. Proper validation and error handling

## Current State

### RequirementsSection.tsx (read-only)
- Requirement Level: required | recommended | optional
- Employment Type: both | w2_only | 1099_only (driver credentials only)
- Grace Period: number of days

### ExpirationSection.tsx (read-only)
- Expiration Type: never | fixed_interval | driver_specified
- Expiration Interval Days: number (when fixed_interval)
- Warning Threshold: days before expiration to notify

### SettingsSection.tsx (read-only)
- Status: Active/Inactive toggle
- Metadata: Created, Updated, ID (display only)

## Implementation Plan

### Phase 1: Create Shared State Management

The credential type editor needs to track changes across all tabs, not just the instruction_config.

**File: `src/pages/admin/CredentialTypeEditor.tsx`**

Add state for tracking changes to all editable fields:

```typescript
interface CredentialTypeEdits {
  // Requirements tab
  requirement?: 'required' | 'recommended' | 'optional';
  employment_type?: 'both' | 'w2_only' | '1099_only';
  grace_period_days?: number;
  
  // Expiration tab
  expiration_type?: 'never' | 'fixed_interval' | 'driver_specified';
  expiration_interval_days?: number;
  expiration_warning_days?: number;
  
  // Settings tab
  is_active?: boolean;
  requires_driver_action?: boolean; // New field from CODEX-020
}

const [edits, setEdits] = useState<CredentialTypeEdits>({});
```

Merge edits into hasChanges check:
```typescript
const hasChanges = hasInstructionChanges || Object.keys(edits).length > 0;
```

### Phase 2: Update RequirementsSection

**File: `src/components/features/admin/credential-builder/RequirementsSection.tsx`**

Convert from read-only display to editable form:

```typescript
interface RequirementsSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
}

export function RequirementsSection({ 
  credentialType, 
  edits, 
  onEditChange 
}: RequirementsSectionProps) {
  // Use edit value if present, otherwise fall back to saved value
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
            onValueChange={(v) => onEditChange({ requirement: v as any })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="required" id="req-required" />
              <Label htmlFor="req-required">
                Required - Must be completed to be eligible
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recommended" id="req-recommended" />
              <Label htmlFor="req-recommended">
                Recommended - Shows warning but doesn't block
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="optional" id="req-optional" />
              <Label htmlFor="req-optional">
                Optional - Nice to have
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {credentialType.category === 'driver' && (
        <Card>
          <CardHeader>
            <CardTitle>Employment Type</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={employmentType} 
              onValueChange={(v) => onEditChange({ employment_type: v as any })}
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
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={gracePeriod}
              onChange={(e) => onEditChange({ 
                grace_period_days: parseInt(e.target.value) || 0 
              })}
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
```

### Phase 3: Update ExpirationSection

**File: `src/components/features/admin/credential-builder/ExpirationSection.tsx`**

```typescript
interface ExpirationSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
}

export function ExpirationSection({ 
  credentialType, 
  edits, 
  onEditChange 
}: ExpirationSectionProps) {
  const expirationType = edits.expiration_type ?? credentialType.expiration_type;
  const intervalDays = edits.expiration_interval_days ?? credentialType.expiration_interval_days;
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
            onValueChange={(v) => onEditChange({ expiration_type: v as any })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="never" id="exp-never" />
              <Label htmlFor="exp-never">
                Never expires (one-time completion)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed_interval" id="exp-fixed" />
              <Label htmlFor="exp-fixed">
                Fixed interval (valid for set period)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="driver_specified" id="exp-driver" />
              <Label htmlFor="exp-driver">
                Driver specifies expiration date
              </Label>
            </div>
          </RadioGroup>

          {expirationType === 'fixed_interval' && (
            <div className="flex items-center gap-2 pt-2 pl-6">
              <span className="text-sm">Valid for</span>
              <Input
                type="number"
                value={intervalDays}
                onChange={(e) => onEditChange({ 
                  expiration_interval_days: parseInt(e.target.value) || 365 
                })}
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
              onChange={(e) => onEditChange({ 
                expiration_warning_days: parseInt(e.target.value) || 30 
              })}
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
```

### Phase 4: Update SettingsSection

**File: `src/components/features/admin/credential-builder/SettingsSection.tsx`**

Add status toggle and new "Requires Driver Action" toggle:

```typescript
interface SettingsSectionProps {
  credentialType: CredentialType;
  edits: CredentialTypeEdits;
  onEditChange: (updates: Partial<CredentialTypeEdits>) => void;
}

export function SettingsSection({ 
  credentialType, 
  edits, 
  onEditChange 
}: SettingsSectionProps) {
  const isActive = edits.is_active ?? credentialType.is_active;
  const requiresDriverAction = edits.requires_driver_action ?? 
    credentialType.requires_driver_action ?? true;

  return (
    <div className="space-y-6">
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
            <Switch
              checked={isActive}
              onCheckedChange={(v) => onEditChange({ is_active: v })}
            />
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
              onCheckedChange={(v) => onEditChange({ requires_driver_action: v })}
            />
          </div>
          
          {!requiresDriverAction && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                This credential won't appear in the driver's credential list. 
                Admins will manage it from the driver/vehicle detail pages.
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
```

### Phase 5: Update Save Handler

**File: `src/pages/admin/CredentialTypeEditor.tsx`**

Update the save handler to persist all changes:

```typescript
const handleSave = async () => {
  if (!id) return;

  try {
    // Save instruction config if changed
    if (hasInstructionChanges && instructionConfig) {
      await updateConfig.mutateAsync({
        credentialTypeId: id,
        config: instructionConfig,
      });
    }

    // Save other field edits if any
    if (Object.keys(edits).length > 0) {
      await updateCredentialType.mutateAsync({
        id,
        ...edits,
      });
    }

    setHasInstructionChanges(false);
    setEdits({});
  } catch {
    // Error handled by mutation
  }
};
```

### Phase 6: Add Update Mutation

**File: `src/hooks/useCredentialTypes.ts`**

Add or update the mutation for updating credential type fields:

```typescript
export function useUpdateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      id: string;
      requirement?: string;
      employment_type?: string;
      grace_period_days?: number;
      expiration_type?: string;
      expiration_interval_days?: number;
      expiration_warning_days?: number;
      is_active?: boolean;
      requires_driver_action?: boolean;
    }) => {
      const { id, ...fields } = updates;
      return credentialTypesService.update(id, fields);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['credentialType', variables.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['credentialTypes'] 
      });
      toast.success('Credential type updated');
    },
    onError: () => {
      toast.error('Failed to update credential type');
    },
  });
}
```

**File: `src/services/credentialTypes.ts`**

Add the update function:

```typescript
export async function update(
  id: string,
  updates: Partial<{
    requirement: string;
    employment_type: string;
    grace_period_days: number;
    expiration_type: string;
    expiration_interval_days: number;
    expiration_warning_days: number;
    is_active: boolean;
    requires_driver_action: boolean;
  }>
) {
  const { data, error } = await supabase
    .from('credential_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

## Database Migration (if requires_driver_action doesn't exist)

This is covered by CODEX-020's migration `024_credential_type_refactor.sql`. If that migration hasn't been run yet, this task depends on it.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/CredentialTypeEditor.tsx` | Add edits state, pass to tabs, update save handler |
| `src/components/features/admin/credential-builder/RequirementsSection.tsx` | Convert to editable form |
| `src/components/features/admin/credential-builder/ExpirationSection.tsx` | Convert to editable form |
| `src/components/features/admin/credential-builder/SettingsSection.tsx` | Convert to editable form, add requires_driver_action toggle |
| `src/hooks/useCredentialTypes.ts` | Add useUpdateCredentialType hook |
| `src/services/credentialTypes.ts` | Add update function |
| `src/types/credential.ts` | Add requires_driver_action to CredentialType interface |

## Acceptance Criteria

- [ ] Requirements tab fields are editable (requirement, employment_type, grace_period_days)
- [ ] Expiration tab fields are editable (expiration_type, interval, warning days)
- [ ] Settings tab has working Active/Inactive toggle
- [ ] Settings tab has "Requires Driver Action" toggle with explanatory text
- [ ] All changes tracked and reflected in "Unsaved changes" badge
- [ ] Save button persists all changes to database
- [ ] Form validation prevents invalid values (e.g., negative days)
- [ ] UI updates immediately reflect saved changes
- [ ] No TypeScript errors

## Testing

1. Edit each field in Requirements tab → verify save works
2. Toggle expiration type between all options → verify interval field shows/hides
3. Toggle Active status → verify badge updates
4. Toggle "Requires Driver Action" → verify alert appears when OFF
5. Make changes across multiple tabs → verify single Save persists all
6. Refresh page after save → verify values persisted

## Dependencies

- CODEX-020 migration for `requires_driver_action` column (can be run independently)

## Notes

- The "Requires Driver Action" toggle replaces the semantic meaning of `submission_type = 'admin_verified'`
- Employment Type field only shows for driver credentials (category === 'driver')
- Grace period is for new credential types - existing drivers get this time to submit
