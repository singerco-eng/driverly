import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ElevatedContainer } from '@/components/ui/elevated-container';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDropZone } from '@/components/ui/file-drop-zone';
import { useUpdateVehicle } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useToast } from '@/hooks/use-toast';
import { US_STATES } from '@/lib/us-states';
import type { VehicleWithAssignments, VehicleOwnership, VehicleType } from '@/types/vehicle';

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleWithAssignments;
}

export function EditVehicleModal({ open, onOpenChange, vehicle }: EditVehicleModalProps) {
  const updateVehicle = useUpdateVehicle();
  const { data: drivers } = useDrivers();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('info');
  const [make, setMake] = useState(vehicle.make);
  const [model, setModel] = useState(vehicle.model);
  const [year, setYear] = useState(String(vehicle.year));
  const [color, setColor] = useState(vehicle.color);
  const [licensePlate, setLicensePlate] = useState(vehicle.license_plate);
  const [licenseState, setLicenseState] = useState(vehicle.license_state);
  const [vin, setVin] = useState(vehicle.vin ?? '');
  const [vehicleType, setVehicleType] = useState<VehicleType>(vehicle.vehicle_type);
  const [ownership, setOwnership] = useState<VehicleOwnership>(vehicle.ownership);
  const [ownerDriverId, setOwnerDriverId] = useState(vehicle.owner_driver_id ?? '');
  const [seatCapacity, setSeatCapacity] = useState(String(vehicle.seat_capacity));
  const [wheelchairCapacity, setWheelchairCapacity] = useState(String(vehicle.wheelchair_capacity));
  const [stretcherCapacity, setStretcherCapacity] = useState(String(vehicle.stretcher_capacity));
  const [fleetNumber, setFleetNumber] = useState(vehicle.fleet_number ?? '');
  const [mileage, setMileage] = useState(vehicle.mileage !== null ? String(vehicle.mileage) : '');
  const [exteriorPhotoUrl, setExteriorPhotoUrl] = useState(vehicle.exterior_photo_url ?? '');
  const [interiorPhotoUrl, setInteriorPhotoUrl] = useState(vehicle.interior_photo_url ?? '');
  const [wheelchairLiftPhotoUrl, setWheelchairLiftPhotoUrl] = useState(vehicle.wheelchair_lift_photo_url ?? '');
  const [exteriorFiles, setExteriorFiles] = useState<File[]>([]);
  const [interiorFiles, setInteriorFiles] = useState<File[]>([]);
  const [liftFiles, setLiftFiles] = useState<File[]>([]);

  useEffect(() => {
    if (open) {
      setMake(vehicle.make);
      setModel(vehicle.model);
      setYear(String(vehicle.year));
      setColor(vehicle.color);
      setLicensePlate(vehicle.license_plate);
      setLicenseState(vehicle.license_state);
      setVin(vehicle.vin ?? '');
      setVehicleType(vehicle.vehicle_type);
      setOwnership(vehicle.ownership);
      setOwnerDriverId(vehicle.owner_driver_id ?? '');
      setSeatCapacity(String(vehicle.seat_capacity));
      setWheelchairCapacity(String(vehicle.wheelchair_capacity));
      setStretcherCapacity(String(vehicle.stretcher_capacity));
      setFleetNumber(vehicle.fleet_number ?? '');
      setMileage(vehicle.mileage !== null ? String(vehicle.mileage) : '');
      setExteriorPhotoUrl(vehicle.exterior_photo_url ?? '');
      setInteriorPhotoUrl(vehicle.interior_photo_url ?? '');
      setWheelchairLiftPhotoUrl(vehicle.wheelchair_lift_photo_url ?? '');
      setExteriorFiles([]);
      setInteriorFiles([]);
      setLiftFiles([]);
      setActiveTab('info');
    }
  }, [open, vehicle]);

  const isSubmitting = updateVehicle.isPending;

  useEffect(() => {
    if (vehicleType !== 'wheelchair_van') {
      setWheelchairLiftPhotoUrl('');
      setLiftFiles([]);
    }
  }, [vehicleType]);

  const canSubmit = useMemo(() => {
    if (!make.trim() || !model.trim() || !year || !color.trim()) return false;
    if (!licensePlate.trim() || !licenseState.trim()) return false;
    if (ownership === 'driver' && !ownerDriverId) return false;
    if (vehicleType === 'wheelchair_van' && Number(wheelchairCapacity) <= 0) return false;
    if (vehicleType === 'stretcher_van' && Number(stretcherCapacity) <= 0) return false;
    return true;
  }, [
    make,
    model,
    year,
    color,
    licensePlate,
    licenseState,
    ownership,
    ownerDriverId,
    vehicleType,
    wheelchairCapacity,
    stretcherCapacity,
  ]);

  const handlePhotoUpload = (file: File, onChange: (value: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await updateVehicle.mutateAsync({
      vehicleId: vehicle.id,
      data: {
        make: make.trim(),
        model: model.trim(),
        year: Number(year),
        color: color.trim(),
        license_plate: licensePlate.trim(),
        license_state: licenseState.trim(),
        vin: vin.trim() || undefined,
        vehicle_type: vehicleType,
        ownership,
        owner_driver_id: ownership === 'driver' ? ownerDriverId : undefined,
        seat_capacity: Number(seatCapacity),
        wheelchair_capacity: Number(wheelchairCapacity),
        stretcher_capacity: Number(stretcherCapacity),
        fleet_number: fleetNumber.trim() || undefined,
        mileage: mileage ? Number(mileage) : undefined,
        exterior_photo_url: exteriorPhotoUrl.trim() || undefined,
        interior_photo_url: interiorPhotoUrl.trim() || undefined,
        wheelchair_lift_photo_url: wheelchairLiftPhotoUrl.trim() || undefined,
      },
    });
    onOpenChange(false);
  };

  return (
    <ElevatedContainer
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Edit Vehicle"
      description="Update vehicle details."
      size="xl"
      variant="elevated"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="info">Vehicle Info</TabsTrigger>
            <TabsTrigger value="identification">Identification</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-white/80">Fleet Number</label>
                  <Input value={fleetNumber} onChange={(e) => setFleetNumber(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-white/80">Make</label>
                  <Input value={make} onChange={(e) => setMake(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-white/80">Model</label>
                  <Input value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-white/80">Year</label>
                  <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-white/80">Color</label>
                  <Input value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-white/80">Vehicle Type</label>
                  <Select value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleType)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedan">Sedan</SelectItem>
                      <SelectItem value="suv">SUV</SelectItem>
                      <SelectItem value="minivan">Minivan</SelectItem>
                      <SelectItem value="van">Van</SelectItem>
                      <SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
                      <SelectItem value="stretcher_van">Stretcher Van</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-white/80">Ownership</label>
                  <Select value={ownership} onValueChange={(value) => setOwnership(value as VehicleOwnership)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ownership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-white/80">Seat Capacity</label>
                  <Input type="number" value={seatCapacity} onChange={(e) => setSeatCapacity(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-white/80">Mileage</label>
                  <Input type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} />
                </div>
              </div>
              {ownership === 'driver' && (
                <div>
                  <label className="text-sm text-white/80">Owner Driver</label>
                  <Select value={ownerDriverId} onValueChange={setOwnerDriverId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      {(drivers ?? []).map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.user.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm text-white/80">Wheelchair Capacity</label>
                  <Input
                    type="number"
                    value={wheelchairCapacity}
                    onChange={(e) => setWheelchairCapacity(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/80">Stretcher Capacity</label>
                  <Input
                    type="number"
                    value={stretcherCapacity}
                    onChange={(e) => setStretcherCapacity(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="identification">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm text-white/80">License Plate</label>
                <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm text-white/80">License State</label>
                <Select value={licenseState} onValueChange={setLicenseState}>
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
              <div>
                <label className="text-sm text-white/80">VIN</label>
                <Input value={vin} onChange={(e) => setVin(e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                {exteriorPhotoUrl && exteriorFiles.length === 0 && (
                  <img src={exteriorPhotoUrl} alt="Exterior" className="h-40 w-full rounded-md object-cover" />
                )}
                <FileDropZone
                  files={exteriorFiles}
                  onFilesChange={(files) => {
                    setExteriorFiles(files);
                    if (files[0]) {
                      handlePhotoUpload(files[0], setExteriorPhotoUrl);
                    } else {
                      setExteriorPhotoUrl('');
                    }
                  }}
                  accept="image/*"
                  multiple={false}
                  maxSizeMB={10}
                  label="Exterior Photo"
                  fileTypeHint="JPG, PNG"
                  disabled={isSubmitting}
                  onError={(message) => toast({ title: 'Upload error', description: message, variant: 'destructive' })}
                />
              </div>

              <div className="space-y-3">
                {interiorPhotoUrl && interiorFiles.length === 0 && (
                  <img src={interiorPhotoUrl} alt="Interior" className="h-40 w-full rounded-md object-cover" />
                )}
                <FileDropZone
                  files={interiorFiles}
                  onFilesChange={(files) => {
                    setInteriorFiles(files);
                    if (files[0]) {
                      handlePhotoUpload(files[0], setInteriorPhotoUrl);
                    } else {
                      setInteriorPhotoUrl('');
                    }
                  }}
                  accept="image/*"
                  multiple={false}
                  maxSizeMB={10}
                  label="Interior Photo"
                  fileTypeHint="JPG, PNG"
                  disabled={isSubmitting}
                  onError={(message) => toast({ title: 'Upload error', description: message, variant: 'destructive' })}
                />
              </div>

              {vehicleType === 'wheelchair_van' && (
                <div className="space-y-3">
                  {wheelchairLiftPhotoUrl && liftFiles.length === 0 && (
                    <img
                      src={wheelchairLiftPhotoUrl}
                      alt="Wheelchair lift"
                      className="h-40 w-full rounded-md object-cover"
                    />
                  )}
                  <FileDropZone
                    files={liftFiles}
                    onFilesChange={(files) => {
                      setLiftFiles(files);
                      if (files[0]) {
                        handlePhotoUpload(files[0], setWheelchairLiftPhotoUrl);
                      } else {
                        setWheelchairLiftPhotoUrl('');
                      }
                    }}
                    accept="image/*"
                    multiple={false}
                    maxSizeMB={10}
                    label="Wheelchair Lift Photo"
                    fileTypeHint="JPG, PNG"
                    disabled={isSubmitting}
                    onError={(message) => toast({ title: 'Upload error', description: message, variant: 'destructive' })}
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="modal-secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </ElevatedContainer>
  );
}
