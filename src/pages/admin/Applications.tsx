import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText } from 'lucide-react';
import { useApplications } from '@/hooks/useApplications';
import type { ApplicationStatus, EmploymentType } from '@/types/driver';
import type { ApplicationFilters } from '@/services/applications';

/** Status config using native Badge variants per design system */
const statusConfig: Record<ApplicationStatus, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  draft: { label: 'Draft', badgeVariant: 'outline' },
  pending: { label: 'Pending', badgeVariant: 'secondary' },
  under_review: { label: 'Under Review', badgeVariant: 'secondary' },
  approved: { label: 'Approved', badgeVariant: 'default' },
  rejected: { label: 'Rejected', badgeVariant: 'destructive' },
  withdrawn: { label: 'Withdrawn', badgeVariant: 'outline' },
};

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: 'pending',
    employmentType: 'all',
    search: '',
  });
  const { data: applications, isLoading } = useApplications(filters);

  const statusFilter = (filters.status ?? 'pending') as ApplicationStatus | 'all';
  const employmentFilter = (filters.employmentType ?? 'all') as EmploymentType | 'all';

  const description = useMemo(() => {
    const count = applications?.length ?? 0;
    return `${count} ${count === 1 ? 'application' : 'applications'}`;
  }, [applications?.length]);

  return (
    <EnhancedDataView
      title="Driver Applications"
      description={description}
      searchValue={filters.search || ''}
      onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
      searchPlaceholder="Search by name or email..."
      filters={[
        {
          value: statusFilter,
          onValueChange: (value) =>
            setFilters((prev) => ({ ...prev, status: value as ApplicationStatus | 'all' })),
          label: 'Status',
          placeholder: 'All Status',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'under_review', label: 'Under Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'withdrawn', label: 'Withdrawn' },
            { value: 'all', label: 'All' },
          ],
        },
        {
          value: employmentFilter,
          onValueChange: (value) =>
            setFilters((prev) => ({ ...prev, employmentType: value as EmploymentType | 'all' })),
          label: 'Type',
          placeholder: 'All Types',
          options: [
            { value: 'all', label: 'All Types' },
            { value: 'w2', label: 'W2' },
            { value: '1099', label: '1099' },
          ],
        },
      ]}
      tableProps={{
        data: applications || [],
        loading: isLoading,
        children: (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(applications || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No applications found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (applications || []).map((application) => (
                  <TableRow
                    key={application.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/applications/${application.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">
                            {application.user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{application.user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {application.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[application.application_status].badgeVariant}>
                        {statusConfig[application.application_status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{application.employment_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {application.application_submitted_at
                        ? new Date(application.application_submitted_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ),
      }}
      cardProps={{
        data: applications || [],
        loading: isLoading,
        emptyState: (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No applications found</h3>
            <p className="text-muted-foreground">
              {filters.search ? 'Try adjusting your search or filters.' : 'Applications will appear here.'}
            </p>
          </Card>
        ),
        renderCard: (application) => (
          <Card
            key={application.id}
            className="cursor-pointer hover:shadow-soft transition-all"
            onClick={() => navigate(`/admin/applications/${application.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-muted-foreground font-medium">
                      {application.user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{application.user.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{application.user.email}</p>
                  </div>
                </div>
                <Badge variant={statusConfig[application.application_status].badgeVariant}>
                  {statusConfig[application.application_status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {application.employment_type.toUpperCase()}
                </Badge>
                {application.application_submitted_at && (
                  <span>
                    Submitted {new Date(application.application_submitted_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ),
      }}
    />
  );
}
