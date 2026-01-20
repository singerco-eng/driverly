import { useEffect, useRef, useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitiateEmailChange, useUpdateContactInfo } from '@/hooks/useProfile';
import type { DriverWithUser } from '@/types/driver';
import type { ContactInfoFormData } from '@/types/profile';

const phoneRegex = /^(\+1\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

const contactInfoSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  phone: z.string().regex(phoneRegex, 'Enter a valid US phone number'),
});

interface EditContactInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithUser;
  user: DriverWithUser['user'];
}

export default function EditContactInfoModal({
  open,
  onOpenChange,
  driver,
  user,
}: EditContactInfoModalProps) {
  const updateMutation = useUpdateContactInfo();
  const emailChangeMutation = useInitiateEmailChange();
  const [pendingData, setPendingData] = useState<ContactInfoFormData | null>(null);
  const [emailChangeSent, setEmailChangeSent] = useState(false);
  const initialDataRef = useRef<ContactInfoFormData | null>(null);

  const form = useForm<ContactInfoFormData>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      email: '',
      phone: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    const initialData: ContactInfoFormData = {
      email: user.email || '',
      phone: user.phone || '',
    };
    initialDataRef.current = initialData;
    setEmailChangeSent(false);
    form.reset(initialData);
  }, [open, user, form]);

  const applyChanges = async (data: ContactInfoFormData) => {
    if (!initialDataRef.current) return;
    const initial = initialDataRef.current;

    if (data.phone !== initial.phone) {
      await updateMutation.mutateAsync({
        userId: user.id,
        driverId: driver.id,
        companyId: driver.company_id,
        data,
        oldData: initial,
      });
    }

    if (data.email !== initial.email) {
      await emailChangeMutation.mutateAsync(data.email);
      setEmailChangeSent(true);
      return;
    }

    if (data.phone === initial.phone && data.email === initial.email) {
      onOpenChange(false);
      return;
    }

    onOpenChange(false);
  };

  async function onSubmit(data: ContactInfoFormData) {
    if (!initialDataRef.current) return;
    if (data.email !== initialDataRef.current.email) {
      setPendingData(data);
      return;
    }
    await applyChanges(data);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Contact Info</DialogTitle>
            <DialogDescription>
              Update your email and phone number. Email changes require verification.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...form.register('phone')} />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            {emailChangeSent && (
              <Alert>
                <AlertDescription>
                  Verification email sent. Check your inbox to confirm the change.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending || emailChangeMutation.isPending}>
                {updateMutation.isPending || emailChangeMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingData} onOpenChange={(openState) => !openState && setPendingData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm email change</AlertDialogTitle>
            <AlertDialogDescription>
              We will send a verification email to your new address. Your current email will remain active until
              you confirm the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingData) return;
                const data = pendingData;
                setPendingData(null);
                await applyChanges(data);
              }}
            >
              Send Verification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
