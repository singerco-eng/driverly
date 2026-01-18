import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ApplicationFormData } from '@/types/application';

interface AccountStepProps {
  data: ApplicationFormData;
  errors: Record<string, string>;
  onChange: (data: Partial<ApplicationFormData>) => void;
  onFieldBlur?: () => void;
}

export function AccountStep({ data, errors, onChange, onFieldBlur }: AccountStepProps) {
  const account = data.account || { email: '', password: '', confirmPassword: '' };

  const updateAccount = (field: keyof typeof account, value: string) => {
    onChange({ account: { ...account, [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={account.email}
          onChange={(e) => updateAccount('email', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['account.email'] && (
          <p className="text-sm text-destructive">{errors['account.email']}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={account.password}
          onChange={(e) => updateAccount('password', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['account.password'] && (
          <p className="text-sm text-destructive">{errors['account.password']}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={account.confirmPassword}
          onChange={(e) => updateAccount('confirmPassword', e.target.value)}
          onBlur={onFieldBlur}
        />
        {errors['account.confirmPassword'] && (
          <p className="text-sm text-destructive">{errors['account.confirmPassword']}</p>
        )}
      </div>
    </div>
  );
}
