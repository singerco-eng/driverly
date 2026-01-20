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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRemoveEmergencyContact, useUpdateEmergencyContact } from '@/hooks/useProfile';
import type { DriverWithUser } from '@/types/driver';
import type { EmergencyContactFormData } from '@/types/profile';
import { RELATIONSHIP_OPTIONS } from '@/lib/us-states';

const emergencySchema = z
  .object({
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_relation: z.string().optional(),
  })
  .refine((data) => {
    const hasAny =
      !!data.emergency_contact_name || !!data.emergency_contact_phone || !!data.emergency_contact_relation;
    if (!hasAny) return true;
    return !!data.emergency_contact_name && !!data.emergency_contact_phone && !!data.emergency_contact_relation;
  }, {
    message: 'Please complete all fields or leave them all blank.',
  });

interface EditEmergencyContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithUser;
}

export default function EditEmergencyContactModal({
  open,
  onOpenChange,
  driver,
}: EditEmergencyContactModalProps) {
  const updateMutation = useUpdateEmergencyContact();
  const removeMutation = useRemoveEmergencyContact();
  const initialDataRef = useRef<EmergencyContactFormData | null>(null);

  const form = useForm<EmergencyContactFormData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const initialData: EmergencyContactFormData = {
      emergency_contact_name: driver.emergency_contact_name || '',
      emergency_contact_phone: driver.emergency_contact_phone || '',
      emergency_contact_relation: driver.emergency_contact_relation || '',
    };
    initialDataRef.current = initialData;
    form.reset(initialData);
  }, [open, driver, form]);

  const hasExistingContact =
    !!driver.emergency_contact_name || !!driver.emergency_contact_phone || !!driver.emergency_contact_relation;

  async function onSubmit(data: EmergencyContactFormData) {
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

  const handleRemove = async () => {
    await removeMutation.mutateAsync({
      userId: driver.user.id,
      driverId: driver.id,
      companyId: driver.company_id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Emergency Contact</DialogTitle>
          <DialogDescription>
            Add someone we can reach in case of emergency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contact Name</Label>
            <Input id="emergency_contact_name" {...form.register('emergency_contact_name')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Phone Number</Label>
            <Input id="emergency_contact_phone" type="tel" {...form.register('emergency_contact_phone')} />
          </div>

          <div className="space-y-2">
            <Label>Relationship</Label>
            <Select
              value={form.watch('emergency_contact_relation')}
              onValueChange={(value) => form.setValue('emergency_contact_relation', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}

          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex gap-2">
              {hasExistingContact && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={removeMutation.isPending}
                >
                  Remove Contact
                </Button>
              )}
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
