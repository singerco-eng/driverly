import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useVehicle, useUpdateVehicleStatus } from '@/hooks/useVehicles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPageHeader } from '@/components/ui/DetailPageHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Archive,
} from 'lucide-react';
import { VehicleOverviewTab } from '@/components/features/admin/VehicleOverviewTab';
import { VehicleDetailsTab } from '@/components/features/admin/VehicleDetailsTab';
import { VehicleAssignmentsTab } from '@/components/features/admin/VehicleAssignmentsTab';
import { VehicleCredentialsTab } from '@/components/features/admin/VehicleCredentialsTab';
import { EditVehicleModal } from '@/components/features/admin/EditVehicleModal';
import { useAuth } from '@/contexts/AuthContext';
import type { VehicleStatus } from '@/types/vehicle';
import { vehicleStatusVariant } from '@/lib/status-styles';

/** Status labels for display */
const statusLabels: Record<VehicleStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  retired: 'Retired',
};

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: vehicle, isLoading, error } = useVehicle(id || '');
  const updateStatus = useUpdateVehicleStatus();
  const [editOpen, setEditOpen] = useState(false);

  const handleStatusChange = (status: VehicleStatus) => {
    if (!id) return;
    updateStatus.mutate({ vehicleId: id, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">Vehicle not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/vehicles')}>
          Back to Vehicles
        </Button>
      </div>
    );
  }

  // Single status badge using standard variants
  const badges = (
    <Badge variant={vehicleStatusVariant[vehicle.status]}>
      {statusLabels[vehicle.status]}
    </Badge>
  );

  // Build subtitle - includes ownership info
  const subtitle = `${vehicle.license_plate} • ${vehicle.vehicle_type.replace('_', ' ')} • ${vehicle.ownership} owned`;

  // Build actions
  const actions = (
    <>
      <Button
        variant="outline"
        className="gap-2"
        disabled={!isAdmin}
        onClick={() => setEditOpen(true)}
      >
        <Edit className="w-4 h-4" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" disabled={!isAdmin}>
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {vehicle.status === 'active' && (
            <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
              <XCircle className="w-4 h-4 mr-2" />
              Set Inactive
            </DropdownMenuItem>
          )}
          {vehicle.status === 'inactive' && (
            <DropdownMenuItem onClick={() => handleStatusChange('active')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Set Active
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => handleStatusChange('retired')}
            className="text-destructive"
          >
            <Archive className="w-4 h-4 mr-2" />
            Retire Vehicle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  // Tab list for header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="credentials">Credentials</TabsTrigger>
      <TabsTrigger value="assignments">Assignments</TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="overview">
        {/* Full-width header with centered tabs */}
        <DetailPageHeader
          title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
          subtitle={subtitle}
          badges={badges}
          onBack={() => navigate('/admin/vehicles')}
          backLabel="Back to Vehicles"
          centerContent={tabsList}
          actions={actions}
        />

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="overview" className="mt-0">
              <VehicleOverviewTab vehicle={vehicle} canEdit={isAdmin} />
            </TabsContent>
            <TabsContent value="details" className="mt-0">
              <VehicleDetailsTab vehicle={vehicle} />
            </TabsContent>
            <TabsContent value="credentials" className="mt-0">
              <VehicleCredentialsTab companyId={vehicle.company_id} vehicleId={vehicle.id} />
            </TabsContent>
            <TabsContent value="assignments" className="mt-0">
              <VehicleAssignmentsTab vehicle={vehicle} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <EditVehicleModal open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} />
    </div>
  );
}
