# TASK 016: Enhanced Credential Type Builder - Phase 2 (Step & Block Editing)

## Context

This phase adds **full step and block editing** to the Instruction Builder. Users can now add, edit, reorder, and delete steps, and within each step, add/edit/reorder blocks from a palette.

**Phase 1 Completed:**
- ✅ Database migration for `instruction_config`
- ✅ Type definitions for all block types
- ✅ Simple create modal with template selection
- ✅ Editor page shell with tabs
- ✅ Placeholder InstructionBuilder component

**Phase 2 Scope:**
1. Step management (add, edit, delete, reorder)
2. Block palette sheet for adding blocks
3. Block editing for each block type
4. Drag-and-drop reordering with `@dnd-kit`
5. Step selection and block editor panel

## Prerequisites

- Phase 1 (CODEX-TASK-015) complete
- Migration 022 applied
- `@dnd-kit/core` and `@dnd-kit/sortable` installed

---

## Your Tasks

### Task 1: Install Dependencies

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### Task 2: Step List Component with Drag-and-Drop

Create `src/components/features/admin/credential-builder/StepList.tsx`:

```tsx
import { useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Layers } from 'lucide-react';
import { SortableStepItem } from './SortableStepItem';
import { AddStepSheet } from './AddStepSheet';
import type { InstructionStep, StepType } from '@/types/instructionBuilder';
import { createStep } from '@/types/instructionBuilder';

interface StepListProps {
  steps: InstructionStep[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onStepsChange: (steps: InstructionStep[]) => void;
}

export function StepList({
  steps,
  selectedStepId,
  onSelectStep,
  onStepsChange,
}: StepListProps) {
  const [showAddSheet, setShowAddSheet] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);

    const reordered = arrayMove(steps, oldIndex, newIndex).map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));

    onStepsChange(reordered);
  }

  function handleAddStep(type: StepType, title: string) {
    const newStep = createStep(title, type);
    newStep.order = steps.length + 1;
    onStepsChange([...steps, newStep]);
    onSelectStep(newStep.id);
    setShowAddSheet(false);
  }

  function handleDeleteStep(stepId: string) {
    const filtered = steps
      .filter((s) => s.id !== stepId)
      .map((step, idx) => ({ ...step, order: idx + 1 }));
    onStepsChange(filtered);
    if (selectedStepId === stepId) {
      onSelectStep(filtered[0]?.id ?? null);
    }
  }

  function handleDuplicateStep(stepId: string) {
    const stepToDupe = steps.find((s) => s.id === stepId);
    if (!stepToDupe) return;

    const duped: InstructionStep = {
      ...stepToDupe,
      id: crypto.randomUUID(),
      title: `${stepToDupe.title} (Copy)`,
      order: steps.length + 1,
      blocks: stepToDupe.blocks.map((b) => ({ ...b, id: crypto.randomUUID() })),
    };

    onStepsChange([...steps, duped]);
    onSelectStep(duped.id);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Steps
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowAddSheet(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed rounded-lg">
              <Layers className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-sm font-medium mb-1">No steps yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add steps to build your credential workflow.
              </p>
              <Button variant="outline" size="sm" onClick={() => setShowAddSheet(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Step
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <SortableStepItem
                      key={step.id}
                      step={step}
                      index={index}
                      isSelected={selectedStepId === step.id}
                      onSelect={() => onSelectStep(step.id)}
                      onDelete={() => handleDeleteStep(step.id)}
                      onDuplicate={() => handleDuplicateStep(step.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AddStepSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={handleAddStep}
      />
    </>
  );
}
```

---

### Task 3: Sortable Step Item Component

Create `src/components/features/admin/credential-builder/SortableStepItem.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  FileText,
  ExternalLink,
  ClipboardList,
  Upload,
  PenTool,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import type { InstructionStep, StepType } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

const stepTypeIcons: Record<StepType, React.ElementType> = {
  information: FileText,
  external_action: ExternalLink,
  form_input: ClipboardList,
  document_upload: Upload,
  signature: PenTool,
  knowledge_check: HelpCircle,
  admin_verify: ShieldCheck,
};

const stepTypeLabels: Record<StepType, string> = {
  information: 'Information',
  external_action: 'External Action',
  form_input: 'Form Input',
  document_upload: 'Document Upload',
  signature: 'Signature',
  knowledge_check: 'Knowledge Check',
  admin_verify: 'Admin Verify',
};

interface SortableStepItemProps {
  step: InstructionStep;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableStepItem({
  step,
  index,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
}: SortableStepItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = stepTypeIcons[step.type] || FileText;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 cursor-pointer transition-all',
        isSelected && 'ring-2 ring-primary',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{step.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="w-3 h-3" />
            <span>{stepTypeLabels[step.type]}</span>
            <span>•</span>
            <span>
              {step.blocks.length} block{step.blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
```

---

### Task 4: Add Step Sheet

Create `src/components/features/admin/credential-builder/AddStepSheet.tsx`:

```tsx
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  FileText,
  ExternalLink,
  ClipboardList,
  Upload,
  PenTool,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import type { StepType } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

const stepTypes: { value: StepType; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'information',
    label: 'Information',
    description: 'Read-only content, instructions, or videos',
    icon: FileText,
  },
  {
    value: 'document_upload',
    label: 'Document Upload',
    description: 'User uploads files or documents',
    icon: Upload,
  },
  {
    value: 'form_input',
    label: 'Form Input',
    description: 'User fills out form fields',
    icon: ClipboardList,
  },
  {
    value: 'signature',
    label: 'Signature',
    description: 'User signs an agreement',
    icon: PenTool,
  },
  {
    value: 'external_action',
    label: 'External Action',
    description: 'User visits external website',
    icon: ExternalLink,
  },
  {
    value: 'knowledge_check',
    label: 'Knowledge Check',
    description: 'Quiz or assessment questions',
    icon: HelpCircle,
  },
  {
    value: 'admin_verify',
    label: 'Admin Verification',
    description: 'Admin manually verifies completion',
    icon: ShieldCheck,
  },
];

interface AddStepSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (type: StepType, title: string) => void;
}

export function AddStepSheet({ open, onOpenChange, onAdd }: AddStepSheetProps) {
  const [selectedType, setSelectedType] = useState<StepType>('information');
  const [title, setTitle] = useState('');

  function handleAdd() {
    const stepTitle = title.trim() || stepTypes.find((t) => t.value === selectedType)?.label || 'New Step';
    onAdd(selectedType, stepTitle);
    setTitle('');
    setSelectedType('information');
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTitle('');
      setSelectedType('information');
    }
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Add Step</SheetTitle>
          <SheetDescription>
            Choose the type of step to add to your credential workflow.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="step-title">Step Title (optional)</Label>
            <Input
              id="step-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Upload your CDL"
            />
          </div>

          <div className="space-y-2">
            <Label>Step Type</Label>
            <RadioGroup
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as StepType)}
              className="grid gap-2"
            >
              {stepTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.value}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      selectedType === type.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    )}
                  >
                    <RadioGroupItem value={type.value} className="mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {type.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add Step</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

---

### Task 5: Block Editor Panel

Create `src/components/features/admin/credential-builder/BlockEditorPanel.tsx`:

```tsx
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
import type { InstructionStep, ContentBlock, BlockType, BlockContent } from '@/types/instructionBuilder';
import { createBlock } from '@/types/instructionBuilder';

interface BlockEditorPanelProps {
  step: InstructionStep;
  onStepChange: (step: InstructionStep) => void;
}

export function BlockEditorPanel({ step, onStepChange }: BlockEditorPanelProps) {
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
      {/* Step Settings */}
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

      {/* Blocks */}
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

      {/* Block Editor */}
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
            <BlockEditor block={editingBlock} onChange={handleBlockChange} />
          </CardContent>
        </Card>
      )}

      <BlockPaletteSheet
        open={showPalette}
        onOpenChange={setShowPalette}
        onAddBlock={handleAddBlock}
      />
    </div>
  );
}
```

---

### Task 6: Sortable Block Item

Create `src/components/features/admin/credential-builder/SortableBlockItem.tsx`:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  MoreVertical,
  Copy,
  Trash2,
  Pencil,
  Heading,
  Type,
  FileText,
  Image,
  Video,
  ExternalLink,
  AlertTriangle,
  CheckSquare,
  MousePointer,
  Minus,
  FormInput,
  Upload,
  PenTool,
  HelpCircle,
} from 'lucide-react';
import type { ContentBlock, BlockType } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

const blockTypeIcons: Record<BlockType, React.ElementType> = {
  heading: Heading,
  paragraph: Type,
  rich_text: FileText,
  image: Image,
  video: Video,
  external_link: ExternalLink,
  alert: AlertTriangle,
  checklist: CheckSquare,
  button: MousePointer,
  divider: Minus,
  form_field: FormInput,
  file_upload: Upload,
  signature_pad: PenTool,
  quiz_question: HelpCircle,
};

const blockTypeLabels: Record<BlockType, string> = {
  heading: 'Heading',
  paragraph: 'Paragraph',
  rich_text: 'Rich Text',
  image: 'Image',
  video: 'Video',
  external_link: 'External Link',
  alert: 'Alert',
  checklist: 'Checklist',
  button: 'Button',
  divider: 'Divider',
  form_field: 'Form Field',
  file_upload: 'File Upload',
  signature_pad: 'Signature',
  quiz_question: 'Quiz Question',
};

function getBlockPreview(block: ContentBlock): string {
  const content = block.content as Record<string, unknown>;
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return (content.text as string) || '';
    case 'rich_text':
      return 'Rich text content';
    case 'image':
      return (content.alt as string) || 'Image';
    case 'video':
      return (content.title as string) || 'Video';
    case 'external_link':
      return (content.title as string) || (content.url as string) || 'Link';
    case 'alert':
      return (content.title as string) || (content.message as string) || 'Alert';
    case 'checklist':
      return `${((content.items as unknown[]) || []).length} items`;
    case 'button':
      return (content.text as string) || 'Button';
    case 'divider':
      return '—';
    case 'form_field':
      return (content.label as string) || 'Field';
    case 'file_upload':
      return (content.label as string) || 'File upload';
    case 'signature_pad':
      return (content.label as string) || 'Signature';
    case 'quiz_question':
      return (content.question as string) || 'Question';
    default:
      return '';
  }
}

interface SortableBlockItemProps {
  block: ContentBlock;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function SortableBlockItem({
  block,
  isEditing,
  onEdit,
  onDelete,
  onDuplicate,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = blockTypeIcons[block.type] || Type;
  const preview = getBlockPreview(block);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-2 cursor-pointer transition-all',
        isEditing && 'ring-2 ring-primary bg-primary/5',
        isDragging && 'opacity-50 shadow-lg'
      )}
      onClick={onEdit}
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        <div className="p-1.5 rounded bg-muted">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{blockTypeLabels[block.type]}</p>
          {preview && (
            <p className="text-xs text-muted-foreground truncate">{preview}</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
```

---

### Task 7: Block Palette Sheet

Create `src/components/features/admin/credential-builder/BlockPaletteSheet.tsx`:

```tsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Heading,
  Type,
  FileText,
  Image,
  Video,
  ExternalLink,
  AlertTriangle,
  CheckSquare,
  MousePointer,
  Minus,
  FormInput,
  Upload,
  PenTool,
  HelpCircle,
} from 'lucide-react';
import type { BlockType, BlockContent } from '@/types/instructionBuilder';

interface BlockPaletteItem {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ElementType;
  category: 'content' | 'interactive' | 'action';
  defaultContent: BlockContent;
}

const paletteItems: BlockPaletteItem[] = [
  // Content
  {
    type: 'heading',
    label: 'Heading',
    description: 'Section title',
    icon: Heading,
    category: 'content',
    defaultContent: { text: 'New Heading', level: 2 },
  },
  {
    type: 'paragraph',
    label: 'Paragraph',
    description: 'Text content',
    icon: Type,
    category: 'content',
    defaultContent: { text: '' },
  },
  {
    type: 'rich_text',
    label: 'Rich Text',
    description: 'Formatted content',
    icon: FileText,
    category: 'content',
    defaultContent: { html: '' },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Display an image',
    icon: Image,
    category: 'content',
    defaultContent: { url: '', alt: '' },
  },
  {
    type: 'video',
    label: 'Video',
    description: 'Embed video',
    icon: Video,
    category: 'content',
    defaultContent: { source: 'youtube', url: '', requireWatch: false },
  },
  {
    type: 'alert',
    label: 'Alert',
    description: 'Info/warning box',
    icon: AlertTriangle,
    category: 'content',
    defaultContent: { variant: 'info', title: '', message: '' },
  },
  {
    type: 'divider',
    label: 'Divider',
    description: 'Visual separator',
    icon: Minus,
    category: 'content',
    defaultContent: { style: 'solid' },
  },
  // Interactive
  {
    type: 'form_field',
    label: 'Form Field',
    description: 'Text, date, select',
    icon: FormInput,
    category: 'interactive',
    defaultContent: { key: '', label: '', type: 'text', required: false },
  },
  {
    type: 'file_upload',
    label: 'File Upload',
    description: 'Document upload',
    icon: Upload,
    category: 'interactive',
    defaultContent: { label: 'Upload File', accept: '.pdf,.jpg,.png', maxSizeMB: 50, multiple: false, required: true },
  },
  {
    type: 'signature_pad',
    label: 'Signature',
    description: 'E-signature capture',
    icon: PenTool,
    category: 'interactive',
    defaultContent: { label: 'Your Signature', required: true, allowTyped: true, allowDrawn: true },
  },
  {
    type: 'checklist',
    label: 'Checklist',
    description: 'Checkbox items',
    icon: CheckSquare,
    category: 'interactive',
    defaultContent: { items: [], requireAllChecked: false },
  },
  {
    type: 'quiz_question',
    label: 'Quiz Question',
    description: 'Knowledge check',
    icon: HelpCircle,
    category: 'interactive',
    defaultContent: { question: '', questionType: 'multiple_choice', options: [], allowRetry: true, required: true },
  },
  // Action
  {
    type: 'external_link',
    label: 'External Link',
    description: 'Link to website',
    icon: ExternalLink,
    category: 'action',
    defaultContent: { url: '', title: '', buttonText: 'Open Link', trackVisit: false, requireVisit: false, opensInNewTab: true },
  },
  {
    type: 'button',
    label: 'Button',
    description: 'Action button',
    icon: MousePointer,
    category: 'action',
    defaultContent: { text: 'Continue', variant: 'default', action: 'next_step' },
  },
];

interface BlockPaletteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddBlock: (type: BlockType, content: BlockContent) => void;
}

export function BlockPaletteSheet({ open, onOpenChange, onAddBlock }: BlockPaletteSheetProps) {
  const contentBlocks = paletteItems.filter((b) => b.category === 'content');
  const interactiveBlocks = paletteItems.filter((b) => b.category === 'interactive');
  const actionBlocks = paletteItems.filter((b) => b.category === 'action');

  function handleAdd(item: BlockPaletteItem) {
    onAddBlock(item.type, item.defaultContent);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Block</SheetTitle>
          <SheetDescription>
            Choose a block type to add to this step.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Content */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Content
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {contentBlocks.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="h-auto py-3 px-3 justify-start gap-2"
                    onClick={() => handleAdd(item)}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Interactive */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Interactive
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {interactiveBlocks.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="h-auto py-3 px-3 justify-start gap-2"
                    onClick={() => handleAdd(item)}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Action */}
          <div>
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Action
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {actionBlocks.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.type}
                    variant="outline"
                    className="h-auto py-3 px-3 justify-start gap-2"
                    onClick={() => handleAdd(item)}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="text-left min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

### Task 8: Block Editor Component

Create `src/components/features/admin/credential-builder/BlockEditor.tsx`:

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ContentBlock,
  HeadingBlockContent,
  ParagraphBlockContent,
  ImageBlockContent,
  VideoBlockContent,
  ExternalLinkBlockContent,
  AlertBlockContent,
  DividerBlockContent,
  FormFieldBlockContent,
  FileUploadBlockContent,
  SignaturePadBlockContent,
  ButtonBlockContent,
} from '@/types/instructionBuilder';

interface BlockEditorProps {
  block: ContentBlock;
  onChange: (block: ContentBlock) => void;
}

export function BlockEditor({ block, onChange }: BlockEditorProps) {
  function updateContent<T extends object>(updates: Partial<T>) {
    onChange({
      ...block,
      content: { ...block.content, ...updates } as typeof block.content,
    });
  }

  switch (block.type) {
    case 'heading': {
      const content = block.content as HeadingBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Text</Label>
            <Input
              value={content.text}
              onChange={(e) => updateContent<HeadingBlockContent>({ text: e.target.value })}
              placeholder="Heading text"
            />
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <RadioGroup
              value={String(content.level)}
              onValueChange={(v) => updateContent<HeadingBlockContent>({ level: Number(v) as 1 | 2 | 3 })}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="1" id="h1" />
                <Label htmlFor="h1" className="text-lg font-bold">H1</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="2" id="h2" />
                <Label htmlFor="h2" className="text-base font-bold">H2</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="3" id="h3" />
                <Label htmlFor="h3" className="text-sm font-bold">H3</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      );
    }

    case 'paragraph': {
      const content = block.content as ParagraphBlockContent;
      return (
        <div className="space-y-2">
          <Label>Text</Label>
          <Textarea
            value={content.text}
            onChange={(e) => updateContent<ParagraphBlockContent>({ text: e.target.value })}
            placeholder="Paragraph text..."
            rows={4}
          />
        </div>
      );
    }

    case 'image': {
      const content = block.content as ImageBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image URL</Label>
            <Input
              value={content.url}
              onChange={(e) => updateContent<ImageBlockContent>({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Alt Text</Label>
            <Input
              value={content.alt}
              onChange={(e) => updateContent<ImageBlockContent>({ alt: e.target.value })}
              placeholder="Image description"
            />
          </div>
          <div className="space-y-2">
            <Label>Caption (optional)</Label>
            <Input
              value={content.caption || ''}
              onChange={(e) => updateContent<ImageBlockContent>({ caption: e.target.value })}
              placeholder="Image caption"
            />
          </div>
        </div>
      );
    }

    case 'video': {
      const content = block.content as VideoBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Video Source</Label>
            <Select
              value={content.source}
              onValueChange={(v) => updateContent<VideoBlockContent>({ source: v as 'youtube' | 'vimeo' | 'upload' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="upload">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Video URL</Label>
            <Input
              value={content.url}
              onChange={(e) => updateContent<VideoBlockContent>({ url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={content.title || ''}
              onChange={(e) => updateContent<VideoBlockContent>({ title: e.target.value })}
              placeholder="Video title"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="requireWatch"
              checked={content.requireWatch}
              onCheckedChange={(v) => updateContent<VideoBlockContent>({ requireWatch: !!v })}
            />
            <Label htmlFor="requireWatch">Require watching to proceed</Label>
          </div>
        </div>
      );
    }

    case 'external_link': {
      const content = block.content as ExternalLinkBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={content.url}
              onChange={(e) => updateContent<ExternalLinkBlockContent>({ url: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={content.title}
              onChange={(e) => updateContent<ExternalLinkBlockContent>({ title: e.target.value })}
              placeholder="Link title"
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              value={content.description || ''}
              onChange={(e) => updateContent<ExternalLinkBlockContent>({ description: e.target.value })}
              placeholder="Brief description"
            />
          </div>
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={content.buttonText}
              onChange={(e) => updateContent<ExternalLinkBlockContent>({ buttonText: e.target.value })}
              placeholder="Open Link"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="trackVisit"
                checked={content.trackVisit}
                onCheckedChange={(v) => updateContent<ExternalLinkBlockContent>({ trackVisit: !!v })}
              />
              <Label htmlFor="trackVisit">Track when user visits link</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="requireVisit"
                checked={content.requireVisit}
                onCheckedChange={(v) => updateContent<ExternalLinkBlockContent>({ requireVisit: !!v })}
              />
              <Label htmlFor="requireVisit">Require visit to proceed</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="opensInNewTab"
                checked={content.opensInNewTab}
                onCheckedChange={(v) => updateContent<ExternalLinkBlockContent>({ opensInNewTab: !!v })}
              />
              <Label htmlFor="opensInNewTab">Open in new tab</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'alert': {
      const content = block.content as AlertBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={content.variant}
              onValueChange={(v) => updateContent<AlertBlockContent>({ variant: v as 'info' | 'warning' | 'success' | 'error' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={content.title}
              onChange={(e) => updateContent<AlertBlockContent>({ title: e.target.value })}
              placeholder="Alert title"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={content.message}
              onChange={(e) => updateContent<AlertBlockContent>({ message: e.target.value })}
              placeholder="Alert message..."
              rows={3}
            />
          </div>
        </div>
      );
    }

    case 'divider': {
      const content = block.content as DividerBlockContent;
      return (
        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={content.style}
            onValueChange={(v) => updateContent<DividerBlockContent>({ style: v as 'solid' | 'dashed' | 'dotted' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="solid">Solid</SelectItem>
              <SelectItem value="dashed">Dashed</SelectItem>
              <SelectItem value="dotted">Dotted</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }

    case 'form_field': {
      const content = block.content as FormFieldBlockContent;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Key</Label>
              <Input
                value={content.key}
                onChange={(e) => updateContent<FormFieldBlockContent>({ key: e.target.value })}
                placeholder="field_name"
              />
            </div>
            <div className="space-y-2">
              <Label>Field Type</Label>
              <Select
                value={content.type}
                onValueChange={(v) => updateContent<FormFieldBlockContent>({ type: v as FormFieldBlockContent['type'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="textarea">Textarea</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) => updateContent<FormFieldBlockContent>({ label: e.target.value })}
              placeholder="Field label"
            />
          </div>
          <div className="space-y-2">
            <Label>Placeholder (optional)</Label>
            <Input
              value={content.placeholder || ''}
              onChange={(e) => updateContent<FormFieldBlockContent>({ placeholder: e.target.value })}
              placeholder="Placeholder text"
            />
          </div>
          <div className="space-y-2">
            <Label>Help Text (optional)</Label>
            <Input
              value={content.helpText || ''}
              onChange={(e) => updateContent<FormFieldBlockContent>({ helpText: e.target.value })}
              placeholder="Additional guidance"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="fieldRequired"
              checked={content.required}
              onCheckedChange={(v) => updateContent<FormFieldBlockContent>({ required: !!v })}
            />
            <Label htmlFor="fieldRequired">Required field</Label>
          </div>
        </div>
      );
    }

    case 'file_upload': {
      const content = block.content as FileUploadBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) => updateContent<FileUploadBlockContent>({ label: e.target.value })}
              placeholder="Upload label"
            />
          </div>
          <div className="space-y-2">
            <Label>Accepted File Types</Label>
            <Input
              value={content.accept}
              onChange={(e) => updateContent<FileUploadBlockContent>({ accept: e.target.value })}
              placeholder=".pdf,.jpg,.png"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated extensions or MIME types
            </p>
          </div>
          <div className="space-y-2">
            <Label>Max File Size (MB)</Label>
            <Input
              type="number"
              value={content.maxSizeMB}
              onChange={(e) => updateContent<FileUploadBlockContent>({ maxSizeMB: Number(e.target.value) })}
              min={1}
              max={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Help Text (optional)</Label>
            <Input
              value={content.helpText || ''}
              onChange={(e) => updateContent<FileUploadBlockContent>({ helpText: e.target.value })}
              placeholder="Additional guidance"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="uploadMultiple"
                checked={content.multiple}
                onCheckedChange={(v) => updateContent<FileUploadBlockContent>({ multiple: !!v })}
              />
              <Label htmlFor="uploadMultiple">Allow multiple files</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="uploadRequired"
                checked={content.required}
                onCheckedChange={(v) => updateContent<FileUploadBlockContent>({ required: !!v })}
              />
              <Label htmlFor="uploadRequired">Required</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'signature_pad': {
      const content = block.content as SignaturePadBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Label</Label>
            <Input
              value={content.label}
              onChange={(e) => updateContent<SignaturePadBlockContent>({ label: e.target.value })}
              placeholder="Your Signature"
            />
          </div>
          <div className="space-y-2">
            <Label>Agreement Text (optional)</Label>
            <Textarea
              value={content.agreementText || ''}
              onChange={(e) => updateContent<SignaturePadBlockContent>({ agreementText: e.target.value })}
              placeholder="By signing, I agree to..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowTyped"
                checked={content.allowTyped}
                onCheckedChange={(v) => updateContent<SignaturePadBlockContent>({ allowTyped: !!v })}
              />
              <Label htmlFor="allowTyped">Allow typed signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="allowDrawn"
                checked={content.allowDrawn}
                onCheckedChange={(v) => updateContent<SignaturePadBlockContent>({ allowDrawn: !!v })}
              />
              <Label htmlFor="allowDrawn">Allow drawn signature</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="sigRequired"
                checked={content.required}
                onCheckedChange={(v) => updateContent<SignaturePadBlockContent>({ required: !!v })}
              />
              <Label htmlFor="sigRequired">Required</Label>
            </div>
          </div>
        </div>
      );
    }

    case 'button': {
      const content = block.content as ButtonBlockContent;
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Button Text</Label>
            <Input
              value={content.text}
              onChange={(e) => updateContent<ButtonBlockContent>({ text: e.target.value })}
              placeholder="Continue"
            />
          </div>
          <div className="space-y-2">
            <Label>Variant</Label>
            <Select
              value={content.variant}
              onValueChange={(v) => updateContent<ButtonBlockContent>({ variant: v as 'default' | 'outline' | 'ghost' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Filled)</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Action</Label>
            <Select
              value={content.action}
              onValueChange={(v) => updateContent<ButtonBlockContent>({ action: v as 'next_step' | 'external_url' | 'submit' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_step">Go to Next Step</SelectItem>
                <SelectItem value="submit">Submit</SelectItem>
                <SelectItem value="external_url">Open URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {content.action === 'external_url' && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={content.url || ''}
                onChange={(e) => updateContent<ButtonBlockContent>({ url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          )}
        </div>
      );
    }

    case 'rich_text':
      return (
        <div className="text-sm text-muted-foreground">
          Rich text editor coming in future phase.
        </div>
      );

    case 'checklist':
      return (
        <div className="text-sm text-muted-foreground">
          Checklist editor coming in future phase.
        </div>
      );

    case 'quiz_question':
      return (
        <div className="text-sm text-muted-foreground">
          Quiz question editor coming in future phase.
        </div>
      );

    default:
      return (
        <div className="text-sm text-muted-foreground">
          No editor available for this block type.
        </div>
      );
  }
}
```

---

### Task 9: Update InstructionBuilder Component

Replace `src/components/features/admin/credential-builder/InstructionBuilder.tsx`:

```tsx
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { StepList } from './StepList';
import { BlockEditorPanel } from './BlockEditorPanel';
import type { CredentialTypeInstructions, InstructionStep } from '@/types/instructionBuilder';

interface InstructionBuilderProps {
  config: CredentialTypeInstructions;
  onChange: (config: CredentialTypeInstructions) => void;
}

export function InstructionBuilder({ config, onChange }: InstructionBuilderProps) {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    config.steps[0]?.id ?? null
  );

  const selectedStep = selectedStepId
    ? config.steps.find((s) => s.id === selectedStepId)
    : null;

  function updateSettings(updates: Partial<typeof config.settings>) {
    onChange({
      ...config,
      settings: { ...config.settings, ...updates },
    });
  }

  function handleStepsChange(steps: InstructionStep[]) {
    onChange({ ...config, steps });
  }

  function handleStepChange(updatedStep: InstructionStep) {
    const updated = config.steps.map((s) =>
      s.id === updatedStep.id ? updatedStep : s
    );
    onChange({ ...config, steps: updated });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Steps & Editor */}
      <div className="lg:col-span-2 space-y-4">
        {/* Settings Bar */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="showProgress"
                  checked={config.settings.showProgressBar}
                  onCheckedChange={(v) => updateSettings({ showProgressBar: !!v })}
                />
                <Label htmlFor="showProgress" className="text-sm">
                  Show progress bar
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allowSkip"
                  checked={config.settings.allowStepSkip}
                  onCheckedChange={(v) => updateSettings({ allowStepSkip: !!v })}
                />
                <Label htmlFor="allowSkip" className="text-sm">
                  Allow step skip
                </Label>
              </div>
            </div>
          </div>
        </Card>

        {/* Steps List */}
        <StepList
          steps={config.steps}
          selectedStepId={selectedStepId}
          onSelectStep={setSelectedStepId}
          onStepsChange={handleStepsChange}
        />

        {/* Block Editor Panel */}
        {selectedStep && (
          <BlockEditorPanel step={selectedStep} onStepChange={handleStepChange} />
        )}
      </div>

      {/* Right Column: Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/50">
              <p className="text-sm font-medium">Preview</p>
            </div>
            <div className="p-6 text-center text-muted-foreground min-h-[300px] flex items-center justify-center">
              <p className="text-sm">Live preview coming in Phase 5</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 10: Update Index Export

Update `src/components/features/admin/credential-builder/index.ts`:

```typescript
export { InstructionBuilder } from './InstructionBuilder';
export { RequirementsSection } from './RequirementsSection';
export { ExpirationSection } from './ExpirationSection';
export { SettingsSection } from './SettingsSection';
export { StepList } from './StepList';
export { SortableStepItem } from './SortableStepItem';
export { AddStepSheet } from './AddStepSheet';
export { BlockEditorPanel } from './BlockEditorPanel';
export { SortableBlockItem } from './SortableBlockItem';
export { BlockPaletteSheet } from './BlockPaletteSheet';
export { BlockEditor } from './BlockEditor';
```

---

## Files Created/Modified

| Action | File |
|--------|------|
| CREATE | `src/components/features/admin/credential-builder/StepList.tsx` |
| CREATE | `src/components/features/admin/credential-builder/SortableStepItem.tsx` |
| CREATE | `src/components/features/admin/credential-builder/AddStepSheet.tsx` |
| CREATE | `src/components/features/admin/credential-builder/BlockEditorPanel.tsx` |
| CREATE | `src/components/features/admin/credential-builder/SortableBlockItem.tsx` |
| CREATE | `src/components/features/admin/credential-builder/BlockPaletteSheet.tsx` |
| CREATE | `src/components/features/admin/credential-builder/BlockEditor.tsx` |
| MODIFY | `src/components/features/admin/credential-builder/InstructionBuilder.tsx` |
| MODIFY | `src/components/features/admin/credential-builder/index.ts` |

---

## Acceptance Criteria

### AC-1: Step Management
- [ ] Add Step button opens sheet with step types
- [ ] Steps can be added with custom title
- [ ] Steps can be deleted via dropdown menu
- [ ] Steps can be duplicated via dropdown menu
- [ ] Steps can be reordered via drag-and-drop
- [ ] Selected step is highlighted with ring

### AC-2: Block Management
- [ ] Add Block button opens palette sheet
- [ ] Palette shows blocks in 3 categories: Content, Interactive, Action
- [ ] Blocks can be added to selected step
- [ ] Blocks can be deleted via dropdown menu
- [ ] Blocks can be duplicated via dropdown menu
- [ ] Blocks can be reordered via drag-and-drop

### AC-3: Block Editing
- [ ] Clicking block opens editor panel below
- [ ] Heading: text, level (H1/H2/H3) editable
- [ ] Paragraph: text editable
- [ ] Image: url, alt, caption editable
- [ ] Video: source, url, title, requireWatch editable
- [ ] External Link: url, title, description, buttonText, trackVisit, requireVisit, opensInNewTab
- [ ] Alert: variant, title, message editable
- [ ] Divider: style editable
- [ ] Form Field: key, type, label, placeholder, helpText, required editable
- [ ] File Upload: label, accept, maxSizeMB, helpText, multiple, required editable
- [ ] Signature: label, agreementText, allowTyped, allowDrawn, required editable
- [ ] Button: text, variant, action, url editable
- [ ] Done button closes editor panel

### AC-4: Step Settings
- [ ] Step title editable inline
- [ ] Required checkbox toggles step.required

### AC-5: State Persistence
- [ ] All changes trigger onChange callback
- [ ] "Unsaved changes" badge appears in header
- [ ] Save button persists to database

### AC-6: Drag-and-Drop
- [ ] @dnd-kit installed and working
- [ ] Drag handles visible on steps and blocks
- [ ] Reordering updates order numbers correctly
- [ ] Visual feedback during drag (opacity, shadow)

---

## Testing Checklist

- [ ] Create new credential type → select template with steps → verify steps appear
- [ ] Add new step → verify it appears in list with correct number
- [ ] Drag step to reorder → verify order updates
- [ ] Delete step → verify it's removed and selection updates
- [ ] Duplicate step → verify copy created with "(Copy)" suffix
- [ ] Select step → verify block editor panel appears
- [ ] Add block from palette → verify it appears in step
- [ ] Edit block fields → verify "Unsaved changes" badge appears
- [ ] Drag block to reorder → verify order updates
- [ ] Delete block → verify removal
- [ ] Save → verify toast and changes persist on page reload
