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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your fleet operations.</p>
      </div>

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
  );
}
