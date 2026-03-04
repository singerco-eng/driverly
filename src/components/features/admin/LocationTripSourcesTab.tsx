import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, X } from 'lucide-react';
import { useLocationBrokers, useRemoveBrokerFromLocation } from '@/hooks/useLocations';
import { useToast } from '@/hooks/use-toast';

interface LocationTripSourcesTabProps {
  locationId: string;
  canEdit?: boolean;
  onAssign?: () => void;
}

export function LocationTripSourcesTab({
  locationId,
  canEdit = true,
  onAssign,
}: LocationTripSourcesTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: assignments, isLoading } = useLocationBrokers(locationId);
  const removeBroker = useRemoveBrokerFromLocation();

  const handleRemove = async (brokerId: string) => {
    try {
      await removeBroker.mutateAsync({ locationId, brokerId });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove trip source';
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
          <h3 className="text-lg font-medium">Associated Trip Sources</h3>
          <p className="text-sm text-muted-foreground">
            {assignments?.length || 0} trip sources work with this location
          </p>
        </div>
        <Button onClick={onAssign} disabled={!canEdit || !onAssign}>
          <Plus className="w-4 h-4 mr-2" />
          Add Trip Source
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (assignments?.length ?? 0) === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No trip sources associated</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add trip sources this location works with
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {assignments?.map((assignment) => (
            <Card key={assignment.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => navigate(`/admin/brokers/${assignment.broker_id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {assignment.broker?.name || 'Unknown trip source'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {assignment.broker?.code || 'No code'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!canEdit}
                  onClick={() => void handleRemove(assignment.broker_id)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
