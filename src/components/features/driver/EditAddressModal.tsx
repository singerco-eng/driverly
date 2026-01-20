import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateAddress } from '@/hooks/useProfile';
import type { DriverWithUser } from '@/types/driver';
import type { AddressFormData } from '@/types/profile';
import { US_STATES } from '@/lib/us-states';

const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a valid ZIP code'),
});

interface EditAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithUser;
}

export default function EditAddressModal({ open, onOpenChange, driver }: EditAddressModalProps) {
  const updateMutation = useUpdateAddress();
  const initialDataRef = useRef<AddressFormData | null>(null);

  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const initialData: AddressFormData = {
      address_line1: driver.address_line1 || '',
      address_line2: driver.address_line2 || '',
      city: driver.city || '',
      state: driver.state || '',
      zip_code: driver.zip || '',
    };
    initialDataRef.current = initialData;
    form.reset(initialData);
  }, [open, driver, form]);

  const currentState = form.watch('state');
  const stateChanged = initialDataRef.current?.state && currentState !== initialDataRef.current.state;

  async function onSubmit(data: AddressFormData) {
    if (!initialDataRef.current) return;
    await updateMutation.mutateAsync({
      userId: driver.user.id,
      driverId: driver.id,
      companyId: driver.company_id,
      data,
      oldData: initialDataRef.current,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
          <DialogDescription>Keep your address current for eligibility checks.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" {...form.register('address_line1')} />
            {form.formState.errors.address_line1 && (
              <p className="text-sm text-destructive">{form.formState.errors.address_line1.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input id="address_line2" {...form.register('address_line2')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Select value={currentState} onValueChange={(value) => form.setValue('state', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.state && (
                <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip_code">ZIP Code</Label>
            <Input id="zip_code" {...form.register('zip_code')} />
            {form.formState.errors.zip_code && (
              <p className="text-sm text-destructive">{form.formState.errors.zip_code.message}</p>
            )}
          </div>

          {stateChanged && (
            <Alert>
              <AlertDescription>
                Changing your state may affect broker eligibility. We will update your profile immediately.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
