import { useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Layers } from 'lucide-react';
import { SortableBlockItem } from './SortableBlockItem';
import { BlockPaletteSheet } from './BlockPaletteSheet';
import { BlockEditor } from './BlockEditor';
import type {
  InstructionStep,
  ContentBlock,
  BlockType,
  BlockContent,
} from '@/types/instructionBuilder';
import { createBlock } from '@/types/instructionBuilder';

interface BlockEditorPanelProps {
  step: InstructionStep;
  onStepChange: (step: InstructionStep) => void;
  mode?: 'ai' | 'edit';
  onSwitchToAI?: () => void;
}

export function BlockEditorPanel({ step, onStepChange, mode = 'edit', onSwitchToAI }: BlockEditorPanelProps) {
  const [showPalette, setShowPalette] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const blockIds = step.blocks.map((b) => b.id);
  const editingBlock = editingBlockId
    ? step.blocks.find((b) => b.id === editingBlockId)
    : null;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = step.blocks.findIndex((b) => b.id === active.id);
    const newIndex = step.blocks.findIndex((b) => b.id === over.id);

    const reordered = arrayMove(step.blocks, oldIndex, newIndex).map((block, idx) => ({
      ...block,
      order: idx + 1,
    }));

    onStepChange({ ...step, blocks: reordered });
  }

  function handleAddBlock(type: BlockType, content: BlockContent) {
    const newBlock = createBlock(type, content);
    newBlock.order = step.blocks.length + 1;
    onStepChange({ ...step, blocks: [...step.blocks, newBlock] });
    setShowPalette(false);
    setEditingBlockId(newBlock.id);
  }

  function handleDeleteBlock(blockId: string) {
    const filtered = step.blocks
      .filter((b) => b.id !== blockId)
      .map((block, idx) => ({ ...block, order: idx + 1 }));
    onStepChange({ ...step, blocks: filtered });
    if (editingBlockId === blockId) {
      setEditingBlockId(null);
    }
  }

  function handleDuplicateBlock(blockId: string) {
    const blockToDupe = step.blocks.find((b) => b.id === blockId);
    if (!blockToDupe) return;

    const duped: ContentBlock = {
      ...blockToDupe,
      id: crypto.randomUUID(),
      order: step.blocks.length + 1,
    };

    onStepChange({ ...step, blocks: [...step.blocks, duped] });
  }

  function handleBlockChange(updatedBlock: ContentBlock) {
    const updated = step.blocks.map((b) =>
      b.id === updatedBlock.id ? updatedBlock : b
    );
    onStepChange({ ...step, blocks: updated });
  }

  function handleStepTitleChange(title: string) {
    onStepChange({ ...step, title });
  }

  function handleStepRequiredChange(required: boolean) {
    onStepChange({ ...step, required });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="step-title">Step Title</Label>
            <Input
              id="step-title"
              value={step.title}
              onChange={(e) => handleStepTitleChange(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2">
              <Checkbox
                id="step-required"
                checked={step.required}
                onCheckedChange={(v) => handleStepRequiredChange(!!v)}
              />
              <Label htmlFor="step-required">Required step</Label>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Content Blocks
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowPalette(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Block
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {step.blocks.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed rounded-lg">
              <Layers className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No blocks in this step
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowPalette(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Block
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {step.blocks.map((block) => (
                    <SortableBlockItem
                      key={block.id}
                      block={block}
                      isEditing={editingBlockId === block.id}
                      onEdit={() => setEditingBlockId(block.id)}
                      onDelete={() => handleDeleteBlock(block.id)}
                      onDuplicate={() => handleDuplicateBlock(block.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {editingBlock && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Edit Block</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingBlockId(null)}>
                Done
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <BlockEditor
              block={editingBlock}
              onChange={handleBlockChange}
              mode={mode}
              onSwitchToAI={onSwitchToAI}
            />
          </CardContent>
        </Card>
      )}

      <BlockPaletteSheet
        open={showPalette}
        onOpenChange={setShowPalette}
        onAddBlock={handleAddBlock}
        onSwitchToAI={onSwitchToAI}
      />
    </div>
  );
}
