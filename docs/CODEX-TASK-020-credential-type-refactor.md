# CODEX-TASK-020: Credential Type Refactor

## Status: PLANNED

## Overview

Refactor the credential type system to deprecate the single `submission_type` field in favor of deriving requirements from the `instruction_config` blocks. This simplifies the mental model: **blocks define what's required**, not a separate type field.

## Background

### Current State
- `credential_types.submission_type` is an enum: `document_upload`, `signature`, `form_entry`, `date_entry`, `admin_verified`
- `credential_types.instruction_config` is a JSONB field with steps and blocks (new system)
- Many UI components display icons/labels based on `submission_type`
- `admin_verified` is used both as a display type AND to control behavior (credentials that don't require driver action)

### Problems
1. **Redundancy**: `submission_type` is redundant when `instruction_config` exists - the blocks define what's actually required
2. **Step types are meaningless**: A step marked as "document" type doesn't enforce having an upload block
3. **`admin_verified` conflates concerns**: It's treated as a submission type but actually means "no driver action required"

## Goals

1. Separate the concept of "requires driver action" from submission type
2. Derive display information (icons, labels) from `instruction_config` blocks
3. Simplify step types - steps are just containers for blocks
4. Maintain backwards compatibility with existing credentials
5. Clean, consistent UX across all credential cards and lists

## Database Changes

### Migration: `024_credential_type_refactor.sql`

```sql
-- Migration: 024_credential_type_refactor.sql
-- Purpose: Refactor credential types to derive requirements from instruction_config

-- ============================================
-- 1. Add requires_driver_action flag
-- ============================================
-- This replaces the behavioral aspect of admin_verified
-- When false, the credential is managed entirely by admins

ALTER TABLE credential_types 
  ADD COLUMN IF NOT EXISTS requires_driver_action boolean NOT NULL DEFAULT true;

-- Migrate existing admin_verified credentials
UPDATE credential_types 
  SET requires_driver_action = false 
  WHERE submission_type = 'admin_verified';

-- ============================================
-- 2. Make submission_type optional
-- ============================================
-- Keep for backwards compatibility with legacy credentials
-- New credentials won't need this field

ALTER TABLE credential_types 
  ALTER COLUMN submission_type DROP NOT NULL;

-- ============================================
-- 3. Add comments
-- ============================================

COMMENT ON COLUMN credential_types.requires_driver_action IS 
  'If false, this credential is admin-managed and doesn''t require driver submission';

COMMENT ON COLUMN credential_types.submission_type IS 
  'DEPRECATED: Legacy field for backwards compatibility. New credentials use instruction_config instead.';
```

## Code Changes

### Phase 1: Types & Utilities

#### 1.1 Update TypeScript Types

**File: `src/types/credential.ts`**

```typescript
// Update CredentialType interface
export interface CredentialType {
  id: string;
  company_id: string;
  broker_id: string | null;
  name: string;
  description: string | null;
  category: CredentialCategory;
  scope: 'driver' | 'vehicle';
  
  // NEW: Explicit flag for admin-only credentials
  requires_driver_action: boolean;
  
  // DEPRECATED: Keep for legacy credentials
  submission_type?: SubmissionType;
  
  // NEW: The source of truth for requirements
  instruction_config: CredentialTypeInstructions | null;
  
  // ... rest of fields
}
```

#### 1.2 Create Requirements Utility

**File: `src/lib/credentialRequirements.ts`**

```typescript
import { FileUp, PenTool, FileText, Calendar, CheckSquare, HelpCircle, ShieldCheck } from 'lucide-react';
import type { CredentialType } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

export interface CredentialRequirement {
  type: 'upload' | 'signature' | 'form' | 'date' | 'checklist' | 'quiz';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

/**
 * Derive what a credential requires from its instruction_config
 */
export function getCredentialRequirements(
  config: CredentialTypeInstructions | null
): CredentialRequirement[] {
  if (!config?.steps?.length) return [];
  
  const requirements: CredentialRequirement[] = [];
  const seen = new Set<string>();
  
  for (const step of config.steps) {
    for (const block of step.blocks) {
      // File upload
      if (block.type === 'file_upload' && !seen.has('upload')) {
        requirements.push({ type: 'upload', icon: FileUp, label: 'Upload' });
        seen.add('upload');
      }
      // Signature
      if (block.type === 'signature' && !seen.has('signature')) {
        requirements.push({ type: 'signature', icon: PenTool, label: 'Signature' });
        seen.add('signature');
      }
      // Form fields
      if (block.type === 'form_field' && !seen.has('form')) {
        requirements.push({ type: 'form', icon: FileText, label: 'Form' });
        seen.add('form');
      }
      // Checklist
      if (block.type === 'checklist' && !seen.has('checklist')) {
        requirements.push({ type: 'checklist', icon: CheckSquare, label: 'Checklist' });
        seen.add('checklist');
      }
      // Quiz
      if (block.type === 'quiz_question' && !seen.has('quiz')) {
        requirements.push({ type: 'quiz', icon: HelpCircle, label: 'Quiz' });
        seen.add('quiz');
      }
    }
  }
  
  return requirements;
}

/**
 * Get step count for display
 */
export function getStepCount(config: CredentialTypeInstructions | null): number {
  return config?.steps?.length ?? 0;
}

/**
 * Check if credential is admin-only (no driver action required)
 */
export function isAdminOnlyCredential(credentialType: CredentialType): boolean {
  // New field takes precedence
  if (credentialType.requires_driver_action !== undefined) {
    return !credentialType.requires_driver_action;
  }
  // Fall back to legacy check
  return credentialType.submission_type === 'admin_verified';
}

/**
 * Get legacy submission type display (for backwards compatibility)
 */
export function getLegacyRequirements(
  submissionType: string | undefined
): CredentialRequirement[] {
  switch (submissionType) {
    case 'document_upload':
      return [{ type: 'upload', icon: FileUp, label: 'Upload' }];
    case 'signature':
      return [{ type: 'signature', icon: PenTool, label: 'Signature' }];
    case 'form_entry':
      return [{ type: 'form', icon: FileText, label: 'Form' }];
    case 'date_entry':
      return [{ type: 'date', icon: Calendar, label: 'Date Entry' }];
    case 'admin_verified':
      return [{ type: 'form', icon: ShieldCheck, label: 'Admin Only' }];
    default:
      return [];
  }
}

/**
 * Get all requirements - tries instruction_config first, falls back to legacy
 */
export function getAllRequirements(credentialType: CredentialType): CredentialRequirement[] {
  // Try new system first
  if (credentialType.instruction_config?.steps?.length) {
    return getCredentialRequirements(credentialType.instruction_config);
  }
  // Fall back to legacy
  return getLegacyRequirements(credentialType.submission_type);
}
```

### Phase 2: Shared Display Component

#### 2.1 Create CredentialRequirementsDisplay Component

**File: `src/components/features/credentials/CredentialRequirementsDisplay.tsx`**

```typescript
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, Layers } from 'lucide-react';
import type { CredentialType } from '@/types/credential';
import { 
  getAllRequirements, 
  isAdminOnlyCredential, 
  getStepCount 
} from '@/lib/credentialRequirements';
import { cn } from '@/lib/utils';

interface CredentialRequirementsDisplayProps {
  credentialType: CredentialType;
  showLabels?: boolean;
  showStepCount?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Displays credential requirements derived from instruction_config
 * Shows icons for upload, signature, form, etc.
 */
export function CredentialRequirementsDisplay({
  credentialType,
  showLabels = false,
  showStepCount = true,
  size = 'sm',
  className,
}: CredentialRequirementsDisplayProps) {
  const isAdminOnly = isAdminOnlyCredential(credentialType);
  const requirements = getAllRequirements(credentialType);
  const stepCount = getStepCount(credentialType.instruction_config);
  
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  
  // Admin-only credentials
  if (isAdminOnly) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <ShieldCheck className={iconSize} />
        {showLabels && <span>Admin Only</span>}
      </Badge>
    );
  }
  
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Step count badge */}
      {showStepCount && stepCount > 1 && (
        <Badge variant="outline" className="gap-1">
          <Layers className={iconSize} />
          {stepCount} Steps
        </Badge>
      )}
      
      {/* Requirement icons */}
      {requirements.map((req) => (
        <Tooltip key={req.type}>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <req.icon className={iconSize} />
              {showLabels && <span>{req.label}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{req.label} Required</TooltipContent>
        </Tooltip>
      ))}
      
      {/* Fallback if no requirements detected */}
      {requirements.length === 0 && !stepCount && (
        <Badge variant="outline" className="text-muted-foreground">
          No requirements
        </Badge>
      )}
    </div>
  );
}
```

### Phase 3: Update Behavior Logic

Replace all `submission_type === 'admin_verified'` checks with the new utility:

#### Files to Update:

| File | Current | New |
|------|---------|-----|
| `CredentialReviewCard.tsx` | `credential.credentialType.submission_type === 'admin_verified'` | `isAdminOnlyCredential(credential.credentialType)` |
| `credentialReview.ts` | Multiple checks | Use `isAdminOnlyCredential()` |
| `CredentialDetailModal.tsx` | Direct check | Use utility |
| `DriverCredentialsTab.tsx` | Direct check | Use utility |
| `VehicleCredentialsTab.tsx` | Direct check | Use utility |
| `credentials.ts` | Direct check | Use utility |

### Phase 4: Update Display Components

Replace all submission type display with the new component:

#### Files to Update:

| File | Change |
|------|--------|
| `CredentialCard.tsx` | Replace icon/label with `<CredentialRequirementsDisplay />` |
| `CredentialTypes.tsx` | Replace in list/grid view |
| `CredentialTypeDetail.tsx` | Replace header display |
| `CredentialTypeEditor.tsx` | Replace header icon |
| `Credentials.tsx` (driver) | Replace in cards |
| `DriverCredentialsTab.tsx` | Replace in table/cards |
| `VehicleCredentialsTab.tsx` | Replace in table/cards |
| `driver/VehicleCredentialsTab.tsx` | Replace display |

### Phase 5: Update Creation Flow

#### 5.1 Update CreateCredentialTypeModal

Remove `submission_type` field, add toggle for admin-only:

```typescript
// Replace submission_type field with:
<div className="flex items-center justify-between">
  <div>
    <Label>Requires Driver Action</Label>
    <p className="text-sm text-muted-foreground">
      If disabled, this credential is managed entirely by admins
    </p>
  </div>
  <Switch
    checked={form.watch('requires_driver_action')}
    onCheckedChange={(v) => form.setValue('requires_driver_action', v)}
  />
</div>
```

#### 5.2 Update credentialTypes service

- Remove `submission_type` from create/update
- Add `requires_driver_action` field
- Derive legacy `submission_type` if needed for backwards compat

### Phase 6: Simplify Step Types (Optional)

Update `InstructionStep` type to remove `type` field:

**File: `src/types/instructionBuilder.ts`**

```typescript
// BEFORE
export interface InstructionStep {
  id: string;
  type: StepType; // REMOVE THIS
  title: string;
  description: string;
  blocks: ContentBlock[];
  required: boolean;
}

// AFTER
export interface InstructionStep {
  id: string;
  title: string;
  description: string;
  blocks: ContentBlock[];
  required: boolean;
}
```

Update builder UI to remove step type selector dropdown.

## Migration Strategy

1. **Database first**: Run migration to add `requires_driver_action` and make `submission_type` optional
2. **Utilities**: Add `credentialRequirements.ts` utility
3. **Behavior logic**: Update all `admin_verified` checks to use utility
4. **Display components**: Gradually replace with new component
5. **Creation flow**: Update modals/forms

## Affected Files Summary

### Database
- `supabase/migrations/024_credential_type_refactor.sql` (new)

### Types
- `src/types/credential.ts`
- `src/types/instructionBuilder.ts`

### Utilities (New)
- `src/lib/credentialRequirements.ts`

### Components (New)
- `src/components/features/credentials/CredentialRequirementsDisplay.tsx`

### Components (Update)
- `src/components/features/driver/CredentialCard.tsx`
- `src/components/features/admin/CredentialReviewCard.tsx`
- `src/components/features/admin/CredentialDetailModal.tsx`
- `src/components/features/admin/DriverCredentialsTab.tsx`
- `src/components/features/admin/VehicleCredentialsTab.tsx`
- `src/components/features/driver/VehicleCredentialsTab.tsx`
- `src/components/features/admin/CreateCredentialTypeModal.tsx`
- `src/pages/admin/CredentialTypes.tsx`
- `src/pages/admin/CredentialTypeDetail.tsx`
- `src/pages/admin/CredentialTypeEditor.tsx`
- `src/pages/driver/Credentials.tsx`

### Services (Update)
- `src/services/credentials.ts`
- `src/services/credentialReview.ts`
- `src/services/credentialTypes.ts`

## Acceptance Criteria

- [ ] `requires_driver_action` column exists in database
- [ ] `submission_type` is nullable in database
- [ ] All `admin_verified` behavior checks use `isAdminOnlyCredential()` utility
- [ ] All credential cards/lists show derived requirements icons
- [ ] Multi-step credentials show step count badge
- [ ] Admin-only credentials show shield icon
- [ ] New credential creation doesn't require `submission_type`
- [ ] Existing credentials with only `submission_type` still work (backwards compat)
- [ ] No TypeScript errors
- [ ] UI is consistent across all views

## Testing

1. Create a new credential type with instruction_config - verify icons show correctly
2. View existing legacy credential types - verify they still display correctly
3. Create an admin-only credential - verify shield icon shows
4. Test multi-step credential - verify step count badge
5. Submit credentials as driver - verify flow works
6. Review credentials as admin - verify admin_verified logic works

## Notes

- Keep `LegacyCredentialView` for credentials without `instruction_config`
- Consider future migration script to auto-generate `instruction_config` for legacy credentials
- Step `type` field removal is optional and can be done in a follow-up task
