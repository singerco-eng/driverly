import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Camera, Upload } from 'lucide-react';
import type { DriverVehicle } from '@/types/driverVehicle';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import { useUpdateVehiclePhotos, useUploadVehiclePhoto } from '@/hooks/useDriverVehicles';

interface UpdatePhotosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: DriverVehicle;
}

export default function UpdatePhotosModal({ open, onOpenChange, vehicle }: UpdatePhotosModalProps) {
  const updatePhotos = useUpdateVehiclePhotos();
  const uploadPhoto = useUploadVehiclePhoto();
  const [previews, setPreviews] = useState<{ exterior: string | null; interior: string | null; lift: string | null }>({
    exterior: null,
    interior: null,
    lift: null,
  });
  const [uploads, setUploads] = useState<{ exterior?: string | null; interior?: string | null; lift?: string | null }>(
    {},
  );

  const exteriorInputRef = useRef<HTMLInputElement>(null);
  const interiorInputRef = useRef<HTMLInputElement>(null);
  const liftInputRef = useRef<HTMLInputElement>(null);
  const exteriorCameraRef = useRef<HTMLInputElement>(null);
  const interiorCameraRef = useRef<HTMLInputElement>(null);
  const liftCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const loadPreviews = async () => {
      const [exterior, interior, lift] = await Promise.all([
        resolveVehiclePhotoUrl(vehicle.exterior_photo_url),
        resolveVehiclePhotoUrl(vehicle.interior_photo_url),
        resolveVehiclePhotoUrl(vehicle.wheelchair_lift_photo_url),
      ]);
      setPreviews({ exterior, interior, lift });
    };
    void loadPreviews();
    setUploads({});
  }, [open, vehicle]);

  const handleUpload = async (photoType: 'exterior' | 'interior' | 'lift', file: File) => {
    const url = await uploadPhoto.mutateAsync({ vehicleId: vehicle.id, file, photoType });
    setUploads((prev) => ({ ...prev, [photoType]: url }));
    setPreviews((prev) => ({ ...prev, [photoType]: URL.createObjectURL(file) }));
  };

  const handleSave = async () => {
    await updatePhotos.mutateAsync({
      vehicleId: vehicle.id,
      photos: {
        exterior_photo_url: uploads.exterior ?? vehicle.exterior_photo_url,
        interior_photo_url: uploads.interior ?? vehicle.interior_photo_url,
        wheelchair_lift_photo_url: uploads.lift ?? vehicle.wheelchair_lift_photo_url,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Vehicle Photos</DialogTitle>
          <DialogDescription>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <Label>Exterior Photo</Label>
            {previews.exterior ? (
              <img src={previews.exterior} alt="Exterior" className="h-40 w-full object-cover rounded-md border" />
            ) : (
              <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                No exterior photo yet
              </div>
            )}
            <input
              ref={exteriorInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload('exterior', file);
              }}
            />
            <input
              ref={exteriorCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload('exterior', file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => exteriorInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => exteriorCameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Interior Photo</Label>
            {previews.interior ? (
              <img src={previews.interior} alt="Interior" className="h-40 w-full object-cover rounded-md border" />
            ) : (
              <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                No interior photo yet
              </div>
            )}
            <input
              ref={interiorInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload('interior', file);
              }}
            />
            <input
              ref={interiorCameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload('interior', file);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => interiorInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => interiorCameraRef.current?.click()}>
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </div>
          </div>

          {vehicle.vehicle_type === 'wheelchair_van' && (
            <div className="space-y-3">
              <Label>Wheelchair Lift Photo</Label>
              {previews.lift ? (
                <img src={previews.lift} alt="Lift" className="h-40 w-full object-cover rounded-md border" />
              ) : (
                <div className="h-40 rounded-md border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                  No lift photo yet
                </div>
              )}
              <input
                ref={liftInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload('lift', file);
                }}
              />
              <input
                ref={liftCameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void handleUpload('lift', file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => liftInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => liftCameraRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={updatePhotos.isPending}>
            {updatePhotos.isPending ? 'Saving...' : 'Save Photos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
