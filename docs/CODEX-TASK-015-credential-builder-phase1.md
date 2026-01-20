# TASK 015: Enhanced Credential Type Builder - Phase 1 (Infrastructure & Shell)

## Context

Build the foundation for an **Enhanced Credential Type Builder** that transforms simple credential type creation into a powerful multi-step instruction builder. This phase establishes the infrastructure, data model, simple create modal, and editor page shell.

**Key Principle:** The builder will eventually replace the simple `submission_type` field with a block-based instruction system that can handle multi-step workflows, external links (drug test sites, training portals), embedded forms, and rich content.

**Phase 1 Scope:**
1. Database migration for `instruction_config` JSONB column
2. TypeScript type definitions for the new instruction schema
3. Simple "Create Credential Type" modal (replaces current complex modal)
4. Full-screen editor page shell with tabs
5. Empty `InstructionBuilder` component placeholder

**Reference:** This task implements Phase 1 of the Enhanced Credential Type Builder plan.

## Prerequisites

- Migration `021_broker_assignment_settings.sql` already applied
- Existing credential types working (`/admin/settings/credentials`)
- Current `CreateCredentialTypeModal.tsx` exists
- Current `CredentialTypes.tsx` list page exists
- Current `CredentialTypeDetail.tsx` exists
- Broker management working (for broker-scoped credentials)

## Design System Requirements

Follow patterns from `docs/04-FRONTEND-GUIDELINES.md`:
- **List Page**: Use existing `EnhancedDataView` (minimal changes)
- **Create Modal**: Pattern 3 (simple Dialog, `sm:max-w-lg`)
- **Editor Page**: Pattern 2 (Detail/Edit Page with back link, header, tabs)
- **Components**: Use `Card`, `Tabs`, `Button`, `Input`, `Label`, `RadioGroup`, `Select`, `Checkbox`, `Badge`, `Skeleton`, `DropdownMenu`
- **Toast**: Use `useToast` for notifications
- **Loading**: Use `Skeleton` components

---

## Your Tasks

### Task 1: Database Migration

Create `supabase/migrations/022_credential_instruction_builder.sql`:

```sql
-- Migration: Enhanced Credential Type Builder
-- Adds instruction_config JSONB column for rich multi-step instructions

-- 1. Add instruction_config column
ALTER TABLE credential_types 
  ADD COLUMN IF NOT EXISTS instruction_config jsonb;

-- 2. Add comment for documentation
COMMENT ON COLUMN credential_types.instruction_config IS 
  'JSON configuration for multi-step instruction builder. Schema version 2+.';

-- 3. Create index for querying instruction config
CREATE INDEX IF NOT EXISTS idx_credential_types_instruction_config 
  ON credential_types USING gin (instruction_config);

-- 4. Migrate existing descriptions to new format
-- This converts simple description text to the new instruction_config structure
UPDATE credential_types 
SET instruction_config = jsonb_build_object(
  'version', 2,
  'settings', jsonb_build_object(
    'showProgressBar', false,
    'allowStepSkip', false,
    'completionBehavior', 'required_only',
    'externalSubmissionAllowed', false
  ),
  'steps', CASE 
    WHEN description IS NOT NULL AND description != '' THEN
      jsonb_build_array(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'order', 1,
          'title', 'Instructions',
          'type', 'information',
          'required', false,
          'blocks', jsonb_build_array(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'order', 1,
              'type', 'paragraph',
              'content', jsonb_build_object('text', description)
            )
          ),
          'conditions', '[]'::jsonb,
          'completion', jsonb_build_object('type', 'auto', 'autoCompleteOnView', true)
        )
      )
    ELSE
      '[]'::jsonb
    END
)
WHERE instruction_config IS NULL;

-- 5. Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 022: Added instruction_config to credential_types';
END $$;
```

---

### Task 2: Instruction Builder Types

Create `src/types/instructionBuilder.ts`:

```typescript
/**
 * Enhanced Credential Type Instruction Builder Types
 * Version 2 schema for multi-step, block-based credential instructions
 */

// ============ TOP-LEVEL SCHEMA ============

export interface CredentialTypeInstructions {
  version: 2;
  settings: InstructionSettings;
  steps: InstructionStep[];
}

export interface InstructionSettings {
  showProgressBar: boolean;
  allowStepSkip: boolean;
  completionBehavior: 'all_steps' | 'required_only';
  externalSubmissionAllowed: boolean;
}

// ============ STEPS ============

export interface InstructionStep {
  id: string;
  order: number;
  title: string;
  type: StepType;
  required: boolean;
  blocks: ContentBlock[];
  conditions: StepCondition[];
  completion: StepCompletion;
}

export type StepType = 
  | 'information'      // Read-only content
  | 'external_action'  // Go to external site
  | 'form_input'       // Fill out fields
  | 'document_upload'  // Upload files
  | 'signature'        // Sign agreement
  | 'knowledge_check'  // Quiz questions
  | 'admin_verify';    // Admin marks complete

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in';
  value: string | string[];
}

export interface StepCompletion {
  type: 'auto' | 'manual' | 'form_submit' | 'external_confirm' | 'quiz_pass';
  autoCompleteOnView?: boolean;
  externalCallbackUrl?: string;
  passScore?: number;
}

// ============ BLOCKS ============

export interface ContentBlock {
  id: string;
  order: number;
  type: BlockType;
  content: BlockContent;
}

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'rich_text'
  | 'image'
  | 'video'
  | 'external_link'
  | 'alert'
  | 'checklist'
  | 'button'
  | 'divider'
  | 'form_field'
  | 'file_upload'
  | 'signature_pad'
  | 'quiz_question';

// Block content types
export type BlockContent =
  | HeadingBlockContent
  | ParagraphBlockContent
  | RichTextBlockContent
  | ImageBlockContent
  | VideoBlockContent
  | ExternalLinkBlockContent
  | AlertBlockContent
  | ChecklistBlockContent
  | ButtonBlockContent
  | DividerBlockContent
  | FormFieldBlockContent
  | FileUploadBlockContent
  | SignaturePadBlockContent
  | QuizQuestionBlockContent;

export interface HeadingBlockContent {
  text: string;
  level: 1 | 2 | 3;
}

export interface ParagraphBlockContent {
  text: string;
}

export interface RichTextBlockContent {
  html: string;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
}

export interface VideoBlockContent {
  source: 'youtube' | 'vimeo' | 'upload';
  url: string;
  title?: string;
  requireWatch: boolean;
  watchPercentRequired?: number;
}

export interface ExternalLinkBlockContent {
  url: string;
  title: string;
  description?: string;
  buttonText: string;
  trackVisit: boolean;
  requireVisit: boolean;
  opensInNewTab: boolean;
}

export interface AlertBlockContent {
  variant: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
}

export interface ChecklistBlockContent {
  title?: string;
  items: ChecklistItem[];
  requireAllChecked: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

export interface ButtonBlockContent {
  text: string;
  variant: 'default' | 'outline' | 'ghost';
  action: 'next_step' | 'external_url' | 'submit';
  url?: string;
}

export interface DividerBlockContent {
  style: 'solid' | 'dashed' | 'dotted';
}

export interface FormFieldBlockContent {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FileUploadBlockContent {
  label: string;
  accept: string; // e.g., '.pdf,.jpg,.png' or 'image/*'
  maxSizeMB: number;
  multiple: boolean;
  required: boolean;
  helpText?: string;
}

export interface SignaturePadBlockContent {
  label: string;
  required: boolean;
  allowTyped: boolean;
  allowDrawn: boolean;
  agreementText?: string;
}

export interface QuizQuestionBlockContent {
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'text';
  options?: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
  allowRetry: boolean;
  required: boolean;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

// ============ TEMPLATES ============

export interface InstructionTemplate {
  id: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  config: CredentialTypeInstructions;
}

// ============ HELPERS ============

export function createEmptyInstructions(): CredentialTypeInstructions {
  return {
    version: 2,
    settings: {
      showProgressBar: false,
      allowStepSkip: false,
      completionBehavior: 'required_only',
      externalSubmissionAllowed: false,
    },
    steps: [],
  };
}

export function createStep(title: string, type: StepType = 'information'): InstructionStep {
  return {
    id: crypto.randomUUID(),
    order: 0,
    title,
    type,
    required: true,
    blocks: [],
    conditions: [],
    completion: {
      type: type === 'information' ? 'auto' : 'manual',
      autoCompleteOnView: type === 'information',
    },
  };
}

export function createBlock<T extends BlockContent>(type: BlockType, content: T): ContentBlock {
  return {
    id: crypto.randomUUID(),
    order: 0,
    type,
    content,
  };
}
```

---

### Task 3: Update Credential Type

Update `src/types/credential.ts` to include the new instruction config:

Add to existing file (do NOT replace the entire file):

```typescript
// Add import at top
import type { CredentialTypeInstructions } from './instructionBuilder';

// Update CredentialType interface - add this field:
export interface CredentialType {
  // ... existing fields ...
  
  // NEW: Rich instruction configuration (v2+)
  instruction_config: CredentialTypeInstructions | null;
}

// Update CredentialTypeFormData - add this field:
export interface CredentialTypeFormData {
  // ... existing fields ...
  
  // NEW: Instruction configuration
  instruction_config?: CredentialTypeInstructions | null;
}

// Add simple create form data type
export interface CreateCredentialTypeSimple {
  name: string;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  template_id: string | null;
}
```

---

### Task 4: Instruction Templates

Create `src/lib/instruction-templates.ts`:

```typescript
import type { CredentialTypeInstructions, InstructionTemplate } from '@/types/instructionBuilder';
import { createEmptyInstructions, createStep, createBlock } from '@/types/instructionBuilder';

/**
 * Pre-built templates for common credential types
 * These populate the instruction builder when selected in the create modal
 */

export const instructionTemplates: InstructionTemplate[] = [
  {
    id: 'document_upload',
    label: 'Document Upload',
    description: 'Simple document or certificate upload',
    icon: 'FileText',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Upload Document',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Upload the required document. Accepted formats: PDF, JPG, PNG.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Document',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSizeMB: 50,
                multiple: false,
                required: true,
                helpText: 'Maximum file size: 50MB',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'photo_capture',
    label: 'Photo Capture',
    description: 'Take or upload a photo',
    icon: 'Camera',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Capture Photo',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Take a clear photo or upload an existing image.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Photo',
                accept: 'image/*',
                maxSizeMB: 10,
                multiple: false,
                required: true,
                helpText: 'JPG or PNG, max 10MB',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'signature',
    label: 'Signature Agreement',
    description: 'Review document and sign electronically',
    icon: 'PenTool',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Review Agreement',
          type: 'information',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Agreement', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Please read the following agreement carefully before signing.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'info',
                title: 'Review Required',
                message: 'You must review this document before you can sign.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'auto', autoCompleteOnView: true },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Sign Document',
          type: 'signature',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'signature_pad',
              content: {
                label: 'Your Signature',
                required: true,
                allowTyped: true,
                allowDrawn: true,
                agreementText: 'By signing, I agree to the terms above.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'training_quiz',
    label: 'Training + Quiz',
    description: 'Video training with knowledge check',
    icon: 'GraduationCap',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Watch Training',
          type: 'information',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Training Video', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Watch the training video below. You must watch at least 90% to proceed.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'video',
              content: {
                source: 'youtube',
                url: '',
                title: 'Training Video',
                requireWatch: true,
                watchPercentRequired: 90,
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Knowledge Check',
          type: 'knowledge_check',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Quiz', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Answer the following questions to complete your training.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'quiz_question',
              content: {
                question: 'Sample question?',
                questionType: 'multiple_choice',
                options: [
                  { id: crypto.randomUUID(), text: 'Option A', isCorrect: true },
                  { id: crypto.randomUUID(), text: 'Option B', isCorrect: false },
                  { id: crypto.randomUUID(), text: 'Option C', isCorrect: false },
                ],
                explanation: 'Explanation of correct answer.',
                allowRetry: true,
                required: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'quiz_pass', passScore: 80 },
        },
      ],
    },
  },
  {
    id: 'external_upload',
    label: 'External + Upload',
    description: 'Complete external action then upload proof',
    icon: 'ExternalLink',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: true,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Complete External Action',
          type: 'external_action',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Action Required', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Complete the required action at the external website.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'warning',
                title: 'Important',
                message: 'Complete this within the required timeframe.',
              },
            },
            {
              id: crypto.randomUUID(),
              order: 4,
              type: 'external_link',
              content: {
                url: 'https://example.com',
                title: 'Go to External Site',
                description: 'Click to open the external website.',
                buttonText: 'Open Website →',
                trackVisit: true,
                requireVisit: true,
                opensInNewTab: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Upload Proof',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Upload your confirmation or results document.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Results',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSizeMB: 50,
                multiple: false,
                required: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'admin_verified',
    label: 'Admin Verified',
    description: 'Admin manually marks complete',
    icon: 'CheckCircle',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Awaiting Verification',
          type: 'admin_verify',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Admin Verification Required', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'This credential will be verified by your administrator. No action is required from you.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'info',
                title: 'Status',
                message: 'Awaiting admin verification. Contact your administrator if you have questions.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
      ],
    },
  },
  {
    id: 'blank',
    label: 'Blank Custom',
    description: 'Start with an empty canvas',
    icon: 'Plus',
    config: createEmptyInstructions(),
  },
];

export function getTemplateById(id: string): InstructionTemplate | undefined {
  return instructionTemplates.find(t => t.id === id);
}

export function getDefaultTemplate(): InstructionTemplate {
  return instructionTemplates.find(t => t.id === 'document_upload')!;
}
```

---

### Task 5: Update Credential Types Service

Update `src/services/credentialTypes.ts` (if it exists) or create it:

Add these functions (integrate with existing service if present):

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { CredentialType, CreateCredentialTypeSimple, CredentialTypeFormData } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { getTemplateById, getDefaultTemplate } from '@/lib/instruction-templates';

/**
 * Create a new credential type with minimal info (simple modal)
 * Returns the created credential type ID for redirect to editor
 */
export async function createCredentialTypeSimple(
  companyId: string,
  data: CreateCredentialTypeSimple,
  createdBy: string
): Promise<string> {
  // Get template config or default
  const template = data.template_id 
    ? getTemplateById(data.template_id) 
    : getDefaultTemplate();
  
  const instructionConfig = template?.config ?? null;

  // Derive submission_type from template for backward compatibility
  const submissionType = deriveSubmissionType(instructionConfig);

  const { data: created, error } = await supabase
    .from('credential_types')
    .insert({
      company_id: companyId,
      name: data.name,
      category: data.category,
      scope: data.scope,
      broker_id: data.scope === 'broker' ? data.broker_id : null,
      instruction_config: instructionConfig,
      // Defaults
      submission_type: submissionType,
      employment_type: 'both',
      requirement: 'required',
      expiration_type: 'never',
      expiration_warning_days: 30,
      grace_period_days: 30,
      is_active: true,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

/**
 * Update instruction config for a credential type
 */
export async function updateInstructionConfig(
  credentialTypeId: string,
  config: CredentialTypeInstructions
): Promise<void> {
  const submissionType = deriveSubmissionType(config);

  const { error } = await supabase
    .from('credential_types')
    .update({
      instruction_config: config,
      submission_type: submissionType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', credentialTypeId);

  if (error) throw error;
}

/**
 * Derive legacy submission_type from instruction config blocks
 * For backward compatibility with existing credential submission flow
 */
function deriveSubmissionType(config: CredentialTypeInstructions | null): string {
  if (!config || config.steps.length === 0) {
    return 'document_upload';
  }

  const allBlocks = config.steps.flatMap(s => s.blocks);
  
  // Check for specific block types
  const hasSignature = allBlocks.some(b => b.type === 'signature_pad');
  const hasFileUpload = allBlocks.some(b => b.type === 'file_upload');
  const hasFormField = allBlocks.some(b => b.type === 'form_field');
  const hasQuiz = allBlocks.some(b => b.type === 'quiz_question');
  
  // Check for admin_verify step type
  const hasAdminVerify = config.steps.some(s => s.type === 'admin_verify');

  if (hasAdminVerify && !hasSignature && !hasFileUpload && !hasFormField) {
    return 'admin_verified';
  }
  if (hasSignature) return 'signature';
  if (hasFileUpload) return 'document_upload';
  if (hasFormField || hasQuiz) return 'form';
  
  return 'document_upload';
}

/**
 * Get a single credential type by ID with instruction config
 */
export async function getCredentialTypeById(id: string): Promise<CredentialType | null> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(`
      *,
      broker:brokers(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}
```

---

### Task 6: Update Credential Types Hook

Update `src/hooks/useCredentialTypes.ts` to include new functions:

Add these to existing hook file:

```typescript
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import * as credentialTypesService from '@/services/credentialTypes';
import type { CreateCredentialTypeSimple } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

/**
 * Hook to create credential type with simple modal
 */
export function useCreateCredentialTypeSimple() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
      createdBy,
    }: {
      companyId: string;
      data: CreateCredentialTypeSimple;
      createdBy: string;
    }) => {
      return credentialTypesService.createCredentialTypeSimple(companyId, data, createdBy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create credential type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to get a single credential type by ID
 */
export function useCredentialTypeById(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-type', id],
    queryFn: () => credentialTypesService.getCredentialTypeById(id!),
    enabled: !!id,
  });
}

/**
 * Hook to update instruction config
 */
export function useUpdateInstructionConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      credentialTypeId,
      config,
    }: {
      credentialTypeId: string;
      config: CredentialTypeInstructions;
    }) => {
      return credentialTypesService.updateInstructionConfig(credentialTypeId, config);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credential-type', variables.credentialTypeId] });
      queryClient.invalidateQueries({ queryKey: ['credential-types'] });
      toast({
        title: 'Changes saved',
        description: 'Credential type updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to save changes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
```

---

### Task 7: Simple Create Modal (New)

Create `src/components/features/admin/CreateCredentialTypeSimpleModal.tsx`:

```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateCredentialTypeSimple, useBrokers } from '@/hooks/useCredentialTypes';
import { useAuth } from '@/contexts/AuthContext';
import { instructionTemplates } from '@/lib/instruction-templates';
import {
  FileText,
  Camera,
  PenTool,
  GraduationCap,
  ExternalLink,
  CheckCircle,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Camera,
  PenTool,
  GraduationCap,
  ExternalLink,
  CheckCircle,
  Plus,
};

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.enum(['driver', 'vehicle']),
  scope: z.enum(['global', 'broker']),
  broker_id: z.string().nullable(),
  template_id: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface CreateCredentialTypeSimpleModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCredentialTypeSimpleModal({
  companyId,
  open,
  onOpenChange,
}: CreateCredentialTypeSimpleModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createMutation = useCreateCredentialTypeSimple();
  const { data: brokers } = useBrokers(companyId);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('document_upload');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: 'driver',
      scope: 'global',
      broker_id: null,
      template_id: 'document_upload',
    },
  });

  const watchScope = watch('scope');

  async function onSubmit(data: FormData) {
    if (!user?.id) return;

    try {
      const id = await createMutation.mutateAsync({
        companyId,
        data: {
          ...data,
          template_id: selectedTemplate,
        },
        createdBy: user.id,
      });

      reset();
      onOpenChange(false);
      navigate(`/admin/settings/credentials/${id}`);
    } catch {
      // Error handled by mutation
    }
  }

  function handleClose() {
    reset();
    setSelectedTemplate('document_upload');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Credential Type</DialogTitle>
          <DialogDescription>
            Set up the basics, then configure detailed instructions on the next screen.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Drug Screening, Background Check"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <RadioGroup
              value={watch('category')}
              onValueChange={(v) => setValue('category', v as 'driver' | 'vehicle')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="driver" id="cat-driver" />
                <Label htmlFor="cat-driver">Driver Credential</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicle" id="cat-vehicle" />
                <Label htmlFor="cat-vehicle">Vehicle Credential</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Scope */}
          <div className="space-y-2">
            <Label>Scope *</Label>
            <RadioGroup
              value={watch('scope')}
              onValueChange={(v) => setValue('scope', v as 'global' | 'broker')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="scope-global" />
                <Label htmlFor="scope-global">Global (All drivers)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="broker" id="scope-broker" />
                <Label htmlFor="scope-broker">Broker-Specific</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Broker Select (conditional) */}
          {watchScope === 'broker' && (
            <div className="space-y-2">
              <Label>Broker *</Label>
              <Select
                value={watch('broker_id') || ''}
                onValueChange={(v) => setValue('broker_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {brokers?.map((broker) => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Start from Template</Label>
            <p className="text-sm text-muted-foreground">
              Choose a template to pre-populate the builder.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {instructionTemplates.map((template) => {
                const Icon = iconMap[template.icon] || FileText;
                return (
                  <Button
                    key={template.id}
                    type="button"
                    variant={selectedTemplate === template.id ? 'default' : 'outline'}
                    className={cn(
                      'h-auto py-3 flex flex-col items-center gap-1',
                      selectedTemplate === template.id && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs text-center leading-tight">
                      {template.label}
                    </span>
                  </Button>
                );
              })}
            </div>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground pt-1">
                {instructionTemplates.find(t => t.id === selectedTemplate)?.description}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create & Configure'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### Task 8: Editor Page Shell

Create `src/pages/admin/CredentialTypeEditor.tsx`:

```tsx
import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  MoreVertical,
  Loader2,
  FileText,
  Camera,
  PenTool,
  ClipboardList,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useCredentialTypeById, useUpdateInstructionConfig } from '@/hooks/useCredentialTypes';
import { InstructionBuilder } from '@/components/features/admin/credential-builder/InstructionBuilder';
import { RequirementsSection } from '@/components/features/admin/credential-builder/RequirementsSection';
import { ExpirationSection } from '@/components/features/admin/credential-builder/ExpirationSection';
import { SettingsSection } from '@/components/features/admin/credential-builder/SettingsSection';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { createEmptyInstructions } from '@/types/instructionBuilder';

const submissionTypeIcons: Record<string, React.ElementType> = {
  document_upload: FileText,
  photo: Camera,
  signature: PenTool,
  form: ClipboardList,
  admin_verified: CheckCircle,
  date_entry: Calendar,
};

export default function CredentialTypeEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: credentialType, isLoading, error } = useCredentialTypeById(id);
  const updateConfig = useUpdateInstructionConfig();

  const [instructionConfig, setInstructionConfig] = useState<CredentialTypeInstructions | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize config from data
  useState(() => {
    if (credentialType?.instruction_config) {
      setInstructionConfig(credentialType.instruction_config);
    }
  });

  // Update local state when data loads
  if (credentialType && !instructionConfig) {
    const config = credentialType.instruction_config ?? createEmptyInstructions();
    setInstructionConfig(config);
  }

  const handleConfigChange = (config: CredentialTypeInstructions) => {
    setInstructionConfig(config);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!id || !instructionConfig) return;

    try {
      await updateConfig.mutateAsync({
        credentialTypeId: id,
        config: instructionConfig,
      });
      setHasChanges(false);
    } catch {
      // Error handled by mutation
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Error state
  if (error || !credentialType) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/settings/credentials"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Credential Types
        </Link>
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Credential type not found</h3>
          <p className="text-muted-foreground mb-4">
            The credential type you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/admin/settings/credentials')}>
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const TypeIcon = submissionTypeIcons[credentialType.submission_type] || FileText;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/admin/settings/credentials"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Credential Types
      </Link>

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted">
            <TypeIcon className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{credentialType.name}</h1>
              <Badge variant={credentialType.is_active ? 'default' : 'secondary'}>
                {credentialType.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {hasChanges && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {credentialType.category === 'driver' ? 'Driver' : 'Vehicle'} Credential •{' '}
              {credentialType.scope === 'global' ? 'Global' : credentialType.broker?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" disabled>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateConfig.isPending}
          >
            {updateConfig.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Rename</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                {credentialType.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="instructions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="instructions">Instructions</TabsTrigger>
          <TabsTrigger value="requirements">Requirements</TabsTrigger>
          <TabsTrigger value="expiration">Expiration</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="instructions" className="space-y-0">
          {instructionConfig && (
            <InstructionBuilder
              config={instructionConfig}
              onChange={handleConfigChange}
            />
          )}
        </TabsContent>

        <TabsContent value="requirements" className="space-y-6">
          <RequirementsSection credentialType={credentialType} />
        </TabsContent>

        <TabsContent value="expiration" className="space-y-6">
          <ExpirationSection credentialType={credentialType} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsSection credentialType={credentialType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### Task 9: Empty Builder Component (Placeholder)

Create `src/components/features/admin/credential-builder/InstructionBuilder.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Plus, Layers } from 'lucide-react';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

interface InstructionBuilderProps {
  config: CredentialTypeInstructions;
  onChange: (config: CredentialTypeInstructions) => void;
}

export function InstructionBuilder({ config, onChange }: InstructionBuilderProps) {
  const updateSettings = (updates: Partial<typeof config.settings>) => {
    onChange({
      ...config,
      settings: { ...config.settings, ...updates },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Builder */}
      <div className="lg:col-span-2 space-y-4">
        {/* Settings Bar */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showProgress"
                  checked={config.settings.showProgressBar}
                  onCheckedChange={(v) => updateSettings({ showProgressBar: !!v })}
                />
                <Label htmlFor="showProgress" className="text-sm">
                  Show progress bar
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowSkip"
                  checked={config.settings.allowStepSkip}
                  onCheckedChange={(v) => updateSettings({ allowStepSkip: !!v })}
                />
                <Label htmlFor="allowSkip" className="text-sm">
                  Allow step skip
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Steps
              </CardTitle>
              <Button variant="ghost" size="sm" disabled>
                <Plus className="w-4 h-4 mr-1" />
                Add Step
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {config.steps.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-lg">
                <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-sm font-medium mb-1">No steps yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add steps to build your credential workflow.
                </p>
                <Button variant="outline" size="sm" disabled>
                  <Plus className="w-4 h-4 mr-1" />
                  Add First Step
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {config.steps.map((step, index) => (
                  <Card key={step.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.blocks.length} block{step.blocks.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placeholder for Block Editor */}
        <Card className="p-6">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">
              Select a step to edit its blocks.
            </p>
            <p className="text-xs mt-1">
              (Full block editor coming in Phase 2)
            </p>
          </div>
        </Card>
      </div>

      {/* Right Column: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border-t p-6 text-center text-muted-foreground">
                <p className="text-sm">Live preview coming in Phase 5</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 10: Section Placeholders

Create `src/components/features/admin/credential-builder/RequirementsSection.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import type { CredentialType } from '@/types/credential';

interface RequirementsSectionProps {
  credentialType: CredentialType;
}

export function RequirementsSection({ credentialType }: RequirementsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Requirement Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={credentialType.requirement}
            className="space-y-2"
            disabled
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
              <Label htmlFor="req-optional">Optional - Nice to have</Label>
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            (Editing coming in future phase)
          </p>
        </CardContent>
      </Card>

      {credentialType.category === 'driver' && (
        <Card>
          <CardHeader>
            <CardTitle>Employment Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={credentialType.employment_type}
              className="space-y-2"
              disabled
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
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={credentialType.grace_period_days}
              className="w-20"
              disabled
            />
            <span className="text-sm text-muted-foreground">
              days for existing drivers to submit
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Create `src/components/features/admin/credential-builder/ExpirationSection.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import type { CredentialType } from '@/types/credential';

interface ExpirationSectionProps {
  credentialType: CredentialType;
}

export function ExpirationSection({ credentialType }: ExpirationSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Expiration Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={credentialType.expiration_type}
            className="space-y-2"
            disabled
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

          {credentialType.expiration_type === 'fixed_interval' && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm">Valid for</span>
              <Input
                type="number"
                value={credentialType.expiration_interval_days || 365}
                className="w-20"
                disabled
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          )}
          
          <p className="text-xs text-muted-foreground">
            (Editing coming in future phase)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Warning Threshold</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm">Notify when credential expires within</span>
            <Input
              type="number"
              value={credentialType.expiration_warning_days}
              className="w-20"
              disabled
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

Create `src/components/features/admin/credential-builder/SettingsSection.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { CredentialType } from '@/types/credential';

interface SettingsSectionProps {
  credentialType: CredentialType;
}

export function SettingsSection({ credentialType }: SettingsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">
                {credentialType.is_active 
                  ? 'This credential is active and visible to drivers.'
                  : 'This credential is inactive and hidden from drivers.'}
              </p>
            </div>
            <Badge variant={credentialType.is_active ? 'default' : 'secondary'}>
              {credentialType.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <Button variant="outline" disabled>
            {credentialType.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <p className="text-xs text-muted-foreground">
            (Editing coming in future phase)
          </p>
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

---

### Task 11: Add Route

Update `src/App.tsx` to add the editor route:

Find the admin routes section and add:

```tsx
// Import at top
import CredentialTypeEditor from '@/pages/admin/CredentialTypeEditor';

// In the admin routes, add this route (alongside existing credential routes):
<Route path="settings/credentials/:id" element={<CredentialTypeEditor />} />
```

---

### Task 12: Update List Page to Use New Modal

Update `src/pages/admin/CredentialTypes.tsx`:

Replace the import and usage of `CreateCredentialTypeModal` with `CreateCredentialTypeSimpleModal`:

```tsx
// Change import
import CreateCredentialTypeSimpleModal from '@/components/features/admin/CreateCredentialTypeSimpleModal';

// Update component usage (at bottom of file)
{companyId && (
  <CreateCredentialTypeSimpleModal
    companyId={companyId}
    open={showCreateModal}
    onOpenChange={setShowCreateModal}
  />
)}
```

Also update the card/row onClick to navigate to the new editor page:

```tsx
// The existing onClick already navigates to:
onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
// This is correct - no change needed
```

---

### Task 13: Create Index Export

Create `src/components/features/admin/credential-builder/index.ts`:

```typescript
export { InstructionBuilder } from './InstructionBuilder';
export { RequirementsSection } from './RequirementsSection';
export { ExpirationSection } from './ExpirationSection';
export { SettingsSection } from './SettingsSection';
```

---

## Files Created/Modified

| Action | File |
|--------|------|
| CREATE | `supabase/migrations/022_credential_instruction_builder.sql` |
| CREATE | `src/types/instructionBuilder.ts` |
| MODIFY | `src/types/credential.ts` (add instruction_config field) |
| CREATE | `src/lib/instruction-templates.ts` |
| MODIFY | `src/services/credentialTypes.ts` (add new functions) |
| MODIFY | `src/hooks/useCredentialTypes.ts` (add new hooks) |
| CREATE | `src/components/features/admin/CreateCredentialTypeSimpleModal.tsx` |
| CREATE | `src/pages/admin/CredentialTypeEditor.tsx` |
| CREATE | `src/components/features/admin/credential-builder/InstructionBuilder.tsx` |
| CREATE | `src/components/features/admin/credential-builder/RequirementsSection.tsx` |
| CREATE | `src/components/features/admin/credential-builder/ExpirationSection.tsx` |
| CREATE | `src/components/features/admin/credential-builder/SettingsSection.tsx` |
| CREATE | `src/components/features/admin/credential-builder/index.ts` |
| MODIFY | `src/App.tsx` (add route) |
| MODIFY | `src/pages/admin/CredentialTypes.tsx` (use new modal) |

---

## Acceptance Criteria

### AC-1: Database Migration
- [ ] Migration `022_credential_instruction_builder.sql` runs without error
- [ ] `instruction_config` column added to `credential_types` table
- [ ] Existing credentials with descriptions are migrated to v2 format
- [ ] New credentials without description get empty config

### AC-2: Type Definitions
- [ ] `CredentialTypeInstructions` type defined with all block types
- [ ] Helper functions `createEmptyInstructions`, `createStep`, `createBlock` work
- [ ] `CredentialType` interface includes `instruction_config` field

### AC-3: Templates
- [ ] 7 templates defined (document, photo, signature, training, external, admin, blank)
- [ ] Templates have correct structure matching `CredentialTypeInstructions`
- [ ] `getTemplateById` and `getDefaultTemplate` work correctly

### AC-4: Simple Create Modal
- [ ] Modal opens from "Add Type" button on list page
- [ ] Name, category, scope fields work with validation
- [ ] Broker select appears only when scope is "broker"
- [ ] Template selection shows all 7 templates with icons
- [ ] On create, navigates to `/admin/settings/credentials/:id`
- [ ] Toast shows on success/error

### AC-5: Editor Page Shell
- [ ] Page loads at `/admin/settings/credentials/:id`
- [ ] Back link returns to list
- [ ] Header shows name, badge, category, scope
- [ ] "Unsaved changes" badge appears when config changes
- [ ] Save button saves instruction config
- [ ] Tabs work: Instructions, Requirements, Expiration, Settings
- [ ] Loading skeleton displays while fetching
- [ ] Error state shows if credential not found

### AC-6: Instruction Builder Placeholder
- [ ] Shows settings checkboxes (progress bar, skip steps)
- [ ] Displays steps list (if any from template)
- [ ] Shows empty state with "Add First Step" if no steps
- [ ] Preview panel shows placeholder on right
- [ ] Changes to settings trigger `onChange` callback

### AC-7: Section Placeholders
- [ ] Requirements section shows current values (read-only for now)
- [ ] Expiration section shows current values (read-only for now)
- [ ] Settings section shows status badge and metadata
- [ ] All sections display "(Editing coming in future phase)"

### AC-8: Routing
- [ ] `/admin/settings/credentials` still shows list (with new modal)
- [ ] `/admin/settings/credentials/:id` shows editor page
- [ ] Clicking credential card navigates to editor

### AC-9: Backward Compatibility
- [ ] Existing credentials still work in driver submission flow
- [ ] `submission_type` is derived from instruction config blocks
- [ ] Old `CreateCredentialTypeModal` can be removed after testing

---

## Important Notes

1. **Do NOT delete** `CreateCredentialTypeModal.tsx` yet - keep as backup until new flow is verified
2. The `useBrokers` hook should already exist in `useCredentialTypes.ts` - reuse it
3. Templates use `crypto.randomUUID()` which works in modern browsers
4. The editor is read-only for Requirements/Expiration/Settings tabs in Phase 1
5. Phase 2 will add step/block editing functionality to `InstructionBuilder`

---

## Testing Checklist

- [ ] Create new credential type with "Document Upload" template → verify steps populated
- [ ] Create new credential type with "Blank Custom" template → verify empty steps
- [ ] Create broker-specific credential → verify broker_id saved correctly
- [ ] Open existing credential in editor → verify instruction_config loads
- [ ] Toggle settings checkboxes → verify "Unsaved changes" badge appears
- [ ] Save changes → verify toast and badge disappears
- [ ] Navigate between tabs → verify content switches
- [ ] Click back link → verify returns to list
