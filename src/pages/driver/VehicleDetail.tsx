import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Star,
  Camera,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useDriverVehicle, useSetPrimaryVehicle, useSetVehicleActive } from '@/hooks/useDriverVehicles';
import { useVehicleCredentials } from '@/hooks/useCredentials';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import { VehicleOverviewTab } from '@/components/features/driver/VehicleOverviewTab';
import { VehicleDetailsTab } from '@/components/features/driver/VehicleDetailsTab';
import { VehicleCredentialsTab } from '@/components/features/driver/VehicleCredentialsTab';
import EditVehicleModal from '@/components/features/driver/EditVehicleModal';
import UpdatePhotosModal from '@/components/features/driver/UpdatePhotosModal';
import SetInactiveModal from '@/components/features/driver/SetInactiveModal';
import RetireVehicleModal from '@/components/features/driver/RetireVehicleModal';
import { CannotActivateVehicleModal } from '@/components/features/driver/CannotActivateVehicleModal';
import type { VehicleStatus } from '@/types/vehicle';

/** Status config using native Badge variants per design system */
const statusConfig: Record<VehicleStatus, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  active: { label: 'Active', badgeVariant: 'default' },
  inactive: { label: 'Inactive', badgeVariant: 'secondary' },
  retired: { label: 'Retired', badgeVariant: 'destructive' },
};

export default function DriverVehicleDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: driver, isLoading: driverLoading } = useDriverByUserId(user?.id);
  const { data: vehicle, isLoading: vehicleLoading } = useDriverVehicle(vehicleId);
  const { data: credentials = [] } = useVehicleCredentials(vehicleId);
  
  const [editOpen, setEditOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [inactiveOpen, setInactiveOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [cannotActivateOpen, setCannotActivateOpen] = useState(false);

  // Photo loading state for hero image
  const [heroPhotoUrl, setHeroPhotoUrl] = useState<string | null>(null);
  const [heroPhotoLoading, setHeroPhotoLoading] = useState(true);

  const is1099 = driver?.employment_type === '1099';
  const setPrimary = useSetPrimaryVehicle();
  const setActive = useSetVehicleActive();

  // Calculate missing required global credentials
  const missingCredentials = useMemo(() => {
    const requiredGlobal = credentials.filter(
      (c) => c.credentialType.requirement === 'required' && c.credentialType.scope === 'global'
    );
    return requiredGlobal
      .filter((c) => c.displayStatus !== 'approved')
      .map((c) => ({
        name: c.credentialType.name,
        credentialTypeId: c.credentialType.id,
      }));
  }, [credentials]);

  const isUncredentialed = missingCredentials.length > 0;

  // Handle attempting to set vehicle active
  const handleSetActive = () => {
    if (isUncredentialed) {
      setCannotActivateOpen(true);
    } else {
      setActive.mutate(vehicle!.id);
    }
  };

  // Default tab from URL param
  const defaultTab = searchParams.get('tab') || 'overview';

  // Resolve hero photo
  useEffect(() => {
    let mounted = true;
    const loadPhoto = async () => {
      if (vehicle?.exterior_photo_url) {
        const url = await resolveVehiclePhotoUrl(vehicle.exterior_photo_url);
        if (mounted) {
          setHeroPhotoUrl(url);
        }
      } else {
        setHeroPhotoLoading(false);
      }
    };
    void loadPhoto();
    return () => {
      mounted = false;
    };
  }, [vehicle?.exterior_photo_url]);

  if (driverLoading || vehicleLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">Vehicle not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/driver/vehicles')}>
          Back to Vehicles
        </Button>
      </div>
    );
  }

  // Single status badge - always show vehicle status
  const badges = (
    <Badge variant={statusConfig[vehicle.status].badgeVariant}>
      {statusConfig[vehicle.status].label}
    </Badge>
  );

  // Build subtitle - includes primary designation if applicable
  const subtitle = `${vehicle.vehicle_type.replace('_', ' ')} • ${vehicle.license_plate} • ${vehicle.license_state}${vehicle.assignment?.is_primary ? ' • Primary Vehicle' : ''}`;

  // Build actions
  const actions = is1099 ? (
    <>
      <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
        <Edit className="w-4 h-4" />
        Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!vehicle.assignment?.is_primary && driver && (
            <DropdownMenuItem
              onClick={() => setPrimary.mutate({ driverId: driver.id, vehicleId: vehicle.id })}
            >
              <Star className="w-4 h-4 mr-2" />
              Set Primary
            </DropdownMenuItem>
          )}
          {vehicle.status === 'inactive' ? (
            <DropdownMenuItem onClick={handleSetActive}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Set Active
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setInactiveOpen(true)}>
              <XCircle className="w-4 h-4 mr-2" />
              Set Inactive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setRetireOpen(true)}
            className="text-destructive"
          >
            <Archive className="w-4 h-4 mr-2" />
            Retire Vehicle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  ) : (
    <Button variant="outline" onClick={() => setPhotosOpen(true)}>
      Update Photos
    </Button>
  );

  // Tab list for header
  const tabsList = (
    <TabsList>
      <TabsTrigger value="overview">Overview</TabsTrigger>
      <TabsTrigger value="details">Details</TabsTrigger>
      <TabsTrigger value="credentials">Credentials</TabsTrigger>
    </TabsList>
  );

  // Hero image component
  const heroImage = (
    <div className="relative aspect-video max-h-48 bg-muted/20 rounded-lg overflow-hidden flex items-center justify-center">
      {heroPhotoLoading && heroPhotoUrl && (
        <Skeleton className="absolute inset-0 h-full w-full" />
      )}
      {heroPhotoUrl && (
        <img
          src={heroPhotoUrl}
          alt="Vehicle"
          className={`h-full w-full object-cover transition-opacity ${heroPhotoLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setHeroPhotoLoading(false)}
          onError={() => setHeroPhotoLoading(false)}
        />
      )}
      {!heroPhotoUrl && !heroPhotoLoading && (
        <Camera className="h-10 w-10 text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue={defaultTab}>
        {/* Full-width header with centered tabs */}
        <DetailPageHeader
          title={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          subtitle={subtitle}
          badges={badges}
          onBack={() => navigate('/driver/vehicles')}
          backLabel="Back to Vehicles"
          centerContent={tabsList}
          actions={actions}
        />

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero Image */}
            {heroImage}

            {/* Tab content */}
            <TabsContent value="overview" className="mt-0">
              <VehicleOverviewTab
                vehicle={vehicle}
                driver={driver}
                companyId={profile?.company_id}
                onUpdatePhotos={() => setPhotosOpen(true)}
                is1099={is1099}
              />
            </TabsContent>
            <TabsContent value="details" className="mt-0">
              <VehicleDetailsTab vehicle={vehicle} />
            </TabsContent>
            <TabsContent value="credentials" className="mt-0">
              {profile?.company_id && (
                <VehicleCredentialsTab
                  companyId={profile.company_id}
                  vehicleId={vehicle.id}
                />
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Modals */}
      {vehicle && (
        <>
          <EditVehicleModal open={editOpen} onOpenChange={setEditOpen} vehicle={vehicle} />
          <UpdatePhotosModal open={photosOpen} onOpenChange={setPhotosOpen} vehicle={vehicle} />
          <SetInactiveModal open={inactiveOpen} onOpenChange={setInactiveOpen} vehicle={vehicle} />
          <RetireVehicleModal
            open={retireOpen}
            onOpenChange={setRetireOpen}
            vehicle={vehicle}
            driverId={driver?.id || ''}
          />
          <CannotActivateVehicleModal
            open={cannotActivateOpen}
            onOpenChange={setCannotActivateOpen}
            vehicleId={vehicle.id}
            vehicleName={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            missingCredentials={missingCredentials}
          />
        </>
      )}
    </div>
  );
}
