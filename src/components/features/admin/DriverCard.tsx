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
import { supabase } from '@/integrations/supabase/client';
import type { DriverWithUser, DriverStatus } from '@/types/driver';
import {
  Briefcase,
  Calendar,
  Eye,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Car,
} from 'lucide-react';

export type AdminDriverCardAction = 'view' | 'edit' | 'vehicles';

interface AdminDriverCardProps {
  driver: DriverWithUser;
  onAction?: (action: AdminDriverCardAction, driver: DriverWithUser) => void;
}

/** Status config using native Badge variants per design system */
const statusStyles: Record<DriverStatus, { 
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
  suspended: {
    label: 'Suspended',
    badgeVariant: 'destructive',
  },
  archived: {
    label: 'Archived',
    badgeVariant: 'outline',
  },
};

async function resolveAvatarUrl(avatarUrl: string | null | undefined): Promise<string | null> {
  if (!avatarUrl) return null;
  
  // If it's already a full URL, return as-is
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // Otherwise, get signed URL from Supabase storage
  try {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(avatarUrl, 3600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

export function AdminDriverCard({ driver, onAction }: AdminDriverCardProps): JSX.Element {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setAvatarLoading(true);
    setAvatarError(false);
    
    const load = async () => {
      const resolved = await resolveAvatarUrl(driver.user.avatar_url);
      if (isMounted) {
        setAvatarUrl(resolved);
        if (!resolved) {
          setAvatarLoading(false);
        }
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, [driver.user.avatar_url]);

  const statusConfig = statusStyles[driver.status];
  const initials = driver.user.full_name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const handleClick = () => {
    navigate(`/admin/drivers/${driver.id}`);
  };

  // Format location
  const location = [driver.city, driver.state].filter(Boolean).join(', ');

  // Format last active
  const lastActive = driver.last_active_at
    ? new Date(driver.last_active_at).toLocaleDateString()
    : null;

  return (
    <Card className="h-full min-h-[280px] flex flex-col hover:shadow-soft transition-all">
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header with photo, driver info, and actions */}
        <div className="flex items-start gap-4">
          {/* Driver Avatar */}
          <div 
            className="h-16 w-16 flex-shrink-0 rounded-full border bg-muted/20 flex items-center justify-center overflow-hidden cursor-pointer relative"
            onClick={handleClick}
          >
            {/* Show skeleton while loading */}
            {avatarLoading && avatarUrl && (
              <Skeleton className="absolute inset-0 h-full w-full rounded-full" />
            )}
            {/* Render image (hidden while loading via opacity) */}
            {avatarUrl && !avatarError && (
              <img 
                src={avatarUrl} 
                alt={driver.user.full_name} 
                className={`h-full w-full object-cover transition-opacity ${avatarLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setAvatarLoading(false)}
                onError={() => {
                  setAvatarError(true);
                  setAvatarLoading(false);
                }}
              />
            )}
            {/* Show initials placeholder if no photo or error */}
            {(!avatarUrl || avatarError) && !avatarLoading && (
              <span className="text-primary font-semibold text-lg">{initials}</span>
            )}
          </div>

          {/* Driver Info */}
          <div className="flex-1 min-w-0 space-y-1 cursor-pointer" onClick={handleClick}>
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{driver.user.full_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{driver.user.email}</p>
              </div>
              <Badge variant={statusConfig.badgeVariant} className="shrink-0">
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Driver actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction?.('view', driver)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('edit', driver)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Driver
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAction?.('vehicles', driver)}>
                <Car className="h-4 w-4 mr-2" />
                Manage Vehicles
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Employment Type */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            <span>{driver.employment_type === 'w2' ? 'W2 Employee' : '1099 Contractor'}</span>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{driver.user.phone || 'No phone'}</span>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{location}</span>
            </div>
          )}

          {/* Last Active */}
          {lastActive && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>Last active: {lastActive}</span>
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
