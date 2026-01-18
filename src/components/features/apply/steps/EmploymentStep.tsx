import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ApplicationFormData } from '@/types/application';
import type { EmploymentType } from '@/types/driver';

interface EmploymentStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<ApplicationFormData>) => void;
}

export function EmploymentStep({ data, errors, onChange }: EmploymentStepProps) {
  const employmentType = data.employmentType;

  const handleChange = (value: EmploymentType) => {
    onChange({ employmentType: value });
  };

  return (
    <div className="space-y-4">
      <RadioGroup
        value={employmentType}
        onValueChange={(value) => handleChange(value as EmploymentType)}
        className="grid gap-3"
      >
        <Label className="flex items-start gap-3 border rounded-lg p-4 cursor-pointer">
          <RadioGroupItem value="w2" className="mt-1" />
          <div>
            <div className="font-medium">W2 Employee</div>
            <p className="text-sm text-muted-foreground">
              Drive company vehicles with scheduled shifts and benefits.
            </p>
          </div>
        </Label>
        <Label className="flex items-start gap-3 border rounded-lg p-4 cursor-pointer">
          <RadioGroupItem value="1099" className="mt-1" />
          <div>
            <div className="font-medium">1099 Contractor</div>
            <p className="text-sm text-muted-foreground">
              Use your own vehicle and work flexible hours.
            </p>
          </div>
        </Label>
      </RadioGroup>
      {errors['employmentType'] && (
        <p className="text-sm text-destructive">{errors['employmentType']}</p>
      )}
    </div>
  );
}
