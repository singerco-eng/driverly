import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApplicationStatus } from '@/types/driver';

const statusLabels: Record<ApplicationStatus, string> = {
  draft: 'Draft',
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Not Approved',
  withdrawn: 'Withdrawn',
};

const statusStyles: Record<ApplicationStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border/40',
  pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  under_review: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-700 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  withdrawn: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

interface ApplicationStatusCardProps {
  status: ApplicationStatus;
  description?: string;
  extra?: React.ReactNode;
}

export function ApplicationStatusCard({ status, description, extra }: ApplicationStatusCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Application Status</CardTitle>
        <Badge variant="outline" className={statusStyles[status]}>
          {statusLabels[status]}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {extra}
      </CardContent>
    </Card>
  );
}
