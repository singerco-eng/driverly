import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ElevatedContainer } from '@/components/ui/elevated-container';
import { FormToggle, FormToggleItem } from '@/components/ui/form-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import type { CompanyDetail } from '@/types/company';
import { Building2, MapPin, Palette } from 'lucide-react';

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  ein: z.string().optional(),
  timezone: z.string(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface EditCompanyModalProps {
  company: CompanyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabValue = 'basic' | 'address' | 'branding';

export default function EditCompanyModal({ company, open, onOpenChange }: EditCompanyModalProps) {
  const { toast } = useToast();
  const updateCompany = useUpdateCompany();
  const [activeTab, setActiveTab] = useState<TabValue>('basic');

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || '',
      primary_color: company.primary_color,
      ein: company.ein || '',
      timezone: company.timezone,
    },
  });

  useEffect(() => {
    form.reset({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || '',
      primary_color: company.primary_color,
      ein: company.ein || '',
      timezone: company.timezone,
    });
  }, [company, form]);

  async function onSubmit(data: CompanyFormValues) {
    try {
      await updateCompany.mutateAsync({ id: company.id, data });
      toast({
        title: 'Company updated',
        description: `${data.name} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update company',
        variant: 'destructive',
      });
    }
  }

  const handleClose = () => {
    setActiveTab('basic');
    onOpenChange(false);
  };

  return (
    <ElevatedContainer
      isOpen={open}
      onClose={handleClose}
      title="Edit Company"
      description="Update company information."
      size="lg"
      variant="elevated"
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tab Navigation using FormToggle for DS compliance */}
        <FormToggle value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} fullWidth>
          <FormToggleItem value="basic" className="flex-1 gap-2">
            <Building2 className="w-4 h-4" />
            Basic Info
          </FormToggleItem>
          <FormToggleItem value="address" className="flex-1 gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </FormToggleItem>
          <FormToggleItem value="branding" className="flex-1 gap-2">
            <Palette className="w-4 h-4" />
            Branding
          </FormToggleItem>
        </FormToggle>

        {/* Tab Content */}
        <div className="min-h-[280px]">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Company Name *</Label>
                  <Input id="name" {...form.register('name')} />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <Input value={`/${company.slug}`} disabled className="bg-muted/30" />
                  <p className="text-xs text-muted-foreground">Slug cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Tax ID)</Label>
                  <Input id="ein" {...form.register('ein')} placeholder="XX-XXXXXXX" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={form.watch('timezone')} onValueChange={(v) => form.setValue('timezone', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {US_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" {...form.register('address_line1')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" {...form.register('address_line2')} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...form.register('city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...form.register('state')} placeholder="NY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input id="zip" {...form.register('zip')} placeholder="10001" />
                </div>
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Brand Color</Label>
                <div className="flex gap-3">
                  <Input id="primary_color" {...form.register('primary_color')} className="flex-1" />
                  <div className="relative">
                    <input
                      type="color"
                      value={form.watch('primary_color')}
                      onChange={(e) => form.setValue('primary_color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border/50"
                    />
                  </div>
                </div>
                {form.formState.errors.primary_color && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.primary_color.message}
                  </p>
                )}
              </div>

              {/* Color Preview */}
              <div className="p-4 rounded-lg border border-border/30 bg-muted/20">
                <p className="text-sm text-muted-foreground mb-3">Preview</p>
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shadow-soft"
                    style={{ backgroundColor: form.watch('primary_color') }}
                  >
                    {form.watch('name')?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="font-medium">{form.watch('name') || 'Company Name'}</p>
                    <p className="text-sm text-muted-foreground">/{company.slug}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateCompany.isPending}>
            {updateCompany.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ElevatedContainer>
  );
}
