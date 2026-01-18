import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LicensePhotoUpload } from '@/components/features/apply/LicensePhotoUpload';
import type { ApplicationFormData } from '@/types/application';

interface LicenseStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  userId: string;
  onChange: (data: Partial<ApplicationFormData>) => void;
  onFieldBlur?: () => void;
  onPhotoSaved?: () => void;
}

export function LicenseStep({
  data,
  errors,
  userId,
  onChange,
  onFieldBlur,
  onPhotoSaved,
}: LicenseStepProps) {
  const license = data.license || {
    number: '',
    state: '',
    expiration: '',
    frontUrl: '',
    backUrl: '',
  };

  const updateLicense = (field: keyof typeof license, value: string) => {
    onChange({ license: { ...license, [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="licenseNumber">License Number</Label>
          <Input
            id="licenseNumber"
            value={license.number}
            onChange={(e) => updateLicense('number', e.target.value)}
            onBlur={onFieldBlur}
          />
          {errors['license.number'] && (
            <p className="text-sm text-destructive">{errors['license.number']}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseState">State</Label>
          <Input
            id="licenseState"
            value={license.state}
            onChange={(e) => updateLicense('state', e.target.value.toUpperCase())}
            onBlur={onFieldBlur}
            maxLength={2}
          />
          {errors['license.state'] && (
            <p className="text-sm text-destructive">{errors['license.state']}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="licenseExpiration">Expiration Date</Label>
        <Input
          id="licenseExpiration"
          type="date"
          value={license.expiration}
          onChange={(e) => updateLicense('expiration', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['license.expiration'] && (
          <p className="text-sm text-destructive">{errors['license.expiration']}</p>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <LicensePhotoUpload
          label="Front of License"
          value={license.frontUrl}
          userId={userId}
          side="front"
          onChange={(path) => updateLicense('frontUrl', path)}
          onSaved={onPhotoSaved}
        />
        <LicensePhotoUpload
          label="Back of License"
          value={license.backUrl}
          userId={userId}
          side="back"
          onChange={(path) => updateLicense('backUrl', path)}
          onSaved={onPhotoSaved}
        />
      </div>
    </div>
  );
}
