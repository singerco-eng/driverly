import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BlockEditor } from './BlockEditor';
import type { ContentBlock, BlockType } from '@/types/instructionBuilder';
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

interface BlockEditorSheetProps {
  block: ContentBlock | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (block: ContentBlock) => void;
  onDelete: () => void;
}

export function BlockEditorSheet({
  block,
  open,
  onOpenChange,
  onChange,
  onDelete,
}: BlockEditorSheetProps) {
  if (!block) return null;

  const Icon = blockTypeIcons[block.type] || Type;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <SheetTitle>Edit {blockTypeLabels[block.type]}</SheetTitle>
              <SheetDescription>Configure this content block</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="py-6">
          <BlockEditor block={block} onChange={onChange} />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete Block
          </Button>
          <Button size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
