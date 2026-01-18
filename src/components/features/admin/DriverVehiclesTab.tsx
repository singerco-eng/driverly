import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DriverWithDetails } from '@/types/driver';

interface DriverVehiclesTabProps {
  driver: DriverWithDetails;
}

export function DriverVehiclesTab({ driver }: DriverVehiclesTabProps) {
  const assignments = driver.vehicles ?? [];

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No vehicles assigned
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => (
        <Card key={assignment.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {assignment.vehicle?.make} {assignment.vehicle?.model}{' '}
              {assignment.vehicle?.year}
            </CardTitle>
            <Badge variant="outline">{assignment.assignment_type}</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">Plate</p>
              <p className="font-medium">{assignment.vehicle?.license_plate || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">{assignment.vehicle?.status || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Assigned</p>
              <p className="font-medium">
                {new Date(assignment.starts_at).toLocaleDateString()}
              </p>
            </div>
            {assignment.notes && (
              <div className="md:col-span-3">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{assignment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
