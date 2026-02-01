# AI-001: Document Extraction System

> **Copy this entire document when starting the implementation session.**

---

## Overview

Build an end-to-end document extraction system for credential submissions:

1. **Document Block**: New block type that bundles upload + extraction fields
2. **Edit Mode Guardrails**: Prevent manual complexity, guide users to AI
3. **AI Builder Support**: Generate Document blocks conversationally
4. **Extraction Engine**: OCR/Vision AI to extract data from uploads
5. **Admin Review**: Show extraction results with confidence badges

This is a **flagship AI feature**. Prioritize UX and correctness.

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                         ADMIN: BUILDER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   AI Mode                              Edit Mode                │
│   ────────                             ─────────                │
│   • Creates Document blocks            • Reorders blocks        │
│   • Configures extraction fields       • Edits labels           │
│   • Handles unknown docs               • Toggles required       │
│   • "Add insurance upload"             • Deletes blocks         │
│                                        • Cannot create Document │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DRIVER: SUBMISSION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   1. Driver sees Document block                                 │
│   2. Uploads document                                           │
│   3. Extraction runs (2-5 sec animation)                        │
│   4. Review screen: pre-filled fields                           │
│   5. Validation warnings if issues                              │
│   6. Confirm & continue                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN: REVIEW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   • Document block shows confidence badge                       │
│   • Click badge → modal with extraction details                 │
│   • Per-field confidence, quality analysis                      │
│   • Override warnings flagged                                   │
│   • Review score for future AI-002 queue filtering              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Document Block & Edit Mode

### 1.1 Document Block Data Model

**File:** `src/types/instructionBuilder.ts`

```typescript
// New block type
type BlockType = 
  | 'heading' 
  | 'paragraph' 
  | 'alert'
  | 'video'
  | 'image'
  | 'checklist'
  | 'form_field'
  | 'file_upload'      // Simple upload, no extraction
  | 'document'         // NEW: Upload + extraction fields
  | 'signature_pad'
  | 'external_link'
  | 'quiz_question';

// Document block content
interface DocumentBlockContent {
  // Upload configuration
  uploadLabel: string;
  uploadDescription?: string;
  acceptedTypes: string[];  // ['image/*', 'application/pdf']
  maxSizeMB: number;
  required: boolean;
  
  // Extraction fields (populated by AI, editable)
  extractionFields: DocumentExtractionField[];
  
  // Semantic context for AI extraction
  extractionContext?: string;  // "commercial auto insurance policy"
}

interface DocumentExtractionField {
  id: string;
  key: string;          // Form data key: "policy_number"
  label: string;        // Display label: "Policy Number"
  type: 'text' | 'date' | 'number' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  
  // Extraction hints (optional, improves accuracy)
  extractionHints?: string[];  // ["policy #", "member ID", "policy number"]
  
  // Metadata
  source: 'ai_generated' | 'user_specified';
}
```

### 1.2 Document Block Editor (Builder)

**File:** `src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx`

```typescript
interface DocumentBlockEditorProps {
  content: DocumentBlockContent;
  onChange: (content: DocumentBlockContent) => void;
  readOnly?: boolean;
}

// Renders:
// ┌─────────────────────────────────────────────────────────────┐
// │  📄 Document Upload                                         │
// ├─────────────────────────────────────────────────────────────┤
// │  Upload Label: [Upload your insurance card    ]             │
// │  Description:  [Front of your insurance card  ] (optional)  │
// │  Required: ☑                                                │
// │                                                             │
// │  ─────────────────────────────────────────────────────────  │
// │  Extraction Fields                                          │
// │                                                             │
// │  ┌───────────────────────────────────────────────────────┐ │
// │  │ Policy Number       [Text ▼]      ☑ Required    [✕]  │ │
// │  └───────────────────────────────────────────────────────┘ │
// │  ┌───────────────────────────────────────────────────────┐ │
// │  │ Insurance Carrier   [Text ▼]      ☐ Required    [✕]  │ │
// │  └───────────────────────────────────────────────────────┘ │
// │  ┌───────────────────────────────────────────────────────┐ │
// │  │ Expiration Date     [Date ▼]      ☑ Required    [✕]  │ │
// │  └───────────────────────────────────────────────────────┘ │
// │                                                             │
// │  ┌───────────────────────────────────────────────────────┐ │
// │  │ ✨ Need to add or change fields?                      │ │
// │  │    [Ask AI to modify fields]                          │ │
// │  └───────────────────────────────────────────────────────┘ │
// │                                                             │
// └─────────────────────────────────────────────────────────────┘
```

**Editable in Edit Mode:**
- Upload label
- Upload description
- Required toggle (block level)
- Field labels
- Field required toggles
- Delete fields

**Not editable in Edit Mode (requires AI):**
- Adding new extraction fields
- Adding extraction hints
- Creating the Document block itself

### 1.3 Document Block Renderer (Driver)

**File:** `src/components/features/credentials/blocks/DocumentBlock.tsx`

```typescript
interface DocumentBlockProps {
  content: DocumentBlockContent;
  state: DocumentBlockState;
  onStateChange: (state: DocumentBlockState) => void;
  disabled?: boolean;
  readOnly?: boolean;  // For admin review
}

interface DocumentBlockState {
  uploadedFileUrl: string | null;
  uploadedFileName: string | null;
  extractionStatus: 'idle' | 'extracting' | 'complete' | 'failed';
  extractionResult: ExtractionResult | null;
  fieldValues: Record<string, string>;  // User-confirmed values
  overrides: string[];  // Warning codes that were overridden
}
```

**Render states:**

1. **Initial (no upload):**
```
┌─────────────────────────────────────────────────────────────┐
│  Upload your Insurance Card                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │        Click to upload or drag and drop            │   │
│  │        PNG, JPG, or PDF up to 10MB                 │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

2. **Extracting:**
```
┌─────────────────────────────────────────────────────────────┐
│  Upload your Insurance Card                                 │
│                                                             │
│         ┌─────────────────────────┐                         │
│         │  [Document thumbnail]   │                         │
│         └─────────────────────────┘                         │
│                                                             │
│         ✨ Analyzing your document...                       │
│         ━━━━━━━━━━━░░░░░░░░░░░░░░                          │
│                                                             │
│         Extracting insurance information                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

3. **Review extracted data:**
```
┌─────────────────────────────────────────────────────────────┐
│  Upload your Insurance Card                    [Change ↻]   │
│                                                             │
│  ┌──────────────┐                                           │
│  │ [thumbnail]  │  insurance_card.jpg                       │
│  └──────────────┘                                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Review Your Information                                    │
│  Please verify the extracted data is correct.               │
│                                                             │
│  Policy Number *                                            │
│  [ABC123456____________________________] ✓                  │
│                                                             │
│  Insurance Carrier                                          │
│  [State Farm_______________________________] ✓              │
│                                                             │
│  Expiration Date *                                          │
│  [03/15/2026_______________________________] ✓              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

4. **Validation warning:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ⚠️  This document appears to be expired                    │
│                                                             │
│  We detected an expiration date of January 15, 2024.        │
│                                                             │
│  [Upload Different Document]                                │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  Is this incorrect? [Continue Anyway →]                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Edit Mode Guardrails

**File:** `src/components/features/admin/credential-builder/AddBlockMenu.tsx`

Update the "Add Block" menu to show Document as AI-only:

```typescript
const blockCategories = [
  {
    name: 'Content',
    blocks: [
      { type: 'heading', label: 'Heading', canAddManually: true },
      { type: 'paragraph', label: 'Paragraph', canAddManually: true },
      { type: 'alert', label: 'Alert', canAddManually: true },
      { type: 'video', label: 'Video', canAddManually: true },
    ],
  },
  {
    name: 'Interactive',
    blocks: [
      { type: 'form_field', label: 'Form Field', canAddManually: true },
      { type: 'file_upload', label: 'File Upload', canAddManually: true, 
        helpText: 'Simple upload without data extraction' },
      { type: 'checklist', label: 'Checklist', canAddManually: true },
      { type: 'signature_pad', label: 'Signature', canAddManually: true },
    ],
  },
  {
    name: 'Documents',
    blocks: [
      { 
        type: 'document', 
        label: 'Document Upload', 
        canAddManually: false,  // RESTRICTED
        aiRequired: true,
        helpText: 'Upload with automatic field extraction',
        restrictedMessage: 'Document blocks are created using AI mode to ensure extraction is configured correctly.',
      },
    ],
  },
];
```

**Restricted action UI:**
```
┌─────────────────────────────────────────────────────────────┐
│  📄 Document Upload                              ✨ AI      │
│                                                             │
│  Upload with automatic field extraction                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ℹ️ Document blocks are created using AI mode to     │   │
│  │    ensure extraction is configured correctly.        │   │
│  │                                                      │   │
│  │    [Switch to AI Mode]                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.5 Edit Mode Permissions

**File:** `src/components/features/admin/credential-builder/BlockEditor.tsx`

```typescript
interface BlockPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canReorder: boolean;
  editableFields: string[];
  restrictedFields: string[];
  restrictedMessage?: string;
}

function getBlockPermissions(block: ContentBlock, mode: 'ai' | 'edit'): BlockPermissions {
  if (mode === 'ai') {
    return { canEdit: true, canDelete: true, canReorder: true, editableFields: ['*'], restrictedFields: [] };
  }
  
  // Edit mode permissions
  switch (block.type) {
    case 'document':
      return {
        canEdit: true,
        canDelete: true,
        canReorder: true,
        editableFields: [
          'uploadLabel',
          'uploadDescription', 
          'required',
          'extractionFields.*.label',
          'extractionFields.*.required',
        ],
        restrictedFields: [
          'extractionFields.add',      // Cannot add new fields
          'extractionFields.*.extractionHints',  // Cannot edit hints
          'extractionContext',
        ],
        restrictedMessage: 'Use AI mode to add or configure extraction fields',
      };
      
    case 'file_upload':
    case 'form_field':
    case 'heading':
    case 'paragraph':
    case 'checklist':
    case 'signature_pad':
    default:
      return {
        canEdit: true,
        canDelete: true,
        canReorder: true,
        editableFields: ['*'],
        restrictedFields: [],
      };
  }
}
```

### 1.6 FileUpload Block Help Text

Update FileUpload block in Add menu:

```
┌─────────────────────────────────────────────────────────────┐
│  📎 File Upload                                             │
│                                                             │
│  Simple file upload without data extraction.                │
│  Use for photos, supporting documents, or files where       │
│  you don't need to extract specific information.            │
│                                                             │
│  💡 Need to extract data like policy numbers or dates?      │
│     Use "Document Upload" in AI mode instead.               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 2: AI Builder Support

### 2.1 Document Block Generation

**File:** `supabase/functions/generate-credential-instructions/index.ts`

Update the AI to generate Document blocks for document-based credentials:

```typescript
// Add to system prompt:

const documentBlockInstructions = `
When the user needs to collect a document with specific data fields, use the "document" block type.

Document blocks include:
- uploadLabel: What to ask the user to upload
- extractionFields: Fields to extract from the document

KNOWN DOCUMENT TYPES (auto-configure fields):
- Auto Insurance Card: policy_number, carrier, expiration_date
- Driver's License: license_number, state, expiration_date, class
- Vehicle Registration: plate_number, vin, expiration_date
- DOT Physical Card: certificate_number, examiner_name, expiration_date
- Drug Test Results: test_date, result, lab_name
- Training Certificate: certificate_number, completion_date, expiration_date

UNKNOWN DOCUMENT TYPES:
If you don't recognize the document type, ASK the user what fields they need to extract.
Do not guess. Say something like:
"I'll add a [document name] upload. What information do you need to extract from this document?"

Then offer common field suggestions:
- Document/Certificate Number
- Issue Date
- Expiration Date
- Issuing Authority
- Name fields

Example output for known type:
{
  "type": "document",
  "content": {
    "uploadLabel": "Upload your insurance card",
    "uploadDescription": "Front of your auto insurance card showing policy number",
    "acceptedTypes": ["image/*", "application/pdf"],
    "maxSizeMB": 10,
    "required": true,
    "extractionFields": [
      { "id": "f1", "key": "policy_number", "label": "Policy Number", "type": "text", "required": true, "source": "ai_generated" },
      { "id": "f2", "key": "carrier", "label": "Insurance Carrier", "type": "text", "required": false, "source": "ai_generated" },
      { "id": "f3", "key": "expiration_date", "label": "Expiration Date", "type": "date", "required": true, "source": "ai_generated" }
    ]
  }
}
`;
```

### 2.2 Handling Unknown Documents

When AI doesn't recognize a document type, it should ask:

```
User: "Add a TNC permit upload"

AI Response (conversational):
{
  "type": "clarification_needed",
  "message": "I'll add a TNC Permit document upload. I'm not familiar with the specific fields on this type of permit.\n\nWhat information do you need to extract? Common permit fields include:",
  "suggestions": [
    { "key": "permit_number", "label": "Permit Number", "type": "text" },
    { "key": "expiration_date", "label": "Expiration Date", "type": "date" },
    { "key": "issue_date", "label": "Issue Date", "type": "date" },
    { "key": "issuing_authority", "label": "Issuing Authority", "type": "text" },
    { "key": "driver_name", "label": "Driver Name", "type": "text" }
  ],
  "allowCustomFields": true
}
```

**UI for field selection:**
```
┌─────────────────────────────────────────────────────────────┐
│  AI: I'll add a TNC Permit document upload. What fields     │
│      do you need to extract?                                │
│                                                             │
│  ☑ Permit Number                                            │
│  ☑ Expiration Date                                          │
│  ☐ Issue Date                                               │
│  ☐ Issuing Authority                                        │
│  ☐ Driver Name                                              │
│                                                             │
│  [+ Add custom field]                                       │
│                                                             │
│  [Create Document Block]                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Adding Fields to Existing Document Block

When user is in AI mode and wants to modify a Document block:

```
User: "Add a VIN field to the insurance card"

AI: "I've added a VIN field to the Insurance Card document. 
     This will be extracted from the uploaded insurance card."

// Updates the existing document block's extractionFields
```

```
User: "Remove the carrier field"

AI: "I've removed the Insurance Carrier field from extraction."
```

---

## Phase 3: Extraction Engine

### 3.1 Edge Function

**File:** `supabase/functions/extract-document-data/index.ts`

```typescript
interface ExtractionRequest {
  documentUrl: string;
  
  // Semantic context (from Document block + credential)
  credentialName: string;
  uploadLabel: string;
  extractionContext?: string;
  
  // Fields to extract
  fields: {
    key: string;
    label: string;
    type: string;
    extractionHints?: string[];
  }[];
  
  // Validation
  expectedVin?: string;  // For vehicle credentials
}

interface ExtractionResponse {
  success: boolean;
  
  // Extracted values
  fields: {
    [key: string]: {
      value: string | null;
      confidence: number;  // 0-100
    };
  };
  
  // Document analysis
  documentAnalysis: {
    detectedType: string | null;
    typeConfidence: number;
    matchesExpected: boolean;
    
    expiration: {
      detected: string | null;  // ISO date
      isExpired: boolean;
    };
    
    quality: {
      clarity: 'clear' | 'slightly_blurry' | 'blurry' | 'unreadable';
      clarityConfidence: number;
      issues: string[];  // ['cropped', 'glare', 'low_resolution']
    };
    
    vinFound?: boolean;
  };
  
  // For AI-002 admin review
  reviewScore: {
    score: number;
    recommendation: 'likely_approve' | 'needs_review' | 'likely_reject';
    factors: {
      documentClarity: number;
      dataConfidence: number;
      validationsPassed: number;
    };
  };
  
  detectedIssues: {
    code: string;
    severity: 'error' | 'warning';
    message: string;
    suggestedAction: string;
  }[];
}
```

### 3.2 Semantic Extraction Prompt

```typescript
const buildExtractionPrompt = (request: ExtractionRequest) => `
You are analyzing a document for a credential called "${request.credentialName}".
The user was asked to upload: "${request.uploadLabel}"
${request.extractionContext ? `Additional context: ${request.extractionContext}` : ''}

EXTRACT THESE FIELDS:
${request.fields.map(f => {
  const hints = f.extractionHints?.length ? ` (look for: ${f.extractionHints.join(', ')})` : '';
  return `- ${f.label}${hints}`;
}).join('\n')}

ALSO ANALYZE:
1. Document type: Does this appear to be what was requested ("${request.uploadLabel}")?
2. Expiration: Is there an expiration date? Is it in the past?
3. Quality: Rate clarity (clear/slightly_blurry/blurry/unreadable), note any issues
${request.expectedVin ? `4. VIN check: Does this document show VIN "${request.expectedVin}"?` : ''}

RULES:
- Return confidence 0-100 for each field
- If you can't find a field clearly, return null with low confidence
- NEVER extract: SSN, EIN, Tax ID, bank account numbers, routing numbers
- Use ISO format for dates (YYYY-MM-DD)

Respond with JSON only.
`;
```

### 3.3 Extraction Flow Hook

**File:** `src/hooks/useDocumentExtraction.ts`

```typescript
interface UseDocumentExtractionOptions {
  credentialName: string;
  documentBlock: DocumentBlockContent;
  vehicleVin?: string;
  onExtractionComplete: (result: ExtractionResult) => void;
  onExtractionError: (error: Error) => void;
}

interface UseDocumentExtractionReturn {
  extract: (fileUrl: string) => Promise<void>;
  isExtracting: boolean;
  result: ExtractionResult | null;
  error: Error | null;
}

export function useDocumentExtraction(options: UseDocumentExtractionOptions): UseDocumentExtractionReturn {
  // Calls edge function
  // Handles loading state
  // Returns extracted data
}
```

---

## Phase 4: Admin Review

### 4.1 Extraction Results Display

In credential review, Document blocks show extraction results:

```
┌─────────────────────────────────────────────────────────────┐
│  📄 Insurance Card                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Document Preview Thumbnail]     insurance_card.jpg        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Submitted Values                                           │
│                                                             │
│  Policy Number: ABC123456                                   │
│  Insurance Carrier: State Farm                              │
│  Expiration Date: 03/15/2026                                │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  AI Extraction                           [92% confidence]   │
│                                          └─ Click for details
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Confidence Badge + Modal

Clicking the confidence badge opens a modal:

```
┌─────────────────────────────────────────────────────────────┐
│  AI Extraction Details                               [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Overall Confidence: 92%              ✓ Likely Approve      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Field Extraction                                           │
│                                                             │
│  Policy Number                                              │
│  Extracted: "ABC123456"                          94%        │
│  Submitted: "ABC123456"                          ✓ Match    │
│                                                             │
│  Insurance Carrier                                          │
│  Extracted: "State Farm"                         98%        │
│  Submitted: "State Farm"                         ✓ Match    │
│                                                             │
│  Expiration Date                                            │
│  Extracted: "2026-03-15"                         91%        │
│  Submitted: "2026-03-15"                         ✓ Match    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Document Analysis                                          │
│                                                             │
│  ✓ Document type matches expected (Insurance Card)          │
│  ✓ Document is not expired                                  │
│  ✓ Image quality: Clear                                     │
│  ✓ No warnings overridden                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Review Score Breakdown                                     │
│                                                             │
│  Document Clarity:    100/100                               │
│  Data Confidence:      94/100                               │
│  Validations Passed:  100/100                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Warning Display

If driver overrode warnings, show prominently:

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Driver Overrides                                        │
│                                                             │
│  The driver overrode the following warnings:                │
│                                                             │
│  • Document appears expired (detected: 01/15/2024)          │
│    Driver clicked "Continue Anyway"                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model: Credential Storage

### Extraction Metadata

**Stored on:** `driver_credentials` and `vehicle_credentials` tables

```typescript
interface CredentialExtractionMetadata {
  // Per-block extraction results
  blocks: {
    [blockId: string]: {
      // Whether extraction was attempted
      attempted: boolean;
      extractedAt: string;
      
      // Field extraction results
      fields: {
        [fieldKey: string]: {
          extractedValue: string | null;
          confidence: number;
          usedValue: string;  // What driver actually submitted
          wasEdited: boolean;
        };
      };
      
      // Document analysis
      documentAnalysis: {
        detectedType: string | null;
        typeConfidence: number;
        matchesExpected: boolean;
        expiration: { detected: string | null; isExpired: boolean };
        quality: { clarity: string; issues: string[] };
        vinFound?: boolean;
      };
      
      // Review scoring (for AI-002)
      reviewScore: {
        score: number;
        recommendation: string;
        factors: Record<string, number>;
      };
      
      // Issues and overrides
      detectedIssues: Array<{ code: string; severity: string; message: string }>;
      overriddenWarnings: string[];
    };
  };
}

// Column: extraction_metadata JSONB
```

### Database Migration

**File:** `supabase/migrations/030_document_extraction.sql`

```sql
-- Add extraction metadata column
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;

ALTER TABLE vehicle_credentials 
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;

-- Add queryable columns for AI-002 queue filtering
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
ADD COLUMN IF NOT EXISTS ai_review_score INTEGER;

ALTER TABLE vehicle_credentials 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT,
ADD COLUMN IF NOT EXISTS ai_review_score INTEGER;

-- Trigger to sync recommendation from JSONB
CREATE OR REPLACE FUNCTION sync_ai_recommendation()
RETURNS TRIGGER AS $$
DECLARE
  first_block_key TEXT;
  block_data JSONB;
BEGIN
  IF NEW.extraction_metadata IS NOT NULL AND 
     NEW.extraction_metadata->'blocks' IS NOT NULL THEN
    -- Get first block's review score
    SELECT key, value INTO first_block_key, block_data
    FROM jsonb_each(NEW.extraction_metadata->'blocks')
    LIMIT 1;
    
    IF block_data IS NOT NULL THEN
      NEW.ai_recommendation := block_data->'reviewScore'->>'recommendation';
      NEW.ai_review_score := (block_data->'reviewScore'->>'score')::INTEGER;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER driver_credentials_ai_sync
BEFORE INSERT OR UPDATE OF extraction_metadata ON driver_credentials
FOR EACH ROW EXECUTE FUNCTION sync_ai_recommendation();

CREATE TRIGGER vehicle_credentials_ai_sync
BEFORE INSERT OR UPDATE OF extraction_metadata ON vehicle_credentials
FOR EACH ROW EXECUTE FUNCTION sync_ai_recommendation();

-- Indexes for queue filtering
CREATE INDEX idx_driver_cred_ai_rec ON driver_credentials (ai_recommendation) 
WHERE status = 'pending_review';

CREATE INDEX idx_vehicle_cred_ai_rec ON vehicle_credentials (ai_recommendation) 
WHERE status = 'pending_review';
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/types/documentBlock.ts` | Document block type definitions |
| `src/components/features/admin/credential-builder/blocks/DocumentBlockEditor.tsx` | Builder editor for Document blocks |
| `src/components/features/credentials/blocks/DocumentBlock.tsx` | Driver renderer for Document blocks |
| `src/components/features/credentials/DocumentExtractionFlow.tsx` | Extraction animation + review flow |
| `src/components/features/credentials/ExtractionWarningModal.tsx` | Warning modals (expired, wrong type, etc.) |
| `src/components/features/credentials/ExtractionDetailsModal.tsx` | Admin modal showing extraction details |
| `src/hooks/useDocumentExtraction.ts` | Hook for extraction API |
| `supabase/functions/extract-document-data/index.ts` | Extraction edge function |
| `supabase/migrations/030_document_extraction.sql` | Database migration |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/instructionBuilder.ts` | Add 'document' block type |
| `src/components/features/admin/credential-builder/AddBlockMenu.tsx` | Document block guardrail |
| `src/components/features/admin/credential-builder/BlockEditor.tsx` | Edit mode permissions |
| `src/components/features/credentials/InstructionRenderer/index.tsx` | Render Document blocks |
| `supabase/functions/generate-credential-instructions/index.ts` | Generate Document blocks |

---

## Implementation Order

### Phase 1: Document Block Foundation (Week 1)
1. Define `DocumentBlockContent` type
2. Create `DocumentBlockEditor` for builder
3. Create `DocumentBlock` renderer for drivers (no extraction yet)
4. Add edit mode permissions and guardrails
5. Update AddBlockMenu with guardrails

### Phase 2: AI Builder Integration (Week 2)
1. Update `generate-credential-instructions` to produce Document blocks
2. Add known document type handling
3. Add unknown document clarification flow
4. Test Document block generation end-to-end

### Phase 3: Extraction Engine (Week 3)
1. Create `extract-document-data` edge function
2. Create `useDocumentExtraction` hook
3. Build extraction animation component
4. Build extraction review flow
5. Build validation warning modals
6. Database migration for `extraction_metadata`

### Phase 4: Admin Review (Week 4)
1. Display extraction data on Document blocks in review
2. Confidence badge component
3. Extraction details modal
4. Override warning display

### Phase 5: Polish & Edge Cases (Week 5)
1. Error handling and retry logic
2. Offline/failure graceful degradation
3. Performance optimization
4. Comprehensive testing

---

## Acceptance Criteria

### Document Block (Phase 1)
- [ ] Document block type defined with extraction fields
- [ ] Builder shows Document block editor
- [ ] Edit mode: can edit labels, required, delete fields
- [ ] Edit mode: cannot add new extraction fields (shows guardrail)
- [ ] Edit mode: cannot create Document block (shows guardrail)
- [ ] FileUpload block has help text distinguishing from Document
- [ ] Driver sees Document block with upload + fields

### AI Builder (Phase 2)
- [ ] AI generates Document blocks for document-based credentials
- [ ] Known documents auto-populate fields
- [ ] Unknown documents prompt for field specification
- [ ] AI can add/remove fields from existing Document blocks

### Extraction (Phase 3)
- [ ] Extraction triggers after upload
- [ ] Animation shows during extraction (2-5 sec)
- [ ] Fields pre-fill with extracted values
- [ ] Low confidence fields (<70%) left blank
- [ ] Validation warnings for expired/wrong type/VIN mismatch
- [ ] Override tracking for warnings
- [ ] Sensitive data never extracted

### Admin Review (Phase 4)
- [ ] Document blocks in review show extraction badge
- [ ] Badge shows confidence percentage
- [ ] Clicking badge opens details modal
- [ ] Modal shows per-field extraction + confidence
- [ ] Modal shows document analysis
- [ ] Override warnings prominently displayed

---

## Future: AI-002 Integration

This system is designed to support AI-002 (AI-Assisted Credential Review):

- `ai_recommendation` column enables queue filtering by recommendation
- `ai_review_score` column enables sorting by confidence
- `reviewScore` in extraction metadata provides breakdown for admin
- `detectedIssues` array enables AI-generated rejection reasons

See "Future: AI-Assisted Credential Review" section in this document for full AI-002 architecture.

---

## Test Scenarios

### Scenario 1: Known Document - Insurance Card
1. Admin uses AI: "Create auto insurance credential"
2. AI generates Document block with Policy #, Carrier, Expiration
3. Driver uploads clear insurance card
4. Extraction fills all three fields
5. Driver confirms, submits
6. Admin sees 90%+ confidence badge

### Scenario 2: Unknown Document - TNC Permit
1. Admin uses AI: "Add TNC permit upload"
2. AI asks: "What fields do you need?"
3. Admin selects: Permit Number, Expiration
4. Document block created with selected fields
5. Driver uploads permit, extraction works

### Scenario 3: Edit Mode Guardrails
1. Admin in Edit mode clicks "Add Block"
2. Document Upload shows "Requires AI" badge
3. Admin clicks it, sees guardrail message
4. Admin clicks "Switch to AI Mode"
5. Successfully adds Document block via AI

### Scenario 4: Expired Document Warning
1. Driver uploads expired insurance card
2. Warning: "This document appears to be expired"
3. Driver clicks "Continue Anyway"
4. Submission proceeds
5. Admin sees "Driver overrode expiration warning"

### Scenario 5: Extraction Failure
1. Driver uploads unreadable document
2. Extraction fails
3. Message: "We couldn't read this document"
4. Options: "Try Different Photo" or "Enter Manually"
5. Driver enters fields manually, no extraction metadata

---

## Notes

- Token costs acceptable - flagship feature
- OpenAI GPT-4o Vision recommended for accuracy
- Start with insurance, license, registration - most common
- Semantic extraction means no rigid document type system
- Edit mode guardrails prevent complexity without blocking
- Document blocks bundle upload + fields = clear mental model
