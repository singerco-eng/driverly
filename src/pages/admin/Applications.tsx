import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, LayoutGrid, List } from 'lucide-react';
import { useApplications } from '@/hooks/useApplications';
import { ApplicationCard } from '@/components/features/admin/ApplicationCard';
import { applicationStatusConfig } from '@/lib/status-configs';
import type { ApplicationStatus, EmploymentType } from '@/types/driver';
import type { ApplicationFilters } from '@/services/applications';

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
  const applicationCount = applications?.length ?? 0;

  // View toggle in header
  const viewToggle = (
    <TabsList>
      <TabsTrigger value="table" className="gap-1.5">
        <List className="w-4 h-4" />
        Table
      </TabsTrigger>
      <TabsTrigger value="cards" className="gap-1.5">
        <LayoutGrid className="w-4 h-4" />
        Cards
      </TabsTrigger>
    </TabsList>
  );

  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="table">
        {/* Full-width header */}
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold">Driver Applications</h1>
                <p className="text-sm text-muted-foreground">
                  {applicationCount} {applicationCount === 1 ? 'application' : 'applications'}
                </p>
              </div>

              {/* Center: view toggle */}
              <div className="flex items-center justify-center">
                {viewToggle}
              </div>

              {/* Right: placeholder for balance */}
              <div className="flex-1" />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Filter bar */}
            <FilterBar
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
            />

            {/* Table view */}
            <TabsContent value="table" className="mt-0">
              <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={4}>
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
                    {(applications || []).length === 0 && !isLoading ? (
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
                          className="cursor-pointer hover:bg-muted/50"
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
                            <Badge variant={applicationStatusConfig[application.application_status].variant}>
                              {applicationStatusConfig[application.application_status].label}
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
              </EnhancedTable>
            </TabsContent>

            {/* Cards view */}
            <TabsContent value="cards" className="mt-0">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-lg" />
                  ))}
                </div>
              ) : (applications || []).length === 0 ? (
                <Card className="p-12 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No applications found</h3>
                  <p className="text-muted-foreground">
                    {filters.search ? 'Try adjusting your search or filters.' : 'Applications will appear here.'}
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(applications || []).map((application) => (
                    <ApplicationCard key={application.id} application={application} />
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
