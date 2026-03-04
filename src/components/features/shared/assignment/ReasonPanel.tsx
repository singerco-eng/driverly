import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { ReasonPanelProps } from './types';

export function ReasonPanel({
  options,
  value,
  onChange,
  showNotes,
  notes,
  onNotesChange,
}: ReasonPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Reason</label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select reason" />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showNotes && (
        <div>
          <label className="text-sm font-medium">Additional Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Optional notes..."
            className="mt-2"
          />
        </div>
      )}
    </div>
  );
}
