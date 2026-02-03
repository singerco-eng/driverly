import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VehicleWithAssignments } from '@/types/vehicle';
import {
  useDriverAssignments,
  useVehicleAssignment,
  useVehicleAssignmentHistory,
} from '@/hooks/useVehicleAssignments';
import { AssignDriverToVehicleModal } from '@/components/features/admin/AssignDriverToVehicleModal';
import { TransferVehicleModal } from '@/components/features/admin/TransferVehicleModal';
import { UnassignVehicleModal } from '@/components/features/admin/UnassignVehicleModal';
import { AssignmentHistoryList } from '@/components/features/admin/AssignmentHistoryList';
import { formatDate } from '@/lib/formatters';

interface VehicleAssignmentsTabProps {
  vehicle: VehicleWithAssignments;
}

export function VehicleAssignmentsTab({ vehicle }: VehicleAssignmentsTabProps) {
  const { data: currentAssignment } = useVehicleAssignment(vehicle.id);
  const { data: driverAssignments = [] } = useDriverAssignments(currentAssignment?.driver_id);
  const { data: history = [] } = useVehicleAssignmentHistory(vehicle.id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [unassignOpen, setUnassignOpen] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const visibleHistory = useMemo(
    () => (showAllHistory ? history : history.slice(0, 5)),
    [history, showAllHistory],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assignments</h3>
          <p className="text-sm text-muted-foreground">Current driver assignment for this vehicle.</p>
        </div>
        <Button onClick={() => setAssignOpen(true)}>Assign to Driver</Button>
      </div>

      {currentAssignment ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">
                {currentAssignment.driver?.user.full_name || 'Assigned Driver'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {currentAssignment.driver?.employment_type?.toUpperCase() || '—'} •{' '}
                {currentAssignment.driver?.status || '—'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{currentAssignment.assignment_type.toUpperCase()}</Badge>
              {currentAssignment.is_primary && <Badge>Primary</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-muted-foreground">Since</p>
                <p className="font-medium">{formatDate(currentAssignment.starts_at)}</p>
              </div>
              {currentAssignment.ends_at && (
                <div>
                  <p className="text-muted-foreground">Ends</p>
                  <p className="font-medium">{formatDate(currentAssignment.ends_at)}</p>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setTransferOpen(true)}>
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUnassignOpen(true)}>
                Unassign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            <div>This vehicle is not currently assigned to a driver.</div>
            <Button variant="outline" onClick={() => setAssignOpen(true)}>
              Assign to Driver
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-lg font-semibold">Assignment History</h4>
          <p className="text-sm text-muted-foreground">Recent changes for this vehicle.</p>
        </div>
        {history.length > 5 && (
          <Button variant="ghost" size="sm" onClick={() => setShowAllHistory((prev) => !prev)}>
            {showAllHistory ? 'Show Recent' : 'View All'}
          </Button>
        )}
      </div>
      <AssignmentHistoryList history={visibleHistory} mode="vehicle" />

      <AssignDriverToVehicleModal
        open={assignOpen}
        onOpenChange={setAssignOpen}
        vehicleId={vehicle.id}
        vehicleName={vehicleName}
      />

      {currentAssignment && (
        <TransferVehicleModal
          open={transferOpen}
          onOpenChange={setTransferOpen}
          assignmentId={currentAssignment.id}
          vehicleName={vehicleName}
          currentDriverId={currentAssignment.driver_id}
          currentDriverName={currentAssignment.driver?.user.full_name || 'Driver'}
        />
      )}

      {currentAssignment && (
        <UnassignVehicleModal
          open={unassignOpen}
          onOpenChange={setUnassignOpen}
          assignmentId={currentAssignment.id}
          vehicleName={vehicleName}
          driverName={currentAssignment.driver?.user.full_name || 'Driver'}
          isOnlyVehicle={driverAssignments.length <= 1}
          isPrimary={currentAssignment.is_primary}
        />
      )}
    </div>
  );
}
