/**
 * AIBuilderTwoPanel - Two-panel AI credential builder
 * 
 * Left panel (~38%): Chat conversation with AI
 * Right panel (~62%): Live preview using InstructionRenderer
 * 
 * Features:
 * - Bidirectional mode switching (AI <-> Manual)
 * - Chat history persistence across mode switches
 * - Live preview updates during generation
 * - Context-aware refinement for existing configs
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Loader2,
  Wand2,
  FileUp,
  PenTool,
  FileText,
  CheckSquare,
  ExternalLink,
  AlertCircle,
  Send,
  Bot,
  User,
  ArrowLeft,
  Wrench,
  Save,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAutoSaveDraft } from '@/hooks/useAIBuilderDraft';

// Preview components
import { InstructionRenderer } from '@/components/features/credentials/InstructionRenderer';
import { ExtractOrUploadChoice, FieldSelectionForm } from './ai';
import type { StepProgressData } from '@/types/credentialProgress';
import { createEmptyProgressData } from '@/types/credentialProgress';
import {
  createBlock,
  createStep,
  type CredentialTypeInstructions,
  type DocumentExtractionField,
} from '@/types/instructionBuilder';
import type { CredentialTypeStatus } from '@/types/credential';

// ============================================
// TYPES
// ============================================

type AIComponent =
  | {
      type: 'extract_or_upload';
      documentName: string;
    }
  | {
      type: 'field_selection';
      documentName: string;
      suggestedFields: {
        key: string;
        label: string;
        defaultChecked: boolean;
      }[];
    };

type ComponentResponse =
  | {
      type: 'extract_or_upload';
      documentName: string;
      choice: 'extract' | 'upload';
    }
  | {
      type: 'field_selection';
      documentName: string;
      selectedFields: string[];
      otherFields: string;
    };

interface PendingDocument {
  id: string;
  name: string;
  status: 'awaiting_extract_choice' | 'awaiting_fields' | 'configured';
  choice?: 'extract' | 'upload';
  fields?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  component?: AIComponent | null;
}

interface AIBuilderTwoPanelProps {
  credentialId?: string;
  credentialName: string;
  initialConfig: CredentialTypeInstructions;
  onConfigChange: (config: CredentialTypeInstructions) => void;
  onSave?: () => Promise<void>;
  onSwitchToManual: () => void;
  onBack: () => void;
  initialChatHistory?: ChatMessage[];
  onChatHistoryChange?: (messages: ChatMessage[]) => void;
  credentialStatus?: CredentialTypeStatus;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

// ============================================
// EXAMPLE PROMPTS
// ============================================

const EXAMPLE_PROMPTS = [
  {
    icon: FileUp,
    label: 'Document Upload',
    prompt:
      "I need drivers to upload their commercial driver's license, both front and back photos. Include an expiration date field.",
  },
  {
    icon: PenTool,
    label: 'Agreement Signature',
    prompt:
      'Create a safety policy acknowledgment where drivers read the policy text, check that they understand each section, and sign at the end.',
  },
  {
    icon: FileText,
    label: 'Form Entry',
    prompt:
      'Collect driver background check information: full legal name, date of birth, SSN last 4 digits, current address, and 3 years of employment history.',
  },
  {
    icon: CheckSquare,
    label: 'Training Checklist',
    prompt:
      'A vehicle inspection training with a YouTube video to watch, a checklist of items they need to understand, and a quiz with 3 multiple choice questions.',
  },
  {
    icon: ExternalLink,
    label: 'External Action',
    prompt:
      'Driver needs to complete a third-party background check at checkr.com. Show instructions, provide the link, and have them confirm when complete.',
  },
];

// ============================================
// CHAT BUBBLE COMPONENT
// ============================================

function ChatBubble({ 
  message, 
  isNew = false 
}: { 
  message: ChatMessage; 
  isNew?: boolean;
}) {
  const isUser = message.role === 'user';
  const [isVisible, setIsVisible] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  return (
    <div 
      className={cn(
        'flex items-start gap-2 transition-all duration-300 ease-out',
        isUser && 'flex-row-reverse',
        isNew && !isVisible && 'opacity-0 translate-y-2',
        isNew && isVisible && 'opacity-100 translate-y-0'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full shrink-0',
          isUser ? 'bg-primary' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5 text-primary-foreground" />
        ) : (
          <Bot className="w-3.5 h-3.5 text-primary" />
        )}
      </div>
      <div
        className={cn(
          'py-2 px-3 rounded-2xl max-w-[85%] overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ============================================
// THINKING INDICATOR
// ============================================

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-[fade-in_0.2s_ease-out]">
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="py-2 px-3 rounded-2xl rounded-tl-sm bg-muted">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Thinking</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// GENERATING ANIMATION
// ============================================

function GeneratingAnimation() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
            style={{ animationDuration: '1s' }}
          />
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          Generating credential...
        </p>
        <p className="text-xs text-muted-foreground">
          Building your workflow
        </p>
      </div>
    </div>
  );
}

// ============================================
// EMPTY PREVIEW STATE
// ============================================

function EmptyPreviewState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto mb-3 flex items-center justify-center">
          <Sparkles className="w-5 h-5 opacity-50" />
        </div>
        <p className="text-sm">
          Describe your credential and click Generate
        </p>
        <p className="text-xs mt-1">
          The preview will appear here
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AIBuilderTwoPanel({
  credentialId,
  credentialName,
  initialConfig,
  onConfigChange,
  onSave,
  onSwitchToManual,
  onBack,
  initialChatHistory = [],
  onChatHistoryChange,
  credentialStatus,
  secondaryActionLabel,
  onSecondaryAction,
}: AIBuilderTwoPanelProps) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatHistory);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [newMessageIndex, setNewMessageIndex] = useState(-1);
  
  // Config state
  const [config, setConfig] = useState<CredentialTypeInstructions>(initialConfig);
  const [pendingConfig, setPendingConfig] = useState<CredentialTypeInstructions | null>(null);
  
  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Preview progress state
  const [progressData, setProgressData] = useState<StepProgressData>(
    createEmptyProgressData()
  );
  
  // Track if we're in "refinement" mode (started with existing config)
  const hasExistingConfig = (pendingConfig ?? config).steps.length > 0;
  const [contextMessageGenerated, setContextMessageGenerated] = useState(false);
  
  // Auto-save to localStorage
  useAutoSaveDraft(credentialId, config, messages, true);

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Update parent when messages change
  useEffect(() => {
    onChatHistoryChange?.(messages);
  }, [messages, onChatHistoryChange]);

  // Update parent when config changes
  useEffect(() => {
    onConfigChange(config);
  }, [config, onConfigChange]);

  // Track unsaved changes (when config has steps and differs from initial)
  const initialConfigRef = useRef(initialConfig);
  useEffect(() => {
    // If config has steps and differs from initial, mark as unsaved
    if (config.steps.length > 0) {
      const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfigRef.current);
      setHasUnsavedChanges(hasChanges);
    }
  }, [config]);

  // Handle save to database
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      await onSave();
      setSaveSuccess(true);
      setHasUnsavedChanges(false);
      initialConfigRef.current = config; // Update ref to current config
      
      // Reset success indicator after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
      setError('Failed to save credential. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [onSave, isSaving, config]);

  // Generate context message when entering with existing config
  useEffect(() => {
    if (hasExistingConfig && messages.length === 0 && !contextMessageGenerated) {
      generateContextMessage();
    }
  }, [hasExistingConfig, messages.length, contextMessageGenerated]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length, isThinking]);

  // Focus input after AI responds
  useEffect(() => {
    if (!isThinking && messages.length > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isThinking, messages.length]);

  useEffect(() => {
    if (pendingDocuments.length === 0) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue =
        'You have pending document configurations. Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingDocuments.length]);

  // Generate context message for existing configs
  const generateContextMessage = async () => {
    setContextMessageGenerated(true);
    setIsThinking(true);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        {
          body: {
            mode: 'summarize_for_refinement',
            existingConfig: initialConfig,
            credentialName,
          },
        }
      );

      if (fnError) {
        // If the mode isn't supported yet, generate a simple summary
        const stepSummary = initialConfig.steps
          .map((step, i) => `${i + 1}. ${step.title}`)
          .join('\n');
        
        const fallbackMessage = `I see you've already built a credential with ${initialConfig.steps.length} section${initialConfig.steps.length !== 1 ? 's' : ''}:\n\n${stepSummary}\n\nWhat would you like to change or add?`;
        
        setMessages([{ role: 'assistant', content: fallbackMessage }]);
      } else if (data?.summary) {
        setMessages([{ role: 'assistant', content: data.summary }]);
      } else {
        // Fallback summary
        const stepSummary = initialConfig.steps
          .map((step, i) => `${i + 1}. ${step.title}`)
          .join('\n');
        
        const fallbackMessage = `I see you've built a credential with ${initialConfig.steps.length} section${initialConfig.steps.length !== 1 ? 's' : ''}:\n\n${stepSummary}\n\nWhat would you like to refine?`;
        
        setMessages([{ role: 'assistant', content: fallbackMessage }]);
      }
    } catch {
      // Silent fallback - just start fresh
      const fallbackMessage = `I can help you refine "${credentialName}". What changes would you like to make?`;
      setMessages([{ role: 'assistant', content: fallbackMessage }]);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle progress changes from InstructionRenderer
  const handleProgressChange = useCallback(
    (data: StepProgressData) => {
      setProgressData(data);
    },
    []
  );

  // Send chat message
  const applyConfigUpdates = (
    baseConfig: CredentialTypeInstructions,
    updates: Partial<CredentialTypeInstructions>
  ): CredentialTypeInstructions => {
    if (!updates) return baseConfig;
    return {
      ...baseConfig,
      ...updates,
      version: updates.version ?? baseConfig.version,
      settings: updates.settings
        ? { ...baseConfig.settings, ...updates.settings }
        : baseConfig.settings,
      steps: updates.steps ?? baseConfig.steps,
    };
  };

  const createFieldKey = (label: string) => {
    const normalized = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return normalized || `field_${crypto.randomUUID().slice(0, 8)}`;
  };

  const inferFieldType = (label: string): DocumentExtractionField['type'] => {
    const lower = label.toLowerCase();
    if (lower.includes('date')) return 'date';
    if (lower.includes('email')) return 'email';
    if (lower.includes('phone')) return 'phone';
    return 'text';
  };

  const parseOtherFields = (text: string) => {
    if (!text.trim()) return [];
    return text
      .split(/,| and /i)
      .map((part) => part.trim())
      .filter(Boolean);
  };

  const addDocumentToConfig = (doc: PendingDocument) => {
    const baseConfig = pendingConfig ?? config;
    
    // Check if a step with this document name already exists (for updates)
    const existingStepIndex = baseConfig.steps.findIndex(
      (s) => s.title.toLowerCase() === doc.name.toLowerCase()
    );
    
    const step = existingStepIndex >= 0 
      ? { ...baseConfig.steps[existingStepIndex] }
      : createStep(doc.name, 'document_upload');
    
    const headingBlock = createBlock('heading', {
      text: doc.name,
      level: 2,
    });

    if (doc.choice === 'upload') {
      const uploadBlock = createBlock('file_upload', {
        label: `Upload ${doc.name}`,
        accept: '.pdf,image/*',
        maxSizeMB: 10,
        multiple: false,
        required: true,
        helpText: undefined,
      });
      step.blocks = [headingBlock, uploadBlock];
    } else if (doc.choice === 'extract' && doc.fields?.length) {
      const extractionFields: DocumentExtractionField[] = doc.fields.map((field) => ({
        id: crypto.randomUUID(),
        key: createFieldKey(field),
        label: field,
        type: inferFieldType(field),
        required: true,
        source: 'user_specified',
      }));
      const documentBlock = createBlock('document', {
        uploadLabel: `Upload your ${doc.name}`,
        uploadDescription: undefined,
        acceptedTypes: ['image/*', 'application/pdf'],
        maxSizeMB: 10,
        required: true,
        extractionFields,
        extractionContext: undefined,
      });
      step.blocks = [headingBlock, documentBlock];
    }

    if (step.blocks.length > 0) {
      let nextSteps: typeof baseConfig.steps;
      
      if (existingStepIndex >= 0) {
        // Update existing step in place
        nextSteps = baseConfig.steps.map((s, idx) => 
          idx === existingStepIndex ? step : s
        );
      } else {
        // Add new step
        nextSteps = [...baseConfig.steps, { ...step, order: baseConfig.steps.length + 1 }];
      }
      
      setConfig({ ...baseConfig, steps: nextSteps });
      setPendingConfig(null);
      setHasPendingChanges(false);
    }
  };

  const windowMessages = (incoming: ChatMessage[]) => {
    const maxMessages = 20;
    if (incoming.length <= maxMessages) return incoming;
    const first = incoming.slice(0, 2);
    const recent = incoming.slice(-15);
    const summary: ChatMessage = {
      role: 'assistant',
      content: `[Earlier conversation summarized: ${
        incoming.length - 17
      } messages about credential configuration]`,
    };
    return [...first, summary, ...recent];
  };

  const findPendingDocument = (name: string) =>
    pendingDocuments.find((doc) => doc.name === name && doc.status !== 'configured');

  const buildReadyToGenerate = (content: string, responseFlag?: boolean) => {
    if (responseFlag) return true;
    const readyIndicators = [
      'have everything',
      'have enough',
      'ready to generate',
      'click generate',
      'good to go',
      'all set',
    ];
    return readyIndicators.some((indicator) =>
      content.toLowerCase().includes(indicator)
    );
  };

  const sendMessage = async (
    userMessage: string,
    options?: { componentResponse?: ComponentResponse; pendingDocs?: PendingDocument[] }
  ) => {
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    
    setNewMessageIndex(updatedMessages.length - 1);
    setMessages(updatedMessages);
    setInputValue('');
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    setIsThinking(true);
    setError(null);

    try {
      const windowedMessages = windowMessages(updatedMessages);
      const requestMessages = windowedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const requestBody: Record<string, unknown> = {
        mode: hasExistingConfig ? 'refine_existing' : 'chat',
        messages: requestMessages,
        credentialName,
      };

      // Include existing config context for refinement
      if (hasExistingConfig) {
        requestBody.existingConfig = pendingConfig ?? config;
      }

      if (options?.componentResponse) {
        requestBody.componentResponse = options.componentResponse;
      }

      requestBody.pendingDocuments = options?.pendingDocs ?? pendingDocuments;

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        { body: requestBody }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get response');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const responseText = data?.response ?? data?.content ?? '';
      const responseComponent = data?.component ?? null;
      const responseConfigUpdates = data?.configUpdates ?? data?.partialConfig ?? null;
      const responseHasPendingChanges =
        typeof data?.hasPendingChanges === 'boolean'
          ? data.hasPendingChanges
          : !!responseConfigUpdates;

      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: responseText,
        component: responseComponent,
      };
      
      const newMessages = [...updatedMessages, aiResponse];
      setNewMessageIndex(newMessages.length - 1);
      setMessages(newMessages);

      if (responseComponent?.type === 'extract_or_upload') {
        setPendingDocuments((prev) => {
          if (
            prev.some(
              (doc) =>
                doc.name === responseComponent.documentName &&
                doc.status !== 'configured'
            )
          ) {
            return prev;
          }
          return [
            ...prev,
            {
              id: crypto.randomUUID(),
              name: responseComponent.documentName,
              status: 'awaiting_extract_choice',
            },
          ];
        });
      }

      // Check if AI indicates it's ready to generate
      const readyFromResponse = buildReadyToGenerate(
        responseText,
        data?.readyToGenerate
      );
      setIsReadyToGenerate(readyFromResponse);

      if (responseConfigUpdates) {
        const baseConfig = pendingConfig ?? config;
        const nextConfig = applyConfigUpdates(
          baseConfig,
          responseConfigUpdates as Partial<CredentialTypeInstructions>
        );
        setPendingConfig(nextConfig);
        setHasPendingChanges(responseHasPendingChanges);
        if (responseHasPendingChanges) {
          setIsReadyToGenerate(true);
        }
      } else if (data?.partialConfig) {
        setConfig(data.partialConfig);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsThinking(false);
    }
  };

  // Handle send button click
  const handleSend = () => {
    sendMessage(inputValue);
  };

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle textarea changes with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    const maxHeight = 150;
    e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
  };

  // Handle example prompt click
  const handleExampleClick = (examplePrompt: string) => {
    sendMessage(examplePrompt);
  };

  // Handle Generate button click
  const handleGenerate = async () => {
    if (hasPendingChanges && pendingConfig) {
      setConfig(pendingConfig);
      setPendingConfig(null);
      setHasPendingChanges(false);
      setIsReadyToGenerate(false);
      setProgressData(createEmptyProgressData());
      setNewMessageIndex(messages.length);
      setMessages([
        ...messages,
        {
          role: 'assistant',
          content:
            'Updates applied. You can preview them on the right or ask for more changes.',
        },
      ]);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const windowedMessages = windowMessages(messages);
      const requestBody: Record<string, unknown> = {
        mode: hasExistingConfig ? 'refine_from_chat' : 'generate_from_chat',
        messages: windowedMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        credentialName,
        pendingDocuments,
      };

      // Include existing config for refinement
      if (hasExistingConfig) {
        requestBody.existingConfig = pendingConfig ?? config;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        { body: requestBody }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.config) {
        throw new Error('No configuration returned');
      }

      // Update config state (this will update preview)
      setConfig(data.config);
      setPendingConfig(null);
      setHasPendingChanges(false);
      setIsReadyToGenerate(false);

      // Reset progress for new config
      setProgressData(createEmptyProgressData());

      // Add a success message to chat
      const successMessage: ChatMessage = {
        role: 'assistant',
        content: `I've ${hasExistingConfig ? 'updated' : 'generated'} your credential! You can preview it on the right. Click "Edit Manually" if you'd like to make detailed changes, or tell me what else you'd like to adjust.`,
      };
      setMessages([...messages, successMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComponentResponse = async (
    response: ComponentResponse,
    summaryOverride?: string,
    isUpdate?: boolean
  ) => {
    if (response.type === 'extract_or_upload') {
      const matched = findPendingDocument(response.documentName);
      const updatedPendingDocs = pendingDocuments.map((doc) =>
        doc.id === matched?.id
          ? {
              ...doc,
              status:
                response.choice === 'extract' ? 'awaiting_fields' : 'configured',
              choice: response.choice,
            }
          : doc
      );
      setPendingDocuments(updatedPendingDocs);

      if (response.choice === 'upload' && matched) {
        addDocumentToConfig({
          ...matched,
          status: 'configured',
          choice: 'upload',
        });
        setPendingDocuments((prev) => prev.filter((doc) => doc.id !== matched.id));
      }

      const userMessage =
        response.choice === 'extract'
          ? `Extract specific fields from ${response.documentName}.`
          : `Just upload ${response.documentName} without extraction.`;
      await sendMessage(userMessage, {
        componentResponse: response,
        pendingDocs: updatedPendingDocs,
      });
      return;
    }

    // Handle field_selection response (for both known and unknown documents)
    const otherText = response.otherFields.trim();
    const parsedOtherFields = parseOtherFields(otherText);
    const allFields = [...response.selectedFields, ...parsedOtherFields].filter(Boolean);
    
    // Check if there's an existing pending document (from A/B choice flow)
    const matched = findPendingDocument(response.documentName);
    
    // Create the document config - works for both known docs (no pending) and unknown docs (has pending)
    const docToAdd: PendingDocument = matched
      ? {
          ...matched,
          status: 'configured',
          choice: 'extract' as const,
          fields: allFields,
        }
      : {
          // For known documents that skip A/B choice, create the doc entry directly
          id: crypto.randomUUID(),
          name: response.documentName,
          status: 'configured',
          choice: 'extract' as const,
          fields: allFields,
        };

    // Add or update the document in config
    addDocumentToConfig(docToAdd);
    
    // Clean up pending documents if there was one
    if (matched) {
      setPendingDocuments((prev) => prev.filter((doc) => doc.id !== matched.id));
    }

    // Skip sending message if this is just an update (user re-edited an existing form)
    if (isUpdate) {
      return;
    }

    const parts = [summaryOverride || response.selectedFields.join(', ')].filter(Boolean);
    if (otherText) {
      parts.push(otherText);
    }
    const summary = parts.filter(Boolean).join(', ');
    const userMessage = summary
      ? `Extract ${summary} from ${response.documentName}.`
      : `Extract fields from ${response.documentName}.`;

    await sendMessage(userMessage, {
      componentResponse: response,
      pendingDocs: pendingDocuments.filter((doc) => doc.id !== matched?.id),
    });
  };

  const hasMessages = messages.length > 0;
  // Use pendingConfig for preview if available (shows AI suggestions before user clicks "Update")
  const previewConfig = pendingConfig ?? config;
  const hasSteps = previewConfig.steps.length > 0;
  const saveLabel = credentialStatus === 'draft' ? 'Save Draft' : 'Save Changes';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">
              {credentialName || 'New Credential'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onSwitchToManual} className="gap-2">
            <Wrench className="w-4 h-4" />
            Edit Manually
          </Button>
        </div>
      </div>

      {/* Main Content - Two Panels */}
      <div className={cn(
        'flex flex-1 overflow-hidden',
        'flex-col md:flex-row'
      )}>
        {/* Chat Panel - Left */}
        <div className={cn(
          'border-b md:border-b-0 md:border-r border-border flex flex-col bg-background',
          'h-1/2 md:h-full md:w-[38%] md:min-w-[320px]'
        )}>
          {/* Chat Messages */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-3 py-3"
          >
            <div className="space-y-3">
              {!hasMessages && !isThinking ? (
                // Initial state with examples
                <div className="space-y-6 py-4">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                      <Bot className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-medium mb-1">
                      What credential do you need?
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                      Describe what drivers should complete, upload, or acknowledge
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground text-center block">
                      Quick examples
                    </Label>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {EXAMPLE_PROMPTS.map((example) => (
                        <Badge
                          key={example.label}
                          variant="outline"
                          className="cursor-pointer hover:bg-accent transition-colors py-1.5 px-2 text-xs"
                          onClick={() => handleExampleClick(example.prompt)}
                        >
                          <example.icon className="w-3 h-3 mr-1.5" />
                          {example.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className="space-y-2">
                      <ChatBubble
                        message={msg}
                        isNew={idx === newMessageIndex}
                      />
                      {msg.role === 'assistant' && msg.component ? (
                        <div className="pl-9">
                          {msg.component.type === 'extract_or_upload' ? (
                            <ExtractOrUploadChoice
                              documentName={msg.component.documentName}
                              onSelect={(choice) =>
                                handleComponentResponse({
                                  type: 'extract_or_upload',
                                  documentName: msg.component.documentName,
                                  choice,
                                })
                              }
                            />
                          ) : (
                            <FieldSelectionForm
                              documentName={msg.component.documentName}
                              suggestedFields={msg.component.suggestedFields}
                              onConfirm={(selectedFields, otherFields, isUpdate) =>
                                handleComponentResponse(
                                  {
                                    type: 'field_selection',
                                    documentName: msg.component.documentName,
                                    selectedFields,
                                    otherFields,
                                  },
                                  selectedFields
                                    .map(
                                      (fieldKey) =>
                                        msg.component.suggestedFields.find(
                                          (field) => field.key === fieldKey
                                        )?.label ?? fieldKey
                                    )
                                    .join(', '),
                                  isUpdate
                                )
                              }
                            />
                          )}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {isThinking && <ThinkingIndicator />}
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-3 pb-2">
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-border space-y-2">
            {/* Save button when there are configured steps */}
            {hasSteps && onSave && !isThinking && (
              <Button
                onClick={handleSave}
                disabled={isSaving || (!hasUnsavedChanges && !saveSuccess)}
                className="w-full"
                size="sm"
                variant={hasUnsavedChanges ? 'default' : saveSuccess ? 'default' : 'secondary'}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Saved
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {hasUnsavedChanges ? saveLabel : 'Saved'}
                  </>
                )}
              </Button>
            )}

            {/* Chat input */}
            <div className="relative">
              <Textarea
                ref={inputRef}
                placeholder={
                  hasMessages
                    ? 'Type a message... (Shift+Enter for new line)'
                    : 'Describe your credential...'
                }
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isThinking || isGenerating}
                className="min-h-[44px] max-h-[100px] resize-none py-2.5 pr-10 text-sm"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isThinking || isGenerating}
                size="icon"
                className="absolute right-1.5 bottom-1.5 h-7 w-7"
                variant="ghost"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Preview Panel - Right */}
        <div className={cn(
          'flex-1 flex flex-col bg-muted/20',
          'h-1/2 md:h-full'
        )}>
          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isGenerating ? (
              <GeneratingAnimation />
            ) : !hasSteps ? (
              <EmptyPreviewState />
            ) : (
              <div className="animate-[fade-in_0.4s_ease-out]">
                <InstructionRenderer
                  config={previewConfig}
                  progressData={progressData}
                  onProgressChange={handleProgressChange}
                  onSubmit={() => {
                    // Preview mode - just log
                    console.log('Preview submit clicked');
                  }}
                  disabled={false}
                  isSubmitting={false}
                  submitLabel="Complete"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
