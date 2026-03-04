import { Checkbox } from '@/components/ui/checkbox';

interface PrimaryToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export function PrimaryToggle({
  checked,
  onChange,
  label = 'Set as primary vehicle',
}: PrimaryToggleProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(checked) => onChange(checked === true)} />
      {label}
    </label>
  );
}
