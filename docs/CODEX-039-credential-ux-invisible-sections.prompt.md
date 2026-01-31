# CODEX-039: Credential UX - Soft Section Groups & Breathing Room

> **Copy this entire document when starting the implementation session.**

---

## Context

We are finalizing the credential form experience with a focus on **breathing room** and **visual clarity**. The key insight: Pure "no cards" creates a cramped wall of inputs. Instead, we use **soft section groups** that provide structure without heavy borders.

### Design Principles

1. **Soft section groups** - Subtle `bg-muted/30` containers with generous padding
2. **Generous spacing** - `space-y-10` between sections, `space-y-6` within
3. **Headings are blocks** - Admin adds `heading` blocks for visual breaks within sections
4. **Progress is section-based** - "2 of 3 sections" in sticky header
5. **Clean blocks** - Simplified signature, external link, checklist styling

### Three Usage Contexts (Same Component)

1. **Driver submission** (`readOnly={false}`) - Driver fills out flowing form
2. **Admin builder preview** (`readOnly={false}`) - Admin previews the flow
3. **Admin review** (`readOnly={true}`) - Admin reviews submitted data

---

## Current vs New Behavior

### Current (Cramped, No Visual Grouping)

```
┌─────────────────────────────────────────────────────────┐
│ First Name *                                            │
│ [_______________] ← 16px gap                            │
│ Last Name *                                             │
│ [_______________] ← 16px gap                            │
│ Email *                                                 │
│ [_______________] ← 16px gap                            │
│ Front of License *                                      │
│ [Upload zone]     ← Everything runs together            │
│ Sign Here *                                             │
│ [Signature]                                             │
└─────────────────────────────────────────────────────────┘
```

### New (Soft Section Groups, Breathing Room)

```
┌─────────────────────────────────────────────────────────┐
│ Driver's License                        2 of 3 sections │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ ┌─ soft bg, rounded, p-6 ─────────────────────────────┐ │
│ │                                                     │ │
│ │  First Name *                                       │ │
│ │  [_______________]                                  │ │
│ │                         ← 24px gap within section   │ │
│ │  Last Name *                                        │ │
│ │  [_______________]                                  │ │
│ │                                                     │ │
│ │  Email *                                            │ │
│ │  [_______________]                                  │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│              ↑ 40px gap between sections ↑              │
│                                                         │
│ ┌─ soft bg, rounded, p-6 ─────────────────────────────┐ │
│ │                                                     │ │
│ │  Front of License *                                 │ │
│ │  ┌─────────────────────────────────────────────┐   │ │
│ │  │     Click to upload or drag and drop        │   │ │
│ │  └─────────────────────────────────────────────┘   │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                                   [Submit for Review]   │
└─────────────────────────────────────────────────────────┘
```

**Soft section groups** provide visual structure and breathing room.

---

## Required Changes

### 1. Rewrite InstructionRenderer - Flatten Blocks

**File:** `src/components/features/credentials/InstructionRenderer/index.tsx`

Key changes:
- Remove section header rendering
- Remove auto-dividers between sections
- Flatten all blocks into single continuous flow
- Add sticky progress header

```tsx
export function InstructionRenderer({
  config,
  progressData,
  onProgressChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  readOnly = false,
  submitLabel,
  credentialName,
}: InstructionRendererProps) {
  // Calculate section-based progress
  const { completedSections, totalSections, percentComplete } = useMemo(() => {
    const total = config.steps.filter(s => s.required).length;
    const completed = config.steps.filter(step => {
      if (!step.required) return true;
      return isSectionComplete(step, getStepState(progressData, step.id));
    }).length;
    return {
      completedSections: completed,
      totalSections: total,
      percentComplete: total > 0 ? Math.round((completed / total) * 100) : 100,
    };
  }, [config.steps, progressData]);

  // Flatten all blocks with section context
  const allBlocks = useMemo(() => {
    return config.steps.flatMap((step) =>
      step.blocks.map((block) => ({
        block,
        stepId: step.id,
        stepRequired: step.required,
      }))
    );
  }, [config.steps]);

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Progress Header */}
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{credentialName}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{completedSections} of {totalSections} sections</span>
            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Flowing Blocks */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {allBlocks.map(({ block, stepId, stepRequired }) => (
            <BlockRenderer
              key={block.id}
              block={block}
              stepState={getStepState(progressData, stepId)}
              onStateChange={(updates) => handleStepStateChange(stepId, updates)}
              disabled={disabled || readOnly}
              readOnly={readOnly}
              sectionRequired={stepRequired}
            />
          ))}
        </div>
      </div>

      {/* Submit Footer */}
      {!readOnly && (
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <div className="max-w-2xl mx-auto flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={disabled || !canSubmit || isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {submitLabel || 'Submit for Review'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 2. Update Block Spacing

All blocks should have consistent spacing. Parent uses `space-y-4`.

Blocks should NOT add their own outer margins. Internal spacing only.

### 3. Heading Block - Visual Section Breaks

When admin wants a visual section, they add a `heading` block:

```tsx
// HeadingBlock.tsx - no changes needed
// Just renders h1/h2/h3 based on level
// This IS the section header when admin wants one
```

### 4. Divider Block - Visual Separation

When admin wants a line between content:

```tsx
// DividerBlock.tsx - no changes needed
// Just renders <Separator />
// This IS the divider when admin wants one
```

### 5. Progress Calculation

Progress is based on **sections** (steps), not individual blocks:

```tsx
function isSectionComplete(step: InstructionStep, state: StepState): boolean {
  // A section is complete when ALL required blocks in it are satisfied
  for (const block of step.blocks) {
    if (!isBlockSatisfied(block, state)) {
      return false;
    }
  }
  return true;
}

function isBlockSatisfied(block: ContentBlock, state: StepState): boolean {
  switch (block.type) {
    case 'form_field': {
      const content = block.content as FormFieldBlockContent;
      if (content.required && !state.formData[content.key]) return false;
      break;
    }
    case 'file_upload': {
      const content = block.content as FileUploadBlockContent;
      if (content.required && state.uploadedFiles.length === 0) return false;
      break;
    }
    case 'signature_pad': {
      const content = block.content as SignaturePadBlockContent;
      if (content.required && !state.signatureData) return false;
      break;
    }
    case 'checklist': {
      const content = block.content as ChecklistBlockContent;
      if (content.requireAllChecked) {
        const allChecked = content.items.every(item => state.checklistStates[item.id]);
        if (!allChecked) return false;
      }
      break;
    }
    case 'video': {
      const content = block.content as VideoBlockContent;
      if (content.requireWatch && !state.videosWatched[block.id]) return false;
      break;
    }
    case 'external_link': {
      const content = block.content as ExternalLinkBlockContent;
      if (content.requireVisit && !state.externalLinksVisited.includes(block.id)) return false;
      break;
    }
    case 'quiz_question': {
      const content = block.content as QuizQuestionBlockContent;
      if (content.required && !state.quizAnswers[block.id]) return false;
      break;
    }
    // Content blocks (heading, paragraph, alert, etc.) don't affect completion
  }
  return true;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/features/credentials/InstructionRenderer/index.tsx` | Flatten blocks, add sticky header, remove section chrome |
| `src/components/features/credentials/blocks/*.tsx` | Ensure no outer margins, consistent internal spacing |
| `src/pages/driver/CredentialDetail.tsx` | Pass credentialName to renderer |
| `src/pages/admin/DriverCredentialDetail.tsx` | Pass credentialName to renderer |

---

## Acceptance Criteria

### AC-1: Invisible Sections
- [ ] No section headers auto-rendered
- [ ] No dividers auto-rendered between sections
- [ ] Blocks flow continuously
- [ ] Section exists in data model but not in UI

### AC-2: Sticky Progress Header
- [ ] Shows credential name on left
- [ ] Shows "X of Y sections" on right
- [ ] Progress bar visualizes completion
- [ ] Sticky at top during scroll

### AC-3: Block Flow
- [ ] All blocks render in single stream
- [ ] `space-y-4` between blocks
- [ ] No extra chrome from sections
- [ ] Heading blocks create visual sections when present

### AC-4: Section-Based Progress
- [ ] Progress calculated per section (step)
- [ ] Section complete = all required blocks satisfied
- [ ] Optional sections don't block submission

### AC-5: Submit Footer
- [ ] Sticky at bottom
- [ ] Enabled when all required sections complete
- [ ] Shows loading state during submission

---

## Test Scenarios

### Scenario 1: Simple Credential (1 Section, No Headings)

1. Create credential with 1 section containing: file_upload, form_field (date)
2. No heading blocks added
3. **Verify:** Driver sees pure flowing form - upload zone, date field, submit
4. **Verify:** No section header visible
5. **Verify:** Progress shows "0 of 1 sections" → "1 of 1 sections"

### Scenario 2: Complex Credential (3 Sections with Headings)

1. Create credential with 3 sections
2. Each section starts with a heading block
3. **Verify:** Driver sees heading blocks as visual section breaks
4. **Verify:** No auto-headers, only the heading blocks admin added
5. **Verify:** Progress shows "0 of 3 sections" → ... → "3 of 3 sections"

### Scenario 3: Mixed Sections

1. Create credential: Section 1 (no heading), Section 2 (has heading)
2. **Verify:** Section 1 blocks flow with no header
3. **Verify:** Section 2 heading block appears, then its blocks
4. **Verify:** Feels like one section visually, but progress tracks both

### Scenario 4: Optional Section

1. Create credential: Section 1 (required), Section 2 (optional)
2. Fill Section 1 only
3. **Verify:** Submit button enabled (optional section doesn't block)
4. **Verify:** Progress shows "1 of 1 sections" (optional not counted in required)

---

## Visual Reference

### Progress Header States

```
// Not started
Driver's License                          0 of 2 sections
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// In progress  
Driver's License                          1 of 2 sections
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

// Complete
Driver's License                          2 of 2 sections
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
████████████████████████████████████████████████████████
```

---

## Data Model Reference

### InstructionStep (Section)

```typescript
interface InstructionStep {
  id: string;
  order: number;
  title: string;        // Admin-only, NOT rendered to driver
  type: StepType;       // Legacy, may deprecate
  required: boolean;    // Does this section block submission?
  blocks: ContentBlock[];
  conditions: StepCondition[];
  completion: StepCompletion;
}
```

### Key Point: `title` is NOT rendered

The `step.title` is for admin organization in the builder. Drivers never see it.
If admin wants a visual header, they add a `heading` block.

---

## Related Documents

- `CODEX-036-credential-ux-layout.prompt.md` - Original Notion-style concept
- `CODEX-037-credential-ux-document-preview.prompt.md` - Document preview improvements
- `CODEX-038-credential-ux-blocks.prompt.md` - Block-level changes
- `.cursor/rules/credential-builder.md` - AI rules for credential construction
