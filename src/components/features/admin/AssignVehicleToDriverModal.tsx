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
import {
  useAssignVehicle,
  useAvailableVehicles,
  useDriverAssignments,
} from '@/hooks/useVehicleAssignments';
import type { AssignmentType } from '@/types/vehicleAssignment';

interface AssignVehicleToDriverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverId: string;
  driverName: string;
  employmentType: string;
}

export function AssignVehicleToDriverModal({
  open,
  onOpenChange,
  driverId,
  driverName,
  employmentType,
}: AssignVehicleToDriverModalProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const assignVehicle = useAssignVehicle();
  const { data: vehicles, isLoading } = useAvailableVehicles(profile?.company_id);
  const { data: assignments } = useDriverAssignments(driverId);
  const [search, setSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('assigned');
  const [isPrimary, setIsPrimary] = useState(false);
  const [startsAt, setStartsAt] = useState<Date | undefined>();
  const [endsAt, setEndsAt] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedVehicleId('');
      setAssignmentType('assigned');
      setStartsAt(undefined);
      setEndsAt(undefined);
      setIsPrimary((assignments?.length ?? 0) === 0);
    }
  }, [open, assignments?.length]);

  const filteredVehicles = useMemo(() => {
    if (!search.trim()) return vehicles || [];
    const term = search.toLowerCase();
    return (vehicles || []).filter((vehicle: any) => {
      const label = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.license_plate}`.toLowerCase();
      return label.includes(term);
    });
  }, [search, vehicles]);

  const selectedVehicle = useMemo(
    () => filteredVehicles.find((vehicle: any) => vehicle.id === selectedVehicleId),
    [filteredVehicles, selectedVehicleId],
  );

  const needsEndDate = assignmentType === 'borrowed';
  const hasValidEndDate =
    !needsEndDate ||
    (!!endsAt && (!startsAt || endsAt.getTime() > startsAt.getTime()));

  const canSubmit = selectedVehicleId && hasValidEndDate;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await assignVehicle.mutateAsync({
        vehicle_id: selectedVehicleId,
        driver_id: driverId,
        assignment_type: assignmentType,
        is_primary: isPrimary,
        starts_at: startsAt ? startsAt.toISOString() : undefined,
        ends_at: needsEndDate && endsAt ? endsAt.toISOString() : undefined,
      });
      onOpenChange(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign vehicle';
      toast({
        title: 'Assignment failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assign Vehicle to {driverName}</DialogTitle>
          <DialogDescription>
            Select a company vehicle and assignment type for this {employmentType.toUpperCase()} driver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">Search Vehicles</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by make, model, or plate..."
              className="mt-2"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Available Company Vehicles</div>
            <div className="rounded-lg border p-3 space-y-3 max-h-64 overflow-auto">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading vehicles...</div>
              ) : filteredVehicles.length === 0 ? (
                <div className="text-sm text-muted-foreground">No vehicles found.</div>
              ) : (
                <RadioGroup value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  {filteredVehicles.map((vehicle: any) => {
                    const current = vehicle.current_assignment;
                    const assignedTo = current?.driver?.user?.full_name;
                    const isAssigned = !!assignedTo;
                    return (
                      <label
                        key={vehicle.id}
                        className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted/30 cursor-pointer"
                      >
                        <RadioGroupItem value={vehicle.id} className="mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </div>
                            <Badge variant="outline" className="capitalize">
                              {vehicle.vehicle_type?.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Plate {vehicle.license_plate || '—'}
                          </div>
                          {isAssigned && (
                            <div className="text-xs text-amber-600">
                              Assigned to {assignedTo}. Selecting will transfer this vehicle.
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
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
                <RadioGroupItem value="assigned" />
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
            {assignVehicle.isPending ? 'Assigning...' : 'Assign Vehicle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
