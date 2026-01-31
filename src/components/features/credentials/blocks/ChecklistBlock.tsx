import type { ChecklistBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChecklistBlockProps {
  content: ChecklistBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ChecklistBlock({
  content,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: ChecklistBlockProps) {
  const items = content.items || [];
  const isDisabled = disabled || readOnly;
  const allChecked = items.length > 0 && items.every(
    (item) => stepState.checklistStates[item.id] === true
  );

  const handleCheck = (itemId: string, checked: boolean) => {
    if (isDisabled) return;
    
    onStateChange({
      checklistStates: {
        ...stepState.checklistStates,
        [itemId]: checked,
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm">
        No checklist items defined
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content.title && (
        <Label className="text-sm font-medium">
          {content.title}
          {content.requireAllChecked && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      
      <div className="space-y-3">
        {items.map((item) => {
          const isChecked = stepState.checklistStates[item.id] ?? false;
          return (
            <Label
              key={item.id}
              htmlFor={item.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border border-border/50 transition-colors',
                !readOnly && 'cursor-pointer hover:bg-muted/30',
                isChecked && 'bg-muted/30 border-primary/30'
              )}
            >
              {readOnly ? (
                isChecked ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                )
              ) : (
                <Checkbox
                  id={item.id}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleCheck(item.id, !!checked)}
                  disabled={isDisabled}
                  className="mt-0.5"
                />
              )}
              <span className="text-sm leading-relaxed">
                {item.text}
              </span>
            </Label>
          );
        })}
      </div>

      {!readOnly && content.requireAllChecked && !allChecked && (
        <p className="text-xs text-muted-foreground">
          You must check all items to continue
        </p>
      )}
    </div>
  );
}
