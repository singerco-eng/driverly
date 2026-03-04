import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LocationWithStats } from '@/types/location';
import { locationStatusConfig } from '@/lib/status-configs';
import {
  Building2,
  Car,
  Eye,
  MoreHorizontal,
  MapPin,
  Users,
  FileCheck,
  AlertTriangle,
  XCircle,
  Clock,
  Pencil,
} from 'lucide-react';

export type AdminLocationCardAction = 'view' | 'edit';

type CredentialStatus = {
  status: 'valid' | 'expiring' | 'expired' | 'missing' | 'grace_period' | 'pending';
  missing: number;
  total: number;
};

interface AdminLocationCardProps {
  location: LocationWithStats & { credentialStatus?: CredentialStatus };
  onAction?: (action: AdminLocationCardAction, location: LocationWithStats) => void;
}

export function AdminLocationCard({ location, onAction }: AdminLocationCardProps): JSX.Element {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/admin/locations/${location.id}`);
  };

  const address = [location.city, location.state].filter(Boolean).join(', ') || 'No address';

  return (
    <Card className="h-full flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={locationStatusConfig[location.status].variant}>
              {locationStatusConfig[location.status].label}
            </Badge>
          </div>
          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Location actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('view', location)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('edit', location)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center content with icon/name */}
        <div className="flex flex-col items-center text-center cursor-pointer" onClick={handleClick}>
          <div className="h-16 w-16 rounded-full border bg-muted/20 flex items-center justify-center mb-2">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold">{location.name}</h3>
          <p className="text-sm text-muted-foreground">
            {location.code ? `Code: ${location.code}` : 'No code'}
          </p>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Credential Status */}
          {location.credentialStatus && location.credentialStatus.total > 0 && (
            <div className={`flex items-center gap-2 ${
              location.credentialStatus.status === 'valid' ? 'text-primary' :
              location.credentialStatus.status === 'expired' || location.credentialStatus.status === 'missing' ? 'text-destructive' :
              location.credentialStatus.status === 'expiring' || location.credentialStatus.status === 'grace_period' ? 'text-amber-600 dark:text-amber-500' :
              'text-muted-foreground'
            }`}>
              {location.credentialStatus.status === 'valid' ? (
                <>
                  <FileCheck className="h-4 w-4 flex-shrink-0" />
                  <span>Credentials complete</span>
                </>
              ) : location.credentialStatus.status === 'expiring' ? (
                <>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Credentials expiring</span>
                </>
              ) : location.credentialStatus.status === 'expired' ? (
                <>
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{location.credentialStatus.missing} credentials expired</span>
                </>
              ) : location.credentialStatus.status === 'missing' ? (
                <>
                  <XCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{location.credentialStatus.missing} credentials missing</span>
                </>
              ) : location.credentialStatus.status === 'grace_period' ? (
                <>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{location.credentialStatus.missing} credentials due soon</span>
                </>
              ) : location.credentialStatus.status === 'pending' ? (
                <>
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Credentials pending review</span>
                </>
              ) : null}
            </div>
          )}

          {/* Address */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{address}</span>
          </div>

          {/* Driver count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>{location.driver_count} drivers</span>
          </div>

          {/* Vehicle count */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Car className="h-4 w-4 flex-shrink-0" />
            <span>{location.vehicle_count} vehicles</span>
          </div>
        </div>

        {/* Spacer */}
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
