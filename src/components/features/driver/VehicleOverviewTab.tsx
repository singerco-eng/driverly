import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, Camera, Building2, Star } from 'lucide-react';
import { getBrokers } from '@/services/brokers';
import * as credentialService from '@/services/credentials';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import type { DriverVehicleWithStatus } from '@/types/driverVehicle';
import type { Driver } from '@/types/driver';

interface VehicleOverviewTabProps {
  vehicle: DriverVehicleWithStatus;
  driver: Driver | null | undefined;
  companyId: string | undefined;
  onUpdatePhotos?: () => void;
  is1099: boolean;
}

export function VehicleOverviewTab({
  vehicle,
  driver,
  companyId,
  onUpdatePhotos,
  is1099,
}: VehicleOverviewTabProps) {
  const { data: credentials = [] } = useQuery({
    queryKey: ['vehicle-credentials', vehicle.id],
    queryFn: () => credentialService.getVehicleCredentials(vehicle.id),
    enabled: !!vehicle.id,
  });

  const { data: brokers = [] } = useQuery({
    queryKey: ['brokers', companyId],
    queryFn: () => getBrokers(companyId!),
    enabled: !!companyId,
  });

  const eligibility = useMemo(() => {
    if (!vehicle) return { eligible: [], ineligible: [] };
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
        const required = credentials.filter((c) => c.credentialType.requirement === 'required');
        const brokerRequired = required.filter(
          (c) => c.credentialType.scope === 'global' || c.credentialType.broker_id === broker.id,
        );
        const missing = brokerRequired.filter((c) => c.displayStatus !== 'approved');
        if (missing.length > 0) {
          ineligible.push({ name: broker.name, reason: 'Missing required credentials' });
          return;
        }
        eligible.push(broker.name);
      });
    return { eligible, ineligible };
  }, [brokers, vehicle, credentials, driver?.employment_type]);

  const photos = useMemo(() => {
    if (!vehicle) return [];
    return [
      { label: 'Exterior', url: vehicle.exterior_photo_url },
      { label: 'Interior', url: vehicle.interior_photo_url },
      vehicle.vehicle_type === 'wheelchair_van'
        ? { label: 'Lift', url: vehicle.wheelchair_lift_photo_url }
        : null,
    ].filter(Boolean) as { label: string; url: string | null }[];
  }, [vehicle]);

  return (
    <div className="space-y-6">
      {/* Status Cards Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline" className="capitalize">
              {vehicle.status}
            </Badge>
            {vehicle.status_reason && (
              <p className="mt-2 text-xs text-muted-foreground">{vehicle.status_reason}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Star className={`h-4 w-4 ${vehicle.assignment?.is_primary ? 'text-yellow-500' : 'text-muted-foreground'}`} />
              {vehicle.assignment?.is_primary ? 'Primary Vehicle' : 'Secondary Vehicle'}
            </div>
            {vehicle.assignment?.starts_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Since {new Date(vehicle.assignment.starts_at).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Capacity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{vehicle.seat_capacity} seats</p>
            {vehicle.vehicle_type === 'wheelchair_van' && (
              <p>{vehicle.wheelchair_capacity} wheelchairs</p>
            )}
            {vehicle.vehicle_type === 'stretcher_van' && (
              <p>{vehicle.stretcher_capacity} stretchers</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photos Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Photos</CardTitle>
          <Button size="sm" variant="outline" onClick={onUpdatePhotos}>
            Update Photos
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {photos.map((photo) => (
            <div key={photo.label} className="space-y-2">
              <p className="text-xs text-muted-foreground">{photo.label}</p>
              <div className="h-32 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden">
                {photo.url ? (
                  <VehiclePhoto url={photo.url} />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Broker Eligibility Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Broker Eligibility</CardTitle>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/driver/trip-sources">View Trip Sources</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {eligibility.eligible.length === 0 && eligibility.ineligible.length === 0 ? (
            <p className="text-muted-foreground">No brokers configured yet.</p>
          ) : (
            <>
              {eligibility.eligible.map((name) => (
                <div key={name} className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {name}
                </div>
              ))}
              {eligibility.ineligible.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  {item.name} • {item.reason}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Info Banner for W2 Drivers */}
      {!is1099 && (
        <Card className="border-dashed">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You can update photos for this vehicle. Other changes must be made by your administrator.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VehiclePhoto({ url }: { url: string }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const next = await resolveVehiclePhotoUrl(url);
      if (mounted) setResolvedUrl(next);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [url]);

  if (!resolvedUrl) {
    return <Skeleton className="h-full w-full" />;
  }

  return (
    <>
      {loading && <Skeleton className="absolute inset-0 h-full w-full" />}
      <img
        src={resolvedUrl}
        alt="Vehicle"
        className={`h-full w-full object-cover transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setLoading(false)}
      />
    </>
  );
}
