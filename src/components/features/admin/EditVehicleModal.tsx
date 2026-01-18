import { useEffect, useMemo, useState } from 'react';
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
import { useUpdateVehicle } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import type { VehicleWithAssignments, VehicleOwnership, VehicleType } from '@/types/vehicle';

interface EditVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: VehicleWithAssignments;
}

export function EditVehicleModal({ open, onOpenChange, vehicle }: EditVehicleModalProps) {
  const updateVehicle = useUpdateVehicle();
  const { data: drivers } = useDrivers();
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
    }
  }, [open, vehicle]);

  const isSubmitting = updateVehicle.isPending;

  const canSubmit = useMemo(() => {
    if (!make.trim() || !model.trim() || !year || !color.trim()) return false;
    if (!licensePlate.trim() || !licenseState.trim()) return false;
    if (ownership === 'driver' && !ownerDriverId) return false;
    return true;
  }, [make, model, year, color, licensePlate, licenseState, ownership, ownerDriverId]);

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
      },
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>Edit Vehicle</ModalTitle>
          <ModalDescription>Update vehicle details.</ModalDescription>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
