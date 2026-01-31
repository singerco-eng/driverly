import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { resolveVehiclePhotoUrl } from '@/lib/vehiclePhoto';
import type { DriverVehicleWithStatus, VehicleCompletionStatus } from '@/types/driverVehicle';
import type { VehicleStatus } from '@/types/vehicle';
import {
  Car,
  Eye,
  MoreHorizontal,
  Star,
  Image as ImageIcon,
  Pencil,
} from 'lucide-react';

export type VehicleCardAction =
  | 'set-primary'
  | 'edit'
  | 'set-active'
  | 'set-inactive'
  | 'retire'
  | 'view'
  | 'complete';

interface VehicleCardProps {
  vehicle: DriverVehicleWithStatus;
  completion?: VehicleCompletionStatus; // Optional, kept for compatibility
  readOnly?: boolean;
  onAction?: (action: VehicleCardAction, vehicle: DriverVehicleWithStatus) => void;
}

/** Status config using native Badge variants per design system */
const statusConfig: Record<VehicleStatus, { 
  label: string; 
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  active: {
    label: 'Active',
    badgeVariant: 'default',
  },
  inactive: {
    label: 'Inactive',
    badgeVariant: 'secondary',
  },
  retired: {
    label: 'Retired',
    badgeVariant: 'destructive',
  },
};

export default function VehicleCard({ vehicle, readOnly, onAction }: VehicleCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setPhotoLoading(true);
    setPhotoError(false);
    
    const load = async () => {
      const resolved = await resolveVehiclePhotoUrl(vehicle.exterior_photo_url);
      if (isMounted) {
        setPhotoUrl(resolved);
        // If no URL, we're done loading (show placeholder)
        if (!resolved) {
          setPhotoLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [vehicle.exterior_photo_url]);

  const vehicleStatus = statusConfig[vehicle.status];
  const isPrimary = vehicle.assignment?.is_primary;

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with single status badge and actions */}
        <div className="flex items-center justify-between">
          <Badge variant={vehicleStatus.badgeVariant}>
            {vehicleStatus.label}
          </Badge>
          {/* Actions Menu */}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Vehicle actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction?.('view', vehicle)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {!isPrimary && (
                  <DropdownMenuItem onClick={() => onAction?.('set-primary', vehicle)}>
                    <Star className="h-4 w-4 mr-2" />
                    Set Primary
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onAction?.('edit', vehicle)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Vehicle
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {vehicle.status === 'inactive' ? (
                  <DropdownMenuItem onClick={() => onAction?.('set-active', vehicle)}>
                    Set Active
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onAction?.('set-inactive', vehicle)}>
                    Set Inactive
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="text-destructive" onClick={() => onAction?.('retire', vehicle)}>
                  Retire Vehicle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Centered photo and vehicle info */}
        <Link to={`/driver/vehicles/${vehicle.id}`} className="flex flex-col items-center text-center">
          {/* Vehicle Photo */}
          <div className="h-20 w-28 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden relative mb-2">
            {/* Show skeleton while loading */}
            {photoLoading && photoUrl && (
              <Skeleton className="absolute inset-0 h-full w-full" />
            )}
            {/* Render image (hidden while loading via opacity) */}
            {photoUrl && !photoError && (
              <img 
                src={photoUrl} 
                alt="Vehicle" 
                className={`h-full w-full object-cover transition-opacity ${photoLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setPhotoLoading(false)}
                onError={() => {
                  setPhotoError(true);
                  setPhotoLoading(false);
                }}
              />
            )}
            {/* Show placeholder if no photo or error */}
            {(!photoUrl || photoError) && !photoLoading && (
              <ImageIcon className="h-8 w-8 text-foreground/40" />
            )}
          </div>

          {/* Vehicle Info */}
          <h3 className="text-base font-semibold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">
            {vehicle.vehicle_type.replace('_', ' ')} · {vehicle.license_plate} · {vehicle.license_state}
            {isPrimary && ' · Primary'}
          </p>
        </Link>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Capacity Info */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4 flex-shrink-0" />
            <span>
              {vehicle.seat_capacity ?? 4} seats
              {vehicle.wheelchair_capacity ? ` · ${vehicle.wheelchair_capacity} wheelchair` : ''}
              {vehicle.stretcher_capacity ? ` · ${vehicle.stretcher_capacity} stretcher` : ''}
            </span>
          </div>

          {/* Fleet Number - only show if exists */}
          {vehicle.fleet_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Star className="h-4 w-4 flex-shrink-0" />
              <span>Fleet #{vehicle.fleet_number}</span>
            </div>
          )}
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* View Button */}
        <Button variant="outline" size="sm" className="w-full mt-auto" asChild>
          <Link to={`/driver/vehicles/${vehicle.id}`}>
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
