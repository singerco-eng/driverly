/**
 * Demo Agentic Chat Component
 * 
 * Two-panel layout showing AI credential builder conversation alongside
 * real-time credential preview. Auto-plays conversation, then allows
 * user to click Generate to see the credential build.
 * 
 * - Left panel (~35%): Chat conversation with smooth animations
 * - Right panel (~65%): Real InstructionRenderer (fully interactive after generation)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, User, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Real credential preview
import { InstructionRenderer } from '@/components/features/credentials/InstructionRenderer';
import type { StepProgressData } from '@/types/credentialProgress';
import { createEmptyProgressData } from '@/types/credentialProgress';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

// Mock data
import {
  conversationSteps,
  demoCredentialName,
  finalConfig,
  type ChatMessage,
} from '../demo-data/mockAgenticChat';

interface DemoAgenticChatProps {
  embedded?: boolean;
}

// ============================================
// CHAT BUBBLE COMPONENT (with animation)
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
      // Small delay then animate in
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
          'flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-transform duration-200',
          isUser ? 'bg-primary' : 'bg-primary/10',
          isNew && isVisible && 'animate-[scale-in_0.2s_ease-out]'
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
          'py-2 px-3 rounded-2xl max-w-[85%] transition-all duration-200',
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
// GENERATING ANIMATION (for preview panel)
// ============================================

function GeneratingAnimation({ progress }: { progress: number }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          {/* Spinning outer ring */}
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div 
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin"
            style={{ animationDuration: '1s' }}
          />
          {/* Center icon */}
          <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-6 h-6 text-primary animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-medium text-foreground mb-1">
          Generating credential...
        </p>
        <p className="text-xs text-muted-foreground">
          Building {progress === 1 ? 'video section' : progress === 2 ? 'quiz section' : 'acknowledgment'}...
        </p>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function DemoAgenticChat({ embedded = false }: DemoAgenticChatProps) {
  // Chat animation state
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [showThinking, setShowThinking] = useState(false);
  const [chatComplete, setChatComplete] = useState(false);
  const [newMessageIndex, setNewMessageIndex] = useState(-1);
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);
  
  // Credential config state
  const [config, setConfig] = useState<CredentialTypeInstructions>({
    version: 2,
    settings: {
      showProgressBar: true,
      allowStepSkip: false,
      completionBehavior: 'required_only',
      externalSubmissionAllowed: false,
    },
    steps: [],
  });
  
  // Preview progress state (for InstructionRenderer)
  const [progressData, setProgressData] = useState<StepProgressData>(
    createEmptyProgressData()
  );

  // Refs
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const handleGenerateRef = useRef<(() => Promise<void>) | null>(null);

  // Get visible messages (up to current step)
  const visibleMessages = conversationSteps
    .slice(0, currentStepIndex + 1)
    .map((step) => step.message);

  // Handle progress changes from InstructionRenderer
  const handleProgressChange = useCallback(
    (data: StepProgressData) => {
      setProgressData(data);
    },
    []
  );

  // Handle Generate button click
  const handleGenerate = useCallback(async () => {
    if (isGenerating || generationComplete) return;
    
    setIsGenerating(true);
    setGenerationProgress(1);
    
    // Simulate progressive generation
    await new Promise((resolve) => setTimeout(resolve, 600));
    setGenerationProgress(2);
    
    await new Promise((resolve) => setTimeout(resolve, 600));
    setGenerationProgress(3);
    
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    // Set final config and complete
    setConfig(finalConfig);
    setIsGenerating(false);
    setGenerationComplete(true);
  }, [isGenerating, generationComplete]);

  // Keep ref updated
  handleGenerateRef.current = handleGenerate;

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [visibleMessages.length, showThinking]);

  // Chat animation loop (faster, smoother)
  useEffect(() => {
    if (chatComplete) return;

    const runAnimation = async () => {
      for (let i = 0; i < conversationSteps.length; i++) {
        const step = conversationSteps[i];
        
        // Wait for delay
        await new Promise((resolve) => setTimeout(resolve, step.delay));
        
        // Show thinking indicator if needed (for assistant messages)
        if (step.showThinking) {
          setShowThinking(true);
          await new Promise((resolve) => setTimeout(resolve, 350));
          setShowThinking(false);
        }
        
        // Mark this as the new message for animation
        setNewMessageIndex(i);
        
        // Show the message
        setCurrentStepIndex(i);
        
        // Reset new message flag after animation
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      
      // Mark chat complete and auto-trigger generate
      setChatComplete(true);
      
      // Auto-click generate after a brief pause
      await new Promise((resolve) => setTimeout(resolve, 400));
      handleGenerateRef.current?.();
    };

    // Start animation after a short delay
    const timer = setTimeout(runAnimation, 400);
    return () => clearTimeout(timer);
  }, [chatComplete]);

  const hasSteps = config.steps.length > 0;

  return (
    <div className={cn(
      'flex h-[550px] md:h-[600px] bg-background overflow-hidden',
      embedded && 'rounded-b-lg'
    )}>
      {/* Chat Panel - Left (~35%) */}
      <div className="w-[35%] min-w-[280px] border-r border-border flex flex-col bg-background">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Create with AI</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {demoCredentialName}
          </p>
        </div>

        {/* Chat Messages */}
        <div
          ref={chatScrollRef}
          className="flex-1 overflow-y-auto px-3 py-3"
        >
          <div className="space-y-3">
            {visibleMessages.length === 0 && !showThinking ? (
              // Initial state
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Describe your credential...
                </p>
              </div>
            ) : (
              <>
                {visibleMessages.map((msg, idx) => (
                  <ChatBubble 
                    key={idx} 
                    message={msg} 
                    isNew={idx === newMessageIndex}
                  />
                ))}
                {showThinking && <ThinkingIndicator />}
              </>
            )}
          </div>
        </div>

        {/* Generate Button (shown when chat complete) */}
        {chatComplete && (
          <div className="p-3 border-t border-border animate-[fade-in_0.3s_ease-out]">
            <Button 
              className="w-full" 
              size="sm"
              variant="default"
              onClick={handleGenerate}
              disabled={isGenerating || generationComplete}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : generationComplete ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Generated
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5 mr-1.5" />
                  Generate Credential
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Preview Panel - Right (~65%) */}
      <div className="flex-1 flex flex-col bg-muted/20">
        {/* Preview Header */}
        <div className="px-4 py-3 border-b border-border bg-background flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">Preview</span>
            {hasSteps && (
              <Badge variant="secondary" className="text-xs animate-[fade-in_0.2s_ease-out]">
                {config.steps.length} section{config.steps.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {generationComplete && (
            <span className="text-xs text-muted-foreground animate-[fade-in_0.3s_ease-out]">
              Interactive — try it out
            </span>
          )}
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isGenerating ? (
            <GeneratingAnimation progress={generationProgress} />
          ) : !hasSteps ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto mb-3 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 opacity-50" />
                </div>
                <p className="text-sm">
                  Credential preview will appear here...
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-[fade-in_0.4s_ease-out]">
              <InstructionRenderer
                config={config}
                progressData={progressData}
                onProgressChange={handleProgressChange}
                onSubmit={() => {
                  // Demo - just log
                  console.log('Demo submit');
                }}
                disabled={false}
                isSubmitting={false}
                submitLabel="Complete Training"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
