import { useEffect, useMemo, useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCreateBroker, useUpdateBroker, useUpdateBrokerRates, useCurrentBrokerRates } from '@/hooks/useBrokers';
import { useToast } from '@/hooks/use-toast';
import type { Broker, BrokerFormData, BrokerRateFormData, VehicleType, BrokerAssignmentMode, TripSourceType } from '@/types/broker';
import { getBrokerAssignmentMode, SOURCE_TYPE_CONFIG } from '@/types/broker';
import { Lock, UserPlus, Zap, Building2, Hospital, Shield, User, Briefcase } from 'lucide-react';

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
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const SOURCE_TYPE_OPTIONS: {
  value: TripSourceType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'state_broker',
    label: 'State Broker',
    description: 'Medicaid transportation broker (MTM, LogistiCare, etc.)',
    icon: <Building2 className="w-4 h-4" />,
  },
  {
    value: 'facility',
    label: 'Facility',
    description: 'Healthcare facility (hospital, nursing home, dialysis)',
    icon: <Hospital className="w-4 h-4" />,
  },
  {
    value: 'insurance',
    label: 'Insurance',
    description: 'Insurance company or healthcare network',
    icon: <Shield className="w-4 h-4" />,
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Private individual or family client',
    icon: <User className="w-4 h-4" />,
  },
  {
    value: 'corporate',
    label: 'Corporate',
    description: 'Corporate or employer transportation contract',
    icon: <Briefcase className="w-4 h-4" />,
  },
];

const ASSIGNMENT_MODE_OPTIONS: {
  value: BrokerAssignmentMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'admin_only',
    label: 'Admin Only',
    description: 'Only admins can assign drivers to this trip source',
    icon: <Lock className="w-4 h-4" />,
  },
  {
    value: 'driver_requests',
    label: 'Driver Can Request',
    description: 'Drivers can request to join, admin approves',
    icon: <UserPlus className="w-4 h-4" />,
  },
  {
    value: 'driver_auto_signup',
    label: 'Driver Auto Sign Up',
    description: 'Drivers can join instantly without approval',
    icon: <Zap className="w-4 h-4" />,
  },
];

const vehicleTypeEnum = z.enum(['sedan', 'suv', 'minivan', 'wheelchair_van', 'stretcher_van']);

const sourceTypeEnum = z.enum(['state_broker', 'facility', 'insurance', 'private', 'corporate']);

const tripSourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  source_type: sourceTypeEnum.default('state_broker'),
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
  assignment_mode: z.enum(['admin_only', 'driver_requests', 'driver_auto_signup']).default('admin_only'),
  effective_from: z.string().min(1, 'Effective date is required'),
  rates: z.array(
    z.object({
      vehicle_type: vehicleTypeEnum,
      base_rate: z.coerce.number().min(0),
      per_mile_rate: z.coerce.number().min(0),
    }),
  ),
});

interface TripSourceFormValues extends Omit<BrokerFormData, 'allow_driver_requests' | 'allow_driver_auto_signup'> {
  assignment_mode: BrokerAssignmentMode;
  effective_from: string;
  rates: BrokerRateFormData[];
}

interface BrokerFormModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, modal is in edit mode */
  broker?: Broker;
}

export default function BrokerFormModal({ companyId, open, onOpenChange, broker }: BrokerFormModalProps) {
  const { toast } = useToast();
  const createBroker = useCreateBroker();
  const updateBroker = useUpdateBroker();
  const updateRates = useUpdateBrokerRates();
  const { data: currentRates } = useCurrentBrokerRates(broker?.id);
  const [activeTab, setActiveTab] = useState('basic');

  const isEditMode = !!broker;

  const defaultRates = useMemo(
    () =>
      VEHICLE_TYPES.map((type) => ({
        vehicle_type: type.value,
        base_rate: 0,
        per_mile_rate: 0,
      })),
    [],
  );

  const form = useForm<TripSourceFormValues>({
    resolver: zodResolver(tripSourceSchema),
    defaultValues: {
      name: '',
      code: '',
      source_type: 'state_broker',
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
      assignment_mode: 'admin_only',
      effective_from: new Date().toISOString().split('T')[0],
      rates: defaultRates,
    },
  });

  // Reset form when broker changes (for edit mode)
  useEffect(() => {
    if (broker && open) {
      const assignmentMode = getBrokerAssignmentMode(broker);
      form.reset({
        name: broker.name,
        code: broker.code || '',
        source_type: broker.source_type || 'state_broker',
        logo_url: broker.logo_url || '',
        contact_name: broker.contact_name || '',
        contact_email: broker.contact_email || '',
        contact_phone: broker.contact_phone || '',
        address_line1: broker.address_line1 || '',
        address_line2: broker.address_line2 || '',
        city: broker.city || '',
        state: broker.state || '',
        zip_code: broker.zip_code || '',
        website: broker.website || '',
        contract_number: broker.contract_number || '',
        notes: broker.notes || '',
        service_states: broker.service_states || [],
        accepted_vehicle_types: broker.accepted_vehicle_types || VEHICLE_TYPES.map((t) => t.value),
        accepted_employment_types: broker.accepted_employment_types || ['w2', '1099'],
        assignment_mode: assignmentMode,
        effective_from: new Date().toISOString().split('T')[0],
        rates: currentRates?.length
          ? VEHICLE_TYPES.map((type) => {
              const rate = currentRates.find((r) => r.vehicle_type === type.value);
              return {
                vehicle_type: type.value,
                base_rate: rate?.base_rate ?? 0,
                per_mile_rate: rate?.per_mile_rate ?? 0,
              };
            })
          : defaultRates,
      });
    } else if (!broker && open) {
      form.reset({
        name: '',
        code: '',
        source_type: 'state_broker',
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
        assignment_mode: 'admin_only',
        effective_from: new Date().toISOString().split('T')[0],
        rates: defaultRates,
      });
    }
  }, [broker, open, currentRates, form, defaultRates]);

  const serviceStates = form.watch('service_states');
  const vehicleTypes = form.watch('accepted_vehicle_types');
  const employmentTypes = form.watch('accepted_employment_types');
  const assignmentMode = form.watch('assignment_mode');

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

  const normalizeBrokerData = (values: TripSourceFormValues): BrokerFormData => ({
    name: values.name.trim(),
    code: values.code?.trim() || '',
    source_type: values.source_type,
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
    allow_driver_requests: values.assignment_mode === 'driver_requests',
    allow_driver_auto_signup: values.assignment_mode === 'driver_auto_signup',
  });

  async function onSubmit(values: TripSourceFormValues) {
    try {
      const brokerData = normalizeBrokerData(values);

      if (isEditMode && broker) {
        // Update existing broker
        await updateBroker.mutateAsync({ id: broker.id, data: brokerData });

        // Check if rates have changed before updating
        const hasRateChanges = values.rates.some((rate) => {
          const currentRate = currentRates?.find((r) => r.vehicle_type === rate.vehicle_type);
          return (
            !currentRate ||
            currentRate.base_rate !== rate.base_rate ||
            currentRate.per_mile_rate !== rate.per_mile_rate
          );
        });

        if (hasRateChanges) {
          await updateRates.mutateAsync({
            brokerId: broker.id,
            data: {
              effective_from: values.effective_from,
              rates: values.rates,
            },
          });
        }

        toast({
          title: 'Broker updated',
          description: `${brokerData.name} has been updated successfully.`,
        });
      } else {
        // Create new broker
        const newBroker = await createBroker.mutateAsync({ companyId, data: brokerData });

        await updateRates.mutateAsync({
          brokerId: newBroker.id,
          data: {
            effective_from: values.effective_from,
            rates: values.rates,
          },
        });

        toast({
          title: 'Broker created',
          description: `${newBroker.name} has been created successfully.`,
        });
      }

      form.reset();
      setActiveTab('basic');
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${isEditMode ? 'update' : 'create'} broker`,
        variant: 'destructive',
      });
    }
  }

  const isPending = createBroker.isPending || updateBroker.isPending || updateRates.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Trip Source' : 'Add Trip Source'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update trip source details, requirements, and rates.'
              : 'Create a new trip source and set requirements and rates.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="service">Service Area</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="rates">Rates</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              {/* Source Type Selection */}
              <div className="space-y-3">
                <Label>Source Type *</Label>
                <div className="grid gap-2 md:grid-cols-3">
                  {SOURCE_TYPE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`source-type-${option.value}`}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        form.watch('source_type') === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        id={`source-type-${option.value}`}
                        value={option.value}
                        {...form.register('source_type')}
                        className="sr-only"
                      />
                      <span className="text-muted-foreground">{option.icon}</span>
                      <div>
                        <div className="font-medium text-sm">{option.label}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" {...form.register('name')} placeholder="Statewide Medicaid" />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
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
                  Select all states where this broker contracts trips. Drivers must be in one of these states to join.
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

            <TabsContent value="assignment" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Driver Assignment Mode</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Choose how drivers can be assigned to this broker.
                  </p>
                </div>

                <RadioGroup
                  value={assignmentMode}
                  onValueChange={(value) => form.setValue('assignment_mode', value as BrokerAssignmentMode)}
                  className="space-y-3"
                >
                  {ASSIGNMENT_MODE_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      htmlFor={`assignment-${option.value}`}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                        assignmentMode === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={`assignment-${option.value}`}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>

                {assignmentMode !== 'admin_only' && (
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium mb-2">Note:</p>
                    <p className="text-muted-foreground">
                      {assignmentMode === 'driver_requests'
                        ? 'Drivers in the service area can request to join this broker. You will need to approve each request before they can accept trips.'
                        : 'Drivers in the service area can instantly join this broker. They will still need to complete all required credentials before becoming eligible for trips.'}
                    </p>
                  </div>
                )}
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
                {isEditMode && (
                  <p className="text-sm text-muted-foreground">
                    Changing rates will preserve the old rates for historical records.
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
            <Button type="submit" disabled={isPending}>
              {isPending ? (isEditMode ? 'Saving...' : 'Creating...') : isEditMode ? 'Save Changes' : 'Create Trip Source'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
