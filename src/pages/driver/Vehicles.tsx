import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Car, Plus, Shield, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import {
  useAssignedVehicles,
  useOwnedVehicles,
  useSetPrimaryVehicle,
  useSetVehicleActive,
} from '@/hooks/useDriverVehicles';
import { getBrokers } from '@/services/brokers';
import * as credentialService from '@/services/credentials';
import { calculateVehicleCompletion } from '@/lib/vehicleCompletion';
import type { DriverVehicleWithStatus } from '@/types/driverVehicle';
import VehicleCard, { VehicleCardAction } from '@/components/features/driver/VehicleCard';
import AddVehicleWizard from '@/components/features/driver/AddVehicleWizard';
import EditVehicleModal from '@/components/features/driver/EditVehicleModal';
import SetInactiveModal from '@/components/features/driver/SetInactiveModal';
import RetireVehicleModal from '@/components/features/driver/RetireVehicleModal';
import { CannotActivateVehicleModal } from '@/components/features/driver/CannotActivateVehicleModal';

interface VehiclesFilters {
  search?: string;
}

function computeCredentialStatus(credentials: Awaited<ReturnType<typeof credentialService.getVehicleCredentials>>) {
  const required = credentials.filter((c) => c.credentialType.requirement === 'required');
  if (required.length === 0) {
    return { status: 'valid' as const, summary: 'No required credentials' };
  }

  const hasExpired = required.some((c) => c.displayStatus === 'expired');
  const hasExpiring = required.some((c) => c.displayStatus === 'expiring');
  const hasMissing = required.some((c) =>
    ['not_submitted', 'rejected', 'pending_review', 'awaiting'].includes(c.displayStatus),
  );

  if (hasExpired) {
    return { status: 'expired' as const, summary: 'Credentials expired' };
  }
  if (hasExpiring) {
    return { status: 'expiring' as const, summary: 'Credentials expiring soon' };
  }
  if (hasMissing) {
    const remaining = required.filter((c) => c.displayStatus !== 'approved').length;
    return { status: 'missing' as const, summary: `${remaining} credential${remaining !== 1 ? 's' : ''} need attention` };
  }
  return { status: 'valid' as const, summary: 'All credentials valid' };
}

function computeGlobalCredentialMissing(
  credentials: Awaited<ReturnType<typeof credentialService.getVehicleCredentials>>
) {
  const requiredGlobal = credentials.filter(
    (c) => c.credentialType.requirement === 'required' && c.credentialType.scope === 'global'
  );
  if (requiredGlobal.length === 0) {
    return { missing: false, remaining: 0, missingCredentials: [] };
  }
  const missingCredentials = requiredGlobal
    .filter((c) => c.displayStatus !== 'approved')
    .map((c) => ({
      name: c.credentialType.name,
      credentialTypeId: c.credentialType.id,
    }));
  return { missing: missingCredentials.length > 0, remaining: missingCredentials.length, missingCredentials };
}

export default function DriverVehicles() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<VehiclesFilters>({});
  const [showAdd, setShowAdd] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<DriverVehicleWithStatus | null>(null);
  const [inactiveVehicle, setInactiveVehicle] = useState<DriverVehicleWithStatus | null>(null);
  const [retireVehicle, setRetireVehicle] = useState<DriverVehicleWithStatus | null>(null);
  const [cannotActivateVehicle, setCannotActivateVehicle] = useState<DriverVehicleWithStatus | null>(null);

  const { data: driver, isLoading: driverLoading } = useDriverByUserId(user?.id);
  const driverId = driver?.id;
  const is1099 = driver?.employment_type === '1099';

  const { data: ownedVehicles, isLoading: ownedLoading } = useOwnedVehicles(driverId);
  const { data: assignedVehicles, isLoading: assignedLoading } = useAssignedVehicles(driverId);
  const vehicles = is1099 ? ownedVehicles || [] : assignedVehicles || [];

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers', profile?.company_id],
    queryFn: () => getBrokers(profile!.company_id!),
    enabled: !!profile?.company_id,
  });

  const credentialQueries = useQueries({
    queries: vehicles.map((vehicle) => ({
      queryKey: ['vehicle-credentials', vehicle.id],
      queryFn: () => credentialService.getVehicleCredentials(vehicle.id),
      enabled: !!vehicle.id,
    })),
  });

  const setPrimary = useSetPrimaryVehicle();
  const setActive = useSetVehicleActive();

  const vehiclesWithStatus = useMemo<DriverVehicleWithStatus[]>(() => {
    return vehicles.map((vehicle, index) => {
      const credentials = credentialQueries[index]?.data || [];
      const { status, summary } = computeCredentialStatus(credentials);
      const { missing: isUncredentialed, missingCredentials } = computeGlobalCredentialMissing(credentials);

      const eligibleBrokers: string[] = [];
      const ineligibleBrokers: { name: string; reason: string }[] = [];

      brokers
        .filter((broker) => broker.status === 'active' && broker.is_active !== false)
        .forEach((broker) => {
          if (!broker.accepted_employment_types?.includes(driver?.employment_type || '1099')) {
            ineligibleBrokers.push({ name: broker.name, reason: 'Employment type not accepted' });
            return;
          }

          const acceptedTypes = broker.accepted_vehicle_types as unknown as string[];
          if (acceptedTypes?.length && !acceptedTypes.includes(vehicle.vehicle_type)) {
            ineligibleBrokers.push({ name: broker.name, reason: 'Vehicle type not accepted' });
            return;
          }

          const required = credentials.filter((c) => c.credentialType.requirement === 'required');
          const brokerRequired = required.filter(
            (c) => c.credentialType.scope === 'global' || c.credentialType.broker_id === broker.id,
          );
          const missing = brokerRequired.filter((c) => c.displayStatus !== 'approved');

          if (missing.length > 0) {
            ineligibleBrokers.push({ name: broker.name, reason: 'Missing required credentials' });
            return;
          }

          eligibleBrokers.push(broker.name);
        });

      return {
        ...vehicle,
        credentialStatus: status,
        credentialSummary: summary,
        eligibleBrokers,
        ineligibleBrokers,
        isUncredentialed,
        missingCredentials,
      };
    });
  }, [vehicles, credentialQueries, brokers, driver?.employment_type]);

  const filteredVehicles = useMemo(() => {
    if (!filters.search) return vehiclesWithStatus;
    const search = filters.search.toLowerCase();
    return vehiclesWithStatus.filter(
      (vehicle) =>
        vehicle.make.toLowerCase().includes(search) ||
        vehicle.model.toLowerCase().includes(search) ||
        vehicle.license_plate.toLowerCase().includes(search),
    );
  }, [vehiclesWithStatus, filters.search]);

  const handleAction = (action: VehicleCardAction, vehicle: DriverVehicleWithStatus) => {
    if (action === 'view') {
      navigate(`/driver/vehicles/${vehicle.id}`);
      return;
    }
    if (action === 'complete' || action === 'edit') {
      setEditingVehicle(vehicle);
      return;
    }
    if (action === 'set-primary') {
      void setPrimary.mutateAsync({ driverId: driverId!, vehicleId: vehicle.id });
      return;
    }
    if (action === 'set-active') {
      // Check if vehicle is uncredentialed before allowing activation
      if (vehicle.isUncredentialed) {
        setCannotActivateVehicle(vehicle);
        return;
      }
      void setActive.mutateAsync(vehicle.id);
      return;
    }
    if (action === 'set-inactive') {
      setInactiveVehicle(vehicle);
      return;
    }
    if (action === 'retire') {
      setRetireVehicle(vehicle);
    }
  };

  const vehicleCount = filteredVehicles.length;

  if (driverLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!driverId) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Driver Profile Not Found</h3>
        <p className="text-muted-foreground">
          We couldn't find your driver profile. Please contact support.
        </p>
      </Card>
    );
  }

  const loading = is1099 ? ownedLoading : assignedLoading;

  // View toggle in header
  const viewToggle = (
    <TabsList>
      <TabsTrigger value="table" className="gap-1.5">
        <List className="w-4 h-4" />
        Table
      </TabsTrigger>
      <TabsTrigger value="cards" className="gap-1.5">
        <LayoutGrid className="w-4 h-4" />
        Cards
      </TabsTrigger>
    </TabsList>
  );

  return (
    <>
      <div className="min-h-screen bg-background">
        <Tabs defaultValue="table">
          {/* Full-width header */}
          <div className="border-b bg-background">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: title */}
                <div className="flex-1">
                  <h1 className="text-xl font-bold">{is1099 ? 'My Vehicles' : 'My Assigned Vehicles'}</h1>
                  <p className="text-sm text-muted-foreground">
                    {is1099
                      ? `${vehicleCount} vehicle${vehicleCount !== 1 ? 's' : ''}`
                      : `${vehicleCount} assigned vehicle${vehicleCount !== 1 ? 's' : ''}`}
                  </p>
                </div>

                {/* Center: view toggle */}
                <div className="flex items-center justify-center">
                  {viewToggle}
                </div>

                {/* Right: action button */}
                <div className="flex-1 flex justify-end">
                  {is1099 && (
                    <Button onClick={() => setShowAdd(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Filter bar */}
              <FilterBar
                searchValue={filters.search || ''}
                onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                searchPlaceholder="Search vehicles..."
                filters={[]}
              />

              {/* Cards view */}
              <TabsContent value="cards" className="mt-0">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                ) : filteredVehicles.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
                    <p className="text-muted-foreground">
                      {filters.search ? 'Try adjusting your search.' : 'Vehicles will appear here once added.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredVehicles.map((vehicle) => {
                      const completion = calculateVehicleCompletion(vehicle);
                      return (
                        <VehicleCard
                          key={vehicle.id}
                          vehicle={vehicle}
                          completion={completion}
                          readOnly={!is1099}
                          onAction={handleAction}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Table view */}
              <TabsContent value="table" className="mt-0">
                <EnhancedTable loading={loading} skeletonRows={5} skeletonColumns={5}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Plate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Primary</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.length === 0 && !loading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <Car className="w-8 h-8" />
                              <p>No vehicles found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVehicles.map((vehicle) => (
                          <TableRow
                            key={vehicle.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/driver/vehicles/${vehicle.id}`)}
                          >
                            <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
                            <TableCell>{vehicle.vehicle_type.replace('_', ' ')}</TableCell>
                            <TableCell>{vehicle.license_plate}</TableCell>
                            <TableCell>
                              <Badge variant={vehicle.status === 'active' ? 'default' : vehicle.status === 'retired' ? 'destructive' : 'secondary'}>
                                {vehicle.status === 'active' ? 'Active' : vehicle.status === 'retired' ? 'Retired' : 'Inactive'}
                              </Badge>
                            </TableCell>
                            <TableCell>{vehicle.assignment?.is_primary ? 'Yes' : 'No'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </EnhancedTable>
              </TabsContent>

              {/* Helper note for W2 drivers */}
              {!is1099 && (
                <Card className="p-4 text-sm text-muted-foreground">
                  Company vehicles are managed by your administrator. Contact admin if you need changes to your assignment.
                </Card>
              )}
            </div>
          </div>
        </Tabs>
      </div>

      {is1099 && (
        <AddVehicleWizard
          open={showAdd}
          onOpenChange={setShowAdd}
          driverId={driverId}
          companyId={profile?.company_id || ''}
        />
      )}

      {editingVehicle && (
        <EditVehicleModal open={!!editingVehicle} onOpenChange={() => setEditingVehicle(null)} vehicle={editingVehicle} />
      )}

      {inactiveVehicle && (
        <SetInactiveModal
          open={!!inactiveVehicle}
          onOpenChange={() => setInactiveVehicle(null)}
          vehicle={inactiveVehicle}
        />
      )}

      {retireVehicle && (
        <RetireVehicleModal
          open={!!retireVehicle}
          onOpenChange={() => setRetireVehicle(null)}
          vehicle={retireVehicle}
          driverId={driverId}
        />
      )}

      {cannotActivateVehicle && (
        <CannotActivateVehicleModal
          open={!!cannotActivateVehicle}
          onOpenChange={() => setCannotActivateVehicle(null)}
          vehicleId={cannotActivateVehicle.id}
          vehicleName={`${cannotActivateVehicle.year} ${cannotActivateVehicle.make} ${cannotActivateVehicle.model}`}
          missingCredentials={cannotActivateVehicle.missingCredentials || []}
        />
      )}
    </>
  );
}
