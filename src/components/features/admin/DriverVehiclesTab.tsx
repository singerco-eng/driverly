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
import { AssignVehicleToDriverModal } from '@/components/features/admin/AssignVehicleToDriverModal';
import { UnassignVehicleModal } from '@/components/features/admin/UnassignVehicleModal';
import { ExtendAssignmentModal } from '@/components/features/admin/ExtendAssignmentModal';
import { EndAssignmentEarlyModal } from '@/components/features/admin/EndAssignmentEarlyModal';
import { AssignmentHistoryList } from '@/components/features/admin/AssignmentHistoryList';

interface DriverVehiclesTabProps {
  driver: DriverWithDetails;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function DriverVehiclesTab({ driver }: DriverVehiclesTabProps) {
  const { toast } = useToast();
  const { data: assignments = [] } = useDriverAssignments(driver.id);
  const { data: history = [] } = useDriverAssignmentHistory(driver.id);
  const setPrimary = useSetPrimaryVehicle();
  const [assignOpen, setAssignOpen] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<VehicleAssignment | null>(null);
  const [extendTarget, setExtendTarget] = useState<VehicleAssignment | null>(null);
  const [endEarlyTarget, setEndEarlyTarget] = useState<VehicleAssignment | null>(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Vehicles</h3>
          <p className="text-sm text-muted-foreground">
            Active assignments for this driver.
          </p>
        </div>
        <Button onClick={() => setAssignOpen(true)}>Assign Vehicle</Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            <div>No vehicles assigned.</div>
            {driver.employment_type === 'w2' && (
              <div>This W2 driver needs a vehicle to be eligible for trips.</div>
            )}
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
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
                      onClick={() => setUnassignTarget(assignment)}
                    >
                      Unassign
                    </Button>
                    {isBorrowed && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setExtendTarget(assignment)}>
                          Extend
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEndEarlyTarget(assignment)}
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

      <AssignVehicleToDriverModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        driverId={driver.id}
        driverName={driver.user.full_name}
        employmentType={driver.employment_type}
      />

      {unassignTarget && (
        <UnassignVehicleModal
          open={!!unassignTarget}
          onOpenChange={(open) => !open && setUnassignTarget(null)}
          assignmentId={unassignTarget.id}
          vehicleName={
            unassignTarget.vehicle
              ? `${unassignTarget.vehicle.year} ${unassignTarget.vehicle.make} ${unassignTarget.vehicle.model}`
              : 'Vehicle'
          }
          driverName={driver.user.full_name}
          isOnlyVehicle={assignments.length <= 1}
          isPrimary={unassignTarget.is_primary}
        />
      )}

      {extendTarget && extendTarget.ends_at && (
        <ExtendAssignmentModal
          open={!!extendTarget}
          onOpenChange={(open) => !open && setExtendTarget(null)}
          assignmentId={extendTarget.id}
          currentEndDate={extendTarget.ends_at}
          vehicleName={
            extendTarget.vehicle
              ? `${extendTarget.vehicle.year} ${extendTarget.vehicle.make} ${extendTarget.vehicle.model}`
              : 'Vehicle'
          }
        />
      )}

      {endEarlyTarget && endEarlyTarget.ends_at && (
        <EndAssignmentEarlyModal
          open={!!endEarlyTarget}
          onOpenChange={(open) => !open && setEndEarlyTarget(null)}
          assignmentId={endEarlyTarget.id}
          scheduledEndDate={endEarlyTarget.ends_at}
          vehicleName={
            endEarlyTarget.vehicle
              ? `${endEarlyTarget.vehicle.year} ${endEarlyTarget.vehicle.make} ${endEarlyTarget.vehicle.model}`
              : 'Vehicle'
          }
        />
      )}
    </div>
  );
}
