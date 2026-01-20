import type { ChecklistBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
    <div className="space-y-3">
      {content.title && (
        <h4 className="font-medium text-sm">
          {content.title}
        </h4>
      )}
      
      <div className="space-y-2">
        {items.map((item) => {
          const isChecked = stepState.checklistStates[item.id] ?? false;
          return (
            <div key={item.id} className="flex items-start gap-3">
              <Checkbox
                id={item.id}
                checked={isChecked}
                onCheckedChange={(checked) => handleCheck(item.id, !!checked)}
                disabled={isDisabled}
              />
              <Label
                htmlFor={item.id}
                className="text-sm leading-relaxed cursor-pointer"
              >
                {item.text}
                {item.required && <span className="text-destructive ml-1">*</span>}
              </Label>
            </div>
          );
        })}
      </div>

      {!readOnly && content.requireAllChecked && !allChecked && (
        <p className="text-xs text-muted-foreground">
          ⓘ You must check all items to continue
        </p>
      )}
    </div>
  );
}
