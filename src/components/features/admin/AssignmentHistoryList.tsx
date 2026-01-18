import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssignmentHistory } from '@/types/vehicleAssignment';

interface AssignmentHistoryListProps {
  history: AssignmentHistory[];
  mode: 'vehicle' | 'driver';
}

const actionLabels: Record<string, string> = {
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  transferred: 'Transferred',
  primary_changed: 'Primary Changed',
  extended: 'Extended',
  ended_early: 'Ended Early',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatRange(startedAt?: string | null, endedAt?: string | null) {
  if (!startedAt && !endedAt) return '—';
  const start = startedAt ? formatDate(startedAt) : '—';
  const end = endedAt ? formatDate(endedAt) : 'Ongoing';
  return `${start} • ${end}`;
}

export function AssignmentHistoryList({ history, mode }: AssignmentHistoryListProps) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No assignment history yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const actionLabel = actionLabels[entry.action] || entry.action;
        const subject =
          mode === 'vehicle'
            ? entry.driver?.user.full_name || 'Unknown Driver'
            : entry.vehicle
              ? `${entry.vehicle.year} ${entry.vehicle.make} ${entry.vehicle.model}`
              : 'Unknown Vehicle';
        const subline =
          mode === 'vehicle'
            ? entry.transferred_to_driver
              ? `Transferred to ${entry.transferred_to_driver.user.full_name}`
              : undefined
            : entry.vehicle?.license_plate
              ? `Plate ${entry.vehicle.license_plate}`
              : undefined;

        return (
          <Card key={entry.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold">{subject}</CardTitle>
                <p className="text-xs text-muted-foreground">{formatRange(entry.started_at, entry.ended_at)}</p>
                {subline && <p className="text-xs text-muted-foreground">{subline}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline">{actionLabel}</Badge>
                {entry.is_primary && <Badge>Primary</Badge>}
              </div>
            </CardHeader>
            {(entry.reason || entry.notes || entry.performed_by_user) && (
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {entry.performed_by_user?.full_name && (
                  <div>By {entry.performed_by_user.full_name}</div>
                )}
                {entry.reason && <div>Reason: {entry.reason}</div>}
                {entry.notes && <div>Notes: {entry.notes}</div>}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
