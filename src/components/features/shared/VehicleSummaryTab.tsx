import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { ActionAlertBanner, type ActionAlertItem } from '@/components/ui/action-alert-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Building2,
  Camera,
  Car,
  CheckCircle,
  FileCheck,
  Gauge,
  MapPin,
  Users,
} from 'lucide-react';
import { credentialStatusConfig } from '@/lib/status-configs';
import { computeCredentialStatus, getCredentialStatusConfigKey, getQuickStatStatus } from '@/lib/credentialRequirements';
import { useLocations, useAssignVehicleToLocation } from '@/hooks/useLocations';
import { useUpdateVehicleMileage } from '@/hooks/useVehicles';
import { useBrokers } from '@/hooks/useBrokers';
import { useVehicleCredentials } from '@/hooks/useCredentials';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import type { VehicleWithAssignments } from '@/types/vehicle';
import type { Driver } from '@/types/driver';
import type { DriverVehicleWithStatus } from '@/types/driverVehicle';

type VehicleSummaryVehicle = VehicleWithAssignments | DriverVehicleWithStatus;

export interface VehicleSummaryTabProps {
  vehicle: VehicleSummaryVehicle;
  companyId: string;
  driver?: Driver | null;
  canEdit?: boolean;
  isDriverView?: boolean;
  onUpdatePhotos?: () => void;
}

export function VehicleSummaryTab({
  vehicle,
  companyId,
  driver,
  canEdit = true,
  isDriverView = false,
  onUpdatePhotos,
}: VehicleSummaryTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canEditPhotos = isDriverView ? true : canEdit;

  const { data: locations } = useLocations(companyId);
  const assignToLocation = useAssignVehicleToLocation();
  const updateMileage = useUpdateVehicleMileage();
  const activeLocations = (locations ?? []).filter((location) => location.status === 'active');

  // Always fetch credentials to compute proper status display
  const { data: credentials = [] } = useVehicleCredentials(vehicle.id);
  const { data: brokers = [] } = useBrokers(isDriverView ? companyId : undefined);

  const [mileageValue, setMileageValue] = useState(
    vehicle.mileage !== null ? String(vehicle.mileage) : ''
  );
  const isCompanyVehicle = vehicle.ownership === 'company';

  const [exteriorUrl, setExteriorUrl] = useState<string | null>(null);
  const [interiorUrl, setInteriorUrl] = useState<string | null>(null);
  const [liftUrl, setLiftUrl] = useState<string | null>(null);
  const [photosLoading, setPhotosLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setPhotosLoading(true);
    const loadPhotos = async () => {
      const [exterior, interior, lift] = await Promise.all([
        vehicle.exterior_photo_url ? resolveVehiclePhotoUrl(vehicle.exterior_photo_url) : null,
        vehicle.interior_photo_url ? resolveVehiclePhotoUrl(vehicle.interior_photo_url) : null,
        vehicle.wheelchair_lift_photo_url
          ? resolveVehiclePhotoUrl(vehicle.wheelchair_lift_photo_url)
          : null,
      ]);
      if (mounted) {
        setExteriorUrl(exterior);
        setInteriorUrl(interior);
        setLiftUrl(lift);
        setPhotosLoading(false);
      }
    };
    void loadPhotos();
    return () => {
      mounted = false;
    };
  }, [vehicle.exterior_photo_url, vehicle.interior_photo_url, vehicle.wheelchair_lift_photo_url]);

  const assignmentInfo = useMemo(() => {
    if ('assignments' in vehicle) {
      const primary = vehicle.assignments?.find((assignment) => assignment.is_primary);
      const assignment = primary ?? vehicle.assignments?.[0];
      return {
        label: assignment
          ? assignment.is_primary
            ? 'Primary'
            : 'Secondary'
          : 'Unassigned',
        description: assignment?.driver?.user?.full_name,
        hasAssignment: !!assignment,
      };
    }
    const assignment = vehicle.assignment ?? null;
    return {
      label: assignment
        ? assignment.is_primary
          ? 'Primary'
          : 'Secondary'
        : 'Unassigned',
      description: undefined,
      hasAssignment: !!assignment,
    };
  }, [vehicle]);

  // Compute credential status for alert display
  const computedCredStatus = useMemo(() => computeCredentialStatus(credentials), [credentials]);

  // Build alert items for credential issues
  const alertItems = useMemo<ActionAlertItem[]>(() => {
    const items: ActionAlertItem[] = [];
    
    if (computedCredStatus.total > 0 && computedCredStatus.status !== 'valid') {
      const configKey = getCredentialStatusConfigKey(computedCredStatus.status);
      const config = credentialStatusConfig[configKey];
      const severity = ['expired', 'missing'].includes(computedCredStatus.status) ? 'error' : 'warning';
      
      items.push({
        id: 'credentials-issue',
        message: `${computedCredStatus.count} credential${computedCredStatus.count > 1 ? 's' : ''} ${config.label.toLowerCase()}`,
        severity: severity as 'error' | 'warning',
      });
    }
    
    if (!assignmentInfo.hasAssignment && !isDriverView) {
      items.push({
        id: 'unassigned',
        message: 'Vehicle is not assigned to a driver',
        severity: 'info',
      });
    }
    
    return items;
  }, [assignmentInfo.hasAssignment, computedCredStatus, isDriverView]);

  // Compute credential status from actual credentials using shared utility
  const credentialStatusInfo = useMemo(() => {
    const result = computeCredentialStatus(credentials);
    
    if (result.total === 0) {
      return { label: '—', status: 'neutral' as const };
    }
    
    const configKey = getCredentialStatusConfigKey(result.status);
    const config = credentialStatusConfig[configKey];
    
    return {
      label: config.label,
      status: getQuickStatStatus(result.status),
    };
  }, [credentials]);

  const quickStats = useMemo<QuickStat[]>(() => {
    // Compact stats - removed redundant status (shown in header badge)
    return [
      {
        id: 'assignment',
        label: 'Driver',
        value: assignmentInfo.hasAssignment ? assignmentInfo.description || assignmentInfo.label : 'Unassigned',
        icon: <Users className="h-5 w-5" />,
        status: assignmentInfo.hasAssignment ? 'success' : 'neutral',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: credentialStatusInfo.label,
        icon: <FileCheck className="h-5 w-5" />,
        status: credentialStatusInfo.status,
      },
      {
        id: 'location',
        label: 'Company Location',
        value: activeLocations.find(l => l.id === vehicle.location_id)?.name || 'Unassigned',
        icon: <MapPin className="h-5 w-5" />,
        status: vehicle.location_id ? 'success' : 'neutral',
      },
      {
        id: 'capacity',
        label: 'Capacity',
        value: `${vehicle.seat_capacity} seats`,
        icon: <Car className="h-5 w-5" />,
        status: 'neutral',
        description:
          vehicle.vehicle_type === 'wheelchair_van'
            ? `${vehicle.wheelchair_capacity} WC`
            : vehicle.vehicle_type === 'stretcher_van'
              ? `${vehicle.stretcher_capacity} stretchers`
              : undefined,
      },
    ];
  }, [activeLocations, assignmentInfo, credentialStatusInfo, vehicle]);

  const eligibility = useMemo(() => {
    if (!isDriverView) return { eligible: [], ineligible: [] };
    const eligible: string[] = [];
    const ineligible: { name: string; reason: string }[] = [];

    brokers
      .filter((broker) => broker.status === 'active' && broker.is_active !== false)
      .forEach((broker) => {
        if (!broker.accepted_employment_types?.includes(driver?.employment_type || '1099')) {
          ineligible.push({ name: broker.name, reason: 'Employment type not accepted' });
          return;
        }
        const acceptedTypes = broker.accepted_vehicle_types as unknown as string[];
        if (acceptedTypes?.length && !acceptedTypes.includes(vehicle.vehicle_type)) {
          ineligible.push({ name: broker.name, reason: 'Vehicle type not accepted' });
          return;
        }
        const required = credentials.filter((credential) => credential.credentialType.requirement === 'required');
        const brokerRequired = required.filter(
          (credential) =>
            credential.credentialType.scope === 'global' ||
            credential.credentialType.broker_id === broker.id
        );
        const missing = brokerRequired.filter((credential) =>
          ['not_submitted', 'rejected', 'expired', 'missing'].includes(credential.displayStatus)
        );
        const pending = brokerRequired.filter((credential) =>
          ['pending_review', 'awaiting', 'awaiting_verification'].includes(credential.displayStatus)
        );
        if (missing.length > 0) {
          ineligible.push({ name: broker.name, reason: 'Missing required credentials' });
          return;
        }
        if (pending.length > 0) {
          ineligible.push({ name: broker.name, reason: 'Credentials pending review' });
          return;
        }
        eligible.push(broker.name);
      });

    return { eligible, ineligible };
  }, [brokers, credentials, driver?.employment_type, isDriverView, vehicle.vehicle_type]);

  const handleUpdateMileage = async () => {
    const mileage = Number(mileageValue);
    if (Number.isNaN(mileage)) return;
    await updateMileage.mutateAsync({ vehicleId: vehicle.id, mileage });
  };

  return (
    <div className="space-y-6">
      {/* Alert banner for actionable issues */}
      <ActionAlertBanner items={alertItems} />
      
      {/* Compact stats bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Consolidated Vehicle Details section */}
      <InfoSection
        id="vehicle-details"
        icon={<Car className="h-4 w-4" />}
        title="Vehicle Details"
        description="Specifications and identification"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Make', value: vehicle.make },
            { label: 'Model', value: vehicle.model },
            { label: 'Year', value: vehicle.year },
            { label: 'Color', value: vehicle.color },
            { label: 'Type', value: vehicle.vehicle_type.replace('_', ' ') },
            { label: 'Fleet #', value: vehicle.fleet_number, hidden: !vehicle.fleet_number },
            { label: 'License Plate', value: vehicle.license_plate },
            { label: 'State', value: vehicle.license_state },
            { label: 'VIN', value: vehicle.vin },
            { label: 'Seat Capacity', value: vehicle.seat_capacity },
            {
              label: 'Wheelchair',
              value: vehicle.wheelchair_capacity,
              hidden: vehicle.vehicle_type !== 'wheelchair_van',
            },
            {
              label: 'Stretcher',
              value: vehicle.stretcher_capacity,
              hidden: vehicle.vehicle_type !== 'stretcher_van',
            },
          ]}
          columns={4}
          compact
        />
      </InfoSection>

      <InfoSection
        id="photos"
        icon={<Camera className="h-4 w-4" />}
        title="Photos"
        description="Vehicle exterior, interior, and equipment photos"
        onEdit={onUpdatePhotos}
        canEdit={canEditPhotos}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Exterior', url: exteriorUrl },
            { label: 'Interior', url: interiorUrl },
            ...(vehicle.vehicle_type === 'wheelchair_van' ? [{ label: 'Lift', url: liftUrl }] : []),
          ].map((photo) => (
            <div key={photo.label} className="space-y-2">
              <p className="text-xs text-muted-foreground">{photo.label}</p>
              <div className="h-32 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden">
                {photosLoading ? (
                  <Skeleton className="h-full w-full" />
                ) : photo.url ? (
                  <img src={photo.url} alt={photo.label} className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </div>
      </InfoSection>

      {isAdmin && !isDriverView && (
        <InfoSection
          id="ownership"
          icon={<Building2 className="h-4 w-4" />}
          title="Ownership & Assignment"
          description="Ownership type and location assignment"
          canEdit={false}
        >
          <div className="space-y-4">
            <PropertyGrid
              properties={[
                {
                  label: 'Ownership Type',
                  value: vehicle.ownership.charAt(0).toUpperCase() + vehicle.ownership.slice(1),
                },
                {
                  label: 'Owner',
                  value: 'owner' in vehicle ? vehicle.owner?.user?.full_name : null,
                  hidden: vehicle.ownership === 'company',
                },
              ]}
              columns={2}
            />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Location Assignment</p>
              <Select
                value={vehicle.location_id || 'unassigned'}
                onValueChange={(value) => {
                  assignToLocation.mutate({
                    vehicleId: vehicle.id,
                    locationId: value === 'unassigned' ? null : value,
                  });
                }}
                disabled={!canEdit}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {activeLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name} {location.code ? `(${location.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </InfoSection>
      )}

      {isCompanyVehicle && isAdmin && !isDriverView && (
        <InfoSection
          id="mileage"
          icon={<Gauge className="h-4 w-4" />}
          title="Mileage"
          description="Current odometer reading"
          canEdit={false}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={mileageValue}
              onChange={(event) => setMileageValue(event.target.value)}
              placeholder="Enter mileage"
              className="sm:max-w-[200px]"
              disabled={!canEdit}
            />
            <Button
              onClick={handleUpdateMileage}
              disabled={!canEdit || updateMileage.isPending || !mileageValue.trim()}
              size="sm"
            >
              {updateMileage.isPending ? 'Updating...' : 'Update'}
            </Button>
            {vehicle.mileage_updated_at && (
              <span className="text-xs text-muted-foreground">
                Last updated: {new Date(vehicle.mileage_updated_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </InfoSection>
      )}

      {isDriverView && (
        <InfoSection
          id="broker-eligibility"
          icon={<Building2 className="h-4 w-4" />}
          title="Broker Eligibility"
          description="Which trip sources this vehicle qualifies for"
          canEdit={false}
        >
          {eligibility.eligible.length === 0 && eligibility.ineligible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No brokers configured yet.</p>
          ) : (
            <div className="space-y-2">
              {eligibility.eligible.map((name) => (
                <div key={name} className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {name}
                </div>
              ))}
              {eligibility.ineligible.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  {item.name} • {item.reason}
                </div>
              ))}
            </div>
          )}
        </InfoSection>
      )}
    </div>
  );
}
