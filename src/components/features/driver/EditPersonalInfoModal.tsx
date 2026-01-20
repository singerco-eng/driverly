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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUpdatePersonalInfo, useUploadProfilePhoto, useRemoveProfilePhoto } from '@/hooks/useProfile';
import type { DriverWithUser } from '@/types/driver';
import type { PersonalInfoFormData } from '@/types/profile';
import { Camera, Trash2, Upload } from 'lucide-react';

const personalInfoSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  avatar_url: z.string().nullable(),
});

interface EditPersonalInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithUser;
  user: DriverWithUser['user'];
}

export default function EditPersonalInfoModal({
  open,
  onOpenChange,
  driver,
  user,
}: EditPersonalInfoModalProps) {
  const updateMutation = useUpdatePersonalInfo();
  const uploadPhoto = useUploadProfilePhoto();
  const removePhoto = useRemoveProfilePhoto();
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const initialDataRef = useRef<PersonalInfoFormData | null>(null);

  const form = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      avatar_url: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    const initialData: PersonalInfoFormData = {
      full_name: user.full_name || '',
      date_of_birth: driver.date_of_birth || '',
      avatar_url: user.avatar_url || null,
    };
    initialDataRef.current = initialData;
    form.reset(initialData);
  }, [open, driver, user, form]);

  const initials = (user.full_name || user.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const avatarUrl = form.watch('avatar_url');

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const url = await uploadPhoto.mutateAsync({ userId: user.id, file });
      form.setValue('avatar_url', url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    setIsUploading(true);
    try {
      await removePhoto.mutateAsync(user.id);
      form.setValue('avatar_url', null);
    } finally {
      setIsUploading(false);
    }
  };

  async function onSubmit(data: PersonalInfoFormData) {
    if (!initialDataRef.current) return;
    await updateMutation.mutateAsync({
      userId: user.id,
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
          <DialogTitle>Edit Personal Info</DialogTitle>
          <DialogDescription>Update your name, date of birth, and profile photo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={avatarUrl || undefined} alt={user.full_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap gap-2">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isUploading}
              >
                <Camera className="w-4 h-4 mr-2" />
                Camera
              </Button>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  disabled={isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" {...form.register('full_name')} />
            {form.formState.errors.full_name && (
              <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" type="date" {...form.register('date_of_birth')} />
            {form.formState.errors.date_of_birth && (
              <p className="text-sm text-destructive">{form.formState.errors.date_of_birth.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || isUploading}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
