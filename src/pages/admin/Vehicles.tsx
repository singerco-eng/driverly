import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Eye, Plus, LayoutGrid, List } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { vehicleStatusConfig, credentialStatusConfig } from '@/lib/status-configs';
import * as credentialService from '@/services/credentials';
import type { VehicleFilters, VehicleOwnership, VehicleStatus, VehicleType, VehicleWithAssignments } from '@/types/vehicle';
import { CreateVehicleModal } from '@/components/features/admin/CreateVehicleModal';
import { AdminVehicleCard, AdminVehicleCardAction } from '@/components/features/admin/VehicleCard';
import { EditVehicleModal } from '@/components/features/admin/EditVehicleModal';

// Compute global credential status for a vehicle
// Priority: expired > expiring > missing > grace_period (due soon) > pending > valid
function computeGlobalCredentialStatus(credentials: Awaited<ReturnType<typeof credentialService.getVehicleCredentials>>) {
  const requiredGlobal = credentials.filter(
    (c) =>
      c.credentialType &&
      c.credentialType.requirement === 'required' &&
      c.credentialType.scope === 'global',
  );
  
  if (requiredGlobal.length === 0) {
    return { status: 'valid' as const, missing: 0, total: 0 };
  }

  const expired = requiredGlobal.filter((c) => c.displayStatus === 'expired');
  const expiring = requiredGlobal.filter((c) => c.displayStatus === 'expiring');
  const missing = requiredGlobal.filter((c) => 
    ['not_submitted', 'rejected', 'missing'].includes(c.displayStatus)
  );
  const gracePeriod = requiredGlobal.filter((c) => c.displayStatus === 'grace_period');
  const pending = requiredGlobal.filter((c) => 
    ['pending_review', 'awaiting', 'awaiting_verification'].includes(c.displayStatus)
  );

  if (expired.length > 0) {
    return { status: 'expired' as const, missing: expired.length, total: requiredGlobal.length };
  }
  if (expiring.length > 0) {
    return { status: 'expiring' as const, missing: 0, total: requiredGlobal.length };
  }
  if (missing.length > 0) {
    return { status: 'missing' as const, missing: missing.length, total: requiredGlobal.length };
  }
  if (gracePeriod.length > 0) {
    return { status: 'grace_period' as const, missing: gracePeriod.length, total: requiredGlobal.length };
  }
  if (pending.length > 0) {
    return { status: 'pending' as const, missing: 0, total: requiredGlobal.length };
  }
  return { status: 'valid' as const, missing: 0, total: requiredGlobal.length };
}

type VehicleCredentialStatus = ReturnType<typeof computeGlobalCredentialStatus>;

interface VehicleWithCredentialStatus extends VehicleWithAssignments {
  credentialStatus?: VehicleCredentialStatus;
}

export default function VehiclesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithAssignments | null>(null);
  const { data: vehicles, isLoading } = useVehicles(filters);

  // Fetch credentials for all vehicles in parallel
  const credentialQueries = useQueries({
    queries: (vehicles || []).map((vehicle) => ({
      queryKey: ['vehicle-credentials', vehicle.id],
      queryFn: () => credentialService.getVehicleCredentials(vehicle.id),
      enabled: !!vehicle.id,
    })),
  });

  // Combine vehicles with their credential status
  const vehiclesWithStatus = useMemo<VehicleWithCredentialStatus[]>(() => {
    return (vehicles || []).map((vehicle, index) => {
      const credentials = credentialQueries[index]?.data || [];
      const credentialStatus = computeGlobalCredentialStatus(credentials);
      return {
        ...vehicle,
        credentialStatus,
      };
    });
  }, [vehicles, credentialQueries]);

  const handleCardAction = (action: AdminVehicleCardAction, vehicle: VehicleWithAssignments) => {
    if (action === 'view') {
      navigate(`/admin/vehicles/${vehicle.id}`);
    } else if (action === 'edit') {
      setEditingVehicle(vehicle);
    } else if (action === 'assign') {
      navigate(`/admin/vehicles/${vehicle.id}?tab=assignments`);
    }
  };

  const statusFilter = (filters.status ?? 'all') as VehicleStatus | 'all';
  const typeFilter = (filters.vehicleType ?? 'all') as VehicleType | 'all';
  const ownershipFilter = (filters.ownership ?? 'all') as VehicleOwnership | 'all';

  const sortedVehicles = useMemo(() => {
    return [...vehiclesWithStatus].sort((a, b) => a.ownership.localeCompare(b.ownership));
  }, [vehiclesWithStatus]);

  const vehicleCount = vehicles?.length ?? 0;

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
                  <h1 className="text-xl font-bold">Vehicles</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage vehicles · {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'}
                  </p>
                </div>

                {/* Center: view toggle */}
                <div className="flex items-center justify-center">
                  {viewToggle}
                </div>

                {/* Right: action button */}
                <div className="flex-1 flex justify-end">
                  {isAdmin && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
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
                searchPlaceholder="Search by make, model, plate, or fleet #..."
                filters={[
                  {
                    value: statusFilter,
                    onValueChange: (value) =>
                      setFilters((prev) => ({ ...prev, status: value as VehicleStatus | 'all' })),
                    label: 'Status',
                    placeholder: 'All Status',
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'retired', label: 'Retired' },
                    ],
                  },
                  {
                    value: typeFilter,
                    onValueChange: (value) =>
                      setFilters((prev) => ({ ...prev, vehicleType: value as VehicleType | 'all' })),
                    label: 'Type',
                    placeholder: 'All Types',
                    options: [
                      { value: 'all', label: 'All Types' },
                      { value: 'sedan', label: 'Sedan' },
                      { value: 'suv', label: 'SUV' },
                      { value: 'minivan', label: 'Minivan' },
                      { value: 'van', label: 'Van' },
                      { value: 'wheelchair_van', label: 'Wheelchair Van' },
                      { value: 'stretcher_van', label: 'Stretcher Van' },
                    ],
                  },
                  {
                    value: ownershipFilter,
                    onValueChange: (value) =>
                      setFilters((prev) => ({ ...prev, ownership: value as VehicleOwnership | 'all' })),
                    label: 'Ownership',
                    placeholder: 'All Ownership',
                    options: [
                      { value: 'all', label: 'All Ownership' },
                      { value: 'company', label: 'Company' },
                      { value: 'driver', label: 'Driver' },
                    ],
                  },
                ]}
              />

              {/* Table view */}
              <TabsContent value="table" className="mt-0">
                <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={6}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Credentials</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Ownership</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedVehicles.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <Car className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No vehicles found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedVehicles.map((vehicle, index) => {
                          const credentialQuery = credentialQueries[index];
                          const isCredentialLoading = credentialQuery?.isLoading;
                          const credStatus = vehicle.credentialStatus;
                          
                          return (
                          <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                              <div className="font-medium">
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.license_plate}
                                {vehicle.fleet_number && ` • Fleet #${vehicle.fleet_number}`}
                              </div>
                            </TableCell>
                            <TableCell onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                              <Badge variant={vehicleStatusConfig[vehicle.status].variant}>
                                {vehicleStatusConfig[vehicle.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                              {isCredentialLoading ? (
                                <Skeleton className="h-5 w-20" />
                              ) : !credStatus || credStatus.total === 0 ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : credStatus.status === 'valid' ? (
                                <Badge variant={credentialStatusConfig.approved.variant}>{credentialStatusConfig.approved.label}</Badge>
                              ) : credStatus.status === 'expiring' ? (
                                <Badge variant={credentialStatusConfig.expiring.variant}>{credentialStatusConfig.expiring.label}</Badge>
                              ) : credStatus.status === 'expired' ? (
                                <Badge variant={credentialStatusConfig.expired.variant}>{credentialStatusConfig.expired.label}</Badge>
                              ) : credStatus.status === 'missing' ? (
                                <Badge variant={credentialStatusConfig.missing.variant}>{credentialStatusConfig.missing.label}</Badge>
                              ) : credStatus.status === 'grace_period' ? (
                                <Badge variant={credentialStatusConfig.grace_period.variant}>{credentialStatusConfig.grace_period.label}</Badge>
                              ) : (
                                <Badge variant={credentialStatusConfig.pending_review.variant}>{credentialStatusConfig.pending_review.label}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="capitalize" onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                              {vehicle.vehicle_type.replace('_', ' ')}
                            </TableCell>
                            <TableCell onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                              <span className="capitalize">{vehicle.ownership}</span>
                              {vehicle.owner?.user?.full_name && (
                                <span className="text-muted-foreground text-sm ml-1">
                                  ({vehicle.owner.user.full_name})
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </EnhancedTable>
              </TabsContent>

              {/* Cards view */}
              <TabsContent value="cards" className="mt-0">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[...Array(6)].map((_, i) => (
                      <Skeleton key={i} className="h-48 rounded-lg" />
                    ))}
                  </div>
                ) : sortedVehicles.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
                    <p className="text-muted-foreground">
                      {filters.search ? 'Try adjusting your search or filters.' : 'Vehicles will appear here.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {sortedVehicles.map((vehicle) => (
                      <AdminVehicleCard key={vehicle.id} vehicle={vehicle} onAction={handleCardAction} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <CreateVehicleModal open={createOpen} onOpenChange={setCreateOpen} />
      {editingVehicle && (
        <EditVehicleModal
          open={!!editingVehicle}
          onOpenChange={() => setEditingVehicle(null)}
          vehicle={editingVehicle}
        />
      )}
    </>
  );
}
