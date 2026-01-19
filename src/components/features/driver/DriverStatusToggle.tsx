import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToggleDriverActive } from '@/hooks/useOnboarding';
import { CannotActivateModal } from '@/components/features/driver/CannotActivateModal';
import { GoInactiveModal } from '@/components/features/driver/GoInactiveModal';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { Zap, Moon, AlertCircle } from 'lucide-react';

interface DriverStatusToggleProps {
  driverId: string;
  currentStatus: string;
  canActivate: boolean;
  blockers: string[];
}

export function DriverStatusToggle({
  driverId,
  currentStatus,
  canActivate,
  blockers,
}: DriverStatusToggleProps) {
  const [showBlockers, setShowBlockers] = useState(false);
  const [showGoInactive, setShowGoInactive] = useState(false);
  const toggleMutation = useToggleDriverActive();

  const isActive = currentStatus === 'active';
  const isDisabled = currentStatus === 'suspended' || currentStatus === 'archived';

  const handleToggle = (nextActive: boolean) => {
    if (nextActive) {
      if (!canActivate) {
        setShowBlockers(true);
        return;
      }
      toggleMutation.mutate({ driverId, active: true });
    } else {
      setShowGoInactive(true);
    }
  };

  const handleConfirmInactive = (reason: string) => {
    toggleMutation.mutate({ driverId, active: false, reason });
    setShowGoInactive(false);
  };

  return (
    <>
      <Card className={cn(cardVariants({ variant: isActive ? 'glow' : 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            {isActive ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-500" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                <Moon className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <CardTitle className="text-base">Driver Status</CardTitle>
          </div>
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className={cn(
              isActive
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                : ''
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full mr-1.5',
                isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'
              )}
            />
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {isActive
                ? 'You are available for trips.'
                : 'Turn on when you are ready to receive trips.'}
            </p>
            {isDisabled && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <AlertCircle className="w-3 h-3" />
                Status is managed by support while your account is suspended.
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {isActive ? 'Go offline' : 'Go online'}
            </span>
            <Switch
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={toggleMutation.isPending || isDisabled}
              className={cn(
                isActive && 'data-[state=checked]:bg-emerald-500'
              )}
            />
          </div>
        </CardContent>
      </Card>

      <CannotActivateModal
        open={showBlockers}
        onOpenChange={setShowBlockers}
        blockers={blockers}
      />
      <GoInactiveModal
        open={showGoInactive}
        onOpenChange={setShowGoInactive}
        onConfirm={handleConfirmInactive}
      />
    </>
  );
}
