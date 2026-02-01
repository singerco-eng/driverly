import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

interface FieldSelectionFormProps {
  documentName: string;
  suggestedFields: { key: string; label: string; defaultChecked: boolean }[];
  onConfirm: (selectedFields: string[], otherFields: string) => void;
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
    onConfirm(Array.from(selected), otherText);
  };

  return (
    <div className="space-y-3 my-3 p-4 rounded-lg border bg-muted/30">
      <div className="text-sm text-muted-foreground">
        Select fields to extract for {documentName}.
      </div>
      <div className="space-y-2">
        {suggestedFields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={selected.has(field.key)}
              onCheckedChange={() => handleToggle(field.key)}
            />
            <span>{field.label}</span>
          </label>
        ))}

        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={otherChecked || otherText.trim().length > 0}
            onCheckedChange={(checked) => setOtherChecked(!!checked)}
            className="mt-0.5"
          />
          <div className="flex-1">
            <span>Other:</span>
            <Input
              value={otherText}
              onChange={(e) => handleOtherChange(e.target.value)}
              placeholder="Type any additional fields you need"
              className="mt-1"
            />
          </div>
        </label>
      </div>

      <Button onClick={handleConfirm} className="w-full">
        Confirm
      </Button>
    </div>
  );
}
