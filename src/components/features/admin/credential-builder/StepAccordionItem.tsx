import { useState, useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  ChevronDown,
  MoreVertical,
  Plus,
  Copy,
  Trash2,
  Info,
  ExternalLink,
  FormInput,
  Upload,
  PenTool,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { SortableBlockItem } from './SortableBlockItem';
import { BlockPaletteSheet } from './BlockPaletteSheet';
import type {
  InstructionStep,
  ContentBlock,
  StepType,
  BlockType,
  BlockContent,
} from '@/types/instructionBuilder';
import { createBlock } from '@/types/instructionBuilder';
import { cn } from '@/lib/utils';

const stepTypeIcons: Record<StepType, React.ElementType> = {
  information: Info,
  external_action: ExternalLink,
  form_input: FormInput,
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

interface StepAccordionItemProps {
  step: InstructionStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onStepChange: (step: InstructionStep) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditBlock: (block: ContentBlock) => void;
  /** Make step read-only (buttons do nothing) */
  readOnly?: boolean;
}

export function StepAccordionItem({
  step,
  index,
  isExpanded,
  onToggle,
  onStepChange,
  onDelete,
  onDuplicate,
  onEditBlock,
  readOnly = false,
}: StepAccordionItemProps) {
  const [showPalette, setShowPalette] = useState(false);

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

  const blockSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const blockIds = useMemo(() => step.blocks.map((b) => b.id), [step.blocks]);

  const Icon = stepTypeIcons[step.type] || Info;

  function handleBlockDragEnd(event: DragEndEvent) {
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
    // Auto-open the editor for the new block
    onEditBlock(newBlock);
  }

  function handleDeleteBlock(blockId: string) {
    const filtered = step.blocks
      .filter((b) => b.id !== blockId)
      .map((block, idx) => ({ ...block, order: idx + 1 }));
    onStepChange({ ...step, blocks: filtered });
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

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'transition-all',
          isDragging && 'opacity-50 shadow-lg',
          isExpanded && 'ring-1 ring-primary/30'
        )}
      >
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          {/* Step Header */}
          <div className="flex items-center gap-2 p-3 border-b border-transparent hover:bg-muted/50">
            <button
              {...attributes}
              {...listeners}
              className="touch-none p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>

            <CollapsibleTrigger className="flex-1 flex items-center gap-3 text-left">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{step.title}</span>
                  {step.required && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Required
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="w-3 h-3" />
                  <span>{stepTypeLabels[step.type]}</span>
                  <span>•</span>
                  <span>{step.blocks.length} block{step.blocks.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </CollapsibleTrigger>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate Step
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Step
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Step Content (expanded) */}
          <CollapsibleContent>
            <div className="p-4 pt-3 space-y-4 bg-muted/30">
              {/* Step Settings */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Label htmlFor={`step-title-${step.id}`} className="text-xs text-muted-foreground">
                    Step Title
                  </Label>
                  <Input
                    id={`step-title-${step.id}`}
                    value={step.title}
                    onChange={(e) => onStepChange({ ...step, title: e.target.value })}
                    className="mt-1 h-9"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <Checkbox
                    id={`step-required-${step.id}`}
                    checked={step.required}
                    onCheckedChange={(v) => onStepChange({ ...step, required: !!v })}
                  />
                  <Label htmlFor={`step-required-${step.id}`} className="text-sm">
                    Required step
                  </Label>
                </div>
              </div>

              {/* Blocks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Content Blocks
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => !readOnly && setShowPalette(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Block
                  </Button>
                </div>

                {step.blocks.length === 0 ? (
                  <div className="py-6 text-center border-2 border-dashed rounded-lg bg-background">
                    <p className="text-sm text-muted-foreground mb-2">No blocks yet</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => !readOnly && setShowPalette(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add First Block
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={blockSensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleBlockDragEnd}
                  >
                    <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {step.blocks.map((block) => (
                          <SortableBlockItem
                            key={block.id}
                            block={block}
                            isEditing={false}
                            onEdit={() => onEditBlock(block)}
                            onDelete={() => handleDeleteBlock(block.id)}
                            onDuplicate={() => handleDuplicateBlock(block.id)}
                            readOnly={readOnly}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <BlockPaletteSheet
        open={showPalette}
        onOpenChange={setShowPalette}
        onAddBlock={handleAddBlock}
      />
    </>
  );
}
