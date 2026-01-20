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
  AlertTriangle,
  Building2,
  CheckCircle,
  Circle,
  Eye,
  MoreHorizontal,
  Shield,
  Star,
  Image as ImageIcon,
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
  completion: VehicleCompletionStatus;
  readOnly?: boolean;
  onAction?: (action: VehicleCardAction, vehicle: DriverVehicleWithStatus) => void;
}

const statusStyles: Record<VehicleStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/20 text-green-600 border-green-500/30',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  },
  retired: {
    label: 'Retired',
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
};

export default function VehicleCard({ vehicle, completion, readOnly, onAction }: VehicleCardProps) {
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

  const statusConfig = statusStyles[vehicle.status];
  const isPrimary = vehicle.assignment?.is_primary;

  // Credential status
  const credentialLabel =
    vehicle.credentialStatus === 'valid'
      ? 'All credentials valid'
      : vehicle.credentialSummary || 'Credentials need attention';

  const credentialIconColor =
    vehicle.credentialStatus === 'valid'
      ? 'text-green-500'
      : vehicle.credentialStatus === 'expiring'
        ? 'text-yellow-500'
        : vehicle.credentialStatus === 'expired'
          ? 'text-red-500'
          : 'text-muted-foreground';

  // Eligible brokers
  const eligibleCount = vehicle.eligibleBrokers.length;
  const eligibleText =
    eligibleCount > 0
      ? `${eligibleCount} eligible broker${eligibleCount !== 1 ? 's' : ''}`
      : 'No eligible brokers';

  return (
    <Card className="h-full min-h-[280px] flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header with photo, vehicle info, and actions */}
        <div className="flex items-start gap-4">
          {/* Vehicle Photo */}
          <div className="h-16 w-20 flex-shrink-0 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden relative">
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
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* Vehicle Info */}
          <div className="flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {vehicle.vehicle_type.replace('_', ' ')} • {vehicle.license_plate} • {vehicle.license_state}
                </p>
              </div>
              <Badge variant="outline" className={statusConfig.className}>
                <Circle className="h-2.5 w-2.5 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Actions Menu */}
          {!readOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Vehicle actions">
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

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Primary/Secondary */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className={`h-4 w-4 flex-shrink-0 ${isPrimary ? 'text-yellow-500' : ''}`} />
            <span>{isPrimary ? 'Primary Vehicle' : 'Secondary Vehicle'}</span>
          </div>

          {/* Completion Status */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {completion.isComplete ? (
              <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-500" />
            )}
            <span>
              {completion.isComplete 
                ? 'Profile complete' 
                : `Incomplete (${completion.missingFields.length} missing)`}
            </span>
          </div>

          {/* Credential Status */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className={`h-4 w-4 flex-shrink-0 ${credentialIconColor}`} />
            <span>{credentialLabel}</span>
          </div>

          {/* Eligible Brokers */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span>{eligibleText}</span>
          </div>
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
