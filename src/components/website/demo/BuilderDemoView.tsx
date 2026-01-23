import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Plus,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Type,
  FileText,
  Upload,
  CircleHelp,
  PenTool,
  ListChecks,
  Video,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  aiGeneratedSteps,
  BLOCK_TYPE_LABELS,
  type MockStep,
} from '@/pages/website/demo-data/mockInstructionConfig';
import { TypingText } from './DemoContainer';

interface BuilderDemoViewProps {
  isActive: boolean;
}

type DemoStage = 'empty' | 'typing' | 'generating' | 'complete' | 'reorder';

const blockIcons: Record<string, React.ElementType> = {
  heading: Type,
  paragraph: FileText,
  file_upload: Upload,
  quiz_question: CircleHelp,
  signature_pad: PenTool,
  checklist: ListChecks,
  video: Video,
  alert: AlertTriangle,
  form_field: FileText,
};

export function BuilderDemoView({ isActive }: BuilderDemoViewProps) {
  const [stage, setStage] = useState<DemoStage>('empty');
  const [prompt, setPrompt] = useState('');
  const [visibleSteps, setVisibleSteps] = useState<MockStep[]>([]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [typingComplete, setTypingComplete] = useState(false);

  const promptText =
    'Create a background check credential with consent form, ID upload, verification quiz, and e-signature';

  // Reset on deactivation
  useEffect(() => {
    if (!isActive) {
      setStage('empty');
      setPrompt('');
      setVisibleSteps([]);
      setExpandedStepId(null);
      setTypingComplete(false);
    }
  }, [isActive]);

  // Scripted demo flow
  useEffect(() => {
    if (!isActive) return;

    const timers: NodeJS.Timeout[] = [];

    // Stage 1: Start typing
    timers.push(
      setTimeout(() => {
        setStage('typing');
      }, 1000)
    );

    return () => timers.forEach(clearTimeout);
  }, [isActive]);

  // Handle typing completion
  useEffect(() => {
    if (!typingComplete || stage !== 'typing') return;

    const timers: NodeJS.Timeout[] = [];

    // Start generating
    timers.push(
      setTimeout(() => {
        setStage('generating');
      }, 500)
    );

    // Add steps one by one
    aiGeneratedSteps.forEach((step, index) => {
      timers.push(
        setTimeout(() => {
          setVisibleSteps((prev) => [...prev, step]);
          if (index === 0) {
            setExpandedStepId(step.id);
          }
        }, 1000 + index * 800)
      );
    });

    // Complete
    timers.push(
      setTimeout(() => {
        setStage('complete');
      }, 1000 + aiGeneratedSteps.length * 800 + 500)
    );

    // Reset and loop
    timers.push(
      setTimeout(() => {
        setStage('empty');
        setPrompt('');
        setVisibleSteps([]);
        setExpandedStepId(null);
        setTypingComplete(false);
      }, 1000 + aiGeneratedSteps.length * 800 + 4000)
    );

    return () => timers.forEach(clearTimeout);
  }, [typingComplete, stage]);

  return (
    <div className="flex h-full min-h-[500px]">
      {/* Left sidebar - Step list */}
      <div className="w-72 border-r border-gray-800/50 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-800/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                Credential Builder
              </h3>
              <p className="text-xs text-gray-500">Background Check</p>
            </div>
          </div>
        </div>

        {/* AI Prompt area */}
        <div className="p-3 border-b border-gray-800/50">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">
                AI Assistant
              </span>
            </div>
            <div className="text-sm text-gray-300 min-h-[40px]">
              {stage === 'typing' ? (
                <TypingText text={promptText} onComplete={() => setTypingComplete(true)} />
              ) : stage === 'empty' ? (
                <span className="text-gray-500 italic">
                  Describe what you need...
                </span>
              ) : (
                promptText
              )}
            </div>
            {(stage === 'generating' || stage === 'complete') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 mt-2 text-xs"
              >
                {stage === 'generating' ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    </motion.div>
                    <span className="text-amber-400">Generating steps...</span>
                  </>
                ) : (
                  <>
                    <span className="text-amber-400">✓ Generated {visibleSteps.length} steps</span>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Steps list */}
        <div className="flex-1 overflow-y-auto p-2">
          <AnimatePresence>
            {visibleSteps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-800/50 flex items-center justify-center mb-3">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">No steps yet</p>
                <p className="text-xs text-gray-600 mt-1">
                  Use AI or add manually
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {visibleSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    transition={{ duration: 0.3 }}
                  >
                    <div
                      className={cn(
                        'rounded-lg border transition-all cursor-pointer',
                        expandedStepId === step.id
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'border-gray-700/30 hover:bg-white/5'
                      )}
                      onClick={() =>
                        setExpandedStepId(
                          expandedStepId === step.id ? null : step.id
                        )
                      }
                    >
                      <div className="flex items-center gap-2 p-3">
                        <GripVertical className="w-4 h-4 text-gray-600 shrink-0" />
                        <div className="w-6 h-6 rounded bg-gray-700/50 flex items-center justify-center text-xs text-gray-400 shrink-0">
                          {index + 1}
                        </div>
                        <span className="text-sm text-white truncate flex-1">
                          {step.title}
                        </span>
                        {expandedStepId === step.id ? (
                          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        )}
                      </div>

                      {/* Expanded blocks */}
                      <AnimatePresence>
                        {expandedStepId === step.id && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-1 space-y-1.5 ml-8">
                              {step.blocks.map((block) => {
                                const Icon =
                                  blockIcons[block.type] || FileText;
                                return (
                                  <div
                                    key={block.id}
                                    className="flex items-center gap-2 p-2 rounded bg-gray-800/30 text-xs"
                                  >
                                    <Icon className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-gray-300">
                                      {BLOCK_TYPE_LABELS[block.type] ||
                                        block.type}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Add step button */}
        {visibleSteps.length > 0 && (
          <div className="p-3 border-t border-gray-800/50">
            <button className="w-full px-3 py-2 rounded-lg border border-dashed border-gray-700 text-gray-400 text-sm hover:border-gray-600 hover:text-gray-300 transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Add Step
            </button>
          </div>
        )}
      </div>

      {/* Right panel - Preview */}
      <div className="flex-1 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800/50 flex items-center justify-between">
          <h3 className="font-medium text-white">Preview</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">
              Driver View
            </span>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {visibleSteps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-gray-800/30 flex items-center justify-center mb-4">
                <FileText className="w-10 h-10 text-gray-700" />
              </div>
              <p className="text-gray-500 mb-2">
                No steps to preview
              </p>
              <p className="text-sm text-gray-600">
                Add steps to see how drivers will experience this credential
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              {/* Step progress pills */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {visibleSteps.map((step, index) => (
                  <motion.div
                    key={step.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                      index === 0
                        ? 'bg-amber-500 text-black'
                        : 'bg-gray-700 text-gray-400'
                    )}
                  >
                    {index + 1}
                  </motion.div>
                ))}
              </div>

              {/* Current step card */}
              {visibleSteps[0] && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 rounded-xl bg-gray-800/30 border border-gray-700/30"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {visibleSteps[0].title}
                  </h3>

                  <div className="space-y-4">
                    {visibleSteps[0].blocks.map((block) => {
                      const Icon = blockIcons[block.type] || FileText;
                      return (
                        <div
                          key={block.id}
                          className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/20"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Icon className="w-4 h-4" />
                            {BLOCK_TYPE_LABELS[block.type] || block.type}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button className="flex-1 px-4 py-2.5 rounded-lg bg-gray-700/50 text-gray-400 text-sm font-medium">
                      Previous
                    </button>
                    <button className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-medium">
                      Next Step
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
