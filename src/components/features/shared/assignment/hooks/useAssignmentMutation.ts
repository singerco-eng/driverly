import { useCallback, useMemo } from 'react';
import {
  useAssignVehicle,
  useTransferVehicle,
  useUnassignVehicle,
  useExtendAssignment,
  useEndAssignmentEarly,
} from '@/hooks/useVehicleAssignments';
import {
  useAssignDriverToLocation,
  useAssignVehicleToLocation,
  useAssignBrokerToLocation,
} from '@/hooks/useLocations';
import { useAssignDriverToBroker } from '@/hooks/useBrokers';
import { useAuth } from '@/contexts/AuthContext';
import type { AssignmentMode, SourceContext, AssignmentFormState } from '../types';

interface MutationResult {
  mutate: (state: AssignmentFormState) => Promise<void>;
  isPending: boolean;
}

export function useAssignmentMutation(
  mode: AssignmentMode,
  context: SourceContext
): MutationResult {
  const { profile } = useAuth();

  const assignVehicle = useAssignVehicle();
  const transferVehicle = useTransferVehicle();
  const unassignVehicle = useUnassignVehicle();
  const extendAssignment = useExtendAssignment();
  const endAssignmentEarly = useEndAssignmentEarly();
  const assignDriverToLocation = useAssignDriverToLocation();
  const assignVehicleToLocation = useAssignVehicleToLocation();
  const assignBrokerToLocation = useAssignBrokerToLocation();
  const assignDriverToBroker = useAssignDriverToBroker();

  const mutate = useCallback(
    async (state: AssignmentFormState) => {
      switch (mode) {
        case 'assign-driver-to-vehicle':
          if (context.type !== 'vehicle') throw new Error('Invalid context');
          await assignVehicle.mutateAsync({
            vehicle_id: context.vehicleId,
            driver_id: state.selectedIds[0],
            assignment_type: state.assignmentType,
            is_primary: state.isPrimary,
            starts_at: state.startsAt?.toISOString(),
            ends_at:
              state.assignmentType === 'borrowed' && state.endsAt
                ? state.endsAt.toISOString()
                : undefined,
          });
          break;
        case 'assign-vehicle-to-driver':
          if (context.type !== 'driver') throw new Error('Invalid context');
          await assignVehicle.mutateAsync({
            vehicle_id: state.selectedIds[0],
            driver_id: context.driverId,
            assignment_type: state.assignmentType,
            is_primary: state.isPrimary,
            starts_at: state.startsAt?.toISOString(),
            ends_at:
              state.assignmentType === 'borrowed' && state.endsAt
                ? state.endsAt.toISOString()
                : undefined,
          });
          break;
        case 'transfer-vehicle':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await transferVehicle.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              to_driver_id: state.selectedIds[0],
              reason: state.reason,
              notes: state.notes || undefined,
              is_primary: state.isPrimary,
            },
          });
          break;
        case 'unassign-vehicle':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await unassignVehicle.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              reason: state.reason,
              notes: state.notes || undefined,
            },
          });
          break;
        case 'extend-assignment':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          if (!state.newEndDate) throw new Error('New end date required');
          await extendAssignment.mutateAsync({
            assignmentId: context.assignmentId,
            data: {
              new_ends_at: state.newEndDate.toISOString(),
              reason: state.notes || undefined,
            },
          });
          break;
        case 'end-assignment-early':
          if (context.type !== 'assignment') throw new Error('Invalid context');
          await endAssignmentEarly.mutateAsync({
            assignmentId: context.assignmentId,
            reason: state.reason,
          });
          break;
        case 'assign-driver-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          await assignDriverToLocation.mutateAsync({
            driverId: state.selectedIds[0],
            locationId: context.locationId,
          });
          break;
        case 'assign-vehicle-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          await assignVehicleToLocation.mutateAsync({
            vehicleId: state.selectedIds[0],
            locationId: context.locationId,
          });
          break;
        case 'assign-broker-to-location':
          if (context.type !== 'location') throw new Error('Invalid context');
          if (!profile?.company_id) throw new Error('Company ID required');
          await assignBrokerToLocation.mutateAsync({
            locationId: context.locationId,
            brokerId: state.selectedIds[0],
            companyId: profile.company_id,
          });
          break;
        case 'assign-drivers-to-broker':
          if (context.type !== 'broker') throw new Error('Invalid context');
          await Promise.all(
            state.selectedIds.map((driverId) =>
              assignDriverToBroker.mutateAsync({
                driverId,
                brokerId: context.broker.id,
              })
            )
          );
          break;
        default:
          throw new Error(`Unknown mode: ${mode}`);
      }
    },
    [
      mode,
      context,
      profile?.company_id,
      assignVehicle,
      transferVehicle,
      unassignVehicle,
      extendAssignment,
      endAssignmentEarly,
      assignDriverToLocation,
      assignVehicleToLocation,
      assignBrokerToLocation,
      assignDriverToBroker,
    ]
  );

  const isPending = useMemo(
    () =>
      assignVehicle.isPending ||
      transferVehicle.isPending ||
      unassignVehicle.isPending ||
      extendAssignment.isPending ||
      endAssignmentEarly.isPending ||
      assignDriverToLocation.isPending ||
      assignVehicleToLocation.isPending ||
      assignBrokerToLocation.isPending ||
      assignDriverToBroker.isPending,
    [
      assignVehicle.isPending,
      transferVehicle.isPending,
      unassignVehicle.isPending,
      extendAssignment.isPending,
      endAssignmentEarly.isPending,
      assignDriverToLocation.isPending,
      assignVehicleToLocation.isPending,
      assignBrokerToLocation.isPending,
      assignDriverToBroker.isPending,
    ]
  );

  return { mutate, isPending };
}
