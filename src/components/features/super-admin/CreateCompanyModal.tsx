import { useState } from 'react';
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
import { useCreateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
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
  slug: z.string().optional(),
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

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabValue = 'basic' | 'address' | 'branding';

export default function CreateCompanyModal({ open, onOpenChange }: CreateCompanyModalProps) {
  const { toast } = useToast();
  const createCompany = useCreateCompany();
  const [activeTab, setActiveTab] = useState<TabValue>('basic');

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      primary_color: '#3B82F6',
      ein: '',
      timezone: 'America/New_York',
    },
  });

  async function onSubmit(data: CompanyFormValues) {
    try {
      await createCompany.mutateAsync(data as any);
      toast({
        title: 'Company created',
        description: `${data.name} has been created successfully.`,
      });
      form.reset();
      setActiveTab('basic');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company',
        variant: 'destructive',
      });
    }
  }

  const handleClose = () => {
    form.reset();
    setActiveTab('basic');
    onOpenChange(false);
  };

  return (
    <ElevatedContainer
      isOpen={open}
      onClose={handleClose}
      title="Create Company"
      description="Add a new tenant company to the platform."
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
                  <Input id="name" {...form.register('name')} placeholder="Acme Transport" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    {...form.register('slug')}
                    placeholder="acme-transport (auto-generated)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="contact@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...form.register('phone')} placeholder="(555) 123-4567" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ein">EIN (Tax ID)</Label>
                  <Input id="ein" {...form.register('ein')} placeholder="XX-XXXXXXX" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={form.watch('timezone')}
                    onValueChange={(v) => form.setValue('timezone', v)}
                  >
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
                <Input id="address_line1" {...form.register('address_line1')} placeholder="123 Main St" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" {...form.register('address_line2')} placeholder="Suite 100" />
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

              <p className="text-sm text-muted-foreground mt-4">
                Address information is optional and can be added later.
              </p>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && (
            <div className="space-y-4 animate-in fade-in-50 duration-200">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Brand Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="primary_color"
                    {...form.register('primary_color')}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
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
                    <p className="text-sm text-muted-foreground">
                      /{form.watch('slug') || 'company-slug'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-white/10">
          <div className="text-sm text-muted-foreground">
            {activeTab === 'basic' && 'Step 1 of 3'}
            {activeTab === 'address' && 'Step 2 of 3'}
            {activeTab === 'branding' && 'Step 3 of 3'}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </div>
      </form>
    </ElevatedContainer>
  );
}
