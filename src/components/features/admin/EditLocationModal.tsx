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
import { useUpdateLocation } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import type { Location, LocationStatus, UpdateLocationData } from '@/types/location';

interface EditLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export function EditLocationModal({ open, onOpenChange, location }: EditLocationModalProps) {
  const { toast } = useToast();
  const updateLocation = useUpdateLocation();
  const [name, setName] = useState(location.name);
  const [code, setCode] = useState(location.code ?? '');
  const [addressLine1, setAddressLine1] = useState(location.address_line1 ?? '');
  const [addressLine2, setAddressLine2] = useState(location.address_line2 ?? '');
  const [city, setCity] = useState(location.city ?? '');
  const [stateValue, setStateValue] = useState(location.state ?? '');
  const [zip, setZip] = useState(location.zip ?? '');
  const [phone, setPhone] = useState(location.phone ?? '');
  const [email, setEmail] = useState(location.email ?? '');
  const [status, setStatus] = useState<LocationStatus>(location.status);

  useEffect(() => {
    if (open) {
      setName(location.name);
      setCode(location.code ?? '');
      setAddressLine1(location.address_line1 ?? '');
      setAddressLine2(location.address_line2 ?? '');
      setCity(location.city ?? '');
      setStateValue(location.state ?? '');
      setZip(location.zip ?? '');
      setPhone(location.phone ?? '');
      setEmail(location.email ?? '');
      setStatus(location.status);
    }
  }, [open, location]);

  const canSubmit = useMemo(() => name.trim().length >= 2, [name]);
  const isSaving = updateLocation.isPending;

  const handleSave = async () => {
    if (!canSubmit) return;
    const payload: UpdateLocationData = {
      name: name.trim(),
      code: code.trim() || null,
      address_line1: addressLine1.trim() || null,
      address_line2: addressLine2.trim() || null,
      city: city.trim() || null,
      state: stateValue.trim() || null,
      zip: zip.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      status,
    };

    try {
      await updateLocation.mutateAsync({ id: location.id, data: payload });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update location';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>Edit Location</ModalTitle>
          <ModalDescription>Update location details and status.</ModalDescription>
        </ModalHeader>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Code</label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/80">Address Line 1</label>
            <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-white/80">Address Line 2</label>
            <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm text-white/80">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">State</label>
              <Input value={stateValue} onChange={(e) => setStateValue(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">ZIP</label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm text-white/80">Phone</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-white/80">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-sm text-white/80">Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as LocationStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
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
