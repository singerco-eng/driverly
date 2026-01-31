import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
  RotateCcw,
  ArrowLeft,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

interface AIGeneratorFullScreenProps {
  credentialName: string;
  onApply: (config: CredentialTypeInstructions) => void;
  onManualBuild: () => void;
  onBack: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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

// Thinking indicator with animated dots
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 p-3 rounded-2xl rounded-tl-sm bg-muted max-w-[85%]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted-foreground">Thinking</span>
          <span className="flex gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

// Chat message bubble component
function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          isUser ? 'bg-primary' : 'bg-primary/10'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>
      <div
        className={cn(
          'flex-1 p-3 rounded-2xl max-w-[85%] overflow-hidden',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>{message.content}</p>
      </div>
    </div>
  );
}

export function AIGeneratorFullScreen({
  credentialName,
  onApply,
  onManualBuild,
  onBack,
}: AIGeneratorFullScreenProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReadyToGenerate, setIsReadyToGenerate] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Focus input after AI responds
  useEffect(() => {
    if (!isThinking && messages.length > 0 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isThinking, messages.length]);

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputValue('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setIsThinking(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        {
          body: {
            mode: 'chat',
            messages: updatedMessages,
            credentialName,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || 'Failed to get response');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const aiResponse: ChatMessage = {
        role: 'assistant',
        content: data.response,
      };
      setMessages([...updatedMessages, aiResponse]);

      // Check if AI indicates it's ready to generate
      if (data.readyToGenerate) {
        setIsReadyToGenerate(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSend = () => {
    sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    const maxHeight = 150;
    e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
  };

  const handleExampleClick = (examplePrompt: string) => {
    sendMessage(examplePrompt);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'generate-credential-instructions',
        {
          body: {
            mode: 'generate_from_chat',
            messages,
            credentialName,
          },
        }
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

      // Apply the generated config - this will transition to preview mode
      onApply(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartOver = () => {
    setMessages([]);
    setInputValue('');
    setError(null);
    setIsReadyToGenerate(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-medium">
              {credentialName || 'New Credential'}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onManualBuild} className="gap-2">
          <Wrench className="w-4 h-4" />
          Use Manual Builder
        </Button>
      </div>

      {/* Chat Area - hidden scrollbar */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden px-6 scrollbar-hide"
        ref={scrollRef}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="max-w-2xl mx-auto py-8 space-y-4 min-h-full flex flex-col">
          {!hasMessages ? (
            // Initial state with examples
            <div className="flex-1 flex flex-col justify-center space-y-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                  <Bot className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">
                  What credential do you need?
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Describe what you want drivers to complete, upload, or
                  acknowledge. I'll ask follow-up questions to get the details
                  right.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground text-center block">
                  Quick examples
                </Label>
                <div className="flex flex-wrap justify-center gap-2">
                  {EXAMPLE_PROMPTS.map((example) => (
                    <Badge
                      key={example.label}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors py-2 px-3"
                      onClick={() => handleExampleClick(example.prompt)}
                    >
                      <example.icon className="w-3.5 h-3.5 mr-2" />
                      {example.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Chat messages
            <div className="flex-1 space-y-4">
              {messages.map((msg, idx) => (
                <ChatBubble key={idx} message={msg} />
              ))}
              {isThinking && <ThinkingIndicator />}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-background px-6 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Generate button when ready */}
          {hasMessages && !isThinking && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
              size="lg"
              variant={isReadyToGenerate ? 'default' : 'secondary'}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  {isReadyToGenerate
                    ? 'Generate Credential'
                    : 'Generate Now (or keep chatting)'}
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
                      ? 'Type your response... (Shift+Enter for new line)'
                      : 'Describe your credential...'
                  }
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  disabled={isThinking || isGenerating}
                  className="min-h-[56px] max-h-[150px] resize-none py-3 pr-12"
                  rows={2}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking || isGenerating}
                  size="icon"
                  className="absolute right-2 bottom-2 h-8 w-8"
                  variant="ghost"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

        </div>
      </div>
    </div>
  );
}
