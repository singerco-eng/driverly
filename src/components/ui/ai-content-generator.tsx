import React, { useState } from 'react';
import { Sparkles, Copy, RotateCcw, Check } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  ModalDescription,
} from './modal';
import { Button } from './button';
import { Textarea } from './textarea';
import { Label } from './label';
import { useNotificationToast } from './notification-toast';

export interface AIContentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (prompt: string) => Promise<string>;
  onInsert: (content: string) => void;
  contentType: 'system_prompt' | 'data_collection_criteria' | 'evaluation_criteria';
  fieldLabel: string;
  context?: {
    fieldName?: string;
    fieldType?: string;
    fieldContext?: string;
  };
  agentData?: {
    name?: string;
    [key: string]: any;
  };
}

const getContentTypeLabel = (contentType: string) => {
  switch (contentType) {
    case 'system_prompt':
      return 'System Prompt';
    case 'data_collection_criteria':
      return 'Data Collection Criteria';
    case 'evaluation_criteria':
      return 'Evaluation Criteria';
    default:
      return 'Content';
  }
};

const getPlaceholderText = (contentType: string) => {
  switch (contentType) {
    case 'system_prompt':
      return 'Describe the agent\'s role, personality, and purpose...\nExample: "Create a helpful customer service agent for an e-commerce platform that is professional, empathetic, and knowledgeable about products and policies."';
    case 'data_collection_criteria':
      return 'Describe what data should be collected and how...\nExample: "Extract customer contact information including name, email, and phone number from conversations."';
    case 'evaluation_criteria':
      return 'Describe what makes a successful interaction...\nExample: "Evaluate if the agent resolved the customer\'s issue within 3 turns and maintained a helpful tone."';
    default:
      return 'Describe what you want to generate...';
  }
};

export const AIContentGenerator: React.FC<AIContentGeneratorProps> = ({
  isOpen,
  onClose,
  onGenerate,
  onInsert,
  contentType,
  fieldLabel,
  context = {},
  agentData = {},
}) => {
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showSuccess, showError, showInfo } = useNotificationToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showError("Please describe what you want to generate.", "Empty Prompt");
      return;
    }

    setIsGenerating(true);
    try {
      const content = await onGenerate(prompt);
      setGeneratedContent(content);
    } catch (error) {
      console.error('Generation error:', error);
      showError(error instanceof Error ? error.message : "Failed to generate content. Please try again.", "Generation Failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      showSuccess("Generated content copied to clipboard.", "Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showError("Failed to copy content to clipboard.", "Copy Failed");
    }
  };

  const handleInsertAndClose = () => {
    if (generatedContent) {
      onInsert(generatedContent);
      onClose();
      resetState();
      showSuccess("Generated content has been inserted into the field.", "Content Inserted");
    }
  };

  const handleRegenerate = () => {
    if (prompt.trim()) {
      handleGenerate();
    }
  };

  const resetState = () => {
    setPrompt('');
    setGeneratedContent('');
    setIsGenerating(false);
    setCopied(false);
  };

  const handleClose = () => {
    onClose();
    resetState();
  };

  return (
    <Modal open={isOpen} onOpenChange={handleClose}>
      <ModalContent size="lg" className="max-h-[90vh] overflow-y-auto">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <ModalTitle>
              AI Content Generator
            </ModalTitle>
          </div>
          <ModalDescription>
            Generate {getContentTypeLabel(contentType).toLowerCase()} for <strong>{fieldLabel}</strong> using AI assistance.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="text-foreground">
              What would you like to generate?
            </Label>
            <Textarea
              id="ai-prompt"
              placeholder={getPlaceholderText(contentType)}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="min-h-[100px] bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-white/30"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full"
            variant="gradient"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>

          {/* Generated Content */}
          {generatedContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground">Generated Content:</Label>
                <div className="flex gap-2">
                  <Button
                    variant="glass-subtle"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="glass-subtle"
                    size="icon"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/20 p-4 max-h-[300px] overflow-y-auto overflow-x-hidden">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-white break-words">
                  {generatedContent}
                </div>
              </div>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="modal-secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleInsertAndClose}
            disabled={!generatedContent}
          >
            Insert Content
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
