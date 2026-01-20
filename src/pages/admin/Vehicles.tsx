import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Car, Circle, Eye, Plus } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import type { VehicleFilters, VehicleOwnership, VehicleStatus, VehicleType, VehicleWithAssignments } from '@/types/vehicle';
import { CreateVehicleModal } from '@/components/features/admin/CreateVehicleModal';
import { AdminVehicleCard, AdminVehicleCardAction } from '@/components/features/admin/VehicleCard';
import { EditVehicleModal } from '@/components/features/admin/EditVehicleModal';

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
  const [editingVehicle, setEditingVehicle] = useState<VehicleWithAssignments | null>(null);
  const { data: vehicles, isLoading } = useVehicles(filters);

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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Car className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No vehicles found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedVehicles.map((vehicle) => (
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
                        <Badge variant="outline" className={statusStyles[vehicle.status]}>
                          <Circle className="h-2 w-2 mr-1" />
                          {vehicle.status}
                        </Badge>
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
          renderCard: (vehicle) => (
            <AdminVehicleCard key={vehicle.id} vehicle={vehicle} onAction={handleCardAction} />
          ),
        }}
      />

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
