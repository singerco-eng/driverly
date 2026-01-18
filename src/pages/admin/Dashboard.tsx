import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';

export default function AdminDashboard() {
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();

  const isLoading = driversLoading || vehiclesLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your fleet operations.</p>
      </div>

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
