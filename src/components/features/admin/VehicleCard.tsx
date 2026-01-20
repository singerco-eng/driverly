import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { VehicleWithAssignments, VehicleStatus } from '@/types/vehicle';
import {
  Car,
  Eye,
  MoreHorizontal,
  Pencil,
  Star,
  Image as ImageIcon,
  User,
  Building2,
  Users,
} from 'lucide-react';

export type AdminVehicleCardAction = 'view' | 'edit' | 'assign';

interface AdminVehicleCardProps {
  vehicle: VehicleWithAssignments;
  onAction?: (action: AdminVehicleCardAction, vehicle: VehicleWithAssignments) => void;
}

/** Status config using native Badge variants per design system */
const statusStyles: Record<VehicleStatus, { 
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

export function AdminVehicleCard({ vehicle, onAction }: AdminVehicleCardProps): JSX.Element {
  const navigate = useNavigate();
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
  const ownerName = vehicle.owner?.user?.full_name;
  const activeAssignment = vehicle.assignments?.find((a) => !a.ended_at);
  const assignedDriverName = activeAssignment?.driver?.user?.full_name;

  const handleClick = () => {
    navigate(`/admin/vehicles/${vehicle.id}`);
  };

  return (
    <Card className="h-full min-h-[280px] flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header with photo, vehicle info, and actions */}
        <div className="flex items-start gap-4">
          {/* Vehicle Photo */}
          <div 
            className="h-16 w-20 flex-shrink-0 rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden cursor-pointer relative"
            onClick={handleClick}
          >
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
          <div className="flex-1 space-y-1 cursor-pointer" onClick={handleClick}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {vehicle.vehicle_type.replace('_', ' ')} • {vehicle.license_plate}
                  {vehicle.license_state ? ` • ${vehicle.license_state}` : ''}
                </p>
              </div>
              <Badge variant={statusConfig.badgeVariant}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Actions Menu */}
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
              <DropdownMenuItem onClick={() => onAction?.('edit', vehicle)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Vehicle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('assign', vehicle)}>
                <Users className="h-4 w-4 mr-2" />
                Manage Assignments
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata Section - Always 4 rows for consistent height */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Ownership */}
          <div className="flex items-center gap-2 text-muted-foreground">
            {vehicle.ownership === 'company' ? (
              <>
                <Building2 className="h-4 w-4 flex-shrink-0" />
                <span>Company-owned</span>
              </>
            ) : (
              <>
                <User className="h-4 w-4 flex-shrink-0" />
                <span>Driver-owned{ownerName ? `: ${ownerName}` : ''}</span>
              </>
            )}
          </div>

          {/* Assigned Driver */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {assignedDriverName ? `Assigned to: ${assignedDriverName}` : 'Not assigned'}
            </span>
          </div>

          {/* Capacity Info */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4 flex-shrink-0" />
            <span>
              {vehicle.seat_capacity ?? 4} seats
              {vehicle.wheelchair_capacity ? ` • ${vehicle.wheelchair_capacity} wheelchair` : ''}
              {vehicle.stretcher_capacity ? ` • ${vehicle.stretcher_capacity} stretcher` : ''}
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
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={handleClick}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
