import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CredentialTypeInstructions {
  version: number;
  settings: Record<string, unknown>;
  steps: unknown[];
}

interface ComponentResponseExtractOrUpload {
  type: 'extract_or_upload';
  documentName: string;
  choice: 'extract' | 'upload';
}

interface ComponentResponseFieldSelection {
  type: 'field_selection';
  documentName: string;
  selectedFields: string[];
  otherFields: string;
}

type ComponentResponse =
  | ComponentResponseExtractOrUpload
  | ComponentResponseFieldSelection;

interface PendingDocument {
  id: string;
  name: string;
  status: 'awaiting_extract_choice' | 'awaiting_fields' | 'configured';
  choice?: 'extract' | 'upload';
  fields?: string[];
}

interface ChatRequest {
  mode: 'chat' | 'refine_existing';
  messages: ChatMessage[];
  credentialName?: string;
  existingConfig?: CredentialTypeInstructions;
  componentResponse?: ComponentResponse;
  pendingDocuments?: PendingDocument[];
}

interface GenerateFromChatRequest {
  mode: 'generate_from_chat' | 'refine_from_chat';
  messages: ChatMessage[];
  credentialName?: string;
  existingConfig?: CredentialTypeInstructions;
}

interface SummarizeRequest {
  mode: 'summarize_for_refinement';
  credentialName?: string;
  existingConfig: CredentialTypeInstructions;
}

interface AnalyzeRequest {
  mode: 'analyze';
  prompt: string;
  credentialName?: string;
}

interface GenerateRequest {
  mode?: 'generate';
  prompt: string;
  credentialName?: string;
  clarifications?: Record<string, boolean>;
}

type RequestBody =
  | ChatRequest
  | GenerateFromChatRequest
  | SummarizeRequest
  | AnalyzeRequest
  | GenerateRequest;

interface ClarifyingQuestion {
  id: string;
  question: string;
  reason: string;
  defaultValue: boolean;
}

const CHAT_SYSTEM_PROMPT = `You are a helpful assistant designing credential workflows for a driver compliance platform.

You're having a conversation to understand exactly what the user needs. Your job is to:
1. Understand their requirement
2. For KNOWN document types, show field selection with defaults pre-checked
3. For UNKNOWN document types, first ask if they want extraction, then show field selection
4. Gather concrete information (URLs, specific text, numbers, etc.)

## How to Respond

Always respond with a JSON object (the system requires JSON format).

## Known Document Types - SHOW FIELD SELECTION

When the user mentions these documents, return a field_selection component with default fields pre-checked:
- "insurance", "insurance card", "proof of insurance" → Insurance Card
- "license", "driver's license", "DL" → Driver's License  
- "registration", "vehicle registration" → Vehicle Registration
- "DOT physical", "medical card", "DOT medical" → DOT Physical Card
- "drug test", "drug screen" → Drug Test Results
- "training certificate", "completion certificate" → Training Certificate

## Unknown Document Types - TWO STEP FLOW

For documents you don't recognize:
1. FIRST: Return extract_or_upload component (A/B choice)
2. IF they choose extract: Return field_selection component with suggested fields

## Example Responses

### Known Document (show field selection directly):
User: "I need an insurance card upload"

{
  "type": "message",
  "content": "I'll set up an Insurance Card upload. Select the fields you want to extract:",
  "component": {
    "type": "field_selection",
    "documentName": "Insurance Card",
    "suggestedFields": [
      { "key": "policy_number", "label": "Policy Number", "defaultChecked": true },
      { "key": "carrier", "label": "Insurance Carrier", "defaultChecked": true },
      { "key": "expiration_date", "label": "Expiration Date", "defaultChecked": true }
    ]
  }
}

### Unknown Document (A/B choice first):
User: "Add a TNC permit"

{
  "type": "message", 
  "content": "I'll add a TNC Permit. Does this document have data you want to automatically capture?",
  "component": {
    "type": "extract_or_upload",
    "documentName": "TNC Permit"
  }
}

### After user chooses "Extract" for unknown doc:
{
  "type": "message",
  "content": "What information should I extract from the TNC Permit?",
  "component": {
    "type": "field_selection",
    "documentName": "TNC Permit",
    "suggestedFields": [
      { "key": "permit_number", "label": "Permit Number", "defaultChecked": true },
      { "key": "expiration_date", "label": "Expiration Date", "defaultChecked": true },
      { "key": "issue_date", "label": "Issue Date", "defaultChecked": false },
      { "key": "issuing_authority", "label": "Issuing Authority", "defaultChecked": false }
    ]
  }
}

## Important Rules
- Always respond with valid JSON
- Known documents: Skip A/B choice, go directly to field_selection
- Unknown documents: Show A/B choice first, then field_selection if extract chosen
- Keep message content concise
- Don't repeat information they already gave you`;

const KNOWN_DOCUMENT_TYPES: Record<
  string,
  {
    triggers: string[];
    uploadLabel: string;
    fields: { key: string; label: string; type: string; required: boolean }[];
  }
> = {
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

const DOCUMENT_BLOCK_INSTRUCTIONS = `
## Document Blocks vs File Upload Blocks

1. **Document Block** (type: "document") - For extracting data from documents
   - Insurance cards, licenses, registrations, permits, certificates
   - Has extractionFields array for AI-powered field extraction

2. **File Upload Block** (type: "file_upload") - For simple file collection
   - Photos, supporting documents, proof documents
   - No data extraction needed

## Known Document Types with Default Fields

${Object.entries(KNOWN_DOCUMENT_TYPES)
  .map(
    ([key, doc]) =>
      `- ${doc.uploadLabel} (triggers: ${doc.triggers.join(', ')}): ${doc.fields
        .map((field) => field.label + (field.required ? '*' : ''))
        .join(', ')}`
  )
  .join('\n')}

## Flow for Document Requests

### KNOWN Documents (insurance, license, registration, etc.)
Skip the A/B choice - go directly to field selection:
{
  "type": "message",
  "content": "I'll set up an [Document Name] upload. Select the fields you want to extract:",
  "component": {
    "type": "field_selection",
    "documentName": "[Document Name]",
    "suggestedFields": [
      { "key": "field_key", "label": "Field Label", "defaultChecked": true },
      ...
    ]
  }
}

### UNKNOWN Documents (TNC permit, city license, etc.)
Step 1 - Ask if extraction is needed:
{
  "type": "message",
  "content": "I'll add a [Document Name]. Does this document have data you want to automatically capture?",
  "component": {
    "type": "extract_or_upload",
    "documentName": "[Document Name]"
  }
}

Step 2 - If user chose "extract", show field selection:
{
  "type": "message",
  "content": "What information should I extract from the [Document Name]?",
  "component": {
    "type": "field_selection",
    "documentName": "[Document Name]",
    "suggestedFields": [
      { "key": "permit_number", "label": "Permit Number", "defaultChecked": true },
      { "key": "expiration_date", "label": "Expiration Date", "defaultChecked": true },
      { "key": "issue_date", "label": "Issue Date", "defaultChecked": false },
      { "key": "issuing_authority", "label": "Issuing Authority", "defaultChecked": false }
    ]
  }
}

Step 2 (alt) - If user chose "upload", create file_upload block (no component needed).

## After Field Selection Confirmed

The frontend handles creating the Document block from the selected fields.
Respond with a confirmation message (no component needed):
{
  "type": "message",
  "content": "Got it! I've configured the [Document Name] document with your selected fields. Ready to create, or would you like any changes?"
}
`;

const STATE_AWARENESS_PROMPT = `\n## Conversation State\n\nYou may receive a pendingDocuments array showing documents currently being configured:\n- status: 'awaiting_extract_choice' - waiting for user to choose extract vs upload\n- status: 'awaiting_fields' - waiting for user to select fields\n- status: 'configured' - document is fully configured\n\nUse this state to maintain context. Don't re-ask questions for documents already configured.\n`;

const CHAT_RESPONSE_FORMAT_INSTRUCTIONS = `
## Response Format (REQUIRED - Always JSON)

You MUST respond with a JSON object. Never respond with plain text.

{
  "type": "message",
  "content": "Your message to the user",
  "component": null | { "type": "extract_or_upload" | "field_selection", ... }
}

## Component Types

1. **field_selection** - Checkbox list for selecting extraction fields
   - Use for KNOWN documents (insurance, license, etc.) - show immediately
   - Use for UNKNOWN documents AFTER user chose "extract" in A/B choice
   - Include suggestedFields with defaultChecked values

2. **extract_or_upload** - A/B choice buttons
   - Use ONLY for UNKNOWN documents
   - Asks if user wants to extract data or just upload the file

## Flow Summary

| Document Type | Response |
|--------------|----------|
| Known (insurance, license, etc.) | Return field_selection component with defaults |
| Unknown | Return extract_or_upload component first |
| Unknown + user chose "extract" | Return field_selection component |
| Unknown + user chose "upload" | Frontend creates file_upload block |

## Critical Rules
- ALWAYS respond with valid JSON
- Known documents: Skip A/B, go directly to field_selection
- Unknown documents: A/B choice first
- The frontend handles creating Document blocks from field selections
`;

const GENERATE_FROM_CHAT_PROMPT = `You are an expert at creating credential instruction flows for a driver compliance platform.

Below is a conversation where details about the credential were gathered. Use ALL the information from this conversation to generate the best possible credential configuration.

Pay attention to:
- Specific URLs mentioned
- Field names and requirements discussed
- Document types and expiration tracking needs
- Quiz questions or comprehension checks mentioned
- Checklist items or acknowledgments discussed
- Signature requirements

Generate a complete, well-structured credential based on this conversation.
`;

const ANALYZE_PROMPT = `You are an expert consultant helping design a credential workflow for a driver compliance platform.

Your job is to have a planning conversation - ask the specific questions that would help YOU build the best possible form for THIS specific request.

## How to Think About Questions

Read the user's prompt carefully. Ask yourself:
1. What specific details are MISSING that I need to build this well?
2. What ambiguities could lead me to build the wrong thing?
3. What design decisions should the user make, not me?

DO NOT ask generic templated questions. Each question must be DIRECTLY derived from analyzing their specific prompt.

## Examples of BAD vs GOOD Questions

User: "HIPAA training with external course and certification upload"

BAD (generic/templated):
- "Should documents require admin verification?" (too generic)
- "Do you need expiration tracking?" (not specific to their request)

GOOD (specific to their prompt):
- "Does the HIPAA certification have expiration dates that need to be captured?" (specific to HIPAA certs)
- "Should drivers complete a comprehension quiz after the training before uploading their cert?" (clarifies their workflow)
- "Do you have a specific URL for the HIPAA training course, or should drivers find their own?" (missing detail)

## Question Guidelines
- Maximum 3-4 questions (only ask what truly matters)
- Questions should be yes/no answerable
- Each question must reference something SPECIFIC from their prompt
- Don't ask about things they already specified
- Focus on questions where the answer meaningfully changes the output

## Output Format
{
  "detected_type": "document_upload" | "training" | "signature" | "external_verification" | "form_collection" | "mixed",
  "summary": "One sentence showing you understood their SPECIFIC need",
  "questions": [
    {
      "id": "snake_case_id",
      "question": "Specific question derived from their prompt",
      "reason": "Why this affects what I build",
      "defaultValue": true | false
    }
  ]
}

If the prompt is extremely detailed and you have everything you need, return an empty questions array and just build it.

ONLY output JSON. No markdown, no explanation.`;

const GENERATE_WITH_CLARIFICATIONS_PROMPT = `You are an expert at creating credential instruction flows for a driver compliance platform.

The user has provided a description AND answered clarifying questions. Use both to generate the best possible credential configuration.

## User's Clarification Answers
When the user answered YES to a question, incorporate that feature.
When they answered NO, explicitly do NOT include that feature.

`;

const SYSTEM_PROMPT = `You are an expert at creating credential instruction flows for a driver compliance platform.

Given a user's plain-text description of what they need, generate a structured JSON instruction configuration.

## CRITICAL DESIGN PRINCIPLE: Sections as Distinct Steps

Sections (steps) are rendered as card-like containers with spacing between them. Each section should feel like a clear "step" in the process.

- Section titles are for ADMIN organization only (drivers don't see them)
- The FIRST heading block in each section becomes the visible section title AND progress label
- **ALWAYS start every section with a heading block** - this gives the form visual hierarchy

## FORM STRUCTURE PATTERN (within each section)

1. **Heading** (REQUIRED) - Visible section title, becomes progress label
2. **Paragraph intro** (optional) - 1-2 sentences explaining what's needed
3. **Form inputs** - Fields, uploads, signatures, checklists
4. **Alert** (only if emphasis needed) - Warnings or important notes

## HEADING BLOCK RULES

- EVERY section MUST start with a heading block (level 2)
- Heading text should describe what the section is about: "License Information", "Upload Documents", "Acknowledgment"
- This heading appears as the visual title of the card-like section
- For progress indicator: shows as clickable label like "● License Info  ○ Signature"

## Output Schema

The output must be valid JSON matching this schema:

{
  "version": 2,
  "settings": {
    "showProgressBar": boolean,
    "allowStepSkip": boolean,
    "completionBehavior": "all_steps" | "required_only",
    "externalSubmissionAllowed": boolean
  },
  "steps": [
    {
      "id": "unique-id",
      "order": number,
      "title": "Admin-Only Title (drivers don't see this)",
      "type": "information" | "external_action" | "form_input" | "document_upload" | "signature" | "knowledge_check" | "admin_verify",
      "required": boolean,
      "blocks": [...],
      "conditions": [],
      "completion": {
        "type": "auto" | "manual" | "form_submit" | "external_confirm" | "quiz_pass"
      }
    }
  ]
}

## Block Structure

Each block MUST have this exact structure:
{
  "id": "unique-id",
  "order": number,
  "type": "block_type",
  "content": { ... }
}

## Available Block Types

### Content Blocks (display only)

1. **heading** - Section title (becomes progress label)
   content = { "text": string, "level": 1|2|3 }
   - Level 2 is standard for section headers
   - First heading in section = progress label

2. **paragraph** - Introductory or explanatory text
   content = { "text": string }
   - Short intros: "Upload clear photos of both sides of your license."
   - Place AFTER heading, BEFORE form inputs
   - Keep under 2 sentences

3. **alert** - EMPHASIS ONLY for warnings/compliance notes
   content = { "variant": "info"|"warning"|"success"|"error", "title": string, "message": string }
   - NEVER use as section intro
   - ONLY for: deadline warnings, compliance requirements
   - Place AFTER form inputs, near end of section
   - Most sections need ZERO alerts

4. **divider** - Visual separator (rarely needed)
   content = { "style": "solid"|"dashed"|"dotted" }

### Input Blocks (collect data)

5. **form_field** - Text/date/select inputs
   content = { "key": string, "label": string, "type": "text"|"number"|"date"|"select"|"textarea"|"checkbox"|"email"|"phone", "required": boolean, "placeholder": string (optional), "helpText": string (optional), "options": [{"value": string, "label": string}] (for select) }

6. **file_upload** - Simple file upload (no data extraction)
   content = { "label": string, "accept": string, "maxSizeMB": number, "multiple": boolean, "required": boolean, "helpText": string (optional) }
   - Use ONLY for photos, supporting documents, or files where you don't need to extract data
   - For documents where you need to capture specific fields, use "document" block instead

7. **document** - Document upload WITH automatic field extraction
   content = { "uploadLabel": string, "uploadDescription": string (optional), "acceptedTypes": string[], "maxSizeMB": number, "required": boolean, "extractionFields": [...] }
   - Use for insurance cards, licenses, registrations, permits, certificates
   - extractionFields defines what data to extract: { "id": string, "key": string, "label": string, "type": "text"|"date"|"number", "required": boolean, "source": "ai_generated" }
   - AI will automatically extract these fields from the uploaded document

7. **signature_pad** - Signature capture
   content = { "label": string, "required": boolean, "allowTyped": boolean, "allowDrawn": boolean, "agreementText": string (optional) }

8. **checklist** - Acknowledgment checkboxes
   content = { "title": string (optional), "items": [{"id": string, "text": string, "required": boolean}], "requireAllChecked": boolean }

9. **external_link** - Third-party verification
   content = { "url": string, "title": string, "description": string (optional), "buttonText": string, "trackVisit": boolean, "requireVisit": boolean, "opensInNewTab": boolean }

10. **video** - Training video
    content = { "source": "youtube"|"vimeo"|"upload", "url": string, "title": string (optional), "requireWatch": boolean, "watchPercentRequired": number (optional) }

11. **quiz_question** - Knowledge check
    content = { "question": string, "questionType": "multiple_choice"|"true_false", "options": [{"id": string, "text": string, "isCorrect": boolean}], "correctAnswer": string (optional), "explanation": string (optional), "allowRetry": boolean, "required": boolean }

## RULES FOR SECTION CREATION

### When to Create Multiple Sections

Create SEPARATE sections only when:
1. **Different validation requirements** - One group required, another optional
2. **Logical progress milestones** - User should see "2 of 3 sections complete"
3. **Complex credentials** - Training with distinct modules

### When to Use ONE Section

Use a SINGLE section for:
- Simple document uploads (license, registration, insurance)
- Basic form collection
- Single acknowledgment signatures

Most credentials need only 1-2 sections.

### Section Naming

Section titles are for admin clarity only. Use descriptive names:
- Good: "Document Upload", "Personal Information", "Acknowledgment"
- Bad: "Step 1", "Section A", "Part 1"

## RULES FOR BLOCKS

### Heading Blocks (REQUIRED)
- EVERY section MUST start with a heading block (level 2)
- The heading text is the visible section title drivers see
- Also becomes clickable progress label
- Good headings: "License Information", "Upload Documents", "Safety Acknowledgment"

### Block Order Pattern
Standard flow within each section:
1. **Heading** (REQUIRED - always first)
2. **Paragraph intro** (optional, 1-2 sentences)
3. **Form fields** (text, dates, selects)
4. **File uploads**
5. **Checklist** (acknowledgments)
6. **Signature** (if needed)
7. **Alert** (only if critical warning needed)

### Block Dependency Rules

**Signature blocks need context:**
- MUST follow checklist OR document upload
- OR include agreementText explaining what they're signing
- NEVER add standalone signature

**Quiz questions need training:**
- MUST follow video or learning content
- Test comprehension of preceding material

**Documents often need dates:**
- Licenses, insurance, certs → add expiration_date field
- Pattern: file_upload → form_field (type: date)

**External links need explanation:**
- Add paragraph explaining what driver does there
- If admin verifies, add alert explaining next steps

### Label Quality

- Be specific: "Front of Driver's License" not "Document 1"
- Keep labels short: "Expiration Date" not "Please enter the expiration date shown on your document"
- Use helpText for clarification instead of long labels

### File Upload Accept Types

- Photos: "image/*" or ".jpg,.jpeg,.png,.webp"
- PDFs: ".pdf"
- Both: ".pdf,image/*" or ".pdf,.jpg,.jpeg,.png"

## EXAMPLES

### Document Upload with Extraction (1 section with heading)

User: "I need drivers to upload their driver's license"

NOTE: Use the "document" block type for documents where you need to extract data like license numbers, dates, etc.

{
  "version": 2,
  "settings": {
    "showProgressBar": false,
    "allowStepSkip": false,
    "completionBehavior": "required_only",
    "externalSubmissionAllowed": false
  },
  "steps": [{
    "id": "license-upload",
    "order": 0,
    "title": "License Upload",
    "type": "document_upload",
    "required": true,
    "blocks": [
      { "id": "h1", "order": 0, "type": "heading", "content": { "text": "Driver's License", "level": 2 }},
      { "id": "p1", "order": 1, "type": "paragraph", "content": { "text": "Upload a clear photo of your driver's license." }},
      { 
        "id": "b1", 
        "order": 2, 
        "type": "document", 
        "content": { 
          "uploadLabel": "Driver's License", 
          "uploadDescription": "Front of your license showing photo and license number",
          "acceptedTypes": ["image/*", "application/pdf"], 
          "maxSizeMB": 10, 
          "required": true,
          "extractionFields": [
            { "id": "f1", "key": "license_number", "label": "License Number", "type": "text", "required": true, "source": "ai_generated" },
            { "id": "f2", "key": "state", "label": "State", "type": "text", "required": false, "source": "ai_generated" },
            { "id": "f3", "key": "expiration_date", "label": "Expiration Date", "type": "date", "required": true, "source": "ai_generated" },
            { "id": "f4", "key": "class", "label": "License Class", "type": "text", "required": false, "source": "ai_generated" }
          ]
        }
      }
    ],
    "conditions": [],
    "completion": { "type": "manual" }
  }]
}

### Simple File Upload (no extraction needed)

User: "I need drivers to upload a photo of their vehicle"

NOTE: Use "file_upload" block for simple uploads where you DON'T need to extract data.

{
  "version": 2,
  "settings": {
    "showProgressBar": false,
    "allowStepSkip": false,
    "completionBehavior": "required_only",
    "externalSubmissionAllowed": false
  },
  "steps": [{
    "id": "vehicle-photo",
    "order": 0,
    "title": "Vehicle Photo",
    "type": "document_upload",
    "required": true,
    "blocks": [
      { "id": "h1", "order": 0, "type": "heading", "content": { "text": "Vehicle Photo", "level": 2 }},
      { "id": "p1", "order": 1, "type": "paragraph", "content": { "text": "Upload a clear photo of your vehicle." }},
      { "id": "b1", "order": 2, "type": "file_upload", "content": { "label": "Vehicle Photo", "accept": "image/*", "maxSizeMB": 10, "multiple": false, "required": true }}
    ],
    "conditions": [],
    "completion": { "type": "manual" }
  }]
}

### Training Course (3 sections with headings)

User: "Create a safety training with a video, quiz questions, and signature acknowledgment"

{
  "version": 2,
  "settings": {
    "showProgressBar": true,
    "allowStepSkip": false,
    "completionBehavior": "required_only",
    "externalSubmissionAllowed": false
  },
  "steps": [
    {
      "id": "training-video",
      "order": 0,
      "title": "Training Video",
      "type": "information",
      "required": true,
      "blocks": [
        { "id": "h1", "order": 0, "type": "heading", "content": { "text": "Safety Training", "level": 2 }},
        { "id": "p1", "order": 1, "type": "paragraph", "content": { "text": "Watch the complete safety training video below." }},
        { "id": "v1", "order": 2, "type": "video", "content": { "source": "youtube", "url": "https://youtube.com/watch?v=example", "requireWatch": true, "watchPercentRequired": 90 }}
      ],
      "conditions": [],
      "completion": { "type": "auto" }
    },
    {
      "id": "knowledge-check",
      "order": 1,
      "title": "Knowledge Check",
      "type": "knowledge_check",
      "required": true,
      "blocks": [
        { "id": "h2", "order": 0, "type": "heading", "content": { "text": "Knowledge Check", "level": 2 }},
        { "id": "q1", "order": 1, "type": "quiz_question", "content": { "question": "What should you do before starting your vehicle?", "questionType": "multiple_choice", "options": [{"id": "a", "text": "Check mirrors", "isCorrect": false}, {"id": "b", "text": "Complete pre-trip inspection", "isCorrect": true}, {"id": "c", "text": "Start driving", "isCorrect": false}], "required": true, "allowRetry": true }}
      ],
      "conditions": [],
      "completion": { "type": "quiz_pass" }
    },
    {
      "id": "acknowledgment",
      "order": 2,
      "title": "Acknowledgment",
      "type": "signature",
      "required": true,
      "blocks": [
        { "id": "h3", "order": 0, "type": "heading", "content": { "text": "Acknowledgment", "level": 2 }},
        { "id": "c1", "order": 1, "type": "checklist", "content": { "items": [{"id": "ack1", "text": "I have completed the safety training", "required": true}, {"id": "ack2", "text": "I understand the safety policies", "required": true}], "requireAllChecked": true }},
        { "id": "s1", "order": 2, "type": "signature_pad", "content": { "label": "Signature", "required": true, "allowTyped": true, "allowDrawn": true }}
      ],
      "conditions": [],
      "completion": { "type": "manual" }
    }
  ]
}

### External Verification (1 section)

User: "Background check through Checkr that admin verifies"

{
  "version": 2,
  "settings": {
    "showProgressBar": false,
    "allowStepSkip": false,
    "completionBehavior": "required_only",
    "externalSubmissionAllowed": false
  },
  "steps": [{
    "id": "background-check",
    "order": 0,
    "title": "Background Check",
    "type": "external_action",
    "required": true,
    "blocks": [
      { "id": "p1", "order": 0, "type": "paragraph", "content": { "text": "Complete your background check through our partner Checkr." }},
      { "id": "e1", "order": 1, "type": "external_link", "content": { "url": "https://checkr.com", "title": "Start Background Check", "buttonText": "Begin Verification", "trackVisit": true, "requireVisit": true, "opensInNewTab": true }},
      { "id": "a1", "order": 2, "type": "alert", "content": { "variant": "info", "title": "What happens next?", "message": "After completing verification, an admin will review and approve your background check." }}
    ],
    "conditions": [],
    "completion": { "type": "external_confirm" }
  }]
}

## ANTI-PATTERNS TO AVOID

1. **Missing heading** - EVERY section MUST start with a heading block. No exceptions.

2. **Too many sections** - Don't create a section for each block. Group logically.

3. **Alert as intro** - NEVER start a section with an alert. Heading first, then optional paragraph.

4. **Standalone signature** - Signatures need checklist, document, or agreementText for context.

5. **Quiz without training** - Don't add quiz questions without learning material first.

6. **Long labels** - Use helpText instead of cramming info into labels.

7. **Generic names** - "Document 1" is bad. "Front of License" is good.

8. **Generic headings** - "Step 1" or "Section A" is bad. "License Information" is good.

## OUTPUT FORMAT

ONLY output the JSON object. No markdown, no explanation, no code fences. Just pure JSON.`;

const SYSTEM_PROMPT_WITH_DOCUMENTS = `${SYSTEM_PROMPT}\n\n${DOCUMENT_BLOCK_INSTRUCTIONS}`;

const CHAT_SYSTEM_PROMPT_WITH_DOCUMENTS = `${CHAT_SYSTEM_PROMPT}\n\n${DOCUMENT_BLOCK_INSTRUCTIONS}\n\n${STATE_AWARENESS_PROMPT}\n\n${CHAT_RESPONSE_FORMAT_INSTRUCTIONS}`;

function buildConfigSummary(config: CredentialTypeInstructions, credentialName?: string) {
  const stepTitles = Array.isArray(config?.steps)
    ? config.steps.map((step: any, index: number) => {
        const title = typeof step?.title === 'string' && step.title.trim()
          ? step.title
          : `Section ${index + 1}`;
        return `${index + 1}. ${title}`;
      })
    : [];
  if (stepTitles.length === 0) {
    return credentialName
      ? `Let's build "${credentialName}". What would you like to include?`
      : 'What would you like to build?';
  }
  const header = credentialName
    ? `I see you've already started building "${credentialName}" with ${stepTitles.length} section${stepTitles.length !== 1 ? 's' : ''}:`
    : `I see you've already built a credential with ${stepTitles.length} section${stepTitles.length !== 1 ? 's' : ''}:`;
  return `${header}\n\n${stepTitles.join('\n')}\n\nWhat would you like to change or add?`;
}

/**
 * AUTHENTICATION STRATEGY:
 * 
 * This function is deployed with --no-verify-jwt flag because Supabase's gateway 
 * JWT verification was failing (returning 401 before reaching function code).
 * 
 * We implement our own JWT verification using the same secure pattern as 
 * submit-application: using SUPABASE_SERVICE_ROLE_KEY to call getUser(token).
 * 
 * This is SECURE because:
 * 1. We require an Authorization header
 * 2. We cryptographically verify the JWT using Supabase's auth.getUser(token)
 * 3. Invalid/expired tokens are rejected with 401
 * 4. All authenticated requests are logged with user email
 * 
 * If gateway JWT starts working in the future, we can remove --no-verify-jwt
 * for defense-in-depth (gateway + function verification).
 */
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Request: ${req.method} ${req.url}`);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] CORS preflight - OK`);
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    // ===== JWT AUTHENTICATION =====
    const authHeader = req.headers.get('Authorization');
    console.log(`[${requestId}] Auth: header=${!!authHeader ? 'present' : 'MISSING'}`);
    
    if (!authHeader) {
      console.error(`[${requestId}] AUTH FAILED: No authorization header`);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify we have Supabase credentials
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${requestId}] CONFIG ERROR: Missing Supabase credentials`);
      throw new Error('Supabase credentials not configured');
    }

    // Create admin client and verify JWT
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    
    // Log token format (not the actual token for security)
    const tokenParts = token.split('.');
    console.log(`[${requestId}] Token: format=${tokenParts.length === 3 ? 'valid JWT' : 'INVALID'}, length=${token.length}`);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error(`[${requestId}] AUTH FAILED: ${authError?.message || 'No user found'}`);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] AUTH OK: user=${user.email}, id=${user.id.slice(0, 8)}...`);

    if (!OPENAI_API_KEY) {
      console.error(`[${requestId}] CONFIG ERROR: OpenAI API key not configured`);
      throw new Error('OpenAI API key not configured');
    }

    // Parse request body with error handling
    let body: RequestBody;
    try {
      const text = await req.text();
      console.log(`[${requestId}] Body: length=${text?.length || 0}`);
      if (!text || text.trim() === '') {
        console.error('Empty request body');
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      body = JSON.parse(text) as RequestBody;
      const parsedMode = (body as { mode?: string }).mode;
      const parsedPromptLength = (body as { prompt?: string }).prompt?.length;
      console.log('Parsed body - mode:', parsedMode, 'prompt length:', parsedPromptLength);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: Summarize existing config for refinement
    if (body.mode === 'summarize_for_refinement') {
      const summarizeBody = body as SummarizeRequest;
      if (!summarizeBody.existingConfig) {
        return new Response(
          JSON.stringify({ error: 'No existing config provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          summary: buildConfigSummary(summarizeBody.existingConfig, summarizeBody.credentialName),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: Chat conversation
    if (body.mode === 'chat' || body.mode === 'refine_existing') {
      const chatBody = body as ChatRequest;
      const { messages, credentialName, existingConfig, componentResponse, pendingDocuments } = chatBody;

      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No messages provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Chat mode - messages:', messages.length);

      // Build conversation for OpenAI
      const stateContext = pendingDocuments?.length
        ? `\n\nCurrent pending documents:\n${JSON.stringify(pendingDocuments, null, 2)}`
        : '';

      const openAIMessages = [
        {
          role: 'system',
          content:
            CHAT_SYSTEM_PROMPT_WITH_DOCUMENTS +
            (credentialName
              ? `\n\nThe credential being created is called "${credentialName}".`
              : ''),
        },
        ...(stateContext
          ? [
              {
                role: 'system',
                content: stateContext,
              },
            ]
          : []),
        ...(existingConfig
          ? [
              {
                role: 'system',
                content: `CURRENT CONFIG (JSON):\n${JSON.stringify(existingConfig)}`,
              },
            ]
          : []),
        ...(componentResponse
          ? [
              {
                role: 'system',
                content: `COMPONENT RESPONSE (structured):\n${JSON.stringify(componentResponse)}`,
              },
            ]
          : []),
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAIMessages,
          temperature: 0.7,
          max_tokens: 2000,  // Increased to allow full configUpdates with Document blocks
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const rawResponse = data.choices[0]?.message?.content;

      if (!rawResponse) {
        throw new Error('No response generated');
      }

      let parsedResponse: {
        type?: string;
        content?: string;
        component?: unknown;
        configUpdates?: unknown;
        hasPendingChanges?: boolean;
      } = {};
      try {
        parsedResponse = JSON.parse(rawResponse);
        console.log(`[${requestId}] AI response parsed - has configUpdates: ${!!parsedResponse.configUpdates}, has component: ${!!parsedResponse.component}`);
        if (parsedResponse.configUpdates) {
          console.log(`[${requestId}] configUpdates steps count: ${(parsedResponse.configUpdates as any)?.steps?.length ?? 'N/A'}`);
        }
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse AI response as JSON:`, parseError);
        parsedResponse = { content: rawResponse };
      }

      const responseText = parsedResponse.content ?? rawResponse;

      // Check if AI indicates it has enough info
      const readyIndicators = [
        'have everything',
        'have enough',
        'ready to generate',
        'click generate',
        'good to go',
        'all set',
      ];
      const readyToGenerate = readyIndicators.some((indicator) =>
        responseText.toLowerCase().includes(indicator)
      );

      return new Response(
        JSON.stringify({
          response: responseText,
          component: parsedResponse.component ?? null,
          configUpdates: parsedResponse.configUpdates ?? null,
          hasPendingChanges:
            typeof parsedResponse.hasPendingChanges === 'boolean'
              ? parsedResponse.hasPendingChanges
              : undefined,
          readyToGenerate,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: Generate from chat conversation
    if (body.mode === 'generate_from_chat' || body.mode === 'refine_from_chat') {
      const chatBody = body as GenerateFromChatRequest;
      const { messages, credentialName, existingConfig } = chatBody;

      if (!messages || messages.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No messages provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Generate from chat mode - messages:', messages.length);

      // Convert conversation to a single context string
      const conversationContext = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const userPrompt = credentialName
        ? `Create an instruction flow for a credential called "${credentialName}" based on this conversation:\n\n${conversationContext}`
        : `Create an instruction flow based on this conversation:\n\n${conversationContext}`;

      const refinementContext =
        body.mode === 'refine_from_chat' && existingConfig
          ? `\n\nCURRENT CONFIG (JSON):\n${JSON.stringify(existingConfig)}\n\nUpdate the existing config based on the conversation. Return the full updated config JSON.`
          : '';

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: GENERATE_FROM_CHAT_PROMPT + '\n\n' + SYSTEM_PROMPT_WITH_DOCUMENTS,
            },
            { role: 'user', content: userPrompt + refinementContext },
          ],
          temperature: 0.5,
          max_tokens: 4000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('Failed to generate instructions');
      }

      const data = await response.json();
      const generatedContent = data.choices[0]?.message?.content;

      if (!generatedContent) {
        throw new Error('No content generated');
      }

      const instructionConfig = JSON.parse(generatedContent);

      if (!instructionConfig.version || !instructionConfig.steps || !Array.isArray(instructionConfig.steps)) {
        throw new Error('Invalid instruction config structure');
      }

      return new Response(
        JSON.stringify({ config: instructionConfig }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy modes below (analyze and generate) - keep for backward compatibility
    const legacyBody = body as AnalyzeRequest | GenerateRequest;
    const { prompt, credentialName } = legacyBody;

    if (!prompt || prompt.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: 'Please provide a more detailed description (at least 10 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode: Analyze prompt and return clarifying questions (legacy)
    if ((body as AnalyzeRequest).mode === 'analyze') {
      const analyzeUserPrompt = credentialName
        ? `Analyze this credential requirement for "${credentialName}":\n\n${prompt}`
        : `Analyze this credential requirement:\n\n${prompt}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Faster model for analysis
          messages: [
            { role: 'system', content: ANALYZE_PROMPT },
            { role: 'user', content: analyzeUserPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('Failed to analyze prompt');
      }

      const data = await response.json();
      const analysisContent = data.choices[0]?.message?.content;

      if (!analysisContent) {
        throw new Error('No analysis generated');
      }

      const analysis = JSON.parse(analysisContent);

      return new Response(
        JSON.stringify({
          analysis: {
            detected_type: analysis.detected_type || 'mixed',
            summary: analysis.summary || 'Credential requirements',
            questions: analysis.questions || [],
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode 2: Generate with clarifications (default)
    let systemPrompt = SYSTEM_PROMPT_WITH_DOCUMENTS;
    let userPrompt = credentialName 
      ? `Create an instruction flow for a credential called "${credentialName}". Here's what it should include:\n\n${prompt}`
      : `Create an instruction flow based on this description:\n\n${prompt}`;

    // If clarifications were provided, add them to the prompt
    if ('clarifications' in legacyBody && legacyBody.clarifications && Object.keys(legacyBody.clarifications).length > 0) {
      systemPrompt = GENERATE_WITH_CLARIFICATIONS_PROMPT + SYSTEM_PROMPT_WITH_DOCUMENTS;
      
      const clarificationLines: string[] = [];
      for (const [questionId, answer] of Object.entries(legacyBody.clarifications)) {
        clarificationLines.push(`- ${questionId}: ${answer ? 'YES' : 'NO'}`);
      }
      
      userPrompt += `\n\n## User's Answers to Clarifying Questions:\n${clarificationLines.join('\n')}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error('Failed to generate instructions');
    }

    const data = await response.json();
    const generatedContent = data.choices[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // Parse and validate the JSON
    const instructionConfig = JSON.parse(generatedContent);

    // Basic validation
    if (!instructionConfig.version || !instructionConfig.steps || !Array.isArray(instructionConfig.steps)) {
      throw new Error('Invalid instruction config structure');
    }

    return new Response(
      JSON.stringify({ config: instructionConfig }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating instructions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate instructions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
