# AI-001 Phase 2: AI Builder Integration - Implementation Plan

> **For AI Implementation**: Read the full context document first:
> `docs/AI-001-document-extraction-system.prompt.md`

---

## Overview

Enable the AI builder to generate Document blocks (with extraction fields) when users request document-based credentials. The AI should intelligently decide between Document blocks and FileUpload blocks, and handle unknown document types through a conversational clarification flow.

**Goals:**
- AI generates Document blocks for document-based credentials
- AI asks clarifying questions for unknown document types
- AI can modify existing Document blocks (add/remove/update fields)
- Seamless UX with inline buttons and field selection

**Prerequisites:**
- Phase 1 complete (Document block type, editor, renderer)

---

## UX Specifications

### Known Document Types

The AI automatically configures these document types with standard fields:

| Document Type | Trigger Phrases | Default Fields |
|---------------|-----------------|----------------|
| Auto Insurance Card | "insurance", "insurance card", "proof of insurance" | Policy Number*, Carrier, Expiration Date* |
| Driver's License | "license", "driver's license", "DL" | License Number*, State, Expiration Date*, Class |
| Vehicle Registration | "registration", "vehicle registration" | Plate Number*, VIN, Expiration Date* |
| DOT Physical | "DOT physical", "medical card", "DOT medical" | Certificate Number*, Examiner Name, Expiration Date* |
| Drug Test | "drug test", "drug screen" | Test Date*, Result*, Lab Name |
| Training Certificate | "training certificate", "completion certificate" | Certificate Number, Completion Date*, Expiration Date |

*Required fields

---

### Unknown Document Flow

#### Step 1: Extract vs Upload Choice

When AI encounters an unknown document type:

```
AI: "I'll add a TNC Permit. Does this document have data you want 
     to automatically capture?

     ┌─────────────────────────────────────────────────────────────┐
     │  A - Yes, extract specific fields                          │
     │      I'll read the document and pull out data like permit  │
     │      numbers, dates, etc.                                  │
     ├─────────────────────────────────────────────────────────────┤
     │  B - No, just upload the file                              │
     │      Simple file collection without data extraction        │
     └─────────────────────────────────────────────────────────────┘"
```

**UI Component:** `ExtractOrUploadChoice`
- Two stacked buttons (A and B)
- Each button has title + description
- Clicking sends choice to AI

#### Step 2: Field Selection (if Extract chosen)

```
AI: "What information should I extract from the TNC Permit?

     ┌─────────────────────────────────────────────────────────────┐
     │  ☑ Permit Number                                           │
     │  ☑ Expiration Date                                         │
     │  ☐ Issue Date                                              │
     │  ☐ Issuing Authority                                       │
     │  ☐ Driver Name                                             │
     │  ☐ Other: [                                    ]           │
     │           Type any additional fields you need              │
     │                                                            │
     │                                        [Confirm]           │
     └─────────────────────────────────────────────────────────────┘"
```

**UI Component:** `FieldSelectionForm`
- Checkboxes for suggested fields
- "Other" inline text input (free-form, AI parses)
- [Confirm] button

**AI Parsing for "Other" field:**
- Accepts any format (commas, "and", natural language)
- AI extracts clean field names
- Examples:
  - "Vehicle VIN, Company Name" → Vehicle VIN, Company Name
  - "vin and company" → VIN, Company
  - "the driver's vehicle identification number" → Vehicle VIN

#### Step 3: Confirmation

```
AI: "Got it! I've configured the TNC Permit document:
     
     📄 TNC Permit
        • Permit Number (required)
        • Expiration Date (required)
        • Issuing Authority
        • Vehicle VIN
     
     Ready to create, or would you like any changes?"
```

---

### Multiple Documents Flow

When user requests multiple documents at once:

```
User: "I need insurance, license, and TNC permit"

AI: "I'll create these document uploads:

     📄 Insurance Card ✓
        Policy Number, Carrier, Expiration Date
        
     📄 Driver's License ✓  
        License Number, State, Expiration Date, Class
        
     📄 TNC Permit - Does this document have data you want to 
        automatically capture?
        
        ┌───────────────────────────────────────────────────────┐
        │  A - Yes, extract specific fields                     │
        │      I'll read the document and pull out data...      │
        ├───────────────────────────────────────────────────────┤
        │  B - No, just upload the file                         │
        │      Simple file collection without extraction        │
        └───────────────────────────────────────────────────────┘"
```

- Known documents shown with checkmark and fields
- Unknown documents show inline choice
- After all clarifications, single [Confirm] or generate action

---

### Modifying Document Blocks

AI can modify Document blocks in the same conversation:

```
User: "Add a VIN field to the insurance card"
AI: "Done. I've added VIN to the Insurance Card document."

User: "Remove the carrier field"
AI: "Removed. The Insurance Card now extracts: Policy Number, VIN, 
     Expiration Date."

User: "Make VIN required"
AI: "Updated. VIN is now a required field."

User: "Actually, change the insurance to just a simple upload"
AI: "Got it. I've converted Insurance Card to a simple file upload 
     without extraction."
```

---

### Generate Button States

| State | Button Text | Condition |
|-------|-------------|-----------|
| Initial | **Create Credential** | No pending changes |
| Changes pending | **Update Credential** | AI has collected changes to apply |
| After apply | **Create Credential** | Changes applied, preview updated |

**Logic:**
- Track `hasPendingChanges` state in AI builder
- Set `true` when AI confirms field selections or modifications
- Set `false` after Generate/Update is clicked and preview updates

---

## Technical Implementation

### AI Response Types

The AI can return different response types that the frontend handles:

```typescript
// Response from generate-credential-instructions

interface AIResponse {
  // Standard text response
  type: 'message';
  content: string;
  
  // Optional: Interactive component to render
  component?: AIComponent;
  
  // Optional: Credential config updates (partial or full)
  configUpdates?: Partial<CredentialTypeInstructions>;
  
  // Whether this response has pending changes to apply
  hasPendingChanges?: boolean;
}

type AIComponent = 
  | ExtractOrUploadChoice
  | FieldSelectionForm;

interface ExtractOrUploadChoice {
  type: 'extract_or_upload';
  documentName: string;
  // When user selects, send back: { choice: 'extract' | 'upload' }
}

interface FieldSelectionForm {
  type: 'field_selection';
  documentName: string;
  suggestedFields: {
    key: string;
    label: string;
    defaultChecked: boolean;
  }[];
  // When user confirms, send back: { selectedFields: string[], otherFields: string }
}
```

### Known Document Types Configuration

```typescript
// In generate-credential-instructions edge function

const KNOWN_DOCUMENT_TYPES: Record<string, {
  triggers: string[];
  uploadLabel: string;
  fields: { key: string; label: string; type: string; required: boolean }[];
}> = {
  auto_insurance: {
    triggers: ['insurance', 'insurance card', 'proof of insurance', 'auto insurance'],
    uploadLabel: 'Insurance Card',
    fields: [
      { key: 'policy_number', label: 'Policy Number', type: 'text', required: true },
      { key: 'carrier', label: 'Insurance Carrier', type: 'text', required: false },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: true },
    ],
  },
  drivers_license: {
    triggers: ['license', "driver's license", 'drivers license', 'dl'],
    uploadLabel: "Driver's License",
    fields: [
      { key: 'license_number', label: 'License Number', type: 'text', required: true },
      { key: 'state', label: 'State', type: 'text', required: false },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: true },
      { key: 'class', label: 'License Class', type: 'text', required: false },
    ],
  },
  vehicle_registration: {
    triggers: ['registration', 'vehicle registration'],
    uploadLabel: 'Vehicle Registration',
    fields: [
      { key: 'plate_number', label: 'Plate Number', type: 'text', required: true },
      { key: 'vin', label: 'VIN', type: 'text', required: false },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: true },
    ],
  },
  dot_physical: {
    triggers: ['dot physical', 'medical card', 'dot medical', 'medical certificate'],
    uploadLabel: 'DOT Physical Card',
    fields: [
      { key: 'certificate_number', label: 'Certificate Number', type: 'text', required: true },
      { key: 'examiner_name', label: 'Examiner Name', type: 'text', required: false },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: true },
    ],
  },
  drug_test: {
    triggers: ['drug test', 'drug screen', 'drug screening'],
    uploadLabel: 'Drug Test Results',
    fields: [
      { key: 'test_date', label: 'Test Date', type: 'date', required: true },
      { key: 'result', label: 'Result', type: 'text', required: true },
      { key: 'lab_name', label: 'Lab Name', type: 'text', required: false },
    ],
  },
  training_certificate: {
    triggers: ['training certificate', 'completion certificate', 'certificate of completion'],
    uploadLabel: 'Training Certificate',
    fields: [
      { key: 'certificate_number', label: 'Certificate Number', type: 'text', required: false },
      { key: 'completion_date', label: 'Completion Date', type: 'date', required: true },
      { key: 'expiration_date', label: 'Expiration Date', type: 'date', required: false },
    ],
  },
};
```

### AI System Prompt Updates

Add to the system prompt for credential generation:

```typescript
const DOCUMENT_BLOCK_INSTRUCTIONS = `
## Document Blocks vs File Upload Blocks

When users request document uploads, decide between:

1. **Document Block** - Use when user wants to EXTRACT DATA from the document
   - Insurance cards, licenses, registrations, permits, certificates
   - Any document where specific fields need to be captured
   - Generates a block with type: "document" and extractionFields

2. **File Upload Block** - Use for simple file collection
   - Photos (vehicle photos, profile pictures)
   - Supporting documents with no specific data to extract
   - "Proof of" documents where just having the file matters
   - Generates a block with type: "file_upload"

## Known Document Types

For these documents, automatically configure extraction fields:
${Object.entries(KNOWN_DOCUMENT_TYPES).map(([key, doc]) => 
  `- ${doc.uploadLabel}: ${doc.fields.map(f => f.label + (f.required ? '*' : '')).join(', ')}`
).join('\n')}

## Unknown Document Types

If you don't recognize the document type, ask the user:
1. First ask: Extract data or simple upload? (return component: extract_or_upload)
2. If extract: Ask what fields to extract (return component: field_selection)

## Modifying Document Blocks

You can modify Document blocks:
- Add fields: Add to extractionFields array
- Remove fields: Remove from extractionFields array  
- Change required: Update the required property
- Convert to FileUpload: Replace document block with file_upload block

When making changes, update configUpdates with the modified block.
`;
```

### Frontend Components

#### ExtractOrUploadChoice Component

```typescript
// src/components/features/admin/credential-builder/ai/ExtractOrUploadChoice.tsx

interface ExtractOrUploadChoiceProps {
  documentName: string;
  onSelect: (choice: 'extract' | 'upload') => void;
}

export function ExtractOrUploadChoice({ documentName, onSelect }: ExtractOrUploadChoiceProps) {
  return (
    <div className="space-y-2 my-3">
      <button
        onClick={() => onSelect('extract')}
        className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="font-medium">A - Yes, extract specific fields</div>
        <div className="text-sm text-muted-foreground mt-1">
          I'll read the document and pull out data like permit numbers, dates, etc.
        </div>
      </button>
      
      <button
        onClick={() => onSelect('upload')}
        className="w-full text-left p-4 rounded-lg border hover:bg-muted/50 transition-colors"
      >
        <div className="font-medium">B - No, just upload the file</div>
        <div className="text-sm text-muted-foreground mt-1">
          Simple file collection without data extraction
        </div>
      </button>
    </div>
  );
}
```

#### FieldSelectionForm Component

```typescript
// src/components/features/admin/credential-builder/ai/FieldSelectionForm.tsx

interface FieldSelectionFormProps {
  documentName: string;
  suggestedFields: { key: string; label: string; defaultChecked: boolean }[];
  onConfirm: (selectedFields: string[], otherFields: string) => void;
}

export function FieldSelectionForm({ 
  documentName, 
  suggestedFields, 
  onConfirm 
}: FieldSelectionFormProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(suggestedFields.filter(f => f.defaultChecked).map(f => f.key))
  );
  const [otherText, setOtherText] = useState('');
  const [otherChecked, setOtherChecked] = useState(false);

  const handleToggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const handleOtherChange = (value: string) => {
    setOtherText(value);
    if (value.trim()) {
      setOtherChecked(true);
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected), otherText);
  };

  return (
    <div className="space-y-3 my-3 p-4 rounded-lg border bg-muted/30">
      <div className="space-y-2">
        {suggestedFields.map(field => (
          <label key={field.key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.has(field.key)}
              onCheckedChange={() => handleToggle(field.key)}
            />
            <span>{field.label}</span>
          </label>
        ))}
        
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={otherChecked || otherText.trim().length > 0}
            onCheckedChange={(checked) => setOtherChecked(!!checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <span>Other:</span>
            <Input
              value={otherText}
              onChange={(e) => handleOtherChange(e.target.value)}
              placeholder="Type any additional fields you need"
              className="mt-1"
            />
          </div>
        </label>
      </div>
      
      <Button onClick={handleConfirm} className="w-full">
        Confirm
      </Button>
    </div>
  );
}
```

---

## User Stories

### Story 1: Known Document Generation

**As an** admin using the AI builder  
**I want** to say "add insurance upload" and get a Document block with standard fields  
**So that** I don't have to manually configure extraction

#### Acceptance Criteria
- [ ] AI recognizes "insurance", "insurance card", "proof of insurance" as auto insurance
- [ ] AI generates Document block with Policy Number, Carrier, Expiration fields
- [ ] Policy Number and Expiration are marked required
- [ ] Response shows the configured document with field list
- [ ] Generate button shows "Update Credential" after AI responds

#### Test Scenarios
```
User: "Add an insurance card upload"
Expected: Document block with Policy Number*, Carrier, Expiration*

User: "Create credential for driver's license"
Expected: Document block with License Number*, State, Expiration*, Class

User: "I need them to upload their DOT physical"
Expected: Document block with Certificate Number*, Examiner Name, Expiration*
```

---

### Story 2: Unknown Document - Extract Choice

**As an** admin using the AI builder  
**I want** to be asked whether to extract data from an unknown document  
**So that** I can choose the right block type

#### Acceptance Criteria
- [ ] AI shows ExtractOrUploadChoice component for unknown documents
- [ ] Buttons are stacked vertically (A/B format)
- [ ] Option A leads to field selection
- [ ] Option B creates a FileUpload block
- [ ] Choice is sent back to AI for processing

#### Test Scenarios
```
User: "Add a TNC permit"
Expected: Shows A/B choice (extract vs upload)

User: clicks A
Expected: Shows field selection with suggested fields

User: clicks B  
Expected: AI confirms FileUpload block created
```

---

### Story 3: Unknown Document - Field Selection

**As an** admin selecting fields for an unknown document  
**I want** checkboxes with suggested fields and an "Other" text input  
**So that** I can easily configure what to extract

#### Acceptance Criteria
- [ ] FieldSelectionForm shows suggested fields as checkboxes
- [ ] Common fields pre-checked (Permit Number, Expiration Date)
- [ ] "Other" is inline with checkbox and text input
- [ ] Typing in "Other" auto-checks it
- [ ] [Confirm] button sends selections to AI
- [ ] AI parses "Other" text flexibly (commas, "and", natural language)

#### Test Scenarios
```
User: selects Permit Number, Expiration, types "VIN" in Other
Expected: AI creates Document block with Permit Number, Expiration, VIN

User: types "vehicle vin and company name" in Other
Expected: AI extracts "Vehicle VIN" and "Company Name" as fields
```

---

### Story 4: Multiple Documents

**As an** admin requesting multiple documents  
**I want** the AI to handle them all at once  
**So that** I can quickly set up complex credentials

#### Acceptance Criteria
- [ ] AI lists all requested documents
- [ ] Known documents show with checkmark and fields
- [ ] Unknown documents show inline ExtractOrUploadChoice
- [ ] After all clarifications, single action creates all blocks
- [ ] Preview shows all Document blocks after generate

#### Test Scenarios
```
User: "I need insurance, license, and TNC permit"
Expected: 
- Insurance ✓ (auto-configured)
- License ✓ (auto-configured)
- TNC Permit (shows A/B choice)
```

---

### Story 5: Modify Document Block

**As an** admin refining a Document block  
**I want** to tell the AI to add/remove/change fields  
**So that** I can customize the extraction

#### Acceptance Criteria
- [ ] AI can add fields: "Add VIN to insurance"
- [ ] AI can remove fields: "Remove carrier field"
- [ ] AI can change required: "Make VIN required"
- [ ] AI can convert to FileUpload: "Make it just an upload"
- [ ] AI confirms each change
- [ ] Button shows "Update Credential" after changes

#### Test Scenarios
```
User: "Add a VIN field to the insurance card"
Expected: AI confirms, VIN added to extractionFields

User: "Make policy number optional"
Expected: AI confirms, policy_number.required = false

User: "Actually make insurance just a simple upload"
Expected: AI converts document block to file_upload block
```

---

### Story 6: Generate Button State

**As an** admin using the AI builder  
**I want** the generate button to indicate when there are pending changes  
**So that** I know when to apply updates

#### Acceptance Criteria
- [ ] Initial state: "Create Credential"
- [ ] After AI confirms changes: "Update Credential"  
- [ ] After clicking Update: Button returns to "Create Credential"
- [ ] Preview updates when Update is clicked

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/features/admin/credential-builder/ai/ExtractOrUploadChoice.tsx` | A/B choice component |
| `src/components/features/admin/credential-builder/ai/FieldSelectionForm.tsx` | Field selection with checkboxes |
| `src/components/features/admin/credential-builder/ai/index.ts` | Export AI components |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-credential-instructions/index.ts` | Add Document block generation, known types, clarification handling |
| `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx` | Render AI components, handle hasPendingChanges state |
| `src/pages/admin/CredentialTypeEditor.tsx` | Pass hasPendingChanges to button, handle button text |

---

## Edge Function Changes

### Request/Response Updates

```typescript
// Extended request body
interface GenerateRequest {
  mode: 'generate' | 'chat' | 'refine_existing';
  messages: ChatMessage[];
  credentialName: string;
  existingConfig?: CredentialTypeInstructions;
  
  // NEW: User responses to AI components
  componentResponse?: {
    type: 'extract_or_upload';
    documentName: string;
    choice: 'extract' | 'upload';
  } | {
    type: 'field_selection';
    documentName: string;
    selectedFields: string[];
    otherFields: string;
  };
}

// Extended response
interface GenerateResponse {
  response: string;
  config?: CredentialTypeInstructions;
  
  // NEW: Component to render
  component?: {
    type: 'extract_or_upload';
    documentName: string;
  } | {
    type: 'field_selection';
    documentName: string;
    suggestedFields: { key: string; label: string; defaultChecked: boolean }[];
  };
  
  // NEW: Whether there are pending changes
  hasPendingChanges?: boolean;
}
```

### AI Prompt Flow

1. **User requests document** → AI checks known types
2. **Known type** → Generate Document block, return config
3. **Unknown type** → Return `component: extract_or_upload`
4. **User selects Extract** → Return `component: field_selection`
5. **User confirms fields** → Generate Document block, return config with `hasPendingChanges: true`

---

## Testing Checklist

### Known Documents
- [ ] "insurance" → Auto Insurance Document block
- [ ] "license" → Driver's License Document block
- [ ] "registration" → Vehicle Registration Document block
- [ ] "DOT physical" → DOT Physical Document block
- [ ] "drug test" → Drug Test Document block
- [ ] "training certificate" → Training Certificate Document block

### Unknown Documents
- [ ] Unknown document shows A/B choice
- [ ] Selecting A shows field selection
- [ ] Selecting B creates FileUpload block
- [ ] Field selection has pre-checked suggestions
- [ ] "Other" field accepts any format
- [ ] AI parses "Other" text correctly
- [ ] [Confirm] creates Document block with selected fields

### Multiple Documents
- [ ] Multiple documents handled in one message
- [ ] Known documents auto-configured
- [ ] Unknown documents get inline clarification
- [ ] All blocks created after clarifications complete

### Modifications
- [ ] Add field to Document block
- [ ] Remove field from Document block
- [ ] Change field required status
- [ ] Convert Document to FileUpload
- [ ] Convert FileUpload to Document (with field selection)

### Generate Button
- [ ] Shows "Create Credential" initially
- [ ] Shows "Update Credential" after AI confirms changes
- [ ] Returns to "Create Credential" after clicking
- [ ] Preview updates when button clicked

---

## Definition of Done

Phase 2 is complete when:

1. ✅ AI generates Document blocks for known document types
2. ✅ AI shows ExtractOrUploadChoice for unknown documents
3. ✅ AI shows FieldSelectionForm when user chooses Extract
4. ✅ AI parses "Other" field flexibly
5. ✅ AI handles multiple documents at once
6. ✅ AI can modify existing Document blocks
7. ✅ Generate button shows correct state (Create vs Update)
8. ✅ All acceptance criteria in each story are met
9. ✅ Testing checklist passes
10. ✅ No TypeScript or runtime errors

---

## Implementation Order

1. **Known document types config** - Add KNOWN_DOCUMENT_TYPES to edge function
2. **AI prompt updates** - Add DOCUMENT_BLOCK_INSTRUCTIONS to system prompt
3. **ExtractOrUploadChoice component** - Create and test
4. **FieldSelectionForm component** - Create and test
5. **Component response handling** - Handle componentResponse in edge function
6. **AIBuilderTwoPanel updates** - Render components, track hasPendingChanges
7. **Generate button state** - Implement Create/Update logic
8. **Modification support** - Add/remove/change field handling
9. **Multiple documents** - Handle multiple in one request
10. **End-to-end testing** - Full flow testing

---

## Context Reference

For full architecture and data models, read:
- `docs/AI-001-document-extraction-system.prompt.md`

Key sections:
- "Phase 2: AI Builder Support"
- "Document Block Data Model"
- "Known Document Types"
