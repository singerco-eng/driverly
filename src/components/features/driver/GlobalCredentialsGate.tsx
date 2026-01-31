import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, User, Car, ArrowRight, Circle, Building2, Clock } from 'lucide-react';

interface ActivationGateProps {
  employmentType: '1099' | 'w2';
  driverBlockers: string[];
  vehicleBlockers: string[];
}

// Check if blocker is a "waiting" state (no action needed from driver)
function isWaitingState(blocker: string): boolean {
  return blocker.toLowerCase().startsWith('waiting on');
}

// Get the route for actionable blockers
function getDriverRoute(blocker: string): string | null {
  if (isWaitingState(blocker)) return null;
  
  const routes: Record<string, string> = {
    'Complete Your Profile': '/driver/profile',
    'Add Profile Photo': '/driver/profile',
    'Set Your Availability': '/driver/availability',
    'Add Payment Information': '/driver/settings/payment',
  };
  
  // Check for exact match first
  if (routes[blocker]) return routes[blocker];
  
  // Check for credential submission (dynamic text)
  if (blocker.toLowerCase().includes('submit') && blocker.toLowerCase().includes('credential')) {
    return '/driver/credentials';
  }
  
  return null;
}

function getVehicleRoute(blocker: string): string | null {
  if (isWaitingState(blocker)) return null;
  
  const routes: Record<string, string> = {
    'Add a Vehicle': '/driver/vehicles',
    'Complete Vehicle Information': '/driver/vehicles',
    'Active vehicle with required credentials': '/driver/vehicles',
  };
  
  return routes[blocker] || null;
}

export function ActivationGate({
  employmentType,
  driverBlockers,
  vehicleBlockers,
}: ActivationGateProps) {
  const hasDriverBlockers = driverBlockers.length > 0;
  const hasVehicleBlockers = vehicleBlockers.length > 0;
  const totalBlockers = driverBlockers.length + vehicleBlockers.length;

  return (
    <div className="space-y-6">
      {/* Info Card - What are Trip Sources */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-medium">What are Trip Sources?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {employmentType === '1099' ? (
                  <>
                    Trip sources are brokers and facilities you can sign up with to receive trips.
                    Add more sources to increase your earning opportunities.
                  </>
                ) : (
                  <>
                    Trip sources are brokers and facilities your company works with.
                    Complete your setup to see available assignments.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requirements Card - Similar to Getting Started */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Complete Setup</CardTitle>
            </div>
            <span className="text-sm text-muted-foreground">
              {totalBlockers} item{totalBlockers === 1 ? '' : 's'} remaining
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-0">
          {/* Driver Requirements */}
          {hasDriverBlockers && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                <User className="w-3.5 h-3.5" />
                <span>Driver</span>
              </div>
              <div className="space-y-2">
                {driverBlockers.map((blocker) => {
                  const isWaiting = isWaitingState(blocker);
                  const route = getDriverRoute(blocker);
                  
                  return (
                    <div
                      key={blocker}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <div className="flex items-center gap-2">
                        {isWaiting ? (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <Circle className="w-2 h-2 text-muted-foreground" />
                        )}
                        <span className="text-sm">{blocker}</span>
                      </div>
                      {isWaiting ? (
                        <Badge variant="secondary" className="shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : route ? (
                        <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                          <Link to={route}>
                            Continue
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vehicle Requirements */}
          {hasVehicleBlockers && (
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                <Car className="w-3.5 h-3.5" />
                <span>Vehicle</span>
              </div>
              <div className="space-y-2">
                {vehicleBlockers.map((blocker) => {
                  const isWaiting = isWaitingState(blocker);
                  const route = getVehicleRoute(blocker);
                  
                  return (
                    <div
                      key={blocker}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
                    >
                      <div className="flex items-center gap-2">
                        {isWaiting ? (
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <Circle className="w-2 h-2 text-muted-foreground" />
                        )}
                        <span className="text-sm">{blocker}</span>
                      </div>
                      {isWaiting ? (
                        <Badge variant="secondary" className="shrink-0">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : route ? (
                        <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                          <Link to={route}>
                            Continue
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { ActivationGate as GlobalCredentialsGate };

