# CODEX-040: AI Builder Two-Panel UX - Implementation Prompt

## Overview

Transform the credential builder's AI mode from a full-screen chat-only experience into a **two-panel layout** with live preview, and enable **bidirectional switching** between AI and manual edit modes.

This is the flagship feature of the product. Prioritize UX over token cost savings.

## Business Context

- Users currently can't see what the AI is building until they click "Generate"
- Once users switch to manual edit mode, they cannot return to AI for refinements
- The homepage demo (`src/pages/website/demo/DemoAgenticChat.tsx`) shows the ideal UX - we need to bring this to production
- This change makes the AI builder feel like Cursor's chat interface

## Current Architecture

### File Structure
```
src/
├── pages/admin/
│   └── CredentialTypeEditor.tsx        # Main page, manages mode state
├── components/features/admin/credential-builder/
│   ├── AIGeneratorFullScreen.tsx       # Current full-screen AI chat
│   ├── AIGeneratorSheet.tsx            # Legacy sheet version (side panel)
│   ├── InstructionBuilder.tsx          # Manual drag-drop builder
│   ├── FullPagePreview.tsx             # Preview mode component
│   └── ... (block editors, step items, etc.)
```

### Current Mode Flow (One-Way)
```
CredentialTypeEditor manages: mode = 'ai' | 'preview' | 'edit'

New Credential → AI Mode (full screen chat)
                    ↓ [Generate] + [Apply]
                Preview Mode (full screen)
                    ↓ [Edit]
                Edit Mode (InstructionBuilder)
                    ❌ Cannot return to AI
```

### Key Components to Reference

#### 1. `CredentialTypeEditor.tsx` (lines 38-101)
```typescript
type EditorMode = 'ai' | 'preview' | 'edit';

// Mode is set based on whether credential has existing instructions
useEffect(() => {
  if (hasExistingInstructions) {
    setMode('edit');
  } else {
    setMode('ai');
  }
}, [...]);

// AI applies config and transitions to preview
const handleAIApply = (config: CredentialTypeInstructions) => {
  setInstructionConfig(config);
  setHasInstructionChanges(true);
  setMode('preview');  // ← This is the one-way transition
};
```

#### 2. `AIGeneratorFullScreen.tsx` (current AI interface)
- Full-screen layout with centered chat
- No preview panel
- Example prompts for new users
- Chat bubble components (reusable)
- ThinkingIndicator component (reusable)
- Calls edge function `generate-credential-instructions`

#### 3. `InstructionBuilder.tsx` (manual builder)
- Drag-drop step reordering
- Block editing
- No "Refine with AI" button currently
- Has `hideAIButton` prop (currently always true)

#### 4. Homepage Demo Reference: `src/pages/website/demo/DemoAgenticChat.tsx`
This is the **target UX**. Key patterns to copy:
- Two-panel layout (35% chat / 65% preview)
- Chat panel with smooth animations
- Preview uses real `InstructionRenderer`
- Progressive config updates
- Generate button triggers preview population

## Proposed Architecture

### New Mode Flow (Bidirectional)
```
CredentialTypeEditor manages: mode = 'ai' | 'edit'
                              chatHistory: ChatMessage[]

New Credential → AI Mode (two-panel)
                    ↓ [Switch to Manual]
                Edit Mode (InstructionBuilder)
                    ↓ [Refine with AI]
                AI Mode (two-panel, config + chat preserved)
```

Existing Credential → AI Mode (two-panel + preview)
                   ↓ [AI Editor button in header]
               Edit Mode (InstructionBuilder)

### New Component: `AIBuilderTwoPanel.tsx`

Create a new component that combines chat + live preview:

```typescript
// src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx

interface AIBuilderTwoPanelProps {
  credentialName: string;
  initialConfig: CredentialTypeInstructions;
  onConfigChange: (config: CredentialTypeInstructions) => void;
  onSwitchToManual: () => void;
  onBack: () => void;
  initialChatHistory?: ChatMessage[];
  onChatHistoryChange?: (messages: ChatMessage[]) => void;
}

// Layout structure:
// ┌──────────────────┬─────────────────────────────────┐
// │   Chat Panel     │       Preview Panel             │
// │   (35-40%)       │       (60-65%)                  │
// │                  │                                 │
// │  ChatBubbles     │   InstructionRenderer           │
// │  ThinkingDots    │   (read-only during gen,        │
// │                  │    interactive after)           │
// │                  │                                 │
// │  [Input area]    │                                 │
// │  [Generate btn]  │                                 │
// └──────────────────┴─────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Create Two-Panel Layout Component

**File:** `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx`

1. Copy chat-related code from `AIGeneratorFullScreen.tsx`:
   - `ChatBubble` component
   - `ThinkingIndicator` component
   - `EXAMPLE_PROMPTS` array
   - Message handling logic

2. Create two-panel layout:
```tsx
return (
  <div className="flex h-full">
    {/* Chat Panel */}
    <div className="w-[38%] min-w-[320px] border-r flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <Sparkles /> Create with AI
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map(...)}
        {isThinking && <ThinkingIndicator />}
      </div>
      
      {/* Input */}
      <div className="p-4 border-t">
        <Textarea ... />
        <Button>Generate</Button>
      </div>
    </div>
    
    {/* Preview Panel */}
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b flex justify-between">
        <span>Preview</span>
        <Button onClick={onSwitchToManual}>Edit Manually</Button>
      </div>
      
      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {config.steps.length === 0 ? (
          <EmptyState />
        ) : (
          <InstructionRenderer
            config={config}
            progressData={progressData}
            onProgressChange={setProgressData}
            disabled={isGenerating}
          />
        )}
      </div>
    </div>
  </div>
);
```

3. Handle responsive layout:
```tsx
// Mobile: stack vertically
// Desktop: side by side
<div className={cn(
  "flex h-full",
  "flex-col md:flex-row"
)}>
  <div className={cn(
    "border-b md:border-b-0 md:border-r",
    "h-1/2 md:h-full md:w-[38%] md:min-w-[320px]"
  )}>
```

### Phase 2: Integrate with CredentialTypeEditor

**File:** `src/pages/admin/CredentialTypeEditor.tsx`

1. Add chat history state:
```typescript
const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
```

2. Replace AI mode rendering:
```typescript
if (mode === 'ai') {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <AIBuilderTwoPanel
        credentialName={credentialType.name}
        initialConfig={instructionConfig || createEmptyInstructions()}
        onConfigChange={handleConfigChange}
        onSwitchToManual={() => setMode('edit')}
        onBack={() => navigate('/admin/settings/credentials')}
        initialChatHistory={chatHistory}
        onChatHistoryChange={setChatHistory}
      />
    </div>
  );
}
```

3. Remove 'preview' mode - preview is now embedded in AI mode:
```typescript
type EditorMode = 'ai' | 'edit';  // Remove 'preview'
```

4. Existing credentials should open directly into AI mode with preview:
```typescript
// Always start in AI editor; existing configs trigger context summary
setMode('ai');
```

### Phase 3: Add "Refine with AI" to Manual Builder

**File:** `src/components/features/admin/credential-builder/InstructionBuilder.tsx`

1. Add new prop:
```typescript
interface InstructionBuilderProps {
  config: CredentialTypeInstructions;
  onChange: (config: CredentialTypeInstructions) => void;
  credentialName?: string;
  hideAIButton?: boolean;
  readOnly?: boolean;
  onSwitchToAI?: () => void;  // NEW
}
```

2. Move entry point to the top-right header action:
```tsx
<Button variant="outline" onClick={() => setMode('ai')}>
  <Sparkles className="w-4 h-4 mr-2" />
  AI Editor
</Button>
```

### Phase 4: Context-Aware AI Refinement

**File:** `supabase/functions/generate-credential-instructions/index.ts`

1. Add new mode `refine_existing`:
```typescript
if (mode === 'refine_existing') {
  const { existingConfig, messages, credentialName } = body;
  
  // Summarize existing config for context
  const configSummary = summarizeConfig(existingConfig);
  
  // Build system prompt with context
  const systemPrompt = `
You are helping refine an existing credential called "${credentialName}".

Current structure:
${configSummary}

When the user asks for changes:
- Preserve existing step IDs and block IDs where possible
- Only modify what they explicitly ask to change
- Maintain their custom content unless explicitly changing it
- You can add new steps/blocks as needed
`;

  // Continue with chat or generate updated config
}

function summarizeConfig(config: CredentialTypeInstructions): string {
  return config.steps.map((step, i) => {
    const blockSummary = step.blocks.map(b => `    - ${b.type}: ${getBlockSummary(b)}`).join('\n');
    return `Step ${i + 1}: ${step.title} (${step.type})\n${blockSummary}`;
  }).join('\n\n');
}
```

2. When entering AI mode from edit, generate opening message:
```typescript
// In AIBuilderTwoPanel.tsx
useEffect(() => {
  if (initialConfig.steps.length > 0 && messages.length === 0) {
    // Auto-generate context message
    generateContextMessage(initialConfig);
  }
}, []);

const generateContextMessage = async (config) => {
  const { data } = await supabase.functions.invoke(
    'generate-credential-instructions',
    {
      body: {
        mode: 'summarize_for_refinement',
        existingConfig: config,
        credentialName,
      },
    }
  );
  
  // AI returns something like:
  // "I see you've built a credential with 3 steps:
  //  1. Video Training - YouTube video with 90% watch requirement
  //  2. Knowledge Quiz - 5 questions, 80% to pass
  //  3. Acknowledgment - Checklist + signature
  //  What would you like to change or add?"
  
  setMessages([{ role: 'assistant', content: data.summary }]);
};
```

### Phase 5: Live Preview Updates

Modify chat handling to update preview progressively:

```typescript
// In AIBuilderTwoPanel.tsx
const sendMessage = async (userMessage: string) => {
  // ... existing message handling ...
  
  const { data } = await supabase.functions.invoke(
    'generate-credential-instructions',
    {
      body: {
        mode: hasExistingConfig ? 'refine_existing' : 'chat_with_preview',
        messages: updatedMessages,
        existingConfig: config,
        credentialName,
      },
    }
  );
  
  // Update chat
  setMessages([...updatedMessages, { role: 'assistant', content: data.response }]);
  
  // Update preview if partial config returned
  if (data.partialConfig) {
    setConfig(data.partialConfig);
  }
  
  // Check if ready to generate
  if (data.readyToGenerate) {
    setIsReadyToGenerate(true);
  }
};
```

## Testing Checklist

### Two-Panel Layout
- [ ] Chat panel renders at ~35-40% width on desktop
- [ ] Preview panel renders at ~60-65% width
- [ ] Mobile: panels stack vertically
- [ ] Chat scrolls independently of preview
- [ ] Preview scrolls independently of chat

### Chat Functionality
- [ ] Messages appear with smooth animations
- [ ] Thinking indicator shows during API calls
- [ ] Example prompts work for new credentials
- [ ] Enter sends message, Shift+Enter adds newline
- [ ] Auto-scroll to bottom on new messages

### Preview Functionality
- [ ] Empty state shows when no config
- [ ] InstructionRenderer displays config correctly
- [ ] Preview is read-only during generation
- [ ] Preview becomes interactive after generation
- [ ] Step navigation works

### Mode Switching
- [ ] AI → Edit: Config preserved, chat history saved
- [ ] Edit → AI: Config loaded, context message generated
- [ ] Chat history persists across multiple switches
- [ ] No data loss when switching modes

### Edge Function
- [ ] `refine_existing` mode works with existing config
- [ ] AI understands existing structure
- [ ] Partial config updates work
- [ ] Step/block IDs preserved when possible

## Files to Create/Modify

### Create
1. `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx`

### Modify
1. `src/pages/admin/CredentialTypeEditor.tsx`
   - Add `chatHistory` state
   - Change mode type (remove 'preview')
   - Replace AI mode with `AIBuilderTwoPanel`
   - Pass `onSwitchToAI` to `InstructionBuilder`

2. `src/components/features/admin/credential-builder/InstructionBuilder.tsx`
   - Add `onSwitchToAI` prop
   - Add "Refine with AI" button

3. `src/components/features/admin/credential-builder/index.ts`
   - Export new `AIBuilderTwoPanel`

4. `supabase/functions/generate-credential-instructions/index.ts`
   - Add `refine_existing` mode
   - Add `summarize_for_refinement` mode
   - Add `chat_with_preview` mode (returns partial config)

## Reference Implementation

The homepage demo is the gold standard for this UX:

**File:** `src/pages/website/demo/DemoAgenticChat.tsx`

Key patterns to copy:
- Line 180-290: Two-panel flex layout
- Line 39-68: ChatBubble with animations
- Line 74-92: ThinkingIndicator
- Line 114-147: GeneratingAnimation
- Line 197-237: Chat panel structure
- Line 241-287: Preview panel with InstructionRenderer

## Types Reference

```typescript
// src/types/instructionBuilder.ts
interface CredentialTypeInstructions {
  version: number;
  settings: InstructionSettings;
  steps: InstructionStep[];
}

interface InstructionStep {
  id: string;
  title: string;
  type: StepType;
  order: number;
  blocks: ContentBlock[];
  completion?: StepCompletion;
}

// Chat message type (define in component or shared types)
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

## Success Criteria

1. **Visual**: Two-panel layout matches homepage demo appearance
2. **Functional**: Live preview updates as AI generates
3. **Bidirectional**: Can freely switch between AI and manual modes
4. **Context**: AI understands existing config when refining
5. **Responsive**: Works on mobile (stacked layout)
6. **Smooth**: Animations feel polished, not janky
7. **Preserved**: No data loss when switching modes

## Notes

- Token costs are acceptable - this is the flagship feature
- Prioritize UX over optimization
- The homepage demo (`DemoAgenticChat.tsx`) is the reference implementation
- Reuse existing components where possible (ChatBubble, ThinkingIndicator, InstructionRenderer)
