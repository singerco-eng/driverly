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
