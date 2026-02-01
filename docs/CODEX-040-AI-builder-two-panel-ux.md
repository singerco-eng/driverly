# CODEX-040: AI Builder Two-Panel UX

## Overview

Redesign the credential builder's AI mode to use a two-panel layout (like Cursor's chat) with live preview, and allow seamless switching between AI and manual edit modes.

## Current State

```
┌─────────────────────────────────────────┐
│            AI MODE (full screen)        │
│  ┌───────────────────────────────────┐  │
│  │         Chat only                 │  │
│  │    (no preview visible)           │  │
│  │                                   │  │
│  │    [Generate] → transitions to    │  │
│  │         preview mode              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓ (one-way)
┌─────────────────────────────────────────┐
│           PREVIEW MODE                  │
│    (full screen InstructionRenderer)    │
│         [Edit] → edit mode              │
└─────────────────────────────────────────┘
              ↓ (one-way)
┌─────────────────────────────────────────┐
│            EDIT MODE                    │
│    (InstructionBuilder - manual)        │
│       ❌ Cannot return to AI            │
└─────────────────────────────────────────┘
```

### Problems
1. **No live preview** - Users can't see what AI is building until they generate
2. **One-way flow** - Once in edit mode, cannot go back to AI for refinements
3. **Jarring transitions** - Full-screen mode switches feel disconnected
4. **No iterative refinement** - Must start over to make AI-based changes

## Proposed State

```
┌────────────────────────────────────────────────────────────┐
│  [← Back]  Defensive Driving Training     [Edit Mode] [Save] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┬─────────────────────────────────┐   │
│  │   CHAT PANEL     │       LIVE PREVIEW PANEL        │   │
│  │   (~35-40%)      │          (~60-65%)              │   │
│  │                  │                                 │   │
│  │  [Bot] What...   │   ┌─────────────────────────┐   │   │
│  │  [User] I need.. │   │  Step 1: Video Training │   │   │
│  │  [Bot] Got it!   │   │  ┌───────────────────┐  │   │   │
│  │  [Thinking...]   │   │  │  YouTube embed    │  │   │   │
│  │                  │   │  └───────────────────┘  │   │   │
│  │                  │   │                         │   │   │
│  │                  │   │  Step 2: Quiz           │   │   │
│  │                  │   │  (building...)          │   │   │
│  │                  │   └─────────────────────────┘   │   │
│  │                  │                                 │   │
│  │  ┌────────────┐  │   [Interactive after generate] │   │
│  │  │ Type here  │  │                                 │   │
│  │  └────────────┘  │                                 │   │
│  │  [Generate Now]  │                                 │   │
│  └──────────────────┴─────────────────────────────────┘   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Key Changes

1. **Two-panel layout** in AI mode
   - Chat panel: ~35-40% width (collapsible on mobile)
   - Preview panel: ~60-65% width with real InstructionRenderer

2. **Live preview updates**
   - As AI chat progresses, preview updates with partial config
   - Progressive building: "Building step 1... step 2..."
   - Preview is read-only during generation, interactive after

3. **Bidirectional mode switching**
   - Edit mode → AI mode: "Refine with AI" button
   - AI mode → Edit mode: "Switch to manual" button
   - Chat context preserved when switching back to AI

4. **Unified header**
   - Same header in both modes
   - Mode toggle button (AI ↔ Edit)
   - Save always available

5. **Existing credential entry**
   - Opening an existing credential routes directly into the AI editor + preview
   - AI is primed with existing config context (summary prompt) on entry

6. **Manual review entry point**
   - In edit mode, the top-right action becomes **AI Editor** (replaces Preview)
   - This button switches back to the AI editor for refinement

## Component Architecture

### New: `AIBuilderTwoPanel.tsx`
```tsx
interface AIBuilderTwoPanelProps {
  credentialName: string;
  initialConfig: CredentialTypeInstructions;
  onConfigChange: (config: CredentialTypeInstructions) => void;
  onSwitchToEdit: () => void;
  chatHistory?: ChatMessage[]; // Preserved from previous session
}

// Internal state
- messages: ChatMessage[]
- previewConfig: CredentialTypeInstructions (updates as AI generates)
- isGenerating: boolean
- progressStage: 'idle' | 'step1' | 'step2' | 'step3' | 'complete'
```

### Modified: `CredentialTypeEditor.tsx`
```tsx
type EditorMode = 'ai' | 'edit'; // Remove 'preview' - it's embedded

// New state
- chatHistory: ChatMessage[] // Preserved when switching modes

// Mode switching
- AI → Edit: Preserve chat history, switch to InstructionBuilder
- Edit → AI: Restore chat history, switch to AIBuilderTwoPanel
```

### Modified: `InstructionBuilder.tsx`
```tsx
// Add new prop
interface InstructionBuilderProps {
  // ... existing props
  onSwitchToAI?: () => void; // Enable "Refine with AI" button
}
```

## Implementation Phases

### Phase 1: Two-Panel Layout
- [ ] Create `AIBuilderTwoPanel.tsx` with basic layout
- [ ] Chat panel (reuse existing ChatBubble, ThinkingIndicator)
- [ ] Preview panel (embed InstructionRenderer, read-only initially)
- [ ] Responsive: Stack vertically on mobile, side-by-side on desktop

### Phase 2: Live Preview Updates
- [ ] Modify edge function to return partial configs during chat
- [ ] Progressive config building (video → quiz → acknowledgment)
- [ ] Preview animates as steps appear
- [ ] Loading states for individual sections

### Phase 3: Bidirectional Mode Switching
- [ ] Add chat history preservation in CredentialTypeEditor
- [ ] "Refine with AI" button in InstructionBuilder
- [ ] Mode toggle in header
- [ ] Context restoration when returning to AI

### Phase 4: Polish
- [ ] Message animations (fade + slide)
- [ ] Smooth scroll behavior
- [ ] Generation progress indicator
- [ ] Keyboard shortcuts (Cmd+Enter to generate)

## Edge Function Changes

Current `generate-credential-instructions` modes:
- `chat` - Conversational response only
- `generate_from_chat` - Full config generation

New modes needed:
- `chat_with_preview` - Response + partial config for preview
- `refine_existing` - Take existing config + chat → updated config

## Breakpoints

```css
/* Mobile: Stacked layout */
@media (max-width: 768px) {
  .ai-builder { flex-direction: column; }
  .chat-panel { height: 50%; }
  .preview-panel { height: 50%; }
}

/* Desktop: Side by side */
@media (min-width: 769px) {
  .ai-builder { flex-direction: row; }
  .chat-panel { width: 38%; min-width: 320px; }
  .preview-panel { flex: 1; }
}

/* Large screens: More preview space */
@media (min-width: 1280px) {
  .chat-panel { width: 35%; }
}
```

## Token Usage Note

Per user request: Pass through token costs rather than restricting AI usage. This is the flagship feature - optimize for UX, not token savings.

## Success Criteria

1. Users can see preview building in real-time during AI chat
2. Users can switch between AI and manual edit freely
3. Chat context is preserved across mode switches
4. Mobile experience is functional (stacked layout)
5. Animations feel smooth and polished

## Files to Modify

1. `src/pages/admin/CredentialTypeEditor.tsx` - Mode management, chat history
2. `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx` - New component
3. `src/components/features/admin/credential-builder/InstructionBuilder.tsx` - Add AI button
4. `supabase/functions/generate-credential-instructions/index.ts` - New modes

## Related

- CODEX-039: Credential UX Invisible Sections
- Homepage demo: `src/pages/website/demo/DemoAgenticChat.tsx` (reference implementation)

## Implementation Prompt

See `CODEX-040-AI-builder-two-panel-ux.prompt.md` for comprehensive implementation instructions for another agent.
