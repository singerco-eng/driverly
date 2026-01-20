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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateLicense } from '@/hooks/useProfile';
import type { DriverWithUser } from '@/types/driver';
import type { LicenseFormData } from '@/types/profile';
import { US_STATES } from '@/lib/us-states';
import { supabase } from '@/integrations/supabase/client';
import { Camera, Upload } from 'lucide-react';

const licenseSchema = z.object({
  license_number: z.string().min(1, 'License number is required'),
  license_state: z.string().min(2, 'License state is required'),
  license_expiration: z.string().min(1, 'Expiration date is required'),
  license_front_url: z.string().nullable(),
  license_back_url: z.string().nullable(),
});

interface EditLicenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithUser;
}

export default function EditLicenseModal({ open, onOpenChange, driver }: EditLicenseModalProps) {
  const updateMutation = useUpdateLicense();
  const initialDataRef = useRef<LicenseFormData | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState({ front: false, back: false });

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const frontCameraRef = useRef<HTMLInputElement>(null);
  const backCameraRef = useRef<HTMLInputElement>(null);

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      license_number: '',
      license_state: '',
      license_expiration: '',
      license_front_url: null,
      license_back_url: null,
    },
  });

  useEffect(() => {
    if (!open) return;
    const initialData: LicenseFormData = {
      license_number: driver.license_number || '',
      license_state: driver.license_state || '',
      license_expiration: driver.license_expiration || '',
      license_front_url: driver.license_front_url || null,
      license_back_url: driver.license_back_url || null,
    };
    initialDataRef.current = initialData;
    form.reset(initialData);
    void loadPreview(initialData.license_front_url, setFrontPreview);
    void loadPreview(initialData.license_back_url, setBackPreview);
  }, [open, driver, form]);

  const loadPreview = async (
    path: string | null,
    setter: (value: string | null) => void
  ) => {
    if (!path) {
      setter(null);
      return;
    }
    const { data, error } = await supabase.storage
      .from('credential-documents')
      .createSignedUrl(path, 60 * 60);
    if (error || !data?.signedUrl) {
      setter(null);
      return;
    }
    setter(data.signedUrl);
  };

  const uploadLicensePhoto = async (side: 'front' | 'back', file: File) => {
    setUploading((prev) => ({ ...prev, [side]: true }));
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const filePath = `${driver.user.id}/profile/license-${side}.${extension}`;
      const { error } = await supabase.storage
        .from('credential-documents')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      form.setValue(side === 'front' ? 'license_front_url' : 'license_back_url', filePath);
      const localPreview = URL.createObjectURL(file);
      if (side === 'front') {
        setFrontPreview(localPreview);
      } else {
        setBackPreview(localPreview);
      }
    } finally {
      setUploading((prev) => ({ ...prev, [side]: false }));
    }
  };

  async function onSubmit(data: LicenseFormData) {
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit License Info</DialogTitle>
          <DialogDescription>Update your license details and photos.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="license_number">License Number</Label>
              <Input id="license_number" {...form.register('license_number')} />
              {form.formState.errors.license_number && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.license_number.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>State</Label>
              <Select
                value={form.watch('license_state')}
                onValueChange={(value) => form.setValue('license_state', value)}
              >
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
              {form.formState.errors.license_state && (
                <p className="text-sm text-destructive">{form.formState.errors.license_state.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license_expiration">Expiration Date</Label>
            <Input id="license_expiration" type="date" {...form.register('license_expiration')} />
            {form.formState.errors.license_expiration && (
              <p className="text-sm text-destructive">
                {form.formState.errors.license_expiration.message}
              </p>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label>Front Photo</Label>
              {frontPreview ? (
                <img
                  src={frontPreview}
                  alt="License front"
                  className="w-full max-h-40 object-contain rounded-md border bg-muted/20"
                />
              ) : (
                <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                  No front photo yet
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLicensePhoto('front', file);
                  }}
                />
                <input
                  ref={frontCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLicensePhoto('front', file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => frontInputRef.current?.click()}
                  disabled={uploading.front}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => frontCameraRef.current?.click()}
                  disabled={uploading.front}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </Button>
                {frontPreview && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={frontPreview} target="_blank" rel="noreferrer">
                      View full
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Back Photo</Label>
              {backPreview ? (
                <img
                  src={backPreview}
                  alt="License back"
                  className="w-full max-h-40 object-contain rounded-md border bg-muted/20"
                />
              ) : (
                <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                  No back photo yet
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <input
                  ref={backInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLicensePhoto('back', file);
                  }}
                />
                <input
                  ref={backCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLicensePhoto('back', file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => backInputRef.current?.click()}
                  disabled={uploading.back}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => backCameraRef.current?.click()}
                  disabled={uploading.back}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Camera
                </Button>
                {backPreview && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={backPreview} target="_blank" rel="noreferrer">
                      View full
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

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
