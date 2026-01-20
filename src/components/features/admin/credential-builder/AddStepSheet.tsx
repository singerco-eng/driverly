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

const stepTypes: {
  value: StepType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
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
    const stepTitle =
      title.trim() || stepTypes.find((t) => t.value === selectedType)?.label || 'New Step';
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
              onValueChange={(value) => setSelectedType(value as StepType)}
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
