# TASK 017: Unified Credential Detail - Phase 1 (Foundation)

## Context

Create the foundation for a unified credential detail interface that works for both drivers and admins, for both driver and vehicle credentials. This phase focuses on the database schema and block renderer components.

## Prerequisites

- Phase 1-2 of credential builder complete (CODEX-015, CODEX-016)
- Migration 022 applied (`instruction_config` column exists)

---

## Task 1: Database Migration - Credential Progress

**File:** `supabase/migrations/023_credential_progress.sql`

Create table to persist step-by-step progress:

```sql
-- Track progress through multi-step credentials
CREATE TABLE credential_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Polymorphic reference
  credential_id   uuid NOT NULL,
  credential_table text NOT NULL CHECK (credential_table IN ('driver_credentials', 'vehicle_credentials')),
  
  -- Progress state
  current_step_id text,
  step_data       jsonb NOT NULL DEFAULT '{}',
  
  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  
  UNIQUE(credential_id, credential_table)
);

-- RLS policies
ALTER TABLE credential_progress ENABLE ROW LEVEL SECURITY;

-- Drivers can manage their own progress
CREATE POLICY "drivers_own_progress" ON credential_progress
  FOR ALL USING (
    credential_table = 'driver_credentials' AND
    credential_id IN (
      SELECT id FROM driver_credentials 
      WHERE driver_id IN (
        SELECT id FROM drivers WHERE user_id = auth.uid()
      )
    )
  );

-- Drivers can manage vehicle credential progress for assigned vehicles
CREATE POLICY "drivers_vehicle_progress" ON credential_progress
  FOR ALL USING (
    credential_table = 'vehicle_credentials' AND
    credential_id IN (
      SELECT vc.id FROM vehicle_credentials vc
      JOIN driver_vehicle_assignments dva ON dva.vehicle_id = vc.vehicle_id
      JOIN drivers d ON d.id = dva.driver_id
      WHERE d.user_id = auth.uid() AND dva.status = 'active'
    )
  );

-- Admins can manage all progress in their company
CREATE POLICY "admins_all_progress" ON credential_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND (
        (credential_table = 'driver_credentials' AND credential_id IN (
          SELECT id FROM driver_credentials WHERE company_id = u.company_id
        ))
        OR
        (credential_table = 'vehicle_credentials' AND credential_id IN (
          SELECT id FROM vehicle_credentials WHERE company_id = u.company_id
        ))
      )
    )
  );

-- Index for lookups
CREATE INDEX idx_credential_progress_lookup 
  ON credential_progress(credential_id, credential_table);

-- Trigger for updated_at
CREATE TRIGGER update_credential_progress_updated_at
  BEFORE UPDATE ON credential_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Task 2: TypeScript Types for Progress

**File:** `src/types/credentialProgress.ts`

```typescript
export interface CredentialProgress {
  id: string;
  credential_id: string;
  credential_table: 'driver_credentials' | 'vehicle_credentials';
  current_step_id: string | null;
  step_data: StepProgressData;
  created_at: string;
  updated_at: string;
}

export interface StepProgressData {
  steps: Record<string, StepState>;
}

export interface StepState {
  completed: boolean;
  completedAt: string | null;
  formData: Record<string, unknown>;
  uploadedFiles: string[];
  signatureData: SignatureData | null;
  checklistStates: Record<string, boolean>;
  externalLinksVisited: string[];
}

export interface SignatureData {
  type: 'typed' | 'drawn';
  value: string;
  timestamp: string;
}

export function createEmptyStepState(): StepState {
  return {
    completed: false,
    completedAt: null,
    formData: {},
    uploadedFiles: [],
    signatureData: null,
    checklistStates: {},
    externalLinksVisited: [],
  };
}

export function createEmptyProgressData(): StepProgressData {
  return { steps: {} };
}
```

---

## Task 3: Block Renderer Components

**Directory:** `src/components/features/credentials/blocks/`

Create view-mode renderers for each block type. These render the blocks as users see them (not editable like the builder).

### 3.1 Index File
**File:** `blocks/index.ts`
```typescript
export { HeadingBlock } from './HeadingBlock';
export { ParagraphBlock } from './ParagraphBlock';
// ... all block exports
export { BlockRenderer } from './BlockRenderer';
```

### 3.2 BlockRenderer (dispatcher)
**File:** `blocks/BlockRenderer.tsx`

Routes to correct block component based on type.

### 3.3 Individual Blocks

Each block receives:
```typescript
interface BlockProps<T> {
  content: T;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean; // For preview mode
}
```

Blocks to implement:
- `HeadingBlock` - Renders h1/h2/h3
- `ParagraphBlock` - Renders text
- `RichTextBlock` - Renders HTML (sanitized)
- `ImageBlock` - Renders image with caption
- `VideoBlock` - Embeds YouTube/Vimeo with optional "must watch"
- `AlertBlock` - Info/warning/success/error callout
- `DividerBlock` - Horizontal rule
- `ExternalLinkBlock` - Card with link button, tracks visits
- `ChecklistBlock` - Interactive checkboxes
- `FormFieldBlock` - Text/number/date/select inputs
- `FileUploadBlock` - File drop zone, tracks uploads
- `SignatureBlock` - Signature pad (typed/drawn)
- `QuizQuestionBlock` - Multiple choice with feedback
- `ButtonBlock` - Action button (next step, submit, external)

---

## Task 4: Progress Service & Hook

**File:** `src/services/credentialProgress.ts`

```typescript
export async function getProgress(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials'
): Promise<CredentialProgress | null>;

export async function upsertProgress(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  currentStepId: string,
  stepData: StepProgressData
): Promise<CredentialProgress>;

export async function updateStepState(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  stepId: string,
  updates: Partial<StepState>
): Promise<void>;
```

**File:** `src/hooks/useCredentialProgress.ts`

```typescript
export function useCredentialProgress(
  credentialId: string | undefined,
  credentialTable: 'driver_credentials' | 'vehicle_credentials'
);

export function useUpdateStepState();
```

---

## Acceptance Criteria

- [ ] Migration 023 creates `credential_progress` table with RLS
- [ ] TypeScript types for progress tracking
- [ ] All 14 block renderer components created
- [ ] BlockRenderer dispatcher component
- [ ] Progress service with CRUD operations
- [ ] useCredentialProgress hook with React Query
- [ ] No linter errors

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/023_credential_progress.sql` | Create |
| `src/types/credentialProgress.ts` | Create |
| `src/components/features/credentials/blocks/*.tsx` | Create (15 files) |
| `src/services/credentialProgress.ts` | Create |
| `src/hooks/useCredentialProgress.ts` | Create |
| `docs/00-INDEX.md` | Update with task reference |
