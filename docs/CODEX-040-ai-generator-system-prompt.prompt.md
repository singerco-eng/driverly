# CODEX-040: Update AI Credential Generator System Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

The `generate-credential-instructions` edge function uses OpenAI to generate credential configurations from plain-text descriptions. The system prompt needs to be updated to align with our new **invisible sections** UX strategy (CODEX-039).

### Key Change

The AI must understand that **sections are invisible containers**. Drivers see a continuous flow of blocks, not section headers. The AI should:

1. Create fewer sections (most credentials need only 1-2)
2. Only add heading blocks for complex multi-section credentials
3. Avoid redundant structure

### Reference Document

The full updated system prompt is documented in:
**`docs/AI-SYSTEM-PROMPT-credential-generator.md`**

---

## Current State

**File:** `supabase/functions/generate-credential-instructions/index.ts`

The current `SYSTEM_PROMPT` has these issues:

1. **No mention of invisible sections** - AI doesn't know sections are invisible to drivers
2. **Encourages step-centric thinking** - "Each step has a title" suggests visible headers
3. **No guidance on section count** - AI creates too many sections for simple credentials
4. **Conflicting heading rules** - Says "don't start with heading" but doesn't explain when to use them

---

## Required Changes

### 1. Replace SYSTEM_PROMPT Constant

Open `supabase/functions/generate-credential-instructions/index.ts` and replace the entire `SYSTEM_PROMPT` constant with the updated version from `docs/AI-SYSTEM-PROMPT-credential-generator.md`.

The new prompt includes:

- **Invisible sections principle** explained upfront
- **Section creation rules** (when to use 1 vs multiple)
- **Heading block guidance** (use only for complex credentials)
- **Three complete examples** (simple, complex, external)
- **Anti-patterns** to avoid

### 2. Verify JSON Schema Alignment

Ensure the schema in the prompt matches `src/types/instructionBuilder.ts`:

```typescript
interface CredentialTypeInstructions {
  version: 2;
  settings: InstructionSettings;
  steps: InstructionStep[];
}

interface InstructionStep {
  id: string;
  order: number;
  title: string;           // Admin-only, not rendered
  type: StepType;
  required: boolean;
  blocks: ContentBlock[];
  conditions: StepCondition[];
  completion: StepCompletion;
}
```

### 3. Update Temperature (Optional)

Consider lowering temperature from 0.7 to 0.5 for more consistent output:

```typescript
// Current
temperature: 0.7,

// Recommended
temperature: 0.5,
```

Lower temperature = more predictable structure, which is good for JSON generation.

---

## Implementation

### Step 1: Read the System Prompt Document

```bash
# Review the full system prompt
cat docs/AI-SYSTEM-PROMPT-credential-generator.md
```

### Step 2: Update the Edge Function

**File:** `supabase/functions/generate-credential-instructions/index.ts`

Replace the `SYSTEM_PROMPT` constant (lines ~10-89) with the new version.

Key sections in the new prompt:
1. Critical design principle (invisible sections)
2. Output schema
3. Block types reference
4. Section creation rules
5. Block ordering rules
6. Three complete examples
7. Anti-patterns

### Step 3: Deploy the Function

```bash
supabase functions deploy generate-credential-instructions
```

### Step 4: Test the Changes

Test with these prompts in the AI Generator Sheet:

| Test | Prompt | Expected Output |
|------|--------|-----------------|
| Simple | "Upload driver's license front and back with expiration" | 1 section, NO headings, 2 uploads + 1 date |
| Medium | "Insurance card with policy number and provider info" | 1 section, NO headings, 1 upload + 3 form fields |
| Complex | "Safety training with video, quiz, and signature" | 3 sections, headings at each section |
| External | "Background check through Checkr" | 1 section, external link + alert |

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-credential-instructions/index.ts` | Replace `SYSTEM_PROMPT` constant |

---

## Acceptance Criteria

### AC-1: System Prompt Updated
- [ ] `SYSTEM_PROMPT` replaced with new version
- [ ] Invisible sections principle is first major section
- [ ] Three examples included (simple, complex, external)
- [ ] Anti-patterns section included

### AC-2: Simple Credentials Generate Correctly
- [ ] "Upload license" → 1 section, NO heading blocks
- [ ] "Insurance card" → 1 section, NO heading blocks
- [ ] Block labels are specific (not "Document 1")

### AC-3: Complex Credentials Generate Correctly
- [ ] "Training with video, quiz, signature" → 3 sections
- [ ] Each section starts with heading block
- [ ] Progress bar enabled (showProgressBar: true)

### AC-4: Edge Function Deploys Successfully
- [ ] `supabase functions deploy` completes without errors
- [ ] Function responds to requests
- [ ] JSON output is valid

---

## Test Scenarios

### Scenario 1: Simple Document Upload

**Input:** "I need drivers to upload their driver's license, front and back, with the expiration date"

**Expected Output:**
```json
{
  "version": 2,
  "settings": {
    "showProgressBar": false,
    "allowStepSkip": false,
    "completionBehavior": "required_only",
    "externalSubmissionAllowed": false
  },
  "steps": [{
    "id": "...",
    "title": "License Upload",
    "type": "document_upload",
    "required": true,
    "blocks": [
      { "type": "file_upload", "content": { "label": "Front of License", ... }},
      { "type": "file_upload", "content": { "label": "Back of License", ... }},
      { "type": "form_field", "content": { "key": "expiration_date", "label": "Expiration Date", "type": "date", ... }}
    ]
  }]
}
```

**Verify:**
- Only 1 section
- NO heading blocks
- NO paragraph blocks (labels are sufficient)
- showProgressBar is false (only 1 section)

### Scenario 2: Vehicle Registration

**Input:** "Vehicle registration document with plate number and expiration"

**Expected Output:**
- 1 section
- Blocks: file_upload, form_field (plate), form_field (date)
- NO headings

### Scenario 3: Insurance Card

**Input:** "Insurance card upload with policy number, provider name, and expiration date"

**Expected Output:**
- 1 section
- Blocks: file_upload, form_field (policy), form_field (provider), form_field (date)
- NO headings

### Scenario 4: Training Course

**Input:** "Create a safety training with a YouTube video to watch, 3 quiz questions, and a signature acknowledgment"

**Expected Output:**
- 3 sections (video, quiz, acknowledgment)
- Each section has a heading block at the start
- Video section: heading + paragraph + video
- Quiz section: heading + 3 quiz_questions
- Acknowledgment section: heading + checklist + signature_pad
- showProgressBar is true

### Scenario 5: External Verification

**Input:** "Background check through Checkr that the driver starts and admin verifies"

**Expected Output:**
- 1 section
- Blocks: paragraph (brief), external_link, alert (info)
- NO heading (simple credential)

### Scenario 6: Drug Test (Admin Verified)

**Input:** "Drug test that the admin marks as complete, no driver action needed"

**Expected Output:**
- 1 section
- type: "admin_verify"
- Blocks: paragraph explaining admin will verify
- NO input blocks

---

## Rollback Plan

If issues occur after deployment:

1. The previous `SYSTEM_PROMPT` is in git history
2. Revert the change and redeploy:
   ```bash
   git checkout HEAD~1 -- supabase/functions/generate-credential-instructions/index.ts
   supabase functions deploy generate-credential-instructions
   ```

---

## Related Documents

- `docs/AI-SYSTEM-PROMPT-credential-generator.md` - Full system prompt text
- `docs/CODEX-039-credential-ux-invisible-sections.prompt.md` - UX implementation
- `src/types/instructionBuilder.ts` - TypeScript schema
- `src/components/features/admin/credential-builder/AIGeneratorSheet.tsx` - UI component
