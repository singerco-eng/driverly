import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateLocation } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import type { CreateLocationData } from '@/types/location';

export const createLocationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().max(50).optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
});

export type CreateLocationFormData = z.infer<typeof createLocationSchema>;

interface CreateLocationModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLocationModal({
  companyId,
  open,
  onOpenChange,
}: CreateLocationModalProps) {
  const { toast } = useToast();
  const createLocation = useCreateLocation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLocationFormData>({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: '',
      code: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
    },
  });

  async function onSubmit(data: CreateLocationFormData) {
    const payload: CreateLocationData = {
      name: data.name.trim(),
      code: data.code?.trim() || undefined,
      address_line1: data.address_line1?.trim() || undefined,
      address_line2: data.address_line2?.trim() || undefined,
      city: data.city?.trim() || undefined,
      state: data.state?.trim() || undefined,
      zip: data.zip?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      email: data.email?.trim() || undefined,
    };

    try {
      await createLocation.mutateAsync({ companyId, data: payload });
      toast({
        title: 'Location created',
        description: `${payload.name} has been created successfully.`,
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create location',
        variant: 'destructive',
      });
    }
  }

  function handleClose() {
    reset();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      handleClose();
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Location</DialogTitle>
          <DialogDescription>
            Add a new company location for assigning drivers and vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} placeholder="Downtown Depot" />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" {...register('code')} placeholder="DT-01" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input id="address_line1" {...register('address_line1')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input id="address_line2" {...register('address_line2')} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register('state')} placeholder="NY" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input id="zip" {...register('zip')} placeholder="10001" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" {...register('email')} placeholder="location@company.com" />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLocation.isPending}>
              {createLocation.isPending ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
