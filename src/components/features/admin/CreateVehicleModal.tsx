import { useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateVehicle } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import type { CreateVehicleData, VehicleOwnership, VehicleType } from '@/types/vehicle';

interface CreateVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateVehicleModal({ open, onOpenChange }: CreateVehicleModalProps) {
  const createVehicle = useCreateVehicle();
  const { data: drivers } = useDrivers();
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [licenseState, setLicenseState] = useState('');
  const [vin, setVin] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('sedan');
  const [ownership, setOwnership] = useState<VehicleOwnership>('company');
  const [ownerDriverId, setOwnerDriverId] = useState('');
  const [seatCapacity, setSeatCapacity] = useState('4');
  const [wheelchairCapacity, setWheelchairCapacity] = useState('0');
  const [stretcherCapacity, setStretcherCapacity] = useState('0');
  const [fleetNumber, setFleetNumber] = useState('');
  const [mileage, setMileage] = useState('');

  const isSubmitting = createVehicle.isPending;

  const canSubmit = useMemo(() => {
    if (!make.trim() || !model.trim() || !year || !color.trim()) return false;
    if (!licensePlate.trim() || !licenseState.trim()) return false;
    if (ownership === 'driver' && !ownerDriverId) return false;
    return true;
  }, [make, model, year, color, licensePlate, licenseState, ownership, ownerDriverId]);

  const resetForm = () => {
    setMake('');
    setModel('');
    setYear('');
    setColor('');
    setLicensePlate('');
    setLicenseState('');
    setVin('');
    setVehicleType('sedan');
    setOwnership('company');
    setOwnerDriverId('');
    setSeatCapacity('4');
    setWheelchairCapacity('0');
    setStretcherCapacity('0');
    setFleetNumber('');
    setMileage('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload: CreateVehicleData = {
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
    };

    await createVehicle.mutateAsync(payload);
    resetForm();
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>Add Vehicle</ModalTitle>
          <ModalDescription>Create a new vehicle record.</ModalDescription>
        </ModalHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-white/80">Make</label>
              <Input value={make} onChange={(e) => setMake(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Model</label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Year</label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-white/80">Color</label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">License Plate</label>
              <Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">License State</label>
              <Input value={licenseState} onChange={(e) => setLicenseState(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-white/80">VIN</label>
              <Input value={vin} onChange={(e) => setVin(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Vehicle Type</label>
              <Select value={vehicleType} onValueChange={(value) => setVehicleType(value as VehicleType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="wheelchair_van">Wheelchair Van</SelectItem>
                  <SelectItem value="stretcher_van">Stretcher Van</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <label className="text-sm text-white/80">Seat Capacity</label>
              <Input value={seatCapacity} onChange={(e) => setSeatCapacity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Wheelchair Capacity</label>
              <Input value={wheelchairCapacity} onChange={(e) => setWheelchairCapacity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Stretcher Capacity</label>
              <Input value={stretcherCapacity} onChange={(e) => setStretcherCapacity(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">Fleet Number</label>
              <Input value={fleetNumber} onChange={(e) => setFleetNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Mileage</label>
              <Input value={mileage} onChange={(e) => setMileage(e.target.value)} />
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="modal-secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Vehicle'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
