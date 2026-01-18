import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Car, Plus } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import type { VehicleFilters, VehicleOwnership, VehicleStatus, VehicleType } from '@/types/vehicle';
import { CreateVehicleModal } from '@/components/features/admin/CreateVehicleModal';

const statusStyles: Record<VehicleStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  retired: 'bg-red-500/20 text-red-600 border-red-500/30',
};

export default function VehiclesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const { data: vehicles, isLoading } = useVehicles(filters);

  const statusFilter = (filters.status ?? 'all') as VehicleStatus | 'all';
  const typeFilter = (filters.vehicleType ?? 'all') as VehicleType | 'all';
  const ownershipFilter = (filters.ownership ?? 'all') as VehicleOwnership | 'all';

  const sortedVehicles = useMemo(() => {
    return [...(vehicles ?? [])].sort((a, b) => a.ownership.localeCompare(b.ownership));
  }, [vehicles]);

  const description = useMemo(() => {
    const count = vehicles?.length ?? 0;
    return `Manage vehicles · ${count} ${count === 1 ? 'vehicle' : 'vehicles'}`;
  }, [vehicles?.length]);

  return (
    <>
      <EnhancedDataView
        title="Vehicles"
        description={description}
        actionLabel={isAdmin ? 'Add Vehicle' : undefined}
        actionIcon={<Plus className="w-4 h-4" />}
        onActionClick={isAdmin ? () => setCreateOpen(true) : undefined}
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
        tableProps={{
          data: sortedVehicles,
          loading: isLoading,
          children: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Ownership</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Car className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No vehicles found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}
                    >
                      <TableCell>
                        <div className="font-medium">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.license_plate}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[vehicle.status]}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize">
                        {vehicle.vehicle_type.replace('_', ' ')}
                      </TableCell>
                      <TableCell className="capitalize">{vehicle.ownership}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: sortedVehicles,
          loading: isLoading,
          emptyState: (
            <Card className="p-12 text-center">
              <Car className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
              <p className="text-muted-foreground">
                {filters.search ? 'Try adjusting your search or filters.' : 'Vehicles will appear here.'}
              </p>
            </Card>
          ),
          renderCard: (vehicle, index) => {
            const prev = sortedVehicles[index - 1];
            const showGroupLabel = !prev || prev.ownership !== vehicle.ownership;
            return (
              <div key={vehicle.id} className="space-y-3">
                {showGroupLabel && (
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {vehicle.ownership === 'company' ? 'Company-Owned' : 'Driver-Owned'}
                  </div>
                )}
                <Card
                  className="cursor-pointer hover:shadow-soft transition-all"
                  onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {vehicle.make} {vehicle.model} {vehicle.year}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{vehicle.license_plate}</p>
                      </div>
                      <Badge variant="outline" className={statusStyles[vehicle.status]}>
                        {vehicle.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">
                      {vehicle.vehicle_type.replace('_', ' ')}
                    </Badge>
                    <span className="capitalize">{vehicle.ownership} owned</span>
                  </CardContent>
                </Card>
              </div>
            );
          },
        }}
      />

      <CreateVehicleModal open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
