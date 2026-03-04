import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, X } from 'lucide-react';
import { useAssignDriverToLocation, useLocationDrivers } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';
import { driverStatusConfig } from '@/lib/status-configs';

interface LocationDriversTabProps {
  locationId: string;
  canEdit?: boolean;
  onAssign?: () => void;
}

export function LocationDriversTab({
  locationId,
  canEdit = true,
  onAssign,
}: LocationDriversTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: drivers, isLoading } = useLocationDrivers(locationId);
  const assignDriver = useAssignDriverToLocation();

  const handleRemove = async (driverId: string) => {
    try {
      await assignDriver.mutateAsync({ driverId, locationId: null });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove driver';
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Assigned Drivers</h3>
          <p className="text-sm text-muted-foreground">
            {drivers?.length || 0} drivers assigned to this location
          </p>
        </div>
        <Button onClick={onAssign} disabled={!canEdit || !onAssign}>
          <Plus className="w-4 h-4 mr-2" />
          Assign Driver
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (drivers?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center">
          <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No drivers assigned</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {drivers?.map((driver) => (
            <Card key={driver.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm font-semibold">
                      {driver.user?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{driver.user?.full_name || 'Unknown Driver'}</div>
                    <div className="text-sm text-muted-foreground">
                      {driver.user?.email || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={driverStatusConfig[driver.status].variant}>
                    {driverStatusConfig[driver.status].label}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canEdit}
                    onClick={() => void handleRemove(driver.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
