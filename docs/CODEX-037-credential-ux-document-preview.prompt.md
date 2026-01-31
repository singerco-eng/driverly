# CODEX-037: Credential UX Redesign - Phase 2: DocumentPreview Enhancement

> **Copy this entire document when starting the implementation session.**
> 
> **Prerequisite:** CODEX-036 (Scroll Card Layout) should be implemented first.

---

## Context

We are redesigning the credential detail pages to be **preview-first** instead of **upload-first**. With the new **scroll card layout** (CODEX-036), all steps are now visible on one scrollable page. This makes large, high-quality document previews even more important - users can now see ALL uploaded documents at a glance.

### Scroll Layout Context (from CODEX-036)

The `InstructionRenderer` now renders ALL steps as cards on one scrollable page:
- All upload blocks are visible at once
- Admin review shows all submitted documents without clicking through steps
- Each file upload block should have a large, inspectable preview

### Design Philosophy

The same `InstructionRenderer` component is used across three contexts:
1. **Driver submission** (`readOnly={false}`) - Large previews to verify uploads
2. **Admin builder preview** (`readOnly={false}`) - Interactive preview
3. **Admin review** (`readOnly={true}`) - See all documents at once

All three should have the same visual experience. This task focuses on making document previews larger and more useful, especially for the scroll layout where multiple uploads may be visible.

### The Problem

1. **Tiny previews**: `maxPreviewHeight={150}` (edit) / `maxPreviewHeight={200}` (review) - too small to verify content
2. **No expansion**: Can't click to see full document - must download to inspect
3. **Poor aspect ratios**: Images get stretched/cropped awkwardly
4. **Layout shift**: No skeleton while loading signed URLs
5. **Scroll layout amplifies issues**: With all steps visible, tiny previews are even more noticeable

---

## Current State

### DocumentPreview Component

**File:** `src/components/ui/document-preview.tsx`

```typescript
interface DocumentPreviewProps {
  paths: string[];              // Array of storage paths
  bucket?: string;              // Storage bucket (default: 'credential-documents')
  layout?: 'grid' | 'list';     // Display layout (default: 'grid')
  maxPreviewHeight?: number;    // Max height for previews (default: 200)
}
```

### Current Usage

| Location | maxPreviewHeight | Context |
|----------|------------------|---------|
| `FileUploadBlock.tsx` (edit) | 150 | Driver uploading |
| `FileUploadBlock.tsx` (readOnly) | 200 | Admin reviewing |
| `CredentialHistoryTab.tsx` | 200 | History view |
| `AdminReviewPanel.tsx` | 120 | Admin panel |

### Current Layout (Grid Mode)

```
┌─────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐       │
│  │   Image     │  │   Image     │       │  maxPreviewHeight: 200px
│  │  (small)    │  │  (small)    │       │  (or 150px in edit mode)
│  └─────────────┘  └─────────────┘       │
└─────────────────────────────────────────┘
```

---

## Required Changes

### 1. Increase Default Preview Height

**File:** `src/components/ui/document-preview.tsx`

Change default `maxPreviewHeight` from 200 to 350:

```typescript
// FROM:
maxPreviewHeight = 200,

// TO:
maxPreviewHeight = 350,
```

### 2. Add Click-to-Expand Functionality

Add a new prop `expandable` (default: true) that enables click-to-expand behavior.

When clicked, open a modal with the full document. Create a new `DocumentViewerModal` component.

**New File:** `src/components/ui/document-viewer-modal.tsx`

```typescript
interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;           // The signed URL or path
  fileName: string;      // Display name
  isImage: boolean;      // Image vs PDF
}
```

**Features:**
- Full-screen modal (Dialog component)
- For images: Display at full resolution with object-fit: contain
- For PDFs: Use iframe or embed element
- Close button (X) in top-right
- Click backdrop to close
- Keyboard: Escape to close

### 3. Update DocumentPreview to Support Expansion

**File:** `src/components/ui/document-preview.tsx`

Add new props:

```typescript
interface DocumentPreviewProps {
  paths: string[];
  bucket?: string;
  layout?: 'grid' | 'list';
  maxPreviewHeight?: number;
  expandable?: boolean;        // NEW - default: true
}
```

Implementation:
- Add state for selected document: `const [expandedDoc, setExpandedDoc] = useState<DocumentItem | null>(null)`
- Make image/document clickable (cursor-pointer)
- On click, set `expandedDoc` to open modal
- Render `DocumentViewerModal` at end of component

### 4. Add Skeleton Loading State

Currently, documents show a spinner while loading signed URLs. Add proper skeleton that reserves space:

```typescript
// Replace Loader2 spinner with:
<div 
  className="animate-pulse bg-muted rounded-lg"
  style={{ height: maxPreviewHeight }}
/>
```

This prevents layout shift when images load.

### 5. Improve Aspect Ratio Handling

Current code uses `object-cover` which crops images. Change to `object-contain` with background:

```typescript
// FROM:
<img
  src={doc.signedUrl}
  className="w-full object-cover bg-black/5"
  style={{ maxHeight: maxPreviewHeight }}
/>

// TO:
<img
  src={doc.signedUrl}
  className="w-full object-contain bg-muted/30"
  style={{ 
    maxHeight: maxPreviewHeight,
    minHeight: maxPreviewHeight * 0.5, // Ensure minimum visibility
  }}
/>
```

### 6. Update FileUploadBlock Usage

**File:** `src/components/features/credentials/blocks/FileUploadBlock.tsx`

Update the maxPreviewHeight values:

```typescript
// Edit mode - FROM 150 TO 300:
<DocumentPreview paths={uploadedPaths} layout="grid" maxPreviewHeight={300} />

// Read-only mode - FROM 200 TO 350:
<DocumentPreview paths={uploadedPaths} layout="grid" maxPreviewHeight={350} />
```

### 7. Update CredentialHistoryTab Usage

**File:** `src/components/features/credentials/CredentialDetail/CredentialHistoryTab.tsx`

Keep at 200 for history (secondary context):

```typescript
<DocumentPreview 
  paths={documentUrls} 
  layout="grid" 
  maxPreviewHeight={200}  // Keep smaller for history list
  expandable={true}       // But allow expansion
/>
```

---

## New Component: DocumentViewerModal

**File:** `src/components/ui/document-viewer-modal.tsx`

```typescript
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ExternalLink } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface DocumentViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  fileName: string;
  isImage: boolean;
}

export function DocumentViewerModal({
  open,
  onOpenChange,
  src,
  fileName,
  isImage,
}: DocumentViewerModalProps) {
  const handleDownload = () => {
    window.open(src, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{fileName}</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-medium truncate">{fileName}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center bg-muted/30 overflow-auto" 
             style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {isImage ? (
            <img
              src={src}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <iframe
              src={src}
              title={fileName}
              className="w-full h-full min-h-[70vh]"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/document-preview.tsx` | Add expandable prop, click handler, skeleton, aspect ratio fix |
| `src/components/ui/document-viewer-modal.tsx` | **NEW** - Full-screen document viewer |
| `src/components/features/credentials/blocks/FileUploadBlock.tsx` | Update maxPreviewHeight to 300/350 |
| `src/components/features/credentials/CredentialDetail/CredentialHistoryTab.tsx` | Add expandable prop |

---

## Acceptance Criteria

### AC-1: Larger Default Preview
- [ ] Default `maxPreviewHeight` is 350px (was 200px)
- [ ] FileUploadBlock edit mode uses 300px (was 150px)
- [ ] FileUploadBlock read-only mode uses 350px (was 200px)
- [ ] Document previews are visually larger and more readable

### AC-2: Click-to-Expand
- [ ] Clicking a document preview opens full-screen modal
- [ ] Modal shows document at full resolution
- [ ] Modal has "Open" button to open in new tab
- [ ] Modal closes on backdrop click
- [ ] Modal closes on Escape key
- [ ] Modal closes on X button

### AC-3: Skeleton Loading
- [ ] While signed URL is loading, skeleton placeholder shown (not spinner)
- [ ] Skeleton has same height as final image (no layout shift)
- [ ] After load, image appears in same position

### AC-4: Aspect Ratio
- [ ] Images use `object-contain` (no cropping)
- [ ] Background color fills empty space (muted/30)
- [ ] Tall images don't overflow container
- [ ] Wide images scale down properly

### AC-5: No Regression
- [ ] Driver portal: Can upload and preview documents
- [ ] Admin review: Can see submitted documents
- [ ] History tab: Can expand historical documents
- [ ] Builder preview: Previews work correctly

---

## Test Scenarios

### Scenario 1: Driver Uploads Document

1. Navigate to driver portal → Credentials → Vehicle Registration
2. Upload a JPG image of registration
3. **Verify:** Preview is large (~300px tall), clearly visible
4. **Verify:** Click preview → modal opens with full image
5. **Verify:** Click "Open" → opens in new tab
6. **Verify:** Press Escape → modal closes

### Scenario 2: Admin Reviews Submission

1. Navigate to admin portal → Pending Reviews → select a credential
2. **Verify:** Document preview is large (~350px tall)
3. **Verify:** Can click to expand and inspect
4. **Verify:** No upload zone visible (read-only mode)

### Scenario 3: PDF Document

1. Upload a PDF document
2. **Verify:** Preview shows file icon (or first page if possible)
3. **Verify:** Click → modal opens with iframe showing PDF
4. **Verify:** PDF is scrollable in modal

### Scenario 4: Multiple Documents

1. Upload 2+ documents in one credential
2. **Verify:** Grid layout shows both
3. **Verify:** Each is independently clickable
4. **Verify:** Correct document opens in modal

### Scenario 5: Loading State

1. Open a credential with uploaded documents
2. **Verify:** Skeleton appears during signed URL fetch
3. **Verify:** No layout shift when image loads

### Scenario 6: Mobile (375px width)

1. Open credential on mobile viewport
2. **Verify:** Preview scales to fit screen width
3. **Verify:** Click still opens modal
4. **Verify:** Modal is usable on mobile (scrollable, closable)

---

## Implementation Order

1. Create `DocumentViewerModal` component
2. Update `DocumentPreview` with expandable logic, skeleton, aspect ratio
3. Update `FileUploadBlock` with new preview heights
4. Update `CredentialHistoryTab` to enable expansion
5. Test all scenarios

---

## Notes

- Keep `expandable` as a prop so it can be disabled if needed
- For PDFs, `iframe` works for most browsers but has limitations (some PDFs block iframe embedding)
- Consider adding a fallback for PDFs that won't embed: just show download button
- The `DocumentViewerModal` uses the existing Dialog component from shadcn/ui
- Use `VisuallyHidden` for DialogTitle to satisfy accessibility requirements without showing title twice
