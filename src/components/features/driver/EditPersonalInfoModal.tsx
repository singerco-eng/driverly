import { useCallback, useEffect, useRef, useState } from 'react';
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
import { FileDropZone } from '@/components/ui/file-drop-zone';
import PhotoCropperModal from './PhotoCropperModal';
import { useUpdatePersonalInfo, useUploadProfilePhoto, useRemoveProfilePhoto } from '@/hooks/useProfile';
import { resolveAvatarUrl } from '@/services/profile';
import { useToast } from '@/hooks/use-toast';
import type { DriverWithUser } from '@/types/driver';
import type { PersonalInfoFormData } from '@/types/profile';
import { Trash2 } from 'lucide-react';

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
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [displayAvatarUrl, setDisplayAvatarUrl] = useState<string | null>(null);
  const initialDataRef = useRef<PersonalInfoFormData | null>(null);
  const { toast } = useToast();

  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

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

  // Resolve avatar URL for display (handles signed URLs)
  useEffect(() => {
    let isMounted = true;
    async function loadDisplay() {
      if (avatarUrl) {
        // If it's already a full signed/public URL (e.g. from fresh upload), use directly
        if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
          if (isMounted) setDisplayAvatarUrl(avatarUrl);
        } else {
          const resolved = await resolveAvatarUrl(avatarUrl);
          if (isMounted) setDisplayAvatarUrl(resolved);
        }
      } else {
        if (isMounted) setDisplayAvatarUrl(null);
      }
    }
    void loadDisplay();
    return () => { isMounted = false; };
  }, [avatarUrl]);

  // When files are dropped, show the cropper instead of uploading directly
  const handleFilesChange = useCallback((files: File[]) => {
    setPhotoFiles(files);
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImageSrc(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // When cropper confirms, upload the cropped blob
  const handleCropComplete = useCallback(async (croppedBlob: Blob) => {
    setShowCropper(false);
    setPendingImageSrc(null);
    setPhotoFiles([]);
    setIsUploading(true);

    try {
      // Convert blob to File for the upload function
      const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
      const url = await uploadPhoto.mutateAsync({ userId: user.id, file: croppedFile });
      form.setValue('avatar_url', url);
      toast({
        title: 'Photo updated',
        description: 'Your profile photo has been updated.',
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Could not upload profile photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  }, [uploadPhoto, user.id, form, toast]);

  // When cropper is cancelled
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setPendingImageSrc(null);
    setPhotoFiles([]);
  }, []);

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Personal Info</DialogTitle>
            <DialogDescription>Update your name, date of birth, and profile photo.</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Profile Photo Section */}
            <div className="space-y-3">
              <Label>Profile Photo</Label>
              
              {/* Show current avatar if exists */}
              {displayAvatarUrl && (
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg border border-border/40">
                  <Avatar size="lg">
                    <AvatarImage src={displayAvatarUrl} alt={user.full_name} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current photo</p>
                    <p className="text-xs text-muted-foreground">Upload a new photo to replace</p>
                  </div>
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
                </div>
              )}
              
              {/* File Drop Zone */}
              <FileDropZone
                files={photoFiles}
                onFilesChange={handleFilesChange}
                accept="image/*"
                multiple={false}
                maxSizeMB={5}
                label={displayAvatarUrl ? 'Upload new photo' : undefined}
                fileTypeHint="JPG, PNG"
                helpText="You'll be able to crop and adjust"
                compact
                disabled={isUploading}
                onError={(message) => toast({ title: 'Upload error', description: message, variant: 'destructive' })}
              />
              
              {isUploading && (
                <p className="text-sm text-muted-foreground">Uploading...</p>
              )}
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

      {/* Photo Cropper Modal */}
      {pendingImageSrc && (
        <PhotoCropperModal
          open={showCropper}
          onOpenChange={(open) => {
            if (!open) handleCropCancel();
          }}
          imageSrc={pendingImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
