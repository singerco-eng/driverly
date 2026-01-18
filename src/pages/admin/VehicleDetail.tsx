import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useVehicle, useUpdateVehicleStatus } from '@/hooks/useVehicles';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Archive,
} from 'lucide-react';
import { VehicleOverviewTab } from '@/components/features/admin/VehicleOverviewTab';
import { VehicleDetailsTab } from '@/components/features/admin/VehicleDetailsTab';
import { EditVehicleModal } from '@/components/features/admin/EditVehicleModal';
import { useAuth } from '@/contexts/AuthContext';
import type { VehicleStatus } from '@/types/vehicle';

const statusStyles: Record<VehicleStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-400/30',
  retired: 'bg-red-500/20 text-red-600 border-red-500/30',
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

  return (
    <div className="space-y-6">
      <Link
        to="/admin/vehicles"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Vehicles
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {vehicle.make} {vehicle.model} {vehicle.year}
            </h1>
            <Badge variant="outline" className={statusStyles[vehicle.status]}>
              {vehicle.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{vehicle.license_plate}</p>
          <Badge variant="secondary" className="mt-2 capitalize">
            {vehicle.ownership} owned · {vehicle.vehicle_type.replace('_', ' ')}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="credentials" disabled>
            Credentials
          </TabsTrigger>
          <TabsTrigger value="assignments" disabled>
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <VehicleOverviewTab vehicle={vehicle} canEdit={isAdmin} />
        </TabsContent>
        <TabsContent value="details" className="mt-6">
          <VehicleDetailsTab vehicle={vehicle} />
        </TabsContent>
      </Tabs>

      <EditVehicleModal open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} />
    </div>
  );
}
