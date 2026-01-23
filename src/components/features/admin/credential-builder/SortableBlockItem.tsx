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
  // Defensive check for undefined content
  const content = (block.content ?? {}) as Record<string, unknown>;
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
  /** Make block read-only (clicks are no-op but drag works) */
  readOnly?: boolean;
}

export function SortableBlockItem({
  block,
  isEditing,
  onEdit,
  onDelete,
  onDuplicate,
  readOnly = false,
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
      onClick={() => !readOnly && onEdit()}
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
          {preview && <p className="text-xs text-muted-foreground truncate">{preview}</p>}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => !readOnly && onEdit()}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => !readOnly && onDuplicate()}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => !readOnly && onDelete()} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
