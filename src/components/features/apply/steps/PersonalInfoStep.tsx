import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApplicationFormData } from '@/types/application';

interface PersonalInfoStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<ApplicationFormData>) => void;
  onFieldBlur?: () => void;
}

export function PersonalInfoStep({
  data,
  errors,
  onChange,
  onFieldBlur,
}: PersonalInfoStepProps) {
  const personalInfo = data.personalInfo || {
    fullName: '',
    phone: '',
    dateOfBirth: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zip: '',
    },
  };

  const updatePersonal = (field: keyof typeof personalInfo, value: string) => {
    onChange({ personalInfo: { ...personalInfo, [field]: value } });
  };

  const updateAddress = (field: keyof typeof personalInfo.address, value: string) => {
    onChange({
      personalInfo: {
        ...personalInfo,
        address: { ...personalInfo.address, [field]: value },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          value={personalInfo.fullName}
          onChange={(e) => updatePersonal('fullName', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['personalInfo.fullName'] && (
          <p className="text-sm text-destructive">{errors['personalInfo.fullName']}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={personalInfo.phone}
            onChange={(e) => updatePersonal('phone', e.target.value)}
            onBlur={onFieldBlur}
            placeholder="5551234567"
          />
          {errors['personalInfo.phone'] && (
            <p className="text-sm text-destructive">{errors['personalInfo.phone']}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of Birth</Label>
          <Input
            id="dob"
            type="date"
            value={personalInfo.dateOfBirth}
            onChange={(e) => updatePersonal('dateOfBirth', e.target.value)}
            onBlur={onFieldBlur}
          />
          {errors['personalInfo.dateOfBirth'] && (
            <p className="text-sm text-destructive">{errors['personalInfo.dateOfBirth']}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="line1">Address Line 1</Label>
        <Input
          id="line1"
          value={personalInfo.address.line1}
          onChange={(e) => updateAddress('line1', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['personalInfo.address.line1'] && (
          <p className="text-sm text-destructive">{errors['personalInfo.address.line1']}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="line2">Address Line 2</Label>
        <Input
          id="line2"
          value={personalInfo.address.line2 || ''}
          onChange={(e) => updateAddress('line2', e.target.value)}
          onBlur={onFieldBlur}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={personalInfo.address.city}
            onChange={(e) => updateAddress('city', e.target.value)}
            onBlur={onFieldBlur}
          />
          {errors['personalInfo.address.city'] && (
            <p className="text-sm text-destructive">{errors['personalInfo.address.city']}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={personalInfo.address.state}
            onChange={(e) => updateAddress('state', e.target.value.toUpperCase())}
            onBlur={onFieldBlur}
            maxLength={2}
          />
          {errors['personalInfo.address.state'] && (
            <p className="text-sm text-destructive">{errors['personalInfo.address.state']}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            value={personalInfo.address.zip}
            onChange={(e) => updateAddress('zip', e.target.value)}
            onBlur={onFieldBlur}
          />
          {errors['personalInfo.address.zip'] && (
            <p className="text-sm text-destructive">{errors['personalInfo.address.zip']}</p>
          )}
        </div>
      </div>
    </div>
  );
}
