import { useState, useRef, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Layers,
  Send,
  Bot,
  User,
  RotateCcw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

interface AIGeneratorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialName: string;
  onApply: (config: CredentialTypeInstructions) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_PROMPTS = [
  {
    icon: FileUp,
    label: 'Document Upload',
    prompt: 'I need drivers to upload their commercial driver\'s license, both front and back photos. Include an expiration date field.',
  },
  {
    icon: PenTool,
    label: 'Agreement Signature',
    prompt: 'Create a safety policy acknowledgment where drivers read the policy text, check that they understand each section, and sign at the end.',
  },
  {
    icon: FileText,
    label: 'Form Entry',
    prompt: 'Collect driver background check information: full legal name, date of birth, SSN last 4 digits, current address, and 3 years of employment history.',
  },
  {
    icon: CheckSquare,
    label: 'Training Checklist',
    prompt: 'A vehicle inspection training with a YouTube video to watch, a checklist of items they need to understand, and a quiz with 3 multiple choice questions.',
  },
  {
    icon: ExternalLink,
    label: 'External Action',
    prompt: 'Driver needs to complete a third-party background check at checkr.com. Show instructions, provide the link, and have them confirm when complete.',
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
          'flex-1 p-3 rounded-2xl max-w-[85%]',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export function AIGeneratorSheet({
  open,
  onOpenChange,
  credentialName,
  onApply,
}: AIGeneratorSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<CredentialTypeInstructions | null>(null);
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
    // Shift+Enter allows new line (default behavior)
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight, but cap at max height
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

      setGeneratedConfig(data.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (generatedConfig) {
      onApply(generatedConfig);
      onOpenChange(false);
      resetState();
    }
  };

  const resetState = () => {
    setMessages([]);
    setInputValue('');
    setError(null);
    setGeneratedConfig(null);
    setIsReadyToGenerate(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetState, 300);
  };

  const handleStartOver = () => {
    resetState();
  };

  const hasMessages = messages.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create with AI
          </SheetTitle>
          <SheetDescription>
            {generatedConfig
              ? 'Review your generated credential'
              : 'Describe what you need and I\'ll help you build it'}
          </SheetDescription>
        </SheetHeader>

        {/* Generated Config Preview */}
        {generatedConfig ? (
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Generated Credential
                  </Label>
                  <Badge variant="secondary">
                    {generatedConfig.steps.length} section
                    {generatedConfig.steps.length !== 1 ? 's' : ''}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {generatedConfig.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.blocks.length} block
                          {step.blocks.length !== 1 ? 's' : ''} •{' '}
                          {step.type.replace('_', ' ')}
                        </p>
                      </div>
                      {step.required && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          Required
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t space-y-3">
              <Button onClick={handleApply} className="w-full" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Apply to Credential
              </Button>
              <Button
                variant="outline"
                onClick={() => setGeneratedConfig(null)}
                className="w-full"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Continue Conversation
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You can edit and customize in the builder after applying
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-6" ref={scrollRef}>
              <div className="py-4 space-y-4 min-h-0">
                {!hasMessages ? (
                  // Initial state with examples
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                        <Bot className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="font-medium mb-2">
                        What credential do you need?
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Describe what you want drivers to complete, upload, or
                        acknowledge. I'll ask follow-up questions to get the
                        details right.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        Quick examples
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {EXAMPLE_PROMPTS.map((example) => (
                          <Badge
                            key={example.label}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent transition-colors py-1.5"
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
                  // Chat messages
                  <>
                    {messages.map((msg, idx) => (
                      <ChatBubble key={idx} message={msg} />
                    ))}
                    {isThinking && <ThinkingIndicator />}
                  </>
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
            <div className="p-4 border-t space-y-3">
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
              <div className="flex gap-2 items-end">
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
                  className="flex-1 min-h-[44px] max-h-[150px] resize-none py-3"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isThinking || isGenerating}
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Start over link */}
              {hasMessages && !isThinking && (
                <button
                  onClick={handleStartOver}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                >
                  Start over
                </button>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
