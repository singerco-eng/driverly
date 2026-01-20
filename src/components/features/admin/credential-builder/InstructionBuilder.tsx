import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Layers, Sparkles } from 'lucide-react';
import { StepAccordionItem } from './StepAccordionItem';
import { AddStepSheet } from './AddStepSheet';
import { BlockEditorSheet } from './BlockEditorSheet';
import { AIGeneratorSheet } from './AIGeneratorSheet';
import type {
  CredentialTypeInstructions,
  InstructionStep,
  ContentBlock,
  StepType,
} from '@/types/instructionBuilder';
import { createStep } from '@/types/instructionBuilder';

interface InstructionBuilderProps {
  config: CredentialTypeInstructions;
  onChange: (config: CredentialTypeInstructions) => void;
  credentialName?: string;
}

export function InstructionBuilder({ config, onChange, credentialName = '' }: InstructionBuilderProps) {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(
    config.steps[0]?.id ?? null
  );
  const [showAddStepSheet, setShowAddStepSheet] = useState(false);
  const [showAISheet, setShowAISheet] = useState(false);
  const [editingBlock, setEditingBlock] = useState<{
    stepId: string;
    block: ContentBlock;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stepIds = useMemo(() => config.steps.map((s) => s.id), [config.steps]);

  function handleStepsDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = config.steps.findIndex((s) => s.id === active.id);
    const newIndex = config.steps.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(config.steps, oldIndex, newIndex).map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    onChange({ ...config, steps: reordered });
  }

  function handleAddStep(type: StepType, title: string) {
    const newStep = createStep(title, type);
    newStep.order = config.steps.length + 1;
    onChange({ ...config, steps: [...config.steps, newStep] });
    setExpandedStepId(newStep.id);
    setShowAddStepSheet(false);
  }

  function handleStepChange(updatedStep: InstructionStep) {
    const updated = config.steps.map((s) =>
      s.id === updatedStep.id ? updatedStep : s
    );
    onChange({ ...config, steps: updated });
  }

  function handleDeleteStep(stepId: string) {
    const filtered = config.steps
      .filter((s) => s.id !== stepId)
      .map((step, idx) => ({ ...step, order: idx + 1 }));
    onChange({ ...config, steps: filtered });
    if (expandedStepId === stepId) {
      setExpandedStepId(filtered[0]?.id ?? null);
    }
  }

  function handleDuplicateStep(stepId: string) {
    const stepToDupe = config.steps.find((s) => s.id === stepId);
    if (!stepToDupe) return;

    const duped: InstructionStep = {
      ...stepToDupe,
      id: crypto.randomUUID(),
      title: `${stepToDupe.title} (Copy)`,
      order: config.steps.length + 1,
      blocks: stepToDupe.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };

    onChange({ ...config, steps: [...config.steps, duped] });
    setExpandedStepId(duped.id);
  }

  function handleEditBlock(stepId: string, block: ContentBlock) {
    setEditingBlock({ stepId, block });
  }

  function handleBlockChange(updatedBlock: ContentBlock) {
    if (!editingBlock) return;

    const step = config.steps.find((s) => s.id === editingBlock.stepId);
    if (!step) return;

    const updatedBlocks = step.blocks.map((b) =>
      b.id === updatedBlock.id ? updatedBlock : b
    );

    handleStepChange({ ...step, blocks: updatedBlocks });
    setEditingBlock({ ...editingBlock, block: updatedBlock });
  }

  function handleDeleteEditingBlock() {
    if (!editingBlock) return;

    const step = config.steps.find((s) => s.id === editingBlock.stepId);
    if (!step) return;

    const filteredBlocks = step.blocks
      .filter((b) => b.id !== editingBlock.block.id)
      .map((block, idx) => ({ ...block, order: idx + 1 }));

    handleStepChange({ ...step, blocks: filteredBlocks });
    setEditingBlock(null);
  }

  function handleApplyAIConfig(aiConfig: CredentialTypeInstructions) {
    // If there are existing steps, merge by appending AI-generated steps
    // If empty, replace entirely
    if (config.steps.length === 0) {
      onChange(aiConfig);
    } else {
      // Append AI steps with updated order numbers
      const maxOrder = Math.max(...config.steps.map((s) => s.order), 0);
      const newSteps = aiConfig.steps.map((step, idx) => ({
        ...step,
        order: maxOrder + idx + 1,
      }));
      onChange({
        ...config,
        settings: { ...config.settings, ...aiConfig.settings },
        steps: [...config.steps, ...newSteps],
      });
    }
    // Expand the first new step
    if (aiConfig.steps[0]) {
      setExpandedStepId(aiConfig.steps[0].id);
    }
  }

  return (
    <div className="space-y-4">
      {/* Steps Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Steps
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAISheet(true)}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Create with AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAddStepSheet(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>
      </div>

      {/* Steps List (Accordion) */}
      {config.steps.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No steps yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add steps to build your credential workflow
            </p>
            <Button onClick={() => setShowAddStepSheet(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Step
            </Button>
          </div>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleStepsDragEnd}
        >
          <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {config.steps.map((step, index) => (
                <StepAccordionItem
                  key={step.id}
                  step={step}
                  index={index}
                  isExpanded={expandedStepId === step.id}
                  onToggle={() =>
                    setExpandedStepId(expandedStepId === step.id ? null : step.id)
                  }
                  onStepChange={handleStepChange}
                  onDelete={() => handleDeleteStep(step.id)}
                  onDuplicate={() => handleDuplicateStep(step.id)}
                  onEditBlock={(block) => handleEditBlock(step.id, block)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add another step button at bottom */}
      {config.steps.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowAddStepSheet(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Another Step
          </Button>
        </div>
      )}

      {/* Sheets */}
      <AddStepSheet
        open={showAddStepSheet}
        onOpenChange={setShowAddStepSheet}
        onAdd={handleAddStep}
      />

      <BlockEditorSheet
        block={editingBlock?.block ?? null}
        open={!!editingBlock}
        onOpenChange={(open) => !open && setEditingBlock(null)}
        onChange={handleBlockChange}
        onDelete={handleDeleteEditingBlock}
      />

      <AIGeneratorSheet
        open={showAISheet}
        onOpenChange={setShowAISheet}
        credentialName={credentialName}
        onApply={handleApplyAIConfig}
      />
    </div>
  );
}
