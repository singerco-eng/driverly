import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import type { AssignmentType } from '@/types/vehicleAssignment';
import type { AssignmentTypePanelProps } from './types';

export function AssignmentTypePanel({
  value,
  onChange,
  disabled1099,
  showDates,
  startsAt,
  endsAt,
  onStartsAtChange,
  onEndsAtChange,
}: AssignmentTypePanelProps) {
  const needsEndDate = value === 'borrowed';
  const hasValidEndDate =
    !needsEndDate || (!!endsAt && (!startsAt || endsAt.getTime() > startsAt.getTime()));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Assignment Type</label>
        <RadioGroup value={value} onValueChange={(v) => onChange(v as AssignmentType)}>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="assigned" disabled={disabled1099} />
            <span className={disabled1099 ? 'text-muted-foreground' : ''}>
              Assigned (ongoing)
            </span>
          </label>
          <label className="flex items-center gap-2">
            <RadioGroupItem value="borrowed" />
            Borrowed (temporary)
          </label>
        </RadioGroup>
        {disabled1099 && (
          <p className="text-xs text-muted-foreground">
            1099 drivers can only have borrowed assignments.
          </p>
        )}
      </div>

      {showDates && needsEndDate && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Start Date (optional)</label>
            <DatePicker date={startsAt} onDateChange={onStartsAtChange} />
          </div>
          <div>
            <label className="text-sm font-medium">End Date</label>
            <DatePicker date={endsAt} onDateChange={onEndsAtChange} />
            {!hasValidEndDate && endsAt && (
              <p className="text-xs text-destructive mt-1">
                End date must be after start date.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
