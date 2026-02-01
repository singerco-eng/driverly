# AI-002: Conversation State Management

> **Copy this entire document when starting the implementation session.**

---

## Overview

Add explicit state tracking to the AI builder conversation to prevent context drift and state loss in longer chat sessions. Instead of relying solely on chat history, track pending document configurations and conversation checkpoints explicitly.

**Problem:**
- Long conversations may cause AI to "forget" earlier decisions
- Component responses (A/B choice, field selection) could be lost if context gets too long
- Page refresh loses all pending state
- Token costs increase linearly with conversation length

**Solution:**
- Track `pendingDocuments` state explicitly in requests
- Implement conversation history windowing for very long sessions
- Store confirmed configurations immediately in `existingConfig`

---

## Implementation

### 1. Pending Documents State

Track documents that are in the clarification flow:

```typescript
// New type
interface PendingDocument {
  id: string;
  name: string;
  status: 'awaiting_extract_choice' | 'awaiting_fields' | 'configured';
  choice?: 'extract' | 'upload';
  fields?: string[];
}

// Add to request
interface ChatRequest {
  mode: 'chat' | 'refine_existing';
  messages: ChatMessage[];
  credentialName?: string;
  existingConfig?: CredentialTypeInstructions;
  componentResponse?: ComponentResponse;
  
  // NEW
  pendingDocuments?: PendingDocument[];
}
```

### 2. Frontend State Management

```typescript
// In AIBuilderTwoPanel.tsx

const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);

// When AI returns extract_or_upload component
const handleAIResponse = (response: AIResponse) => {
  if (response.component?.type === 'extract_or_upload') {
    setPendingDocuments(prev => [...prev, {
      id: crypto.randomUUID(),
      name: response.component.documentName,
      status: 'awaiting_extract_choice',
    }]);
  }
};

// When user responds to component
const handleComponentResponse = (docId: string, response: ComponentResponse) => {
  if (response.type === 'extract_or_upload') {
    setPendingDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'awaiting_fields', choice: response.choice }
        : doc
    ));
  } else if (response.type === 'field_selection') {
    setPendingDocuments(prev => prev.map(doc => 
      doc.id === docId 
        ? { ...doc, status: 'configured', fields: response.selectedFields }
        : doc
    ));
  }
  
  // Include state in request
  sendToAI({
    messages,
    componentResponse: response,
    pendingDocuments,
  });
};
```

### 3. Conversation History Windowing

For very long conversations (>20 messages), keep recent + important messages:

```typescript
// In edge function or frontend before sending

function windowMessages(messages: ChatMessage[]): ChatMessage[] {
  const MAX_MESSAGES = 20;
  
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  
  // Keep first 2 (initial context) + last 15 (recent)
  const first = messages.slice(0, 2);
  const recent = messages.slice(-15);
  
  // Add summary marker
  const summary: ChatMessage = {
    role: 'assistant',
    content: `[Earlier conversation summarized: ${messages.length - 17} messages about credential configuration]`,
  };
  
  return [...first, summary, ...recent];
}
```

### 4. Edge Function Updates

```typescript
// In generate-credential-instructions/index.ts

// Add to CHAT_SYSTEM_PROMPT
const STATE_AWARENESS_PROMPT = `
## Conversation State

You may receive a \`pendingDocuments\` array showing documents currently being configured:
- status: 'awaiting_extract_choice' - waiting for user to choose extract vs upload
- status: 'awaiting_fields' - waiting for user to select fields
- status: 'configured' - document is fully configured

Use this state to maintain context. Don't re-ask questions for documents already configured.
`;

// In chat handler
if (body.mode === 'chat') {
  const { messages, pendingDocuments } = body as ChatRequest;
  
  // Include state in system message
  const stateContext = pendingDocuments?.length
    ? `\n\nCurrent pending documents:\n${JSON.stringify(pendingDocuments, null, 2)}`
    : '';
  
  const openAIMessages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT + STATE_AWARENESS_PROMPT + stateContext },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];
}
```

### 5. Immediate Config Storage

When a document is fully configured, add it to `existingConfig` immediately:

```typescript
// In AIBuilderTwoPanel.tsx

const handleDocumentConfigured = (doc: PendingDocument) => {
  if (doc.choice === 'extract' && doc.fields) {
    // Create Document block
    const documentBlock = createDocumentBlock(doc.name, doc.fields);
    
    // Add to existing config immediately
    setExistingConfig(prev => ({
      ...prev,
      steps: [...(prev?.steps || []), {
        id: crypto.randomUUID(),
        title: doc.name,
        blocks: [documentBlock],
        // ... other step properties
      }],
    }));
  } else if (doc.choice === 'upload') {
    // Create FileUpload block
    const fileBlock = createFileUploadBlock(doc.name);
    // Add to config...
  }
  
  // Remove from pending
  setPendingDocuments(prev => prev.filter(d => d.id !== doc.id));
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-credential-instructions/index.ts` | Add `pendingDocuments` to request, state awareness in prompt |
| `src/components/features/admin/credential-builder/AIBuilderTwoPanel.tsx` | Track pending state, window messages, immediate config storage |

---

## Acceptance Criteria

- [ ] `pendingDocuments` state tracked in frontend
- [ ] State passed to edge function with each request
- [ ] AI prompt includes state awareness instructions
- [ ] Conversation windowing for >20 messages
- [ ] Configured documents added to `existingConfig` immediately
- [ ] Page refresh shows warning if pending documents exist
- [ ] No context drift in conversations with 5+ document clarifications

---

## Test Scenarios

### Scenario 1: Long Conversation
1. Start credential builder
2. Request 5 different documents (mix of known/unknown)
3. Go through clarification for each
4. Verify AI remembers all configured documents
5. Generate credential - all 5 documents present

### Scenario 2: State Recovery
1. Configure 2 documents
2. Start clarification for 3rd
3. Refresh page (should show warning)
4. Verify configured documents are in `existingConfig`

### Scenario 3: Window Limiting
1. Have 25+ message conversation
2. Verify request only sends ~20 messages
3. Verify AI still has correct context

---

## Priority

**Medium** - Implement alongside or after Phase 2. The clarification flows in Phase 2 are short enough to work without this, but this prevents edge cases and improves reliability.

---

## Related Documents

- `docs/AI-001-document-extraction-system.prompt.md` - Main architecture
- `docs/AI-001-phase2-implementation.prompt.md` - Phase 2 implementation
