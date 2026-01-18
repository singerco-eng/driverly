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
import { useUpdateDriver } from '@/hooks/useDrivers';
import type { DriverWithDetails, EmploymentType } from '@/types/driver';

interface EditDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driver: DriverWithDetails;
}

export function EditDriverModal({ open, onOpenChange, driver }: EditDriverModalProps) {
  const updateDriver = useUpdateDriver();
  const [fullName, setFullName] = useState(driver.user.full_name);
  const [email, setEmail] = useState(driver.user.email);
  const [phone, setPhone] = useState(driver.user.phone ?? '');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(driver.employment_type);
  const [addressLine1, setAddressLine1] = useState(driver.address_line1 ?? '');
  const [city, setCity] = useState(driver.city ?? '');
  const [state, setState] = useState(driver.state ?? '');
  const [zip, setZip] = useState(driver.zip ?? '');

  useEffect(() => {
    if (open) {
      setFullName(driver.user.full_name);
      setEmail(driver.user.email);
      setPhone(driver.user.phone ?? '');
      setEmploymentType(driver.employment_type);
      setAddressLine1(driver.address_line1 ?? '');
      setCity(driver.city ?? '');
      setState(driver.state ?? '');
      setZip(driver.zip ?? '');
    }
  }, [open, driver]);

  const isSaving = updateDriver.isPending;

  const canSubmit = useMemo(() => {
    return fullName.trim() && email.trim() && employmentType;
  }, [fullName, email, employmentType]);

  const handleSave = async () => {
    if (!canSubmit) return;
    await updateDriver.mutateAsync({
      driverId: driver.id,
      driverData: {
        employment_type: employmentType,
        address_line1: addressLine1 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
      },
      userData: {
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Edit Driver</ModalTitle>
          <ModalDescription>Update driver profile details.</ModalDescription>
        </ModalHeader>

        <div className="grid gap-4">
          <div>
            <label className="text-sm text-white/80">Full name</label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm text-white/80">Employment type</label>
            <Select value={employmentType} onValueChange={(value) => setEmploymentType(value as EmploymentType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="w2">W2</SelectItem>
                <SelectItem value="1099">1099</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">Address</label>
              <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">State</label>
              <Input value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">ZIP</label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>
        </div>

        <ModalFooter>
          <Button variant="modal-secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSave} disabled={!canSubmit || isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
