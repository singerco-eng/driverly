# AI-001 Phase 1: Document Block Foundation - Implementation Plan

> **For AI Implementation**: Read the full context document first:
> `docs/AI-001-document-extraction-system.prompt.md`

---

## ✅ STATUS: PHASE 1 COMPLETE

**Phase 1 has been fully implemented.** This document is retained for reference and testing verification.

### Implementation Summary

| Component | Status | Location |
|-----------|--------|----------|
| Document block types | ✅ Done | `src/types/instructionBuilder.ts` |
| DocumentBlockEditor | ✅ Done | `src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx` |
| DocumentBlock (driver) | ✅ Done | `src/components/features/credentials/blocks/DocumentBlock.tsx` |
| BlockRenderer integration | ✅ Done | `src/components/features/credentials/blocks/BlockRenderer.tsx` |
| blockPermissions.ts | ✅ Done | `src/lib/blockPermissions.ts` |
| BlockPaletteSheet guardrails | ✅ Done | `src/components/features/admin/credential-builder/BlockPaletteSheet.tsx` |
| StepState documentData | ✅ Done | `src/types/credentialProgress.ts` |
| Completion validation | ✅ Done | `src/components/features/credentials/InstructionRenderer/index.tsx` |

### Next Steps
- **Phase 2**: AI Builder Integration (generate Document blocks)
- **Phase 3**: Extraction Engine (OCR/Vision AI)

---

## Original Scope (For Reference)

**What was planned:**
- Document block type definition
- Document block editor component (builder)
- Document block renderer component (driver)
- Edit mode permissions and guardrails
- FileUpload help text updates

**Out of Scope (Later Phases):**
- AI extraction (Phase 3)
- AI builder generation of Document blocks (Phase 2)
- Admin review extraction display (Phase 4)

---

## User Stories

### Story 1: Document Block Type Definition

**As a** developer  
**I want** a well-defined Document block type  
**So that** the system understands how to store and render document uploads with extraction fields

#### Tasks

1.1. Add `document` to the `BlockType` union in `src/types/instructionBuilder.ts`

1.2. Create `DocumentBlockContent` interface:
```typescript
interface DocumentBlockContent {
  uploadLabel: string;
  uploadDescription?: string;
  acceptedTypes: string[];  // ['image/*', 'application/pdf']
  maxSizeMB: number;
  required: boolean;
  extractionFields: DocumentExtractionField[];
  extractionContext?: string;
}

interface DocumentExtractionField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  extractionHints?: string[];
  source: 'ai_generated' | 'user_specified';
}
```

1.3. Create `DocumentBlockState` interface for tracking runtime state:
```typescript
interface DocumentBlockState {
  uploadedFileUrl: string | null;
  uploadedFileName: string | null;
  extractionStatus: 'idle' | 'extracting' | 'complete' | 'failed';
  extractionResult: ExtractionResult | null;
  fieldValues: Record<string, string>;
  overrides: string[];
}
```

1.4. Add Document block to the `ContentBlock` union type

1.5. Export all new types from `src/types/instructionBuilder.ts`

#### Acceptance Criteria
- [ ] `BlockType` includes `'document'`
- [ ] `DocumentBlockContent` interface is defined with all fields
- [ ] `DocumentExtractionField` interface is defined
- [ ] `DocumentBlockState` interface is defined
- [ ] Types are exported and usable in other files
- [ ] TypeScript compiles without errors

#### Files to Modify
- `src/types/instructionBuilder.ts`

---

### Story 2: Document Block Editor (Builder)

**As an** admin using the credential builder  
**I want** to view and edit Document block settings  
**So that** I can customize upload labels and field settings

#### Tasks

2.1. Create `DocumentBlockEditor.tsx` component:

```typescript
// src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx

interface DocumentBlockEditorProps {
  content: DocumentBlockContent;
  onChange: (content: DocumentBlockContent) => void;
  mode: 'ai' | 'edit';
}
```

2.2. Implement the editor UI with sections:
- Upload settings (label, description, required)
- Extraction fields list (editable based on mode)
- "Ask AI to modify fields" prompt (for edit mode)

2.3. Implement edit mode restrictions:
- Upload label: editable
- Upload description: editable
- Required toggle: editable
- Field labels: editable
- Field required toggles: editable
- Delete fields: allowed
- Add fields: BLOCKED (show "Ask AI" prompt)

2.4. Add the editor to the block editor registry/switch statement

#### UI Reference

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Document Upload                                         │
├─────────────────────────────────────────────────────────────┤
│  Upload Settings                                            │
│                                                             │
│  Label *                                                    │
│  [Upload your insurance card                    ]           │
│                                                             │
│  Description (optional)                                     │
│  [Front of your auto insurance card             ]           │
│                                                             │
│  ☑ Required                                                 │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Extraction Fields                                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Label        [Policy Number    ]                      │ │
│  │ Type         [Text ▼]           ☑ Required     [🗑]   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Label        [Insurance Carrier]                      │ │
│  │ Type         [Text ▼]           ☐ Required     [🗑]   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Label        [Expiration Date  ]                      │ │
│  │ Type         [Date ▼]           ☑ Required     [🗑]   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ ✨ Need to add or change fields?                      │ │
│  │                                                       │ │
│  │ Use AI mode to add extraction fields.                 │ │
│  │ [Switch to AI Mode]                                   │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] `DocumentBlockEditor` component renders correctly
- [ ] Upload label is editable
- [ ] Upload description is editable
- [ ] Required toggle works
- [ ] Extraction fields list displays all fields
- [ ] Field labels are editable
- [ ] Field type dropdowns work (text, date, number, email, phone)
- [ ] Field required toggles work
- [ ] Delete field button removes field from list
- [ ] "Add field" is NOT available - shows "Switch to AI Mode" prompt instead
- [ ] Component calls `onChange` with updated content on any edit

#### Files to Create
- `src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx`

#### Files to Modify
- `src/components/features/admin/credential-builder/BlockEditor.tsx` (add case for 'document')
- `src/components/features/admin/credential-builder/index.ts` (export if needed)

---

### Story 3: Document Block Renderer (Driver)

**As a** driver completing a credential  
**I want** to see a Document block with upload zone and form fields  
**So that** I can upload my document and enter the required information

#### Tasks

3.1. Create `DocumentBlock.tsx` component:

```typescript
// src/components/features/credentials/blocks/DocumentBlock.tsx

interface DocumentBlockProps {
  block: ContentBlock;  // type: 'document'
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}
```

3.2. Implement initial state (no upload):
- Show upload label
- Show upload description (if exists)
- Show file drop zone (reuse existing FileDropZone component)
- Show extraction fields as disabled form inputs

3.3. Implement uploaded state (file selected):
- Show file thumbnail/preview
- Show filename with "Change" button
- Show extraction fields as enabled form inputs
- Fields should save to step state

3.4. For Phase 1, skip extraction flow:
- After upload, immediately show fields for manual entry
- Add TODO comment for Phase 3 extraction integration

3.5. Handle field value changes:
- Store in `stepState.documentData[blockId].fieldValues`
- Include uploaded file URL in state

3.6. Integrate with `InstructionRenderer`:
- Add case for 'document' block type
- Pass appropriate props

#### UI Reference - Initial State

```
┌─────────────────────────────────────────────────────────────┐
│  Upload your Insurance Card                                 │
│  Front of your auto insurance card                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │        Click to upload or drag and drop            │   │
│  │        PNG, JPG, or PDF up to 10MB                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Policy Number *                                            │
│  [____________________________________] (disabled)          │
│                                                             │
│  Insurance Carrier                                          │
│  [____________________________________] (disabled)          │
│                                                             │
│  Expiration Date *                                          │
│  [____________________________________] (disabled)          │
│                                                             │
│  ℹ️ Upload your document to fill in these fields            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### UI Reference - Uploaded State

```
┌─────────────────────────────────────────────────────────────┐
│  Upload your Insurance Card                      [Change]   │
│                                                             │
│  ┌──────────────┐                                           │
│  │ [thumbnail]  │  insurance_card.jpg                       │
│  └──────────────┘                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Policy Number *                                            │
│  [____________________________________]                     │
│                                                             │
│  Insurance Carrier                                          │
│  [____________________________________]                     │
│                                                             │
│  Expiration Date *                                          │
│  [____________________________________]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] `DocumentBlock` component renders correctly
- [ ] Upload label and description display
- [ ] File drop zone works (accepts images and PDFs)
- [ ] File uploads to storage and URL is captured
- [ ] After upload, thumbnail/filename shows with "Change" option
- [ ] Extraction fields render as form inputs
- [ ] Fields are disabled until file is uploaded
- [ ] Fields are enabled after file is uploaded
- [ ] Field values save to step state
- [ ] Required field validation works
- [ ] Date fields render as date pickers
- [ ] Read-only mode works (for admin review)
- [ ] Disabled mode works (during form submission)

#### Files to Create
- `src/components/features/credentials/blocks/DocumentBlock.tsx`

#### Files to Modify
- `src/components/features/credentials/InstructionRenderer/index.tsx` (add document block case)
- `src/components/features/credentials/blocks/index.ts` (export DocumentBlock)

---

### Story 4: Edit Mode Guardrails - Add Block Menu

**As an** admin in Edit mode  
**I want** to see that Document blocks require AI mode  
**So that** I understand how to add document uploads with extraction

#### Tasks

4.1. Update the Add Block menu to categorize blocks:
- Content: Heading, Paragraph, Alert, Video, Image
- Interactive: Form Field, File Upload, Checklist, Signature
- Documents: Document Upload (AI required)

4.2. Add `canAddManually` and `aiRequired` flags to block definitions

4.3. For Document block, show:
- Visual "✨ AI" badge
- Help text explaining it requires AI mode
- "Switch to AI Mode" button

4.4. For File Upload block, add help text:
- "Simple file upload without data extraction"
- "Need to extract data? Use Document Upload in AI mode"

#### UI Reference

```
┌─────────────────────────────────────────────────────────────┐
│  + Add Block                                                │
├─────────────────────────────────────────────────────────────┤
│  Content                                                    │
│    ○ Heading                                                │
│    ○ Paragraph                                              │
│    ○ Alert                                                  │
│    ○ Video                                                  │
│                                                             │
│  Interactive                                                │
│    ○ Form Field                                             │
│    ○ File Upload                                            │
│      └─ Simple upload without data extraction               │
│    ○ Checklist                                              │
│    ○ Signature                                              │
│                                                             │
│  Documents                                                  │
│    ○ Document Upload                           ✨ AI        │
│      ┌─────────────────────────────────────────────────┐   │
│      │ Document blocks are created using AI mode to    │   │
│      │ ensure extraction fields are configured         │   │
│      │ correctly.                                      │   │
│      │                                                 │   │
│      │ [Switch to AI Mode]                             │   │
│      └─────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Acceptance Criteria
- [ ] Add Block menu shows categorized block types
- [ ] Document Upload shows "✨ AI" badge
- [ ] Clicking Document Upload shows guardrail message (not the editor)
- [ ] "Switch to AI Mode" button triggers mode switch
- [ ] File Upload shows help text about simple uploads
- [ ] All other blocks can be added normally in Edit mode

#### Files to Modify
- `src/components/features/admin/credential-builder/AddBlockMenu.tsx` (or similar)

---

### Story 5: Edit Mode Guardrails - Block Permissions

**As an** admin editing a Document block in Edit mode  
**I want** restricted editing that prevents me from breaking extraction  
**So that** the extraction continues to work correctly

#### Tasks

5.1. Create a permissions utility:

```typescript
// src/lib/blockPermissions.ts

interface BlockPermissions {
  canDelete: boolean;
  canReorder: boolean;
  editableFields: string[];
  restrictedActions: {
    action: string;
    message: string;
    suggestion: string;
  }[];
}

function getBlockPermissions(
  blockType: BlockType, 
  mode: 'ai' | 'edit'
): BlockPermissions;
```

5.2. Define Document block permissions for Edit mode:
- `canDelete`: true
- `canReorder`: true
- `editableFields`: 
  - `content.uploadLabel`
  - `content.uploadDescription`
  - `content.required`
  - `content.extractionFields.*.label`
  - `content.extractionFields.*.required`
- `restrictedActions`:
  - Add field: "Use AI mode to add extraction fields"
  - Edit extraction hints: "Use AI mode to modify extraction configuration"

5.3. Apply permissions in `DocumentBlockEditor`:
- Show/hide add field button based on permissions
- Show restriction messages when user attempts restricted action

#### Acceptance Criteria
- [ ] `getBlockPermissions` utility exists and returns correct permissions
- [ ] Document block in Edit mode allows: edit labels, toggle required, delete fields, reorder
- [ ] Document block in Edit mode blocks: adding fields, editing hints
- [ ] Restriction message displays when attempting blocked action
- [ ] AI mode has full permissions for Document blocks

#### Files to Create
- `src/lib/blockPermissions.ts`

#### Files to Modify
- `src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx`

---

### Story 6: Step State Updates for Document Block

**As a** developer  
**I want** the step state to properly store Document block data  
**So that** field values and upload info persist correctly

#### Tasks

6.1. Update `StepState` type to include document block data:

```typescript
interface StepState {
  // ... existing fields
  
  // NEW: Document block data
  documentData?: {
    [blockId: string]: {
      uploadedFileUrl: string | null;
      uploadedFileName: string | null;
      fieldValues: Record<string, string>;
      // Future: extractionResult, overrides
    };
  };
}
```

6.2. Update `InstructionRenderer` to initialize document state

6.3. Ensure document data is included in credential submission

6.4. Update completion checking to validate Document blocks:
- File uploaded (if block is required)
- All required fields have values

#### Acceptance Criteria
- [ ] `StepState` includes `documentData` field
- [ ] Document block data persists across renders
- [ ] Document data is saved with credential submission
- [ ] Completion check verifies upload exists (if required)
- [ ] Completion check verifies required field values

#### Files to Modify
- `src/types/instructionBuilder.ts` (StepState)
- `src/components/features/credentials/InstructionRenderer/index.tsx`
- `src/lib/credentialCompletion.ts` (or similar)

---

## Testing Checklist

### Manual Testing

#### Document Block Editor
- [ ] Open credential builder with existing Document block
- [ ] Verify all fields display correctly
- [ ] Edit upload label - verify it saves
- [ ] Edit field label - verify it saves
- [ ] Toggle field required - verify it saves
- [ ] Delete a field - verify it removes
- [ ] Verify "Add field" shows AI prompt, not add button
- [ ] Click "Switch to AI Mode" - verify mode switches

#### Document Block Renderer
- [ ] View credential with Document block as driver
- [ ] Verify upload zone displays
- [ ] Verify fields are disabled initially
- [ ] Upload a file - verify it uploads successfully
- [ ] Verify thumbnail/filename displays after upload
- [ ] Verify fields become enabled after upload
- [ ] Fill in field values - verify they save
- [ ] Click "Change" - verify can re-upload
- [ ] Submit credential - verify data is saved

#### Add Block Menu
- [ ] In Edit mode, open Add Block menu
- [ ] Verify Document Upload shows AI badge
- [ ] Click Document Upload - verify guardrail shows
- [ ] Click "Switch to AI Mode" - verify mode switches
- [ ] Verify File Upload can be added normally
- [ ] Verify File Upload has help text

#### Read-Only Mode
- [ ] View submitted credential in admin review
- [ ] Verify Document block shows in read-only
- [ ] Verify uploaded file is visible
- [ ] Verify field values display (not editable)

---

## Definition of Done

Phase 1 is complete when:

1. ✅ Document block type is defined in TypeScript
2. ✅ Document block editor works in builder (with Edit mode restrictions)
3. ✅ Document block renderer works for drivers (upload + manual field entry)
4. ✅ Add Block menu shows guardrails for Document blocks
5. ✅ Edit mode permissions prevent adding extraction fields
6. ✅ Step state properly stores document data
7. ✅ All acceptance criteria in each story are met
8. ✅ No TypeScript errors
9. ✅ No console errors during normal operation
10. ✅ Manual testing checklist passes

---

## Notes for Implementation

### Existing Components to Reuse
- `FileDropZone` - for file upload UI
- `Input`, `Label`, `Select` - for form fields
- `Button` - for actions
- `Card` - for field containers
- Existing upload logic in `FileUploadBlock`

### Patterns to Follow
- Look at existing block editors in `src/components/features/admin/credential-builder/blocks/`
- Look at existing block renderers in `src/components/features/credentials/blocks/`
- Follow existing state management patterns in `InstructionRenderer`

### Placeholder for Phase 3
In `DocumentBlock.tsx`, after file upload:
```typescript
// TODO: Phase 3 - Trigger extraction here
// For now, skip to manual entry
setExtractionStatus('complete');  // Pretend extraction is done
```

---

## Context Reference

For full architecture and data models, read:
- `docs/AI-001-document-extraction-system.prompt.md`

Key sections:
- "Phase 1: Document Block & Edit Mode"
- "1.1 Document Block Data Model"
- "1.2 Document Block Editor (Builder)"
- "1.3 Document Block Renderer (Driver)"
- "1.4 Edit Mode Guardrails"
