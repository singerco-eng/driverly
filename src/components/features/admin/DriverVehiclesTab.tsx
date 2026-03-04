import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DriverWithDetails } from '@/types/driver';
import type { VehicleAssignment } from '@/types/vehicleAssignment';
import {
  useDriverAssignments,
  useDriverAssignmentHistory,
  useSetPrimaryVehicle,
} from '@/hooks/useVehicleAssignments';
import { useToast } from '@/hooks/use-toast';
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type {
  AssignmentMode,
  AssignmentContext,
} from '@/components/features/shared/assignment';
import { AssignmentHistoryList } from '@/components/features/admin/AssignmentHistoryList';
import { formatDate } from '@/lib/formatters';

interface DriverVehiclesTabProps {
  driver: DriverWithDetails;
  onAssignVehicle: () => void;
}

export function DriverVehiclesTab({ driver, onAssignVehicle }: DriverVehiclesTabProps) {
  const { toast } = useToast();
  const { data: assignments = [] } = useDriverAssignments(driver.id);
  const { data: history = [] } = useDriverAssignmentHistory(driver.id);
  const setPrimary = useSetPrimaryVehicle();
  const [modal, setModal] = useState<{
    open: boolean;
    mode: AssignmentMode | null;
    context: AssignmentContext | null;
  }>({
    open: false,
    mode: null,
    context: null,
  });
  const [showAllHistory, setShowAllHistory] = useState(false);

  const visibleHistory = useMemo(
    () => (showAllHistory ? history : history.slice(0, 5)),
    [history, showAllHistory],
  );

  const handleSetPrimary = async (assignment: VehicleAssignment) => {
    try {
      await setPrimary.mutateAsync({ assignmentId: assignment.id, driverId: driver.id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set primary vehicle';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const getVehicleName = (assignment: VehicleAssignment) =>
    assignment.vehicle
      ? `${assignment.vehicle.year} ${assignment.vehicle.make} ${assignment.vehicle.model}`
      : 'Vehicle';

  const openModal = (mode: AssignmentMode, assignment: VehicleAssignment) => {
    const context: AssignmentContext = {
      type: 'assignment',
      assignmentId: assignment.id,
      vehicleId: assignment.vehicle_id,
      vehicleName: getVehicleName(assignment),
      currentDriverId: assignment.driver_id,
      currentDriverName: driver.user.full_name,
      currentEndDate: assignment.ends_at || undefined,
      isOnlyVehicle: assignments.length <= 1,
      isPrimary: assignment.is_primary,
    };

    setModal({ open: true, mode, context });
  };

  const closeModal = () => setModal({ open: false, mode: null, context: null });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vehicles</h3>
          <p className="text-sm text-muted-foreground">
            Active assignments for this driver.
          </p>
        </div>
        <Button onClick={onAssignVehicle}>Assign Vehicle</Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            <div>No vehicles assigned.</div>
            {driver.employment_type === 'w2' && (
              <div>This W2 driver needs a vehicle to be eligible for trips.</div>
            )}
            <Button variant="outline" onClick={onAssignVehicle}>
              Assign Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => {
            const vehicle = assignment.vehicle;
            const endsSoon =
              assignment.ends_at &&
              new Date(assignment.ends_at).getTime() <
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).getTime();
            const isBorrowed = assignment.assignment_type === 'borrowed';
            const vehicleName = vehicle
              ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
              : 'Vehicle';
            return (
              <Card key={assignment.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{vehicleName}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {vehicle?.vehicle_type?.replace('_', ' ')} •{' '}
                      {vehicle?.license_plate || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{assignment.assignment_type.toUpperCase()}</Badge>
                    {assignment.is_primary && <Badge>Primary</Badge>}
                    {endsSoon && <Badge variant="destructive">Ends Soon</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-6">
                    <div>
                      <p className="text-muted-foreground">Assigned</p>
                      <p className="font-medium">{formatDate(assignment.starts_at)}</p>
                    </div>
                    {assignment.ends_at && (
                      <div>
                        <p className="text-muted-foreground">Ends</p>
                        <p className="font-medium">{formatDate(assignment.ends_at)}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!assignment.is_primary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPrimary(assignment)}
                        disabled={setPrimary.isPending}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openModal('unassign-vehicle', assignment)}
                    >
                      Unassign
                    </Button>
                    {isBorrowed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal('extend-assignment', assignment)}
                        >
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openModal('end-assignment-early', assignment)}
                        >
                          End Early
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Assignment History</h4>
          <p className="text-sm text-muted-foreground">Recent changes for this driver.</p>
        </div>
        {history.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAllHistory((prev) => !prev)}>
            {showAllHistory ? 'Show Recent' : 'View All'}
          </Button>
        )}
      </div>
      <AssignmentHistoryList history={visibleHistory} mode="driver" />

      {modal.mode && modal.context && (
        <UnifiedAssignmentModal
          open={modal.open}
          onOpenChange={(open) => !open && closeModal()}
          mode={modal.mode}
          context={modal.context}
        />
      )}
    </div>
  );
}
