QC# CODEX-038: Credential UX Redesign - Block Components Plan

> **Master plan for all 14 block components in the Notion-style scroll layout.**
>
> **Prerequisite:** CODEX-036 (Notion-Style Layout) should be implemented first.

---

## Overview

The Notion-style scroll layout (CODEX-036) renders ALL credential sections on one seamless page. Each section contains blocks rendered by `BlockRenderer`. This document provides a specialized plan for each block type to achieve the seamless, minimal Notion aesthetic.

### Key Principle: Blocks Are Content-Only

In the Notion-style layout:
- **Parent handles spacing** - `InstructionRenderer` uses `space-y-4` between blocks
- **Blocks are minimal** - No wrapper padding, no boxing
- **Asterisks for required** - Each block shows `Label *` for required fields
- **Typography-based** - Labels are styled text, not boxed elements

### Block Categories

| Category | Blocks | Behavior |
|----------|--------|----------|
| **Content** | Heading, Paragraph, RichText, Image, Video, Alert, Divider, Button | Display content, minimal interaction |
| **Input** | FormField, FileUpload, Signature, Checklist, Quiz, ExternalLink | Collect user input, have readOnly mode |

### Current Issues (from UX Audit)

1. **Wrapper padding** - Many blocks have `p-3`, `p-4` that conflicts with parent spacing
2. **"Required" badges** - Blocks show badges instead of asterisks
3. **Large upload zones** - FileUploadBlock dominates with large drop zone
4. **Nested tabs** - SignatureBlock has tabs that add visual weight
5. **Height inconsistency** - Video is 16:9 fixed, previews are 150-200px

---

## Block-by-Block Plan

### 1. HeadingBlock

**Current:** Renders h1/h2/h3 based on level, no wrapper spacing.

**Issues:**
- No spacing wrapper (relies on parent space-y-3)
- No readOnly prop (not needed but should accept for consistency)

**Changes:**
- None required - works well as-is in scroll layout

**Priority:** Low (no changes needed)

---

### 2. ParagraphBlock

**Current:** Renders text with `text-muted-foreground leading-relaxed`.

**Issues:**
- No spacing wrapper

**Changes:**
- None required - simple text display

**Priority:** Low (no changes needed)

---

### 3. RichTextBlock

**Current:** Uses `prose prose-sm` with `dangerouslySetInnerHTML`.

**Issues:**
- Has `p-4` padding which may conflict with parent spacing
- No sanitization visible (potential XSS risk)

**Changes:**
- Consider removing `p-4` padding (parent provides spacing)
- Verify HTML is sanitized before rendering

**Priority:** Medium

```tsx
// Current:
<div className="p-4 bg-muted/30 rounded-lg">
  <div className="prose prose-sm..." dangerouslySetInnerHTML={...} />
</div>

// Proposed:
<div className="bg-muted/30 rounded-lg">
  <div className="prose prose-sm p-4..." dangerouslySetInnerHTML={...} />
</div>
```

---

### 4. ImageBlock

**Current:** Displays image with optional caption.

**Issues:**
- No max-height constraint - large images could dominate the scroll
- No lazy loading

**Changes:**
- Add `max-h-80` (320px) constraint
- Add `loading="lazy"` attribute
- Keep click-to-expand (future: integrate with DocumentViewerModal)

**Priority:** Medium

```tsx
// Proposed:
<img
  src={content.url}
  alt={content.alt}
  className="rounded-lg max-w-full max-h-80 object-contain"
  loading="lazy"
/>
```

---

### 5. VideoBlock

**Current:** Embeds YouTube/Vimeo with watch tracking. Uses `aspect-video` (16:9).

**Issues:**
- 16:9 aspect can be very tall in scroll layout
- Tracking logic complex

**Changes:**
- Add max-height constraint: `max-h-64` (256px) or `max-h-80` (320px)
- Consider lazy loading for iframes
- Keep watch tracking for required videos

**Priority:** Medium

```tsx
// Proposed:
<div className="relative rounded-lg overflow-hidden max-h-80">
  <div className="aspect-video">
    {/* iframe */}
  </div>
</div>
```

---

### 6. AlertBlock

**Current:** Uses Alert component with variants (info/warning/success/error).

**Issues:**
- None significant - Alert component handles sizing well

**Changes:**
- None required

**Priority:** Low (no changes needed)

---

### 7. DividerBlock

**Current:** Renders `<Separator className="my-2" />`.

**Issues:**
- `my-2` may conflict with parent `space-y-3`

**Changes:**
- Remove `my-2` (parent provides spacing) or keep minimal margin

**Priority:** Low

```tsx
// Proposed:
<Separator className="my-1" />
```

---

### 8. ButtonBlock

**Current:** Renders action buttons (next step, external link, etc.).

**Issues:**
- No readOnly prop (buttons should be hidden or disabled in review mode)

**Changes:**
- Add readOnly prop support - hide or disable buttons
- Ensure external links work in readOnly mode

**Priority:** Medium

```tsx
// Proposed:
export function ButtonBlock({ content, readOnly }: ButtonBlockProps) {
  if (readOnly && content.action !== 'external_link') return null;
  // ... render button
}
```

---

### 9. FormFieldBlock

**Current:** Renders various input types (text, textarea, select, date, etc.).

**Issues:**
- Textarea has fixed `rows={4}` - may be too small or too large
- readOnly mode disables inputs but could show cleaner read-only display

**Changes:**
- In readOnly mode, show value as text instead of disabled input
- Make textarea height responsive

**Priority:** High

```tsx
// Proposed readOnly mode:
if (readOnly) {
  return (
    <div className="space-y-1">
      <Label>{content.label}</Label>
      <p className="text-sm py-2 px-3 bg-muted/50 rounded-md">
        {value || <span className="text-muted-foreground">Not provided</span>}
      </p>
    </div>
  );
}
```

---

### 10. FileUploadBlock

**Current:** File upload with DocumentPreview. Different heights for edit (150) vs readOnly (200).

**Issues:**
- Preview heights too small
- Upload zone dominates in edit mode

**Changes (CODEX-037):**
- Increase preview height to 300-350px
- In edit mode: Show large preview, compact upload button below
- In readOnly mode: Just show large preview (350px)
- Add click-to-expand via DocumentViewerModal

**Priority:** Critical (covered in CODEX-037)

```tsx
// Proposed structure:
<div className="space-y-2">
  <Label>{content.label}</Label>
  
  {/* Large preview first */}
  {hasFiles && (
    <DocumentPreview 
      paths={uploadedPaths} 
      maxPreviewHeight={350}
      expandable={true}
    />
  )}
  
  {/* Compact upload controls (only in edit mode) */}
  {!readOnly && (
    <FileDropZone compact={true} />
  )}
</div>
```

---

### 11. SignatureBlock

**Current:** Tabs for typed/drawn signature with h-32 (128px) canvas.

**Issues:**
- Tabs layout adds height
- Canvas is small for accurate signatures

**Changes:**
- In readOnly mode: Show signature full-width, no tabs
- In edit mode: Keep tabs but consider larger canvas (h-40 or h-48)
- Show signature larger in review

**Priority:** High

```tsx
// Proposed readOnly mode:
if (readOnly) {
  return (
    <div className="space-y-2">
      <Label>{content.label}</Label>
      {signatureData ? (
        <div className="border rounded-lg bg-white p-4">
          <img 
            src={signatureData} 
            alt="Signature" 
            className="max-h-32 mx-auto"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
          No signature provided
        </p>
      )}
    </div>
  );
}
```

---

### 12. ChecklistBlock

**Current:** Interactive checkboxes with "must check all" requirement.

**Issues:**
- Works well, good spacing

**Changes:**
- In readOnly mode, show checked/unchecked icons instead of disabled checkboxes
- Cleaner visual for review

**Priority:** Medium

```tsx
// Proposed readOnly item:
{readOnly ? (
  isChecked ? (
    <CheckCircle2 className="w-4 h-4 text-green-600" />
  ) : (
    <Circle className="w-4 h-4 text-muted-foreground" />
  )
) : (
  <Checkbox checked={isChecked} onCheckedChange={...} />
)}
```

---

### 13. QuizQuestionBlock

**Current:** Multiple choice/true-false questions with feedback.

**Issues:**
- `space-y-4` and `p-4` - largest spacing of all blocks
- Shows correct/incorrect feedback

**Changes:**
- Reduce to `space-y-3` for consistency
- In readOnly, show selected answer clearly with correct/incorrect status

**Priority:** Medium

---

### 14. ExternalLinkBlock

**Current:** Button to open external URL with visit tracking.

**Issues:**
- `p-3` padding may conflict with parent

**Changes:**
- Remove `p-3` wrapper, let parent handle spacing
- In readOnly, show link as clickable (still useful to view)

**Priority:** Low

---

## Implementation Priority

### Phase 1: Critical (CODEX-037)
| Block | Priority | Reason |
|-------|----------|--------|
| **FileUploadBlock** | Critical | Core UX issue - tiny previews |
| **DocumentPreview** | Critical | Used by FileUploadBlock |

### Phase 2: High Priority
| Block | Priority | Reason |
|-------|----------|--------|
| **FormFieldBlock** | High | readOnly display needs improvement |
| **SignatureBlock** | High | Signature display too small in review |

### Phase 3: Medium Priority
| Block | Priority | Reason |
|-------|----------|--------|
| **ImageBlock** | Medium | Needs max-height constraint |
| **VideoBlock** | Medium | Too tall in scroll layout |
| **RichTextBlock** | Medium | Padding conflicts |
| **ChecklistBlock** | Medium | Visual improvement for readOnly |
| **QuizQuestionBlock** | Medium | Spacing consistency |
| **ButtonBlock** | Medium | readOnly support |

### Phase 4: Low Priority
| Block | Priority | Reason |
|-------|----------|--------|
| **HeadingBlock** | Low | Works fine |
| **ParagraphBlock** | Low | Works fine |
| **AlertBlock** | Low | Works fine |
| **DividerBlock** | Low | Minor spacing tweak |
| **ExternalLinkBlock** | Low | Minor padding tweak |

---

## Standardization Guidelines

### Spacing
All blocks should follow these spacing rules:
- No outer wrapper spacing (parent provides `space-y-3`)
- Internal spacing: `space-y-2` for tight, `space-y-3` for normal
- Padding for contained elements: `p-3` or `p-4`

### Heights
Recommended max heights for scroll layout:
- **ImageBlock**: `max-h-80` (320px)
- **VideoBlock**: `max-h-80` (320px) 
- **FileUploadBlock preview**: 350px
- **SignatureBlock canvas**: `h-40` (160px)
- **SignatureBlock display**: `max-h-32` (128px)

### readOnly Mode
All interactive blocks should:
1. Accept `readOnly?: boolean` prop
2. In readOnly mode:
   - Show submitted values as styled text, not disabled inputs
   - Hide action buttons (unless viewing external links)
   - Show completion status (checkmarks, badges)
   - Make file/image previews larger and expandable

---

## CODEX Breakdown

| CODEX | Focus | Blocks |
|-------|-------|--------|
| **037** | DocumentPreview + FileUploadBlock | FileUploadBlock, DocumentPreview |
| **038a** | Input Block Improvements | FormFieldBlock, SignatureBlock |
| **038b** | Media Block Improvements | ImageBlock, VideoBlock |
| **038c** | Interactive Block Improvements | ChecklistBlock, QuizQuestionBlock, ButtonBlock |
| **039** | Content Block Cleanup | HeadingBlock, ParagraphBlock, RichTextBlock, AlertBlock, DividerBlock, ExternalLinkBlock |

---

## Notion-Style Guidelines for All Blocks

### Required Fields Pattern

All blocks with required content should use asterisks:

```tsx
// Pattern for labels with required indicator
<Label>
  {content.label}
  {content.required && <span className="text-destructive ml-0.5">*</span>}
</Label>
```

### No Wrapper Padding

Blocks should NOT add their own outer padding:

```tsx
// ❌ BAD - Block has wrapper padding
export function SomeBlock({ content }) {
  return (
    <div className="p-4 space-y-2 border rounded-lg">
      {/* content */}
    </div>
  );
}

// ✅ GOOD - Minimal wrapper, parent handles spacing
export function SomeBlock({ content }) {
  return (
    <div className="space-y-2">
      {/* content */}
    </div>
  );
}
```

### readOnly Mode Pattern

All input blocks should show clean read-only display:

```tsx
// ✅ GOOD - Clean readOnly display
if (readOnly) {
  return (
    <div className="space-y-1">
      <Label className="text-sm text-muted-foreground">{content.label}</Label>
      <p className="text-sm">
        {value || <span className="text-muted-foreground italic">Not provided</span>}
      </p>
    </div>
  );
}
```

### Height Constraints

Media blocks should have max-height to prevent dominating scroll:

```tsx
// Images and videos
<img className="max-h-80 object-contain" />
<div className="aspect-video max-h-80" />
```

---

## Testing Checklist

For each block, verify:
- [ ] **No outer padding** - Parent handles spacing
- [ ] **Asterisk for required** - `Label *` format
- [ ] **Clean readOnly mode** - Values as text, not disabled inputs
- [ ] **Consistent spacing** - `space-y-2` internal spacing
- [ ] **Max heights** - Media blocks don't dominate
- [ ] **Mobile friendly** - Works at 375px width
- [ ] **State saves** - Progress persists correctly

---

## Related Documents

- `CODEX-036-credential-ux-layout.prompt.md` - Notion-style layout implementation
- `CODEX-037-credential-ux-document-preview.prompt.md` - Preview component improvements
- `UX-AUDIT-credential-scroll-layout.md` - Original UX audit findings
