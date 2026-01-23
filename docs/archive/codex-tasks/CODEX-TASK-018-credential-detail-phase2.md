# TASK 018: Unified Credential Detail - Phase 2 (Detail View)

## Context

Build the main `CredentialDetailView` component that orchestrates the credential submission flow. This view works for both drivers and admins, for both driver and vehicle credentials.

## Prerequisites

- Phase 1 complete (CODEX-017): Migration, types, block renderers, progress service

---

## Task 1: Instruction Renderer Component

**File:** `src/components/features/credentials/InstructionRenderer/index.tsx`

Main component that renders the full instruction flow:

```typescript
interface InstructionRendererProps {
  config: CredentialTypeInstructions;
  progress: CredentialProgress | null;
  onStepChange: (stepId: string) => void;
  onStateChange: (stepId: string, updates: Partial<StepState>) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}
```

Features:
- Renders current step's blocks
- Handles step navigation
- Validates step completion before advancing
- Shows progress bar if enabled
- Disables interactions in preview mode

---

## Task 2: Step Progress Component

**File:** `src/components/features/credentials/InstructionRenderer/StepProgress.tsx`

Visual progress indicator:
- Step pills showing completed/current/upcoming
- Optional progress bar
- Step count ("Step 2 of 4")
- Click on completed step to go back

---

## Task 3: Step Navigation Component

**File:** `src/components/features/credentials/InstructionRenderer/StepNavigation.tsx`

Bottom navigation bar:
- Previous button (disabled on first step)
- Next button / Submit button (on last step)
- Validation: disable Next if required blocks incomplete
- Loading state during submission

---

## Task 4: Credential Detail View

**File:** `src/components/features/credentials/CredentialDetailView.tsx`

Main orchestrator component:

```typescript
interface CredentialDetailViewProps {
  credentialTypeId: string;
  entityType: 'driver' | 'vehicle';
  entityId: string;
  mode: 'submit' | 'review' | 'preview';
  previewConfig?: CredentialTypeInstructions;
  onClose?: () => void;
  backUrl?: string;
}
```

Features:
- Fetches credential type, credential instance, progress
- Determines if using new builder or legacy
- Renders InstructionRenderer or LegacyCredentialView
- Handles submission flow
- Shows entity info (driver name / vehicle info)

---

## Task 5: Credential Detail Header

**File:** `src/components/features/credentials/CredentialDetailHeader.tsx`

Header section:
- Back button
- Credential name + status badge
- Entity info (who this is for)
- Scope indicator (Global / Broker name)
- Admin: link to edit credential type

---

## Task 6: Submission Summary

**File:** `src/components/features/credentials/SubmissionSummary.tsx`

Collapsible section showing:
- Last submission date
- Current status
- Expiration date
- Uploaded documents (thumbnails)
- Signature preview
- Form data summary

---

## Task 7: Legacy Credential View

**File:** `src/components/features/credentials/LegacyCredentialView.tsx`

Fallback for credentials without `instruction_config`:
- Shows `description` field
- Renders submission form based on `submission_type`
- Matches current driver credential detail behavior

---

## Task 8: Update Routes

Add/update routes to use unified component:

**Driver routes:**
- `/driver/credentials/:typeId` → CredentialDetailView (mode: submit)
- `/driver/vehicles/:vehicleId/credentials/:typeId` → CredentialDetailView

**Admin preview route:**
- `/admin/settings/credentials/:typeId/preview` → CredentialDetailView (mode: preview)

---

## Acceptance Criteria

- [ ] InstructionRenderer renders all block types
- [ ] Step navigation with validation
- [ ] Progress bar and step pills
- [ ] CredentialDetailView fetches and orchestrates
- [ ] Header shows entity info correctly
- [ ] Submission flow persists progress and submits
- [ ] Legacy fallback works for old credentials
- [ ] Preview mode disables all interactions
- [ ] Routes updated

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/features/credentials/InstructionRenderer/index.tsx` | Create |
| `src/components/features/credentials/InstructionRenderer/StepProgress.tsx` | Create |
| `src/components/features/credentials/InstructionRenderer/StepNavigation.tsx` | Create |
| `src/components/features/credentials/CredentialDetailView.tsx` | Create |
| `src/components/features/credentials/CredentialDetailHeader.tsx` | Create |
| `src/components/features/credentials/SubmissionSummary.tsx` | Create |
| `src/components/features/credentials/LegacyCredentialView.tsx` | Create |
| `src/App.tsx` | Update routes |
| `src/pages/admin/CredentialTypeEditor.tsx` | Update preview to use route |
