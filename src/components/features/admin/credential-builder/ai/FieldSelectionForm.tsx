import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, FileCheck } from 'lucide-react';

interface FieldSelectionFormProps {
  documentName: string;
  suggestedFields: { key: string; label: string; defaultChecked: boolean }[];
  onConfirm: (selectedFields: string[], otherFields: string, isUpdate: boolean) => void;
}

export function FieldSelectionForm({
  documentName,
  suggestedFields,
  onConfirm,
}: FieldSelectionFormProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(suggestedFields.filter((f) => f.defaultChecked).map((f) => f.key))
  );
  const [otherText, setOtherText] = useState('');
  const [otherChecked, setOtherChecked] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const hasConfirmedOnce = useRef(false);

  const handleToggle = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelected(next);
  };

  const handleOtherChange = (value: string) => {
    setOtherText(value);
    if (value.trim()) {
      setOtherChecked(true);
    }
  };

  const handleConfirm = () => {
    const isUpdate = hasConfirmedOnce.current;
    hasConfirmedOnce.current = true;
    setIsConfirmed(true);
    onConfirm(Array.from(selected), otherText, isUpdate);
  };

  const hasSelection = selected.size > 0 || otherText.trim().length > 0;

  // Build summary text for collapsed view
  const getSummaryText = () => {
    const selectedLabels = suggestedFields
      .filter((f) => selected.has(f.key))
      .map((f) => f.label);
    
    const hasOther = otherText.trim().length > 0;
    const totalCount = selectedLabels.length + (hasOther ? 1 : 0);
    
    if (totalCount === 0) return 'No fields selected';
    
    // Show first 2-3 fields, then "+N more"
    const maxShow = 3;
    const shown = selectedLabels.slice(0, maxShow);
    const remaining = totalCount - shown.length;
    
    let text = shown.join(', ');
    if (remaining > 0) {
      text += ` +${remaining} more`;
    } else if (hasOther && selectedLabels.length <= maxShow) {
      text += selectedLabels.length > 0 ? ', ' : '';
      text += `"${otherText.trim().substring(0, 20)}${otherText.trim().length > 20 ? '...' : ''}"`;
    }
    
    return text;
  };

  // Collapsed/confirmed state - compact summary
  if (isConfirmed) {
    return (
      <div 
        className="my-2 px-3 py-2 rounded-lg border bg-muted/20 flex items-center gap-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsConfirmed(false)}
      >
        <FileCheck className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium">{documentName}</span>
          <span className="text-muted-foreground text-sm"> — </span>
          <span className="text-sm text-muted-foreground truncate">{getSummaryText()}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    );
  }

  // Expanded/editing state
  return (
    <div className="my-3 p-3 rounded-lg border bg-muted/30">
      {/* Header with title and confirm button */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          Select fields to extract for {documentName}.
        </span>
        <Button 
          onClick={handleConfirm} 
          size="sm"
          variant={hasSelection ? "default" : "secondary"}
          disabled={!hasSelection}
          className="h-7 px-2 gap-1"
        >
          <Check className="w-3.5 h-3.5" />
          <span className="text-xs">Done</span>
        </Button>
      </div>

      {/* Field checkboxes */}
      <div className="space-y-1.5">
        {suggestedFields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-muted/50 rounded px-1 -mx-1">
            <Checkbox
              checked={selected.has(field.key)}
              onCheckedChange={() => handleToggle(field.key)}
            />
            <span className="text-sm">{field.label}</span>
          </label>
        ))}

        {/* Other field */}
        <div className="flex items-start gap-2 py-0.5 px-1 -mx-1">
          <Checkbox
            checked={otherChecked || otherText.trim().length > 0}
            onCheckedChange={(checked) => setOtherChecked(!!checked)}
            className="mt-1.5"
          />
          <div className="flex-1">
            <span className="text-sm">Other:</span>
            <Input
              value={otherText}
              onChange={(e) => handleOtherChange(e.target.value)}
              placeholder="Type any additional fields you need"
              className="mt-1 h-8 text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
