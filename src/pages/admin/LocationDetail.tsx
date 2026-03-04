import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Building2,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  Archive,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useUpdateLocation, useDeleteLocation } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import type { LocationStatus } from '@/types/location';
import { locationStatusConfig } from '@/lib/status-configs';
import { LocationSummaryTab } from '@/components/features/shared/LocationSummaryTab';
import { LocationDriversTab } from '@/components/features/admin/LocationDriversTab';
import { LocationVehiclesTab } from '@/components/features/admin/LocationVehiclesTab';
import { LocationCredentialsTab } from '@/components/features/admin/LocationCredentialsTab';
import { LocationTripSourcesTab } from '@/components/features/admin/LocationTripSourcesTab';
import { EditLocationModal } from '@/components/features/admin/EditLocationModal';
import { UnifiedAssignmentModal } from '@/components/features/shared/assignment';
import type {
  AssignmentMode,
  LocationContext,
} from '@/components/features/shared/assignment';

export default function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const { data: location, isLoading, error } = useLocation(id || '');
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const [editOpen, setEditOpen] = useState(false);
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    mode: AssignmentMode | null;
  }>({ open: false, mode: null });

  const handleStatusChange = async (status: LocationStatus) => {
    if (!id) return;
    try {
      await updateLocation.mutateAsync({ id, data: { status } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!location || !isAdmin) return;
    const confirmed = window.confirm(
      `Delete ${location.name}? This will remove the location and unassign drivers and vehicles.`,
    );
    if (!confirmed) return;
    try {
      await deleteLocation.mutateAsync(location.id);
      navigate('/admin/locations');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete location';
      toast({
        title: 'Delete failed',
        description: message,
        variant: 'destructive',
      });
    }
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

  if (error || !location) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">Location not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/locations')}>
          Back to Locations
        </Button>
      </div>
    );
  }

  const avatar = (
    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
      <Building2 className="w-5 h-5 text-primary" />
    </div>
  );

  const badges = (
    <>
      <Badge variant={locationStatusConfig[location.status].variant}>
        {locationStatusConfig[location.status].label}
      </Badge>
    </>
  );

  const subtitle = [
    location.city && location.state ? `${location.city}, ${location.state}` : null,
    location.code ? `Code: ${location.code}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const locationContext: LocationContext = {
    type: 'location',
    locationId: location.id,
    locationName: location.name,
  };

  const openAssignDriver = () =>
    setAssignmentModal({ open: true, mode: 'assign-driver-to-location' });
  const openAssignVehicle = () =>
    setAssignmentModal({ open: true, mode: 'assign-vehicle-to-location' });
  const openAssignBroker = () =>
    setAssignmentModal({ open: true, mode: 'assign-broker-to-location' });
  const closeModal = () => setAssignmentModal({ open: false, mode: null });

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
          {location.status === 'active' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('inactive')}>
              <XCircle className="w-4 h-4 mr-2" />
              Set Inactive
            </DropdownMenuItem>
          )}
          {location.status === 'inactive' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('active')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Set Active
            </DropdownMenuItem>
          )}
          {location.status !== 'archived' && (
            <DropdownMenuItem onClick={() => void handleStatusChange('archived')}>
              <Archive className="w-4 h-4 mr-2" />
              Archive Location
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void handleDelete()} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Location
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  const tabsList = (
    <TabsList>
      <TabsTrigger value="summary">Summary</TabsTrigger>
      <TabsTrigger value="drivers">Drivers</TabsTrigger>
      <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
      <TabsTrigger value="credentials">Credentials</TabsTrigger>
      <TabsTrigger value="trip-sources">Trip Sources</TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="summary">
        <DetailPageHeader
          title={location.name}
          subtitle={subtitle}
          badges={badges}
          avatar={avatar}
          onBack={() => navigate('/admin/locations')}
          backLabel="Back to Locations"
          centerContent={tabsList}
          actions={actions}
        />

        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <TabsContent value="summary" className="mt-0">
              <LocationSummaryTab location={location} canEdit={isAdmin} />
            </TabsContent>
            <TabsContent value="drivers" className="mt-0">
              <LocationDriversTab
                locationId={location.id}
                canEdit={isAdmin}
                onAssign={openAssignDriver}
              />
            </TabsContent>
            <TabsContent value="vehicles" className="mt-0">
              <LocationVehiclesTab
                locationId={location.id}
                canEdit={isAdmin}
                onAssign={openAssignVehicle}
              />
            </TabsContent>
            <TabsContent value="credentials" className="mt-0">
              <LocationCredentialsTab companyId={location.company_id} locationId={location.id} />
            </TabsContent>
            <TabsContent value="trip-sources" className="mt-0">
              <LocationTripSourcesTab
                locationId={location.id}
                canEdit={isAdmin}
                onAssign={openAssignBroker}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <EditLocationModal open={editOpen} onOpenChange={setEditOpen} location={location} />
      {assignmentModal.mode && (
        <UnifiedAssignmentModal
          open={assignmentModal.open}
          onOpenChange={(open) => !open && closeModal()}
          mode={assignmentModal.mode}
          context={locationContext}
        />
      )}
    </div>
  );
}
