import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateCredentialType, useBrokers } from '@/hooks/useCredentialTypes';
import { useToast } from '@/hooks/use-toast';
import type { CredentialTypeFormData } from '@/types/credential';

const credentialTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['driver', 'vehicle']),
  scope: z.enum(['global', 'broker']),
  broker_id: z.string().nullable(),
  employment_type: z.enum(['both', 'w2_only', '1099_only']),
  requirement: z.enum(['required', 'optional', 'recommended']),
  vehicle_types: z.array(z.string()),
  submission_type: z.enum([
    'document_upload',
    'photo',
    'signature',
    'form',
    'admin_verified',
    'date_entry',
  ]),
  form_schema: z.record(z.unknown()).nullable(),
  signature_document_url: z.string().nullable(),
  expiration_type: z.enum(['never', 'fixed_interval', 'driver_specified']),
  expiration_interval_days: z.number().nullable(),
  expiration_warning_days: z.number().default(30),
  grace_period_days: z.number().default(30),
});

interface CreateCredentialTypeModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCredentialTypeModal({
  companyId,
  open,
  onOpenChange,
}: CreateCredentialTypeModalProps) {
  const { toast } = useToast();
  const createCredentialType = useCreateCredentialType();
  const { data: brokers } = useBrokers(companyId);
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<CredentialTypeFormData>({
    resolver: zodResolver(credentialTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'driver',
      scope: 'global',
      broker_id: null,
      employment_type: 'both',
      requirement: 'required',
      vehicle_types: [],
      submission_type: 'document_upload',
      form_schema: null,
      signature_document_url: null,
      expiration_type: 'never',
      expiration_interval_days: null,
      expiration_warning_days: 30,
      grace_period_days: 30,
    },
  });

  const watchScope = form.watch('scope');
  const watchCategory = form.watch('category');
  const watchExpirationType = form.watch('expiration_type');

  async function onSubmit(data: CredentialTypeFormData) {
    try {
      await createCredentialType.mutateAsync({ companyId, data });
      toast({
        title: 'Credential type created',
        description: `${data.name} has been created successfully.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create credential type',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Credential Type</DialogTitle>
          <DialogDescription>
            Define a new credential requirement for drivers or vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="submission">Submission</TabsTrigger>
              <TabsTrigger value="expiration">Expiration</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...form.register('name')} placeholder="Background Check" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description & Instructions</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Provide instructions for drivers..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <RadioGroup
                  value={form.watch('category')}
                  onValueChange={(v) => form.setValue('category', v as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver" id="cat-driver" />
                    <Label htmlFor="cat-driver">Driver Credential</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vehicle" id="cat-vehicle" />
                    <Label htmlFor="cat-vehicle">Vehicle Credential</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Scope *</Label>
                <RadioGroup
                  value={form.watch('scope')}
                  onValueChange={(v) => form.setValue('scope', v as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="scope-global" />
                    <Label htmlFor="scope-global">Global (Required for all)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="broker" id="scope-broker" />
                    <Label htmlFor="scope-broker">Broker-Specific</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchScope === 'broker' && (
                <div className="space-y-2">
                  <Label>Broker *</Label>
                  <Select
                    value={form.watch('broker_id') || ''}
                    onValueChange={(v) => form.setValue('broker_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select broker" />
                    </SelectTrigger>
                    <SelectContent>
                      {brokers?.map((broker) => (
                        <SelectItem key={broker.id} value={broker.id}>
                          {broker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* Submission Tab */}
            <TabsContent value="submission" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>How should this credential be submitted? *</Label>
                <RadioGroup
                  value={form.watch('submission_type')}
                  onValueChange={(v) => form.setValue('submission_type', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="document_upload" id="sub-doc" />
                    <div>
                      <Label htmlFor="sub-doc" className="font-medium">
                        Document Upload
                      </Label>
                      <p className="text-sm text-muted-foreground">Upload a PDF or image file</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="photo" id="sub-photo" />
                    <div>
                      <Label htmlFor="sub-photo" className="font-medium">
                        Photo Capture
                      </Label>
                      <p className="text-sm text-muted-foreground">Take or upload a photo</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="signature" id="sub-sig" />
                    <div>
                      <Label htmlFor="sub-sig" className="font-medium">
                        E-Signature
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Sign a document electronically
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="date_entry" id="sub-date" />
                    <div>
                      <Label htmlFor="sub-date" className="font-medium">
                        Date Entry
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enter a date (e.g., last drug test)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="admin_verified" id="sub-admin" />
                    <div>
                      <Label htmlFor="sub-admin" className="font-medium">
                        Admin Verified
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Admin manually marks as complete
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>

            {/* Expiration Tab */}
            <TabsContent value="expiration" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Does this credential expire? *</Label>
                <RadioGroup
                  value={form.watch('expiration_type')}
                  onValueChange={(v) => form.setValue('expiration_type', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="exp-never" />
                    <Label htmlFor="exp-never">Never expires (one-time completion)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed_interval" id="exp-fixed" />
                    <Label htmlFor="exp-fixed">Fixed interval (valid for set period)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver_specified" id="exp-driver" />
                    <Label htmlFor="exp-driver">Driver specifies expiration date</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchExpirationType === 'fixed_interval' && (
                <div className="space-y-2">
                  <Label>Valid for (days) *</Label>
                  <Input
                    type="number"
                    {...form.register('expiration_interval_days', { valueAsNumber: true })}
                    placeholder="365"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Warning threshold (days before expiration)</Label>
                <Input
                  type="number"
                  {...form.register('expiration_warning_days', { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Requirement Level *</Label>
                <RadioGroup
                  value={form.watch('requirement')}
                  onValueChange={(v) => form.setValue('requirement', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="required" id="req-required" />
                    <Label htmlFor="req-required">
                      Required - Must be completed to be eligible
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recommended" id="req-recommended" />
                    <Label htmlFor="req-recommended">
                      Recommended - Shows warning but doesn't block
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="req-optional" />
                    <Label htmlFor="req-optional">Optional - Nice to have</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchCategory === 'driver' && (
                <div className="space-y-2">
                  <Label>Employment Type *</Label>
                  <RadioGroup
                    value={form.watch('employment_type')}
                    onValueChange={(v) => form.setValue('employment_type', v as any)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="emp-both" />
                      <Label htmlFor="emp-both">Both W2 and 1099</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="w2_only" id="emp-w2" />
                      <Label htmlFor="emp-w2">W2 Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1099_only" id="emp-1099" />
                      <Label htmlFor="emp-1099">1099 Only</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label>Grace period for existing drivers (days)</Label>
                <Input
                  type="number"
                  {...form.register('grace_period_days', { valueAsNumber: true })}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  When this credential is created, existing drivers have this many days to submit.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCredentialType.isPending}>
              {createCredentialType.isPending ? 'Creating...' : 'Create Credential Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
