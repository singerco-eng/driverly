import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UsageBanner } from '@/components/features/admin/UsageBanner';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useOperatorUsage } from '@/hooks/useBilling';
import { useFeatureFlag } from '@/hooks/useFeatureFlags';

export default function AdminDashboard() {
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: usage } = useOperatorUsage();
  const billingEnabled = useFeatureFlag('billing_enabled');

  const isLoading = driversLoading || vehiclesLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Overview of your fleet operations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {billingEnabled && <UsageBanner usage={usage} />}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {isLoading ? '—' : drivers?.length ?? 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total drivers in your company
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vehicles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {isLoading ? '—' : vehicles?.length ?? 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Total vehicles in your fleet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
