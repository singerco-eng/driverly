# AI-001: Smart Document Processing

> **Copy this entire document when starting the implementation session.**

---

## Overview

Add AI-powered document extraction to credential submissions. When drivers upload documents (license, insurance, registration, certifications), AI extracts relevant data and pre-fills form fields, dramatically reducing manual entry and submission errors.

This is a **flagship AI feature** that impacts every credential submission. Prioritize UX clarity over token cost savings.

## Business Context

- Drivers currently upload documents then manually type information that's already on the document
- 30-40% of credential rejections are due to typos, wrong dates, or missing fields
- Admins manually verify document details against entered data
- Extraction reduces driver submission time from 5+ minutes to under 1 minute
- This positions FlowCred as a true "AI credentialing platform"

---

## Current vs New Behavior

### Current Flow (Manual Entry)

```
Driver uploads insurance card
    ↓
Driver manually types:
  - Policy Number: [____________]
  - Carrier: [____________]
  - Expiration: [____________]
    ↓
Driver submits
    ↓
Admin reviews: "Does the card actually say ABC123?"
    ↓
Reject if mismatch → Driver re-enters → Repeat
```

### New Flow (AI Extraction)

```
Driver uploads insurance card
    ↓
Animation: "Analyzing your document..." (2-5 sec)
    ↓
Review screen shows extracted data:
  ✓ Policy Number: ABC123456
  ✓ Carrier: State Farm
  ✓ Expiration: 03/15/2026
  [Edit any field if needed]
    ↓
Driver confirms → Submit
    ↓
Admin sees: "AI extracted: Exp 03/15/2026 (94%)"
    ↓
One-click approve
```

---

## Core Principles

### 1. Confidence Threshold
- **70%+ confidence**: Pre-fill the field
- **Below 70%**: Leave blank, driver enters manually
- **No confidence indicators** shown to drivers - either filled or not

### 2. Block with Override
When AI detects issues (expired doc, wrong type), show a **confident block with easy escape**:
```
┌─────────────────────────────────────────────────┐
│  ⚠️  This document appears to be expired        │
│                                                 │
│  We detected an expiration date of 01/15/2024  │
│                                                 │
│  [Upload Different Document]    ← Primary       │
│                                                 │
│  Is this wrong? [Continue Anyway →]  ← Escape  │
└─────────────────────────────────────────────────┘
```

### 3. Sensitive Data Protection
**NEVER extract**: SSN, Social Security Number, EIN, Tax ID, bank account numbers, routing numbers.

### 4. Label-Based Extraction
Form field labels drive extraction. If field is "Policy Number", AI looks for policy number on document. Admin can override with custom extraction hints for unusual fields.

---

## User Experience

### Driver Flow

#### Step 1: Upload Document

Standard file upload (no change to current UI).

```
┌─────────────────────────────────────────────────┐
│  Upload your Insurance Card                     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │     Click to upload or drag and drop    │   │
│  │     PNG, JPG, or PDF up to 10MB         │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Step 2: Extraction Animation

After upload completes, show extraction state:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│         ┌─────────────────────────┐             │
│         │  [Document thumbnail]   │             │
│         │                         │             │
│         └─────────────────────────┘             │
│                                                 │
│              ✨ Analyzing your document...      │
│              ━━━━━━━━━━━░░░░░░░░░░░             │
│                                                 │
│         Extracting policy information           │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Show document thumbnail
- Animated progress bar (indeterminate or timed)
- Friendly message about what's happening
- Cannot be skipped - driver waits for extraction

#### Step 3: Review Extracted Data

Show extracted fields for confirmation:

```
┌─────────────────────────────────────────────────┐
│  Review Your Information                        │
│                                                 │
│  We extracted the following from your document. │
│  Please verify and correct if needed.           │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Policy Number                          │   │
│  │  [ABC123456________________]  ✓ Filled  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Insurance Carrier                      │   │
│  │  [State Farm__________________]  ✓      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  Expiration Date                        │   │
│  │  [03/15/2026______________]  ✓          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│                        [Confirm & Continue →]   │
└─────────────────────────────────────────────────┘
```

- Pre-filled fields are editable
- Subtle checkmark indicates AI-filled (not confidence %)
- Fields AI couldn't extract are blank - driver fills manually
- "Confirm & Continue" proceeds to next step or submit

#### Step 4: Validation Warnings

**Expired Document:**
```
┌─────────────────────────────────────────────────┐
│  ⚠️  This document appears to be expired        │
│                                                 │
│  We detected an expiration date of:             │
│  January 15, 2024                               │
│                                                 │
│  Please upload a current document.              │
│                                                 │
│  [Upload Different Document]                    │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Is this incorrect? [Continue Anyway →]         │
└─────────────────────────────────────────────────┘
```

**Wrong Document Type:**
```
┌─────────────────────────────────────────────────┐
│  🔍  This doesn't look like an Insurance Card   │
│                                                 │
│  We're looking for your auto insurance card     │
│  showing policy number and coverage dates.      │
│                                                 │
│  [Upload Different Document]                    │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Is this incorrect? [Continue Anyway →]         │
└─────────────────────────────────────────────────┘
```

**VIN Not Found (Vehicle Credentials):**
```
┌─────────────────────────────────────────────────┐
│  ⚠️  Vehicle not found on insurance card        │
│                                                 │
│  We couldn't find VIN: 1HGBH41JXMN109186       │
│  on this insurance card.                        │
│                                                 │
│  Please verify this insurance covers your       │
│  vehicle, or upload a different card.           │
│                                                 │
│  [Upload Different Document]                    │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Vehicle is covered? [Continue Anyway →]        │
└─────────────────────────────────────────────────┘
```

If driver clicks "Continue Anyway", we record this for admin review.

#### Extraction Failure

If extraction fails completely:

```
┌─────────────────────────────────────────────────┐
│  📄  We couldn't read this document             │
│                                                 │
│  Please enter the information manually below,   │
│  or try uploading a clearer photo.              │
│                                                 │
│  [Try Different Photo]   [Enter Manually →]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

"Enter Manually" shows blank form fields for driver to fill.

---

### Admin Review Experience

#### Review Panel Enhancement

Add extraction metadata to admin review:

```
┌─────────────────────────────────────────────────┐
│  Insurance Card                    Pending 📋   │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Document Preview]                             │
│                                                 │
│  ─────────────────────────────────────────────  │
│  Submitted Values                               │
│                                                 │
│  Policy Number: ABC123456                       │
│    └─ AI extracted (94% confidence)             │
│                                                 │
│  Carrier: State Farm                            │
│    └─ AI extracted (98% confidence)             │
│                                                 │
│  Expiration: 03/15/2026                         │
│    └─ AI extracted (91% confidence)             │
│                                                 │
│  ─────────────────────────────────────────────  │
│  ⚠️ Driver overrode warning: "VIN not found"   │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Expiration Date: [03/15/2026    📅]            │
│                                                 │
│  [Reject]                          [Approve ✓]  │
└─────────────────────────────────────────────────┘
```

- Show confidence % for each AI-extracted field
- Flag if driver overrode any warnings
- Pre-fill expiration date from extraction
- Help admin trust the data and approve faster

---

## Admin Configuration

### Credential Type Settings

Add extraction settings to credential type editor:

```
┌─────────────────────────────────────────────────┐
│  AI Document Extraction                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  ☑ Enable AI extraction for this credential    │
│                                                 │
│  Document Type Hint (improves accuracy):        │
│  [ Insurance Card              ▼]               │
│    • Auto Insurance Card                        │
│    • Driver's License                           │
│    • Vehicle Registration                       │
│    • DOT Physical Card                          │
│    • Drug Test Results                          │
│    • Training Certificate                       │
│    • Other / Custom                             │
│                                                 │
│  Validate VIN on document: ☑                    │
│  (For vehicle credentials - checks if vehicle   │
│   VIN appears on uploaded document)             │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Form Field Extraction Settings

Each form field can configure extraction:

```
┌─────────────────────────────────────────────────┐
│  Form Field: Policy Number                      │
├─────────────────────────────────────────────────┤
│                                                 │
│  Field Label: [Policy Number        ]           │
│  Field Type:  [Text                ▼]           │
│  Required:    ☑                                 │
│                                                 │
│  ─────────────────────────────────────────────  │
│  AI Extraction                                  │
│                                                 │
│  ☑ Extract from uploaded document               │
│                                                 │
│  Look for: [policy number, member ID, poli ]    │
│            (auto-filled, editable)              │
│                                                 │
│  ℹ️ AI will search the document for these       │
│     terms and fill this field automatically.    │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Default**: "Look for" pre-filled from field label
- **Editable**: Admin can add synonyms or clarify for unusual fields
- **Example**: Field "Coverage ID" might need hints "policy number, member ID"

---

## Data Model Changes

### New: Extraction Result Storage

Store extraction metadata with credential submission. This schema is designed to support both AI-001 (driver extraction) and future AI-002 (admin review assistance).

```typescript
// Add to driver_credentials / vehicle_credentials

interface ExtractionMetadata {
  // === CORE EXTRACTION (AI-001) ===
  
  // Whether extraction was attempted
  attempted: boolean;
  
  // Timestamp of extraction
  extractedAt: string;
  
  // Per-field extraction results
  fields: {
    [fieldKey: string]: {
      extractedValue: string | null;
      confidence: number;  // 0-100
      used: boolean;       // Did driver accept this value?
      finalValue: string;  // What was actually submitted
    };
  };
  
  // Validation results
  validations: {
    documentType: {
      expected: string | null;
      detected: string | null;
      confidence: number;
      passed: boolean;
      overridden: boolean;
    };
    expiration: {
      detected: string | null;
      isExpired: boolean;
      overridden: boolean;
    };
    vinMatch?: {
      expectedVin: string;
      foundOnDocument: boolean;
      overridden: boolean;
    };
  };
  
  // === DOCUMENT QUALITY (Supports AI-002) ===
  
  documentQuality: {
    clarity: 'clear' | 'slightly_blurry' | 'blurry' | 'unreadable';
    clarityConfidence: number;  // 0-100
    isComplete: boolean;        // All expected regions visible
    issuesDetected: string[];   // ['cropped', 'glare', 'low_resolution', 'rotated']
  };
  
  // === REVIEW SCORE (Supports AI-002) ===
  
  reviewScore: {
    score: number;  // 0-100, overall confidence for admin review
    recommendation: 'likely_approve' | 'needs_review' | 'likely_reject';
    factors: {
      documentClarity: number;    // 0-100
      dataConfidence: number;     // Average field confidence
      validationsPassed: number;  // 0-100 based on validations
      noOverrides: boolean;       // True if driver didn't override warnings
    };
  };
  
  // === DETECTED ISSUES (Supports AI-002 rejection reasons) ===
  
  detectedIssues: {
    code: string;           // 'expired', 'blurry', 'wrong_type', 'vin_mismatch'
    severity: 'error' | 'warning';
    message: string;        // Human-readable issue description
    suggestedAction: string; // "Upload a current document"
  }[];
  
  // Raw extraction response (for debugging)
  rawResponse?: object;
}

// Column: extraction_metadata JSONB
```

### Form Field Block Enhancement

Add extraction config to form field content:

```typescript
// Update FormFieldBlockContent in src/types/instructionBuilder.ts

interface FormFieldBlockContent {
  key: string;
  label: string;
  fieldType: 'text' | 'date' | 'email' | 'phone' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  options?: string[];  // For select
  
  // NEW: Extraction settings
  extraction?: {
    enabled: boolean;
    hints?: string[];  // What to look for (defaults to label if empty)
  };
}
```

### Credential Type Enhancement

Add document type hint to credential type:

```typescript
// Update credential_types table or instruction_config

interface InstructionSettings {
  // ... existing fields
  
  // NEW: Extraction settings
  extraction?: {
    enabled: boolean;
    documentTypeHint?: 'insurance_card' | 'drivers_license' | 'vehicle_registration' | 
                       'dot_physical' | 'drug_test' | 'training_certificate' | 'other';
    validateVin?: boolean;  // For vehicle credentials
  };
}
```

---

## Edge Function

### New: `extract-document-data`

Create new edge function for document extraction:

**File:** `supabase/functions/extract-document-data/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ExtractionRequest {
  // Document to analyze
  documentUrl: string;
  
  // What type of document is expected
  documentTypeHint?: string;
  
  // Fields to extract
  fields: {
    key: string;
    label: string;
    hints?: string[];
  }[];
  
  // Optional: VIN to validate against (vehicle credentials)
  expectedVin?: string;
}

interface ExtractionResponse {
  success: boolean;
  
  // Extracted field values
  fields: {
    [key: string]: {
      value: string | null;
      confidence: number;
    };
  };
  
  // Document validation
  validation: {
    documentType: {
      detected: string | null;
      confidence: number;
      matchesExpected: boolean;
    };
    expiration: {
      date: string | null;
      isExpired: boolean;
    };
    vinFound?: boolean;
  };
  
  // Document quality analysis (for AI-002)
  documentQuality: {
    clarity: 'clear' | 'slightly_blurry' | 'blurry' | 'unreadable';
    clarityConfidence: number;
    isComplete: boolean;
    issuesDetected: string[];
  };
  
  // Review readiness score (for AI-002)
  reviewScore: {
    score: number;
    recommendation: 'likely_approve' | 'needs_review' | 'likely_reject';
    factors: {
      documentClarity: number;
      dataConfidence: number;
      validationsPassed: number;
      noOverrides: boolean;
    };
  };
  
  // Detected issues for rejection reasons (for AI-002)
  detectedIssues: {
    code: string;
    severity: 'error' | 'warning';
    message: string;
    suggestedAction: string;
  }[];
  
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: ExtractionRequest = await req.json();
    const { documentUrl, documentTypeHint, fields, expectedVin } = body;

    // Fetch the document image
    const imageResponse = await fetch(documentUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    
    // Build extraction prompt
    const fieldInstructions = fields.map(f => {
      const lookFor = f.hints?.length ? f.hints.join(', ') : f.label;
      return `- "${f.key}": Look for ${lookFor}`;
    }).join('\n');

    const systemPrompt = `You are a document data extraction assistant for a credentialing platform.

Analyze the uploaded document image and extract the requested information.

RULES:
1. Only extract data you can clearly read on the document
2. Return confidence scores (0-100) for each extraction
3. If you cannot find a field or are unsure, return null with low confidence
4. NEVER extract or return: SSN, Social Security Number, EIN, Tax ID, bank account numbers, routing numbers
5. For dates, use ISO format (YYYY-MM-DD)
6. Detect the document type and any expiration dates present

${documentTypeHint ? `Expected document type: ${documentTypeHint}` : ''}
${expectedVin ? `Check if this VIN appears on the document: ${expectedVin}` : ''}

Fields to extract:
${fieldInstructions}

ADDITIONALLY, analyze document quality:
1. Rate document clarity: 'clear', 'slightly_blurry', 'blurry', or 'unreadable'
2. Check if document appears cropped or incomplete
3. Note any issues: glare, shadows, low_resolution, rotated, etc.
4. Provide a clarityConfidence score (0-100)

Respond with JSON in this format:
{
  "fields": {
    "field_key": { "value": "extracted value", "confidence": 85 }
  },
  "documentType": { "detected": "insurance card", "confidence": 95 },
  "expiration": { "date": "2026-03-15" },
  "vinFound": true,
  "clarity": "clear",
  "clarityConfidence": 90,
  "isComplete": true,
  "issues": []
}`;

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: 'text',
                text: 'Extract the requested information from this document.',
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      }),
    });

    const openaiData = await openaiResponse.json();
    const extractedData = JSON.parse(openaiData.choices[0].message.content);

    // Build validation object
    const validation = {
      documentType: {
        detected: extractedData.documentType?.detected || null,
        confidence: extractedData.documentType?.confidence || 0,
        matchesExpected: documentTypeHint 
          ? extractedData.documentType?.detected?.toLowerCase().includes(documentTypeHint.replace('_', ' '))
          : true,
      },
      expiration: {
        date: extractedData.expiration?.date || null,
        isExpired: extractedData.expiration?.date 
          ? new Date(extractedData.expiration.date) < new Date()
          : false,
      },
      vinFound: expectedVin ? extractedData.vinFound : undefined,
    };

    // Build document quality object (for AI-002)
    const documentQuality = {
      clarity: extractedData.clarity || 'clear',
      clarityConfidence: extractedData.clarityConfidence || 80,
      isComplete: extractedData.isComplete ?? true,
      issuesDetected: extractedData.issues || [],
    };

    // Calculate review score (for AI-002)
    const reviewScore = calculateReviewScore(extractedData.fields, validation, documentQuality);

    // Build detected issues list (for AI-002 rejection reasons)
    const detectedIssues = buildDetectedIssues(validation, documentQuality);

    // Transform to our response format
    const response: ExtractionResponse = {
      success: true,
      fields: extractedData.fields || {},
      validation,
      documentQuality,
      reviewScore,
      detectedIssues,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
// Helper functions for AI-002 support

function calculateReviewScore(fields: any, validation: any, quality: any) {
  // Document clarity score
  const clarityScores = { clear: 100, slightly_blurry: 75, blurry: 40, unreadable: 10 };
  const documentClarity = clarityScores[quality.clarity] || 50;
  
  // Average field confidence
  const fieldConfidences = Object.values(fields || {}).map((f: any) => f.confidence || 0);
  const dataConfidence = fieldConfidences.length > 0 
    ? fieldConfidences.reduce((a: number, b: number) => a + b, 0) / fieldConfidences.length 
    : 0;
  
  // Validation pass rate
  const validationChecks = [
    validation.documentType?.matchesExpected,
    !validation.expiration?.isExpired,
    validation.vinFound !== false, // undefined counts as pass
  ];
  const validationsPassed = (validationChecks.filter(Boolean).length / validationChecks.length) * 100;
  
  // Calculate overall score
  const score = Math.round(
    (documentClarity * 0.2) + 
    (dataConfidence * 0.5) + 
    (validationsPassed * 0.3)
  );
  
  // Determine recommendation
  const recommendation = score >= 85 ? 'likely_approve' : 
                         score >= 50 ? 'needs_review' : 
                         'likely_reject';
  
  return {
    score,
    recommendation,
    factors: {
      documentClarity,
      dataConfidence: Math.round(dataConfidence),
      validationsPassed: Math.round(validationsPassed),
      noOverrides: true, // Will be updated after driver review
    },
  };
}

function buildDetectedIssues(validation: any, quality: any) {
  const issues: any[] = [];
  
  // Expiration issue
  if (validation.expiration?.isExpired) {
    issues.push({
      code: 'expired',
      severity: 'error',
      message: `Document expired on ${validation.expiration.date}`,
      suggestedAction: 'Please upload a current, non-expired document.',
    });
  }
  
  // Document type mismatch
  if (!validation.documentType?.matchesExpected) {
    issues.push({
      code: 'wrong_type',
      severity: 'error',
      message: `Expected document type not detected. Found: ${validation.documentType?.detected || 'unknown'}`,
      suggestedAction: 'Please upload the correct document type.',
    });
  }
  
  // VIN not found
  if (validation.vinFound === false) {
    issues.push({
      code: 'vin_mismatch',
      severity: 'warning',
      message: 'Vehicle VIN not found on document',
      suggestedAction: 'Please verify this document covers your vehicle.',
    });
  }
  
  // Document quality issues
  if (quality.clarity === 'blurry' || quality.clarity === 'unreadable') {
    issues.push({
      code: 'blurry',
      severity: quality.clarity === 'unreadable' ? 'error' : 'warning',
      message: 'Document image is difficult to read',
      suggestedAction: 'Please upload a clearer photo with good lighting.',
    });
  }
  
  // Other quality issues
  if (quality.issuesDetected?.includes('cropped')) {
    issues.push({
      code: 'cropped',
      severity: 'warning',
      message: 'Document appears to be cropped or partially visible',
      suggestedAction: 'Please upload a photo showing the complete document.',
    });
  }
  
  return issues;
}

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## Component Changes

### New: `DocumentExtractionFlow.tsx`

Wrapper component that handles the extraction flow:

**File:** `src/components/features/credentials/DocumentExtractionFlow.tsx`

```typescript
interface DocumentExtractionFlowProps {
  // The uploaded file/URL
  documentUrl: string;
  documentFile?: File;
  
  // Extraction configuration
  extractionConfig: {
    enabled: boolean;
    documentTypeHint?: string;
    validateVin?: boolean;
    fields: {
      key: string;
      label: string;
      hints?: string[];
    }[];
  };
  
  // For vehicle credentials
  vehicleVin?: string;
  
  // Callbacks
  onExtractionComplete: (result: ExtractionResult) => void;
  onCancel: () => void;
}

type ExtractionState = 
  | 'extracting'      // Showing animation
  | 'review'          // Showing extracted fields for confirmation
  | 'warning'         // Showing validation warning
  | 'failed'          // Extraction failed, manual entry
  | 'complete';       // Done, ready to proceed

// Renders:
// 1. Extraction animation
// 2. Review form with pre-filled fields
// 3. Warning modals (expired, wrong type, VIN not found)
// 4. Failure state with manual entry option
```

### Modify: `FileUploadBlock.tsx`

Add extraction trigger after upload:

```typescript
// In FileUploadBlock.tsx

const handleFileUploaded = async (url: string, file: File) => {
  // Check if extraction is enabled for this credential
  if (extractionConfig?.enabled) {
    setShowExtractionFlow(true);
    setUploadedDocument({ url, file });
  } else {
    // Normal flow - just save the file
    onFileUploaded(url);
  }
};

// Render extraction flow when active
{showExtractionFlow && (
  <DocumentExtractionFlow
    documentUrl={uploadedDocument.url}
    documentFile={uploadedDocument.file}
    extractionConfig={extractionConfig}
    vehicleVin={vehicleContext?.vin}
    onExtractionComplete={handleExtractionComplete}
    onCancel={() => setShowExtractionFlow(false)}
  />
)}
```

### Modify: `FormFieldBlock.tsx`

Accept pre-filled values from extraction:

```typescript
// FormFieldBlock receives extractedValue prop
interface FormFieldBlockProps {
  // ... existing props
  extractedValue?: string;
  wasExtracted?: boolean;
}

// Show subtle indicator for AI-filled fields
{wasExtracted && value && (
  <Check className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
)}
```

### Modify: `AdminReviewPanel.tsx`

Show extraction metadata:

```typescript
// In AdminReviewPanel.tsx

{extractionMetadata && (
  <div className="space-y-2 text-sm">
    <h4 className="font-medium">AI Extraction</h4>
    {Object.entries(extractionMetadata.fields).map(([key, data]) => (
      <div key={key} className="flex justify-between text-muted-foreground">
        <span>{key}</span>
        <span>
          {data.extractedValue || 'Not found'} 
          {data.confidence && ` (${data.confidence}%)`}
        </span>
      </div>
    ))}
    
    {extractionMetadata.validations.expiration?.overridden && (
      <Alert variant="warning">
        Driver overrode expiration warning
      </Alert>
    )}
    
    {extractionMetadata.validations.vinMatch?.overridden && (
      <Alert variant="warning">
        Driver overrode VIN mismatch warning
      </Alert>
    )}
  </div>
)}
```

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/functions/extract-document-data/index.ts` | Edge function for Vision API extraction |
| `src/components/features/credentials/DocumentExtractionFlow.tsx` | Extraction flow wrapper component |
| `src/components/features/credentials/ExtractionAnimation.tsx` | "Analyzing..." animation component |
| `src/components/features/credentials/ExtractionReview.tsx` | Review extracted data form |
| `src/components/features/credentials/ExtractionWarning.tsx` | Warning modal component |
| `src/hooks/useDocumentExtraction.ts` | Hook for extraction API call |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/features/credentials/blocks/FileUploadBlock.tsx` | Trigger extraction after upload |
| `src/components/features/credentials/blocks/FormFieldBlock.tsx` | Accept extracted values, show indicator |
| `src/components/features/credentials/InstructionRenderer/index.tsx` | Coordinate extraction with form state |
| `src/components/features/credentials/CredentialDetail/AdminReviewPanel.tsx` | Show extraction metadata |
| `src/components/features/admin/credential-builder/blocks/FormFieldEditor.tsx` | Add extraction settings UI |
| `src/pages/admin/CredentialTypeEditor.tsx` | Add document type hint setting |
| `src/types/instructionBuilder.ts` | Add extraction types to FormFieldBlockContent |
| `src/services/credentials.ts` | Include extraction metadata in submission |

---

## Database Migration

**File:** `supabase/migrations/030_document_extraction.sql`

```sql
-- Add extraction metadata column to credentials tables
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;

ALTER TABLE vehicle_credentials 
ADD COLUMN IF NOT EXISTS extraction_metadata JSONB;

-- Add index for querying credentials with extraction
CREATE INDEX IF NOT EXISTS idx_driver_credentials_extraction 
ON driver_credentials ((extraction_metadata IS NOT NULL));

CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_extraction 
ON vehicle_credentials ((extraction_metadata IS NOT NULL));

-- =================================================================
-- AI-002 PREPARATION: Add queryable recommendation column
-- This enables efficient filtering by AI recommendation in review queue
-- =================================================================

-- Add recommendation column (extracted from JSONB for fast queries)
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

ALTER TABLE vehicle_credentials 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT;

-- Create index for filtering review queue by AI recommendation
CREATE INDEX IF NOT EXISTS idx_driver_credentials_ai_rec 
ON driver_credentials (ai_recommendation) 
WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_vehicle_credentials_ai_rec 
ON vehicle_credentials (ai_recommendation) 
WHERE status = 'pending_review';

-- Add review score column for sorting (extracted from JSONB)
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS ai_review_score INTEGER;

ALTER TABLE vehicle_credentials 
ADD COLUMN IF NOT EXISTS ai_review_score INTEGER;

-- Create trigger to auto-populate from extraction_metadata
CREATE OR REPLACE FUNCTION sync_ai_recommendation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.extraction_metadata IS NOT NULL THEN
    NEW.ai_recommendation := NEW.extraction_metadata->'reviewScore'->>'recommendation';
    NEW.ai_review_score := (NEW.extraction_metadata->'reviewScore'->>'score')::INTEGER;
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

-- Comments
COMMENT ON COLUMN driver_credentials.extraction_metadata IS 
'AI document extraction results including field values, confidence scores, quality analysis, and review recommendations';

COMMENT ON COLUMN driver_credentials.ai_recommendation IS 
'Cached AI recommendation from extraction_metadata for efficient query filtering (likely_approve, needs_review, likely_reject)';

COMMENT ON COLUMN driver_credentials.ai_review_score IS 
'Cached AI review score (0-100) from extraction_metadata for sorting';
```

---

## Acceptance Criteria

### AC-1: Extraction Flow
- [ ] Extraction triggers after document upload (when enabled)
- [ ] Animation shows during extraction (2-5 seconds)
- [ ] Cannot skip or bypass extraction animation
- [ ] Extracted fields pre-fill review form
- [ ] Fields below 70% confidence are left blank
- [ ] Driver can edit all pre-filled values

### AC-2: Validation Warnings
- [ ] Expired document shows warning with override option
- [ ] Wrong document type shows warning with override option
- [ ] Missing VIN (vehicle credentials) shows warning with override option
- [ ] Primary action is "Upload Different" - override is secondary
- [ ] Override action is recorded for admin review

### AC-3: Extraction Failure
- [ ] If extraction fails, show friendly message
- [ ] Offer "Try Different Photo" or "Enter Manually"
- [ ] Manual entry shows blank form fields
- [ ] No extraction metadata stored for manual entries

### AC-4: Admin Review
- [ ] Show AI extraction source and confidence for each field
- [ ] Show warning if driver overrode any validation
- [ ] Pre-fill expiration date from extraction
- [ ] Extraction metadata visible but not overwhelming

### AC-5: Admin Configuration
- [ ] Can enable/disable extraction per credential type
- [ ] Can set document type hint for better accuracy
- [ ] Can enable VIN validation for vehicle credentials
- [ ] Per-field extraction hints in form field editor
- [ ] Default hints auto-filled from field label

### AC-6: Sensitive Data
- [ ] SSN never extracted (verify with test document)
- [ ] EIN never extracted
- [ ] Bank account numbers never extracted
- [ ] Routing numbers never extracted

### AC-7: AI-002 Preparation
- [ ] Extraction returns `documentQuality` analysis
- [ ] Extraction returns `reviewScore` with recommendation
- [ ] Extraction returns `detectedIssues` array
- [ ] `ai_recommendation` column populated automatically via trigger
- [ ] `ai_review_score` column populated automatically via trigger
- [ ] Admin review panel shows AI recommendation badge
- [ ] Review score factors displayed (clarity, confidence, validations)

---

## Test Scenarios

### Scenario 1: Happy Path - Insurance Card

1. Create credential type with extraction enabled, document type = "Insurance Card"
2. Add form fields: Policy Number, Carrier, Expiration Date
3. Driver uploads clear insurance card photo
4. **Verify:** Animation shows for 2-5 seconds
5. **Verify:** All three fields pre-filled
6. **Verify:** Checkmarks shown next to filled fields
7. Driver clicks "Confirm & Continue"
8. **Verify:** Admin review shows extraction confidence

### Scenario 2: Expired Document Warning

1. Driver uploads insurance card with past expiration date
2. **Verify:** Warning shows: "This document appears to be expired"
3. **Verify:** Primary button is "Upload Different Document"
4. **Verify:** "Continue Anyway" link exists
5. Driver clicks "Continue Anyway"
6. **Verify:** Proceeds to review screen
7. **Verify:** Admin sees "Driver overrode expiration warning"

### Scenario 3: Wrong Document Type

1. Credential expects "Insurance Card"
2. Driver uploads driver's license instead
3. **Verify:** Warning shows: "This doesn't look like an Insurance Card"
4. **Verify:** Can override and continue
5. **Verify:** Admin sees warning override

### Scenario 4: VIN Not Found (Vehicle Credential)

1. Create vehicle credential with VIN validation enabled
2. Vehicle has VIN "ABC123"
3. Driver uploads insurance card that doesn't list "ABC123"
4. **Verify:** Warning shows: "Vehicle not found on insurance card"
5. **Verify:** VIN is displayed in warning
6. Driver overrides
7. **Verify:** Admin sees VIN mismatch override

### Scenario 5: Low Confidence Field

1. Upload blurry document where policy number is hard to read
2. **Verify:** Policy number field left blank (below 70% confidence)
3. **Verify:** Other readable fields are filled
4. **Verify:** Driver must manually enter policy number

### Scenario 6: Extraction Failure

1. Upload completely unreadable document (blank page, wrong file type)
2. **Verify:** Shows "We couldn't read this document"
3. **Verify:** "Try Different Photo" and "Enter Manually" buttons shown
4. Click "Enter Manually"
5. **Verify:** Blank form fields shown for manual entry

### Scenario 7: Custom Extraction Hints

1. Create form field "Coverage ID"
2. Set extraction hint to "policy number, member ID, coverage number"
3. Driver uploads insurance card (which says "Policy #")
4. **Verify:** "Coverage ID" field is filled with policy number
5. **Verify:** AI understood the hint mapping

### Scenario 8: Sensitive Data Not Extracted

1. Upload document containing visible SSN (e.g., W-9 form)
2. Have form field labeled "SSN" with extraction enabled
3. **Verify:** SSN field is NOT pre-filled
4. **Verify:** Other non-sensitive fields may be filled

---

## Implementation Order

### Phase 1: Core Extraction (MVP)
1. Create edge function `extract-document-data`
2. Create `useDocumentExtraction` hook
3. Create `ExtractionAnimation` component
4. Create `ExtractionReview` component
5. Modify `FileUploadBlock` to trigger extraction
6. Modify `FormFieldBlock` to accept extracted values
7. Database migration for `extraction_metadata`

### Phase 2: Validation & Warnings
1. Create `ExtractionWarning` component
2. Add expiration date validation
3. Add document type detection
4. Add VIN validation for vehicle credentials
5. Record overrides in extraction metadata

### Phase 3: Admin Configuration
1. Add extraction toggle to credential type settings
2. Add document type hint selector
3. Add VIN validation toggle (vehicle credentials)
4. Add extraction settings to form field editor
5. Auto-fill extraction hints from field labels

### Phase 4: Admin Review + AI-002 Preparation
1. Modify `AdminReviewPanel` to show extraction data
2. Show confidence percentages
3. Highlight override warnings
4. Pre-fill expiration from extraction
5. **AI-002 Prep**: Show AI recommendation badge (Likely Approve / Needs Review / Issues)
6. **AI-002 Prep**: Show review score breakdown (clarity, confidence, validations)
7. **AI-002 Prep**: Verify `ai_recommendation` column populated correctly

---

## Future: AI-Assisted Credential Review (AI-002)

This section documents how the Smart Document Processing architecture is designed to support a future **AI-Assisted Credential Review** feature. Build AI-001 with these integration points in mind.

### Vision

AI-Assisted Review will help admins process credential submissions faster by:
- **Recommending actions**: "Likely Approve" / "Needs Review" / "Issues Found"
- **Pre-screening documents**: Use extraction data to validate before admin sees it
- **Generating rejection reasons**: AI drafts specific, helpful rejection messages
- **Enabling bulk operations**: Batch approve high-confidence submissions

### How AI-001 Feeds AI-002

The extraction metadata we capture in AI-001 becomes the foundation for AI-002:

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI-001: Extraction                       │
│  (Driver submits document)                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  extraction_metadata: {                                         │
│    fields: { policy_number: { value, confidence } },            │
│    validations: { documentType, expiration, vinMatch },         │
│    documentQuality: { clarity, completeness },  ← AI-002 needs  │
│    overrides: [...]                                             │
│  }                                                              │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       AI-002: Review Assistant                  │
│  (Admin reviews submission)                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Uses extraction_metadata to:                                   │
│  • Calculate recommendation score                               │
│  • Surface specific issues                                      │
│  • Generate rejection reasons                                   │
│  • Enable batch approve for high-confidence                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Model: Build for AI-002

Extend `ExtractionMetadata` with fields AI-002 will need:

```typescript
interface ExtractionMetadata {
  // === CORE (AI-001) ===
  attempted: boolean;
  extractedAt: string;
  
  fields: {
    [fieldKey: string]: {
      extractedValue: string | null;
      confidence: number;
      used: boolean;
      finalValue: string;
    };
  };
  
  validations: {
    documentType: { expected, detected, confidence, passed, overridden };
    expiration: { detected, isExpired, overridden };
    vinMatch?: { expectedVin, foundOnDocument, overridden };
  };

  // === FOR AI-002: Document Quality ===
  documentQuality: {
    clarity: 'clear' | 'slightly_blurry' | 'blurry' | 'unreadable';
    clarityConfidence: number;
    isComplete: boolean;  // All expected regions visible
    issuesDetected: string[];  // ['cropped', 'glare', 'low_resolution', etc.]
  };

  // === FOR AI-002: Review Readiness Score ===
  reviewScore: {
    score: number;  // 0-100, overall confidence
    recommendation: 'likely_approve' | 'needs_review' | 'likely_reject';
    factors: {
      documentClarity: number;      // 0-100
      dataConfidence: number;       // Average field confidence
      validationsPassed: number;    // 0-100 based on validations
      noOverrides: boolean;         // True if driver didn't override warnings
    };
  };

  // === FOR AI-002: Rejection Reason Generation ===
  detectedIssues: {
    code: string;           // 'expired', 'blurry', 'wrong_type', 'vin_mismatch', etc.
    severity: 'error' | 'warning';
    message: string;        // Human-readable issue
    suggestedAction: string; // "Upload a current document"
  }[];
  
  rawResponse?: object;
}
```

### Edge Function: Return AI-002 Data

Update `extract-document-data` to return additional analysis:

```typescript
// In extraction response, include:
const response: ExtractionResponse = {
  success: true,
  fields: { ... },
  validation: { ... },
  
  // NEW: For AI-002
  documentQuality: {
    clarity: analyzeClarity(extractedData),
    clarityConfidence: extractedData.clarityConfidence || 85,
    isComplete: !extractedData.issues?.includes('cropped'),
    issuesDetected: extractedData.issues || [],
  },
  
  reviewScore: calculateReviewScore({
    fields: extractedData.fields,
    validation: response.validation,
    quality: response.documentQuality,
  }),
  
  detectedIssues: buildIssuesList({
    validation: response.validation,
    quality: response.documentQuality,
  }),
};

function calculateReviewScore(data): ReviewScore {
  const documentClarity = data.quality.clarity === 'clear' ? 100 : 
                          data.quality.clarity === 'slightly_blurry' ? 75 : 
                          data.quality.clarity === 'blurry' ? 40 : 10;
  
  const dataConfidence = average(Object.values(data.fields).map(f => f.confidence));
  
  const validationsPassed = [
    data.validation.documentType?.passed,
    !data.validation.expiration?.isExpired,
    data.validation.vinMatch?.foundOnDocument ?? true,
  ].filter(Boolean).length / 3 * 100;
  
  const score = (documentClarity * 0.2) + (dataConfidence * 0.5) + (validationsPassed * 0.3);
  
  return {
    score,
    recommendation: score >= 85 ? 'likely_approve' : 
                    score >= 50 ? 'needs_review' : 
                    'likely_reject',
    factors: { documentClarity, dataConfidence, validationsPassed, noOverrides: true },
  };
}
```

### AI Prompt: Include Quality Analysis

Update the extraction prompt to also analyze document quality:

```typescript
const systemPrompt = `You are a document data extraction assistant...

// ... existing instructions ...

ADDITIONALLY, analyze document quality:
1. Rate document clarity: 'clear', 'slightly_blurry', 'blurry', or 'unreadable'
2. Check if document appears cropped or incomplete
3. Note any issues: glare, shadows, low resolution, rotated, etc.
4. Provide a clarityConfidence score (0-100)

Include in your response:
{
  "fields": { ... },
  "documentType": { ... },
  "expiration": { ... },
  "vinFound": boolean,
  
  // Quality analysis
  "clarity": "clear" | "slightly_blurry" | "blurry" | "unreadable",
  "clarityConfidence": 85,
  "isComplete": true,
  "issues": ["glare", "cropped"]  // empty array if none
}
`;
```

### Admin Review Panel: AI-002 Preview

While AI-001 focuses on driver experience, the admin review panel should display the review score as a preview of AI-002 capabilities:

```
┌─────────────────────────────────────────────────────────────────┐
│  Insurance Card                                  Pending 📋     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ AI Analysis ─────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  ✓ Likely Approve                              Score: 92  │ │
│  │                                                           │ │
│  │  ✓ Document is clear and readable                         │ │
│  │  ✓ All fields extracted with high confidence              │ │
│  │  ✓ Document type matches expected                         │ │
│  │  ✓ Expiration date is valid                               │ │
│  │  ✓ No driver overrides                                    │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Document Preview]                                             │
│                                                                 │
│  ...                                                            │
│                                                                 │
│  [Reject]                                        [Approve ✓]   │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Filtering: AI-002 Foundation

Store `reviewScore.recommendation` in a way that allows efficient querying:

```sql
-- In migration, add computed column for filtering
ALTER TABLE driver_credentials 
ADD COLUMN IF NOT EXISTS ai_recommendation TEXT 
GENERATED ALWAYS AS (extraction_metadata->>'reviewScore'->>'recommendation') STORED;

CREATE INDEX IF NOT EXISTS idx_driver_credentials_ai_recommendation 
ON driver_credentials (ai_recommendation) 
WHERE status = 'pending_review';
```

This enables future queries like:
```sql
-- AI-002 will use this for queue filtering
SELECT * FROM driver_credentials 
WHERE status = 'pending_review' 
AND ai_recommendation = 'likely_approve';
```

### AI-002 Feature Scope (Future)

When we build AI-002, it will add:

1. **Queue Tabs**: Filter by AI recommendation
   ```
   [All (71)] [Likely Approve (45)] [Needs Review (23)] [Issues (3)]
   ```

2. **Batch Approve**: One-click approve for high-confidence submissions
   ```
   "Approve 45 submissions? All have 85%+ AI confidence."
   ```

3. **AI-Generated Rejection Reasons**: Draft specific rejection messages
   ```
   "Your insurance card shows an expiration date of January 15, 2024, 
   which has passed. Please upload your current insurance card."
   ```

4. **Disagreement Tracking**: When admin overrides AI recommendation
   ```
   { aiRecommendation: 'likely_approve', adminAction: 'rejected', reason: '...' }
   ```

5. **Auto-Approval** (optional, company setting)
   ```
   "Auto-approve submissions with 95%+ confidence and no warnings"
   ```

### Implementation Notes for AI-001

When building AI-001, ensure:

- [ ] `extraction_metadata` JSONB column supports the full schema above
- [ ] Edge function returns `documentQuality`, `reviewScore`, and `detectedIssues`
- [ ] Admin review panel displays the AI analysis section
- [ ] Review score is stored in a queryable way (indexed column or computed)
- [ ] Override tracking captures which warnings were bypassed

These additions are minimal extra work in AI-001 but enable AI-002 without refactoring.

---

## Future Enhancements (Not in Scope)

- **AI-002: AI-Assisted Credential Review** - See section above for architecture
- **Extraction analytics**: Dashboard showing extraction success rates, common failures
- **Batch extraction**: Extract from multiple documents at once
- **Template learning**: AI learns from company's past credentials
- **Multi-page PDFs**: Extract from specific pages of multi-page documents

---

## Related Documents

- `CODEX-039-credential-ux-invisible-sections.prompt.md` - Credential form layout
- `CODEX-037-credential-ux-document-preview.prompt.md` - Document preview UX
- `CODEX-040-AI-builder-two-panel-ux.prompt.md` - AI builder interface (similar patterns)

---

## Notes

- OpenAI GPT-4o Vision is recommended for best accuracy
- Token costs are acceptable - this is a high-value feature
- Start with insurance cards and licenses - most common credentials
- Extraction should feel fast and magical, not slow and clunky
- When in doubt, leave field blank rather than fill wrong data
