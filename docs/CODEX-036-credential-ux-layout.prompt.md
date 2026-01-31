# CODEX-036: Credential UX Redesign - Notion-Style Scroll Layout

> **Copy this entire document when starting the implementation session.**

---

## Context

We are redesigning the credential detail pages to use a **Notion-style scroll layout** - all steps visible on one seamless scrollable page. The goal is a modern, minimal form experience where sections flow naturally without heavy visual separation.

### Three Usage Contexts (Same Component)

1. **Driver submission** (`readOnly={false}`) - Driver fills out the credential
2. **Admin builder preview** (`readOnly={false}`) - Admin previews what they're building
3. **Admin review** (`readOnly={true}`) - Admin reviews submitted credential

### Design Philosophy: Notion-Style

- **Seamless flow** - Sections flow into each other, minimal visual separation
- **Typography-based hierarchy** - Headers are styled text, not boxed cards
- **Content-first** - Reduce chrome to maximize content visibility
- **No card borders** - Use subtle dividers or whitespace, not boxes around each step
- **Asterisks for required** - No "Required" badges, use `*` on field labels

### Current Problems (From UX Audit)

1. **Heavy card borders** - Each step in a bordered card creates fragmentation
2. **Redundant "Required" badges** - Badge on 5 of 7 steps, visual noise
3. **Inconsistent indicators** - Mix of checkmark icons and numbers
4. **Large upload zones** - Upload controls dominate, previews are tiny
5. **Nested tabs** - Signature block has tabs within the scroll layout
6. **Form fragmentation** - Steps feel like separate forms, not one flow

---

## Visual Target: Notion-Style Form

### Before (Current - Heavy Cards)

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ① Introduction                              [Required]  │ │  ← Card border
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Welcome to the credential...                            │ │
│ │ ⚠️ Important: Please follow...                          │ │
│ │ [Start →]                                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ② Complete Form                             [Required]  │ │  ← Another card
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Name: [____________]                                    │ │
│ │ Age:  [____________]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### After (Notion-Style - Seamless)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Introduction                                                │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Welcome to the credential. This will guide you through     │
│ various tasks.                                              │
│                                                             │
│ ⚠️ Important: Please follow each step carefully.            │
│                                                             │
│ [Start →]                                                   │
│                                                             │
│                                                             │
│ Personal Information                                        │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Name *                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Age *                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                                             │
│ Documents                                                   │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ Identity Document *                                         │
│ [Click to upload]  .pdf · max 5MB                          │
│                                                             │
│                                        [Submit for Review]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Required Changes

### 1. Rewrite InstructionRenderer for Notion-Style Layout

**File:** `src/components/features/credentials/InstructionRenderer/index.tsx`

Key changes:
- **No Card wrappers** - Use dividers between sections
- **No "Required" badges** - Blocks handle their own asterisks
- **Typography-based headers** - `text-lg font-semibold` not CardTitle in a box
- **Consistent spacing** - `space-y-6` between sections, `space-y-3` within

```typescript
import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { BlockRenderer } from '../blocks/BlockRenderer';
import type { CredentialTypeInstructions, InstructionStep } from '@/types/instructionBuilder';
import type { StepProgressData, StepState } from '@/types/credentialProgress';
import {
  createEmptyProgressData,
  getStepState,
  updateStepState as updateStepStateHelper,
  markStepCompleted,
} from '@/types/credentialProgress';

interface InstructionRendererProps {
  config: CredentialTypeInstructions;
  progressData: StepProgressData | null;
  onProgressChange: (data: StepProgressData, currentStepId: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isSubmitting?: boolean;
  readOnly?: boolean;
  submitLabel?: string;
}

export function InstructionRenderer({
  config,
  progressData: externalProgressData,
  onProgressChange,
  onSubmit,
  disabled = false,
  isSubmitting = false,
  readOnly = false,
  submitLabel,
}: InstructionRendererProps) {
  const progressData = externalProgressData ?? createEmptyProgressData();

  // Check if ALL required steps can proceed (for submit button)
  const canSubmit = useMemo(() => {
    return config.steps.every((step) => {
      if (!step.required) return true;
      const stepState = getStepState(progressData, step.id);
      return isStepComplete(step, stepState);
    });
  }, [config.steps, progressData]);

  // Handle state change for a specific step
  const handleStepStateChange = useCallback(
    (stepId: string, updates: Partial<StepState>) => {
      if (disabled) return;
      const newProgressData = updateStepStateHelper(progressData, stepId, updates);
      onProgressChange(newProgressData, stepId);
    },
    [disabled, progressData, onProgressChange]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    
    // Mark all steps as completed
    let newProgressData = progressData;
    config.steps.forEach((step) => {
      newProgressData = markStepCompleted(newProgressData, step.id);
    });
    onProgressChange(newProgressData, config.steps[config.steps.length - 1].id);
    
    onSubmit();
  }, [canSubmit, progressData, config.steps, onProgressChange, onSubmit]);

  // No steps
  if (config.steps.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No instructions configured for this credential.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* All Steps - Notion-style sections */}
      {config.steps.map((step, index) => {
        const stepState = getStepState(progressData, step.id);
        const isFirstStep = index === 0;
        
        return (
          <div key={step.id}>
            {/* Divider between sections (not before first) */}
            {!isFirstStep && <Separator className="mb-6" />}
            
            {/* Section Header - Typography only, no box */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
            </div>
            
            {/* Section Content - Blocks flow naturally */}
            <div className="space-y-4">
              {step.blocks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No content in this section
                </p>
              ) : (
                step.blocks.map((block) => (
                  <BlockRenderer
                    key={block.id}
                    block={block}
                    stepState={stepState}
                    onStateChange={(updates) => handleStepStateChange(step.id, updates)}
                    disabled={disabled || readOnly}
                    readOnly={readOnly}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}

      {/* Submit Button - Sticky footer style */}
      {!readOnly && (
        <div className="flex justify-end pt-4 border-t">
          <Button
            onClick={handleSubmit}
            disabled={disabled || !canSubmit || isSubmitting}
            size="default"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {submitLabel || 'Submit for Review'}
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper function to check if a step is complete
function isStepComplete(step: InstructionStep, stepState: StepState): boolean {
  for (const block of step.blocks) {
    switch (block.type) {
      case 'form_field': {
        const content = block.content as { key: string; required: boolean };
        if (content.required && !stepState.formData[content.key]) {
          return false;
        }
        break;
      }
      case 'file_upload': {
        const content = block.content as { required: boolean };
        if (content.required && stepState.uploadedFiles.length === 0) {
          return false;
        }
        break;
      }
      case 'signature_pad': {
        const content = block.content as { required: boolean };
        if (content.required && !stepState.signatureData) {
          return false;
        }
        break;
      }
      case 'checklist': {
        const content = block.content as { requireAllChecked: boolean; items: { id: string }[] };
        if (content.requireAllChecked) {
          const allChecked = content.items.every(
            (item) => stepState.checklistStates[item.id]
          );
          if (!allChecked) return false;
        }
        break;
      }
      case 'external_link': {
        const content = block.content as { requireVisit: boolean };
        if (content.requireVisit && !stepState.externalLinksVisited.includes(block.id)) {
          return false;
        }
        break;
      }
      case 'video': {
        const content = block.content as { requireWatch: boolean };
        if (content.requireWatch && !stepState.videosWatched[block.id]) {
          return false;
        }
        break;
      }
      case 'quiz_question': {
        const content = block.content as { required: boolean };
        if (content.required && !stepState.quizAnswers[block.id]) {
          return false;
        }
        break;
      }
    }
  }
  return true;
}
```

### 2. Remove Card Imports (No Longer Needed)

The new layout doesn't use Card components. Remove unused imports:

```typescript
// REMOVE these imports:
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { CheckCircle2 } from 'lucide-react';

// ADD this import:
import { Separator } from '@/components/ui/separator';
```

### 3. Block Updates Required

Each block should handle its own "required" indicator using asterisks. Update blocks to:

1. **Remove internal padding** where parent handles spacing
2. **Use asterisk** for required fields: `{label}{required && ' *'}`
3. **Minimal wrappers** - Just the content, no boxing

See `CODEX-038-credential-ux-blocks.prompt.md` for block-specific changes.

---

## Key Differences from Previous Implementation

| Aspect | Old (Card-based) | New (Notion-style) |
|--------|------------------|-------------------|
| **Section wrapper** | `<Card>` with border | `<div>` with `<Separator>` |
| **Header** | `<CardHeader>` with badge | `<h3>` typography only |
| **Required indicator** | Badge: `[Required]` | Asterisk: `Label *` |
| **Spacing** | Card padding + content spacing | Consistent `space-y-4/6` |
| **Visual weight** | Heavy borders around each step | Light dividers between steps |
| **Step numbers** | Circled numbers `①②③` | None (or optional) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/features/credentials/InstructionRenderer/index.tsx` | **Rewrite** - Notion-style with Separator between sections |
| `src/components/features/credentials/blocks/*.tsx` | **Update** - Remove internal padding, use asterisks for required |

**Note:** `StepNavigation.tsx` and `StepProgress.tsx` are no longer used. Can be kept or removed.

---

## Acceptance Criteria

### AC-1: Seamless Scroll Layout
- [ ] All credential sections render on one scrollable page
- [ ] NO card borders around sections
- [ ] Subtle `<Separator />` dividers between sections
- [ ] Sections flow naturally like a Notion page

### AC-2: Typography-Based Headers
- [ ] Section headers are styled text (`text-lg font-semibold`)
- [ ] NO Card wrapper around headers
- [ ] NO circled step numbers (or optional, not required)
- [ ] NO "Required" badges on sections

### AC-3: Asterisk for Required Fields
- [ ] Required fields show `Label *` (asterisk)
- [ ] Each block handles its own required indicator
- [ ] No badges, just inline asterisks

### AC-4: Consistent Spacing
- [ ] `space-y-6` between sections
- [ ] `space-y-4` within sections (between blocks)
- [ ] No extra padding from Card components
- [ ] Clean visual rhythm

### AC-5: Submit Button
- [ ] Single submit button at bottom
- [ ] Has `border-t` separator above
- [ ] Disabled until all required fields complete

### AC-6: Admin Review (readOnly)
- [ ] All sections visible at once
- [ ] No submit button
- [ ] Form fields show values as read-only text
- [ ] No upload zones (just previews)

### AC-7: No Regression
- [ ] Driver portal: Can complete credentials
- [ ] Admin review: Can see all submitted data
- [ ] Builder preview: Preview matches driver experience
- [ ] Progress saved correctly per section

---

## Test Scenarios

### Scenario 1: Visual - No Card Borders

1. Navigate to any multi-step credential
2. **Verify:** NO visible card borders around sections
3. **Verify:** Subtle horizontal lines (Separator) between sections
4. **Verify:** Headers are plain text, not in boxes
5. **Verify:** Flows like a Notion page

### Scenario 2: Visual - Required Fields

1. Navigate to credential with required fields
2. **Verify:** Required fields show `Label *` format
3. **Verify:** NO "Required" badge in section headers
4. **Verify:** Asterisks are inline with labels

### Scenario 3: "Test of All" Credential (7 sections)

1. Navigate to `/admin/drivers/{id}/credentials/{testOfAllId}`
2. **Verify:** All 7 sections visible on one page
3. **Verify:** Sections: Introduction, Form, Documents, Signature, Checklist, External, Admin
4. **Verify:** Can scroll smoothly through all sections
5. **Verify:** Form feels like ONE form, not 7 separate cards
6. Fill out all fields
7. **Verify:** Submit button enables
8. Submit and **verify:** Works correctly

### Scenario 4: Admin Review

1. Navigate to admin portal → Pending Reviews → select credential
2. **Verify:** All sections visible at once
3. **Verify:** No submit button
4. **Verify:** Form fields show submitted values
5. **Verify:** Approve/Reject works

### Scenario 5: Builder Preview

1. Navigate to admin → Credential Types → edit type → Preview
2. **Verify:** Preview shows Notion-style layout
3. **Verify:** Matches what driver will see
4. **Verify:** Can interact with preview

### Scenario 6: Mobile (375px width)

1. Open credential on mobile viewport
2. **Verify:** Layout adapts, no horizontal scroll
3. **Verify:** Sections still flow seamlessly
4. **Verify:** Submit button visible and usable

---

## Before/After Comparison

### Before: Heavy Card Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ① Introduction                              [Required]  │ │  ← Card border
│ ├─────────────────────────────────────────────────────────┤ │  ← Card header
│ │ Welcome text...                                         │ │
│ └─────────────────────────────────────────────────────────┘ │  ← Card border
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ② Complete Form                             [Required]  │ │  ← Another card
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Name: [____________]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### After: Notion-Style Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│ Introduction                                                │
│ ─────────────────────────────────────────────────────────── │  ← Subtle separator
│                                                             │
│ Welcome text...                                             │
│                                                             │
│                                                             │
│ Personal Information                                        │
│ ─────────────────────────────────────────────────────────── │  ← Subtle separator
│                                                             │
│ Name *                                                      │  ← Asterisk on label
│ [_______________________________________________]           │
│                                                             │
│ Age *                                                       │
│ [_______________________________________________]           │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                        [Submit for Review]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Notes

1. **No Card imports** - Remove Card, CardHeader, CardContent imports
2. **Separator component** - Use `@/components/ui/separator`
3. **Typography headers** - `<h3 className="text-lg font-semibold">`
4. **Block responsibility** - Each block handles its own asterisk for required
5. **Spacing rhythm** - `space-y-6` between sections, `space-y-4` within
6. **Submit footer** - `border-t` above submit button area

---

## Related Documents

- `CODEX-037-credential-ux-document-preview.prompt.md` - Preview component improvements
- `CODEX-038-credential-ux-blocks.prompt.md` - Block-specific changes for Notion style
- `UX-AUDIT-credential-scroll-layout.md` - Original UX audit findings
