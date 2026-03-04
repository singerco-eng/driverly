import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { VehicleWithAssignments } from '@/types/vehicle';
import type { VehicleAssignment } from '@/types/vehicleAssignment';
import {
  useDriverAssignments,
  useVehicleAssignment,
  useVehicleAssignmentHistory,
} from '@/hooks/useVehicleAssignments';
import { AssignmentHistoryList } from '@/components/features/admin/AssignmentHistoryList';
import { formatDate } from '@/lib/formatters';
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type {
  AssignmentContext,
  AssignmentMode,
  VehicleContext,
} from '@/components/features/shared/assignment';

interface VehicleAssignmentsTabProps {
  vehicle: VehicleWithAssignments;
}

export function VehicleAssignmentsTab({ vehicle }: VehicleAssignmentsTabProps) {
  const { data: currentAssignment } = useVehicleAssignment(vehicle.id);
  const { data: driverAssignments = [] } = useDriverAssignments(currentAssignment?.driver_id);
  const { data: history = [] } = useVehicleAssignmentHistory(vehicle.id);
  const [modal, setModal] = useState<{
    open: boolean;
    mode: AssignmentMode | null;
    context: VehicleContext | AssignmentContext | null;
  }>({ open: false, mode: null, context: null });
  const [showAllHistory, setShowAllHistory] = useState(false);

  const vehicleName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const openAssignDriver = () =>
    setModal({
      open: true,
      mode: 'assign-driver-to-vehicle',
      context: { type: 'vehicle', vehicleId: vehicle.id, vehicleName },
    });

  const openTransfer = (assignment: VehicleAssignment) =>
    setModal({
      open: true,
      mode: 'transfer-vehicle',
      context: {
        type: 'assignment',
        assignmentId: assignment.id,
        vehicleId: vehicle.id,
        vehicleName,
        currentDriverId: assignment.driver_id,
        currentDriverName: assignment.driver?.user.full_name || 'Unknown',
      },
    });

  const openUnassign = (assignment: VehicleAssignment) =>
    setModal({
      open: true,
      mode: 'unassign-vehicle',
      context: {
        type: 'assignment',
        assignmentId: assignment.id,
        vehicleId: vehicle.id,
        vehicleName,
        currentDriverId: assignment.driver_id,
        currentDriverName: assignment.driver?.user.full_name || 'Unknown',
        isOnlyVehicle: driverAssignments.length <= 1,
        isPrimary: assignment.is_primary,
      },
    });

  const openExtend = (assignment: VehicleAssignment) =>
    setModal({
      open: true,
      mode: 'extend-assignment',
      context: {
        type: 'assignment',
        assignmentId: assignment.id,
        vehicleId: vehicle.id,
        vehicleName,
        currentDriverId: assignment.driver_id,
        currentDriverName: assignment.driver?.user.full_name || 'Unknown',
        currentEndDate: assignment.ends_at || undefined,
      },
    });

  const openEndEarly = (assignment: VehicleAssignment) =>
    setModal({
      open: true,
      mode: 'end-assignment-early',
      context: {
        type: 'assignment',
        assignmentId: assignment.id,
        vehicleId: vehicle.id,
        vehicleName,
        currentDriverId: assignment.driver_id,
        currentDriverName: assignment.driver?.user.full_name || 'Unknown',
      },
    });

  const closeModal = () => setModal({ open: false, mode: null, context: null });

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
        <Button onClick={openAssignDriver}>Assign to Driver</Button>
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
              <Button size="sm" variant="outline" onClick={() => openTransfer(currentAssignment)}>
                Transfer
              </Button>
              <Button size="sm" variant="outline" onClick={() => openUnassign(currentAssignment)}>
                Unassign
              </Button>
              {currentAssignment.assignment_type === 'borrowed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => openExtend(currentAssignment)}>
                    Extend
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEndEarly(currentAssignment)}>
                    End Early
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-3">
            <div>This vehicle is not currently assigned to a driver.</div>
            <Button variant="outline" onClick={openAssignDriver}>
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

      {modal.mode && modal.context && (
        <UnifiedAssignmentModal
          open={modal.open}
          onOpenChange={(open) => !open && closeModal()}
          mode={modal.mode}
          context={modal.context}
          onSuccess={closeModal}
        />
      )}
    </div>
  );
}
