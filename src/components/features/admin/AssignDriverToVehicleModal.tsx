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
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAssignVehicle, useAvailableDrivers } from '@/hooks/useVehicleAssignments';
import type { AssignmentType } from '@/types/vehicleAssignment';

interface AssignDriverToVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
}

export function AssignDriverToVehicleModal({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
}: AssignDriverToVehicleModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const assignVehicle = useAssignVehicle();
  const { data: drivers, isLoading } = useAvailableDrivers(profile?.company_id);
  const [search, setSearch] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('assigned');
  const [isPrimary, setIsPrimary] = useState(true);
  const [startsAt, setStartsAt] = useState<Date | undefined>();
  const [endsAt, setEndsAt] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedDriverId('');
      setAssignmentType('assigned');
      setStartsAt(undefined);
      setEndsAt(undefined);
      setIsPrimary(true);
    }
  }, [open]);

  const filteredDrivers = useMemo(() => {
    if (!search.trim()) return drivers || [];
    const term = search.toLowerCase();
    return (drivers || []).filter((driver: any) => {
      const label = `${driver.user?.full_name} ${driver.user?.email}`.toLowerCase();
      return label.includes(term);
    });
  }, [drivers, search]);

  const selectedDriver = useMemo(
    () => filteredDrivers.find((driver: any) => driver.id === selectedDriverId),
    [filteredDrivers, selectedDriverId],
  );

  useEffect(() => {
    if (!selectedDriver) return;
    if (selectedDriver.employment_type === '1099' && assignmentType === 'assigned') {
      setAssignmentType('borrowed');
    }
    const activeCount = selectedDriver.active_assignments?.length || 0;
    setIsPrimary(activeCount === 0);
  }, [selectedDriver, assignmentType]);

  const w2Drivers = filteredDrivers.filter((driver: any) => driver.employment_type === 'w2');
  const contractorDrivers = filteredDrivers.filter((driver: any) => driver.employment_type === '1099');

  const needsEndDate = assignmentType === 'borrowed';
  const hasValidEndDate =
    !needsEndDate ||
    (!!endsAt && (!startsAt || endsAt.getTime() > startsAt.getTime()));
  const canSubmit = selectedDriverId && hasValidEndDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await assignVehicle.mutateAsync({
        vehicle_id: vehicleId,
        driver_id: selectedDriverId,
        assignment_type: assignmentType,
        is_primary: isPrimary,
        starts_at: startsAt ? startsAt.toISOString() : undefined,
        ends_at: needsEndDate && endsAt ? endsAt.toISOString() : undefined,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign driver';
      toast({
        title: 'Assignment failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const renderDriverOption = (driver: any) => {
    const activeCount = driver.active_assignments?.length || 0;
    return (
      <label
        key={driver.id}
        className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer"
      >
        <RadioGroupItem value={driver.id} className="mt-1" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <div className="font-medium">{driver.user?.full_name}</div>
            <Badge variant="outline" className="uppercase">
              {driver.employment_type}
            </Badge>
            {driver.status !== 'active' && (
              <Badge variant="secondary" className="uppercase">
                {driver.status}
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {activeCount === 0 ? 'No vehicle assigned' : `${activeCount} active vehicle${activeCount === 1 ? '' : 's'}`}
          </div>
        </div>
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign {vehicleName} to Driver</DialogTitle>
          <DialogDescription>Select a driver and assignment type.</DialogDescription>
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

          <div className="space-y-2">
            <div className="text-sm font-medium">W2 Drivers (Recommended)</div>
            <div className="rounded-lg border p-3 space-y-3 max-h-48 overflow-auto">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading drivers...</div>
              ) : w2Drivers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No W2 drivers available.</div>
              ) : (
                <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  {w2Drivers.map(renderDriverOption)}
                </RadioGroup>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">1099 Drivers (Borrowed Only)</div>
            <div className="rounded-lg border p-3 space-y-3 max-h-48 overflow-auto">
              {contractorDrivers.length === 0 ? (
                <div className="text-sm text-muted-foreground">No 1099 drivers available.</div>
              ) : (
                <RadioGroup value={selectedDriverId} onValueChange={setSelectedDriverId}>
                  {contractorDrivers.map(renderDriverOption)}
                </RadioGroup>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Assignment Type</div>
            <RadioGroup
              value={assignmentType}
              onValueChange={(value) => setAssignmentType(value as AssignmentType)}
            >
              <label className="flex items-center gap-2">
                <RadioGroupItem value="assigned" disabled={selectedDriver?.employment_type === '1099'} />
                Assigned (ongoing)
              </label>
              <label className="flex items-center gap-2">
                <RadioGroupItem value="borrowed" />
                Borrowed (temporary)
              </label>
            </RadioGroup>
          </div>

          {needsEndDate && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Start Date</label>
                <DatePicker date={startsAt} onDateChange={setStartsAt} />
              </div>
              <div>
                <label className="text-sm font-medium">End Date</label>
                <DatePicker date={endsAt} onDateChange={setEndsAt} />
                {!hasValidEndDate && (
                  <p className="text-xs text-destructive mt-1">
                    End date must be after the start date.
                  </p>
                )}
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrimary} onCheckedChange={(checked) => setIsPrimary(checked === true)} />
            Set as primary vehicle
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || assignVehicle.isPending}>
            {assignVehicle.isPending ? 'Assigning...' : 'Assign to Driver'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
