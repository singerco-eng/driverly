import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AssignmentStatus, Broker, VehicleType } from '@/types/broker';
import type { CredentialType, CredentialWithDisplayStatus } from '@/types/credential';
import type { DriverVehicle } from '@/types/driverVehicle';
import { getSourceTypeLabel } from '@/types/broker';
import { credentialStatusVariant } from '@/lib/status-styles';
import { isCredentialLiveForDrivers } from '@/lib/credentialRequirements';

type EmploymentType = 'w2' | '1099';

const vehicleTypeLabels: Record<VehicleType, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  minivan: 'Minivan',
  wheelchair_van: 'Wheelchair Van',
  stretcher_van: 'Stretcher Van',
};

type JoinMode = 'auto_signup' | 'request' | 'admin_only' | 'not_eligible';

interface TripSourceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broker: Broker | null;
  driverState?: string | null;
  driverEmploymentType?: EmploymentType | null;
  vehicles: DriverVehicle[];
  vehicleCredentialsById: Record<string, CredentialWithDisplayStatus[]>;
  driverCredentials: CredentialWithDisplayStatus[];
  credentialTypes: CredentialType[];
  assignmentStatus?: AssignmentStatus;
  joinInfo?: { can_join: boolean; join_mode: JoinMode; reason: string };
  onRequest?: () => void;
  onJoin?: () => void;
  isSubmitting?: boolean;
}

export function TripSourceDetailsModal({
  open,
  onOpenChange,
  broker,
  driverState,
  driverEmploymentType,
  vehicles,
  vehicleCredentialsById,
  driverCredentials,
  credentialTypes,
  assignmentStatus,
  joinInfo,
  onRequest,
  onJoin,
  isSubmitting,
}: TripSourceDetailsModalProps) {
  const isAssigned = assignmentStatus === 'assigned';
  const isPending = assignmentStatus === 'pending';
  const joinMode = joinInfo?.join_mode;

  const matchesEmploymentType = (type: CredentialType['employment_type']) => {
    if (!driverEmploymentType) return true;
    if (type === 'both') return true;
    if (type === 'w2_only') return driverEmploymentType === 'w2';
    if (type === '1099_only') return driverEmploymentType === '1099';
    return true;
  };

  const requiredDriverCredentials = useMemo(() => {
    if (!broker) return [];
    return driverCredentials.filter(
      (credential) =>
        credential.credentialType.category === 'driver' &&
        credential.credentialType.requirement === 'required' &&
        isCredentialLiveForDrivers(credential.credentialType) &&
        matchesEmploymentType(credential.credentialType.employment_type) &&
        (credential.credentialType.scope === 'global' ||
          credential.credentialType.broker?.id === broker.id),
    );
  }, [broker, driverCredentials, driverEmploymentType]);

  const requiredVehicleTypes = useMemo(() => {
    if (!broker) return [];
    return credentialTypes.filter(
      (type) =>
        type.category === 'vehicle' &&
        type.requirement === 'required' &&
        isCredentialLiveForDrivers(type) &&
        matchesEmploymentType(type.employment_type) &&
        (type.scope === 'global' || type.broker_id === broker.id),
    );
  }, [broker, credentialTypes, driverEmploymentType]);

  const brokerCredentialTypes = useMemo(() => {
    if (!broker) return [];
    return credentialTypes.filter(
      (type) =>
        type.requirement === 'required' &&
        isCredentialLiveForDrivers(type) &&
        matchesEmploymentType(type.employment_type) &&
        type.scope === 'broker' &&
        type.broker_id === broker.id,
    );
  }, [broker, credentialTypes, driverEmploymentType]);

  const serviceAreaEligible = useMemo(() => {
    if (!broker) return false;
    if (broker.service_states.length === 0) return true;
    if (!driverState) return false;
    return broker.service_states.includes(driverState);
  }, [broker, driverState]);

  if (!broker) return null;

  const vehicleCards = vehicles.map((vehicle) => {
    const vehicleCreds = vehicleCredentialsById[vehicle.id] || [];
    const missingVehicleCreds = requiredVehicleTypes.filter((type) => {
      if (type.vehicle_types && type.vehicle_types.length > 0 && !type.vehicle_types.includes(vehicle.vehicle_type)) {
        return false;
      }
      const match = vehicleCreds.find((cred) => cred.credentialType.id === type.id);
      return !match || match.displayStatus !== 'approved';
    });
    const typeAccepted = broker.accepted_vehicle_types.includes(vehicle.vehicle_type);
    const isActive = vehicle.status === 'active';
    const eligible = typeAccepted && isActive && missingVehicleCreds.length === 0;
    const reason = !typeAccepted
      ? 'Vehicle type not accepted'
      : !isActive
        ? 'Vehicle is inactive'
        : missingVehicleCreds.length
          ? `${missingVehicleCreds.length} credential${missingVehicleCreds.length === 1 ? '' : 's'} missing`
          : 'Eligible';

    return {
      id: vehicle.id,
      label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      vehicleType: vehicleTypeLabels[vehicle.vehicle_type] || vehicle.vehicle_type,
      eligible,
      reason,
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{broker.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">{getSourceTypeLabel(broker.source_type)}</p>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-medium mb-2">Service Area</h4>
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-sm">
                {broker.service_states.length ? broker.service_states.join(', ') : 'All states'}
              </p>
              {driverState && (
                <div className="flex items-center gap-2 text-sm">
                  {serviceAreaEligible ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-success">You are in the service area</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="text-warning">
                        Not in service area (your state: {driverState})
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Accepted Vehicles</h4>
            <div className="flex flex-wrap gap-2">
              {broker.accepted_vehicle_types.length ? (
                broker.accepted_vehicle_types.map((type) => (
                  <Badge key={type} variant="secondary">
                    {vehicleTypeLabels[type] || type}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No vehicle requirements</span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Your Vehicles</h4>
            <div className="grid gap-3">
              {vehicleCards.length === 0 ? (
                <p className="text-sm text-muted-foreground">No vehicles on file.</p>
              ) : (
                vehicleCards.map((vehicle) => (
                  <div key={vehicle.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{vehicle.label}</div>
                        <div className="text-xs text-muted-foreground">{vehicle.vehicleType}</div>
                      </div>
                      <Badge variant={vehicle.eligible ? 'default' : 'secondary'}>
                        {vehicle.eligible ? 'Eligible' : 'Not Eligible'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{vehicle.reason}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">
              {isAssigned || isPending ? 'Required Credentials' : 'Additional Credentials'}
            </h4>
            {isAssigned || isPending ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Driver Credentials</p>
                  <div className="grid gap-2">
                    {requiredDriverCredentials.map((credential) => (
                      <div key={credential.credentialType.id} className="flex items-center justify-between border rounded-md p-2">
                        <span className="text-sm">{credential.credentialType.name}</span>
                        <Badge variant={credentialStatusVariant[credential.displayStatus] || 'outline'}>
                          {credential.displayStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                    {requiredDriverCredentials.length === 0 && (
                      <p className="text-sm text-muted-foreground">No driver credentials configured.</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Vehicle Credentials</p>
                  <div className="grid gap-2">
                    {requiredVehicleTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No vehicle credentials required.</p>
                    ) : (
                      requiredVehicleTypes.map((type) => (
                        <div key={type.id} className="flex items-center justify-between border rounded-md p-2">
                          <span className="text-sm">{type.name}</span>
                          <Badge variant="outline">Required</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {brokerCredentialTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No additional credentials are required to join.
                  </p>
                ) : (
                  brokerCredentialTypes.map((type) => (
                    <div key={type.id} className="flex items-center justify-between border rounded-md p-2">
                      <span className="text-sm">{type.name}</span>
                      <Badge variant="outline">Required</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          {!(isAssigned || isPending) && joinMode === 'request' && onRequest && (
            <Button onClick={onRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Requesting...' : 'Request to Join'}
            </Button>
          )}
          {!(isAssigned || isPending) && joinMode === 'auto_signup' && onJoin && (
            <Button onClick={onJoin} disabled={isSubmitting}>
              {isSubmitting ? 'Joining...' : 'Join Now'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

