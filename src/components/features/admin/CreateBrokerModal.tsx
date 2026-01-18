import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateBroker, useUpdateBrokerRates } from '@/hooks/useBrokers';
import { useToast } from '@/hooks/use-toast';
import type { BrokerFormData, BrokerRateFormData, VehicleType } from '@/types/broker';

const VEHICLE_TYPES: { value: VehicleType; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'wheelchair_van', label: 'Wheelchair Van' },
  { value: 'stretcher_van', label: 'Stretcher Van' },
];

const EMPLOYMENT_TYPES = [
  { value: 'w2', label: 'W2 Employee' },
  { value: '1099', label: '1099 Contractor' },
] as const;

const US_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
];

const vehicleTypeEnum = z.enum(['sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van']);

const brokerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  logo_url: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  website: z.string().optional(),
  contract_number: z.string().optional(),
  notes: z.string().optional(),
  service_states: z.array(z.string()).default([]),
  accepted_vehicle_types: z.array(vehicleTypeEnum).default([]),
  accepted_employment_types: z.array(z.enum(['w2', '1099'])).default([]),
  effective_from: z.string().min(1, 'Effective date is required'),
  rates: z.array(
    z.object({
      vehicle_type: vehicleTypeEnum,
      base_rate: z.coerce.number().min(0),
      per_mile_rate: z.coerce.number().min(0),
    }),
  ),
});

interface BrokerFormValues extends BrokerFormData {
  effective_from: string;
  rates: BrokerRateFormData[];
}

interface CreateBrokerModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateBrokerModal({ companyId, open, onOpenChange }: CreateBrokerModalProps) {
  const { toast } = useToast();
  const createBroker = useCreateBroker();
  const updateRates = useUpdateBrokerRates();
  const [activeTab, setActiveTab] = useState('basic');

  const defaultRates = useMemo(
    () =>
      VEHICLE_TYPES.map((type) => ({
        vehicle_type: type.value,
        base_rate: 0,
        per_mile_rate: 0,
      })),
    [],
  );

  const form = useForm<BrokerFormValues>({
    resolver: zodResolver(brokerSchema),
    defaultValues: {
      name: '',
      code: '',
      logo_url: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      website: '',
      contract_number: '',
      notes: '',
      service_states: [],
      accepted_vehicle_types: VEHICLE_TYPES.map((type) => type.value),
      accepted_employment_types: ['w2', '1099'],
      effective_from: new Date().toISOString().split('T')[0],
      rates: defaultRates,
    },
  });

  const serviceStates = form.watch('service_states');
  const vehicleTypes = form.watch('accepted_vehicle_types');
  const employmentTypes = form.watch('accepted_employment_types');

  const toggleSelection = (
    current: string[],
    value: string,
    checked: boolean,
    setter: (value: string[]) => void,
  ) => {
    if (checked) {
      if (!current.includes(value)) {
        setter([...current, value]);
      }
    } else {
      setter(current.filter((item) => item !== value));
    }
  };

  const normalizeBrokerData = (values: BrokerFormValues): BrokerFormData => ({
    name: values.name.trim(),
    code: values.code?.trim() || '',
    logo_url: values.logo_url?.trim() ? values.logo_url.trim() : null,
    contact_name: values.contact_name?.trim() || '',
    contact_email: values.contact_email?.trim() || '',
    contact_phone: values.contact_phone?.trim() || '',
    address_line1: values.address_line1?.trim() || '',
    address_line2: values.address_line2?.trim() || '',
    city: values.city?.trim() || '',
    state: values.state?.trim() || '',
    zip_code: values.zip_code?.trim() || '',
    website: values.website?.trim() || '',
    contract_number: values.contract_number?.trim() || '',
    notes: values.notes?.trim() || '',
    service_states: values.service_states,
    accepted_vehicle_types: values.accepted_vehicle_types,
    accepted_employment_types: values.accepted_employment_types,
  });

  async function onSubmit(values: BrokerFormValues) {
    try {
      const brokerData = normalizeBrokerData(values);
      const broker = await createBroker.mutateAsync({ companyId, data: brokerData });

      await updateRates.mutateAsync({
        brokerId: broker.id,
        data: {
          effective_from: values.effective_from,
          rates: values.rates,
        },
      });

      toast({
        title: 'Broker created',
        description: `${broker.name} has been created successfully.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create broker',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Broker</DialogTitle>
          <DialogDescription>Create a new broker and set requirements and rates.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="service">Service Area</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="rates">Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Broker Name *</Label>
                  <Input id="name" {...form.register('name')} placeholder="Statewide Medicaid" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Broker Code</Label>
                  <Input id="code" {...form.register('code')} placeholder="SWM-01" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input id="logo_url" {...form.register('logo_url')} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" {...form.register('website')} placeholder="https://..." />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Contact Name</Label>
                  <Input id="contact_name" {...form.register('contact_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input id="contact_email" type="email" {...form.register('contact_email')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input id="contact_phone" {...form.register('contact_phone')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input id="address_line1" {...form.register('address_line1')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input id="address_line2" {...form.register('address_line2')} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...form.register('city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" {...form.register('state')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input id="zip_code" {...form.register('zip_code')} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contract_number">Contract Number</Label>
                  <Input id="contract_number" {...form.register('contract_number')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...form.register('notes')} rows={3} />
              </div>
            </TabsContent>

            <TabsContent value="service" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Service States</Label>
                <ScrollArea className="h-48 rounded-md border p-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {US_STATES.map((state) => (
                      <div key={state} className="flex items-center gap-2">
                        <Checkbox
                          id={`service-${state}`}
                          checked={serviceStates.includes(state)}
                          onCheckedChange={(checked) =>
                            toggleSelection(
                              serviceStates,
                              state,
                              checked === true,
                              (value) => form.setValue('service_states', value),
                            )
                          }
                        />
                        <Label htmlFor={`service-${state}`}>{state}</Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <p className="text-sm text-muted-foreground">
                  Select all states where this broker contracts trips.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="requirements" className="space-y-6 mt-4">
              <div className="space-y-3">
                <Label>Accepted Vehicle Types</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {VEHICLE_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`vehicle-${type.value}`}
                        checked={vehicleTypes.includes(type.value)}
                        onCheckedChange={(checked) =>
                          toggleSelection(
                            vehicleTypes,
                            type.value,
                            checked === true,
                            (value) => form.setValue('accepted_vehicle_types', value as VehicleType[]),
                          )
                        }
                      />
                      <Label htmlFor={`vehicle-${type.value}`}>{type.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Accepted Employment Types</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  {EMPLOYMENT_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`employment-${type.value}`}
                        checked={employmentTypes.includes(type.value)}
                        onCheckedChange={(checked) =>
                          toggleSelection(employmentTypes, type.value, checked === true, (value) =>
                            form.setValue('accepted_employment_types', value as ('w2' | '1099')[]),
                          )
                        }
                      />
                      <Label htmlFor={`employment-${type.value}`}>{type.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rates" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="effective_from">Effective From *</Label>
                <Input id="effective_from" type="date" {...form.register('effective_from')} />
                {form.formState.errors.effective_from && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.effective_from.message}
                  </p>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Per Mile Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {VEHICLE_TYPES.map((type, index) => (
                    <TableRow key={type.value}>
                      <TableCell className="font-medium">{type.label}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`rates.${index}.base_rate`, { valueAsNumber: true })}
                        />
                        <input
                          type="hidden"
                          {...form.register(`rates.${index}.vehicle_type`)}
                          defaultValue={type.value}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          {...form.register(`rates.${index}.per_mile_rate`, { valueAsNumber: true })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBroker.isPending || updateRates.isPending}>
              {createBroker.isPending || updateRates.isPending ? 'Creating...' : 'Create Broker'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
