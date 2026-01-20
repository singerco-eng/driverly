import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle, Camera, Upload } from 'lucide-react';
import type { AddVehicleWizardData, DriverVehicle } from '@/types/driverVehicle';
import { useUpdateVehicle, useUploadVehiclePhoto } from '@/hooks/useDriverVehicles';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import { US_STATES } from '@/lib/us-states';

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: DriverVehicle;
}

export default function EditVehicleModal({ open, onOpenChange, vehicle }: EditVehicleModalProps) {
  const updateVehicle = useUpdateVehicle();
  const uploadPhoto = useUploadVehiclePhoto();
  const [formData, setFormData] = useState<Partial<AddVehicleWizardData>>({});
  const [previews, setPreviews] = useState<{ exterior: string | null; interior: string | null; lift: string | null }>({
    exterior: null,
    interior: null,
    lift: null,
  });

  const exteriorInputRef = useRef<HTMLInputElement>(null);
  const interiorInputRef = useRef<HTMLInputElement>(null);
  const liftInputRef = useRef<HTMLInputElement>(null);
  const exteriorCameraRef = useRef<HTMLInputElement>(null);
  const interiorCameraRef = useRef<HTMLInputElement>(null);
  const liftCameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setFormData({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      vehicle_type: vehicle.vehicle_type,
      license_plate: vehicle.license_plate,
      license_state: vehicle.license_state,
      vin: vehicle.vin || '',
      seat_capacity: vehicle.seat_capacity,
      wheelchair_capacity: vehicle.wheelchair_capacity,
      stretcher_capacity: vehicle.stretcher_capacity,
      exterior_photo_url: vehicle.exterior_photo_url,
      interior_photo_url: vehicle.interior_photo_url,
      wheelchair_lift_photo_url: vehicle.wheelchair_lift_photo_url,
    });
    const loadPreviews = async () => {
      const [exterior, interior, lift] = await Promise.all([
        resolveVehiclePhotoUrl(vehicle.exterior_photo_url),
        resolveVehiclePhotoUrl(vehicle.interior_photo_url),
        resolveVehiclePhotoUrl(vehicle.wheelchair_lift_photo_url),
      ]);
      setPreviews({ exterior, interior, lift });
    };
    void loadPreviews();
  }, [open, vehicle]);

  const hasTypeChanged = useMemo(
    () => formData.vehicle_type && formData.vehicle_type !== vehicle.vehicle_type,
    [formData.vehicle_type, vehicle.vehicle_type],
  );

  const updateField = (key: keyof AddVehicleWizardData, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpload = async (photoType: 'exterior' | 'interior' | 'lift', file: File) => {
    const url = await uploadPhoto.mutateAsync({ vehicleId: vehicle.id, file, photoType });
    if (photoType === 'exterior') {
      updateField('exterior_photo_url', url);
      setPreviews((prev) => ({ ...prev, exterior: URL.createObjectURL(file) }));
    }
    if (photoType === 'interior') {
      updateField('interior_photo_url', url);
      setPreviews((prev) => ({ ...prev, interior: URL.createObjectURL(file) }));
    }
    if (photoType === 'lift') {
      updateField('wheelchair_lift_photo_url', url);
      setPreviews((prev) => ({ ...prev, lift: URL.createObjectURL(file) }));
    }
  };

  const handleSave = async () => {
    await updateVehicle.mutateAsync({ vehicleId: vehicle.id, data: formData });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
          <DialogDescription>Update your vehicle details and photos.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="identification">Identification</TabsTrigger>
            <TabsTrigger value="capacity">Capacity</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input id="make" value={formData.make || ''} onChange={(e) => updateField('make', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model || ''}
                  onChange={(e) => updateField('model', e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => updateField('year', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color || ''}
                  onChange={(e) => updateField('color', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Vehicle Type</Label>
              <RadioGroup
                value={formData.vehicle_type || vehicle.vehicle_type}
                onValueChange={(value) => updateField('vehicle_type', value as AddVehicleWizardData['vehicle_type'])}
                className="grid gap-2 sm:grid-cols-2"
              >
                {[
                { value: 'sedan', label: 'Sedan' },
                { value: 'suv', label: 'SUV' },
                { value: 'minivan', label: 'Minivan' },
                { value: 'van', label: 'Van' },
                  { value: 'wheelchair_van', label: 'Wheelchair Van' },
                  { value: 'stretcher_van', label: 'Stretcher Van' },
                ].map((option) => (
                  <div key={option.value} className="flex items-center gap-2 border rounded-md px-3 py-2">
                    <RadioGroupItem value={option.value} id={`edit-type-${option.value}`} />
                    <Label htmlFor={`edit-type-${option.value}`}>{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
              {hasTypeChanged && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Changing type may affect credential requirements.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="identification" className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="license_plate">License Plate</Label>
                <Input
                  id="license_plate"
                  value={formData.license_plate || ''}
                  onChange={(e) => updateField('license_plate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>License State</Label>
                <Select
                  value={formData.license_state || ''}
                  onValueChange={(value) => updateField('license_state', value)}
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
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vin">VIN</Label>
              <Input id="vin" value={formData.vin || ''} onChange={(e) => updateField('vin', e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="capacity" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="seat_capacity">Seat Capacity</Label>
              <Input
                id="seat_capacity"
                type="number"
                value={formData.seat_capacity || ''}
                onChange={(e) => updateField('seat_capacity', Number(e.target.value))}
              />
            </div>
            {formData.vehicle_type === 'wheelchair_van' && (
              <div className="space-y-2">
                <Label htmlFor="wheelchair_capacity">Wheelchair Capacity</Label>
                <Input
                  id="wheelchair_capacity"
                  type="number"
                  value={formData.wheelchair_capacity || ''}
                  onChange={(e) => updateField('wheelchair_capacity', Number(e.target.value))}
                />
              </div>
            )}
            {formData.vehicle_type === 'stretcher_van' && (
              <div className="space-y-2">
                <Label htmlFor="stretcher_capacity">Stretcher Capacity</Label>
                <Input
                  id="stretcher_capacity"
                  type="number"
                  value={formData.stretcher_capacity || ''}
                  onChange={(e) => updateField('stretcher_capacity', Number(e.target.value))}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-6 pt-4">
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

            {formData.vehicle_type === 'wheelchair_van' && (
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
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={updateVehicle.isPending}>
            {updateVehicle.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
