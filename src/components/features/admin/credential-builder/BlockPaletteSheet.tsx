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
    defaultContent: {
      label: 'Upload File',
      accept: '.pdf,.jpg,.png',
      maxSizeMB: 50,
      multiple: false,
      required: true,
    },
  },
  {
    type: 'signature_pad',
    label: 'Signature',
    description: 'E-signature capture',
    icon: PenTool,
    category: 'interactive',
    defaultContent: {
      label: 'Your Signature',
      required: true,
      allowTyped: true,
      allowDrawn: true,
    },
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
    defaultContent: {
      question: '',
      questionType: 'multiple_choice',
      options: [],
      allowRetry: true,
      required: true,
    },
  },
  {
    type: 'external_link',
    label: 'External Link',
    description: 'Link to website',
    icon: ExternalLink,
    category: 'action',
    defaultContent: {
      url: '',
      title: '',
      buttonText: 'Open Link',
      trackVisit: false,
      requireVisit: false,
      opensInNewTab: true,
    },
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

export function BlockPaletteSheet({
  open,
  onOpenChange,
  onAddBlock,
}: BlockPaletteSheetProps) {
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
          <SheetDescription>Choose a block type to add to this step.</SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
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
