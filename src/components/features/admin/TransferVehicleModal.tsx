import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAvailableDrivers, useDriverAssignments, useTransferVehicle } from '@/hooks/useVehicleAssignments';

interface TransferVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignmentId: string;
  vehicleName: string;
  currentDriverId: string;
  currentDriverName: string;
}

const transferReasons = [
  'Driver reassignment',
  'Route optimization',
  'Driver request',
  'Other',
];

export function TransferVehicleModal({
  open,
  onOpenChange,
  assignmentId,
  vehicleName,
  currentDriverId,
  currentDriverName,
}: TransferVehicleModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const transferVehicle = useTransferVehicle();
  const { data: drivers } = useAvailableDrivers(profile?.company_id);
  const { data: currentAssignments } = useDriverAssignments(currentDriverId);
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedDriverId('');
      setReason('');
      setNotes('');
      setIsPrimary(true);
    }
  }, [open]);

  const availableDrivers = useMemo(
    () => (drivers || []).filter((driver: any) => driver.id !== currentDriverId),
    [drivers, currentDriverId],
  );

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return availableDrivers;
    const term = search.toLowerCase();
    return availableDrivers.filter((driver: any) => {
      const label = `${driver.user?.full_name} ${driver.user?.email}`.toLowerCase();
      return label.includes(term);
    });
  }, [availableDrivers, search]);

  const selectedDriver = useMemo(
    () => filteredDrivers.find((driver: any) => driver.id === selectedDriverId),
    [filteredDrivers, selectedDriverId],
  );

  useEffect(() => {
    if (!selectedDriver) return;
    const activeCount = selectedDriver.active_assignments?.length || 0;
    setIsPrimary(activeCount === 0);
  }, [selectedDriver]);

  const willLeaveNoVehicle = (currentAssignments?.length || 0) <= 1;
  const canSubmit = selectedDriverId && reason;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await transferVehicle.mutateAsync({
        assignmentId,
        data: {
          to_driver_id: selectedDriverId,
          reason,
          notes: notes.trim() || undefined,
          is_primary: isPrimary,
        },
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to transfer vehicle';
      toast({
        title: 'Transfer failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transfer Vehicle</DialogTitle>
          <DialogDescription>
            {vehicleName} is currently assigned to {currentDriverName}. Select a new driver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">Search Drivers</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="mt-2"
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3 max-h-56 overflow-auto">
            {filteredDrivers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No drivers available.</div>
            ) : (
              <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId}>
                {filteredDrivers.map((driver: any) => {
                  const activeCount = driver.active_assignments?.length || 0;
                  return (
                    <label
                      key={driver.id}
                      className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer"
                    >
                      <RadioGroupItem value={driver.id} className="mt-1" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium">{driver.user?.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {activeCount === 0
                            ? 'No vehicle assigned'
                            : `${activeCount} active vehicle${activeCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </RadioGroup>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Reason for Transfer</label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {transferReasons.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={isPrimary} onCheckedChange={(checked) => setIsPrimary(checked === true)} />
                Set as primary for new driver
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional context for this transfer..."
              className="mt-2"
            />
          </div>

          {willLeaveNoVehicle && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              This is {currentDriverName}'s only active vehicle. They will have no vehicle after this
              transfer.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || transferVehicle.isPending}>
            {transferVehicle.isPending ? 'Transferring...' : 'Transfer Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
