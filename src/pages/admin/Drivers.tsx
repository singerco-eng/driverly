import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import type { DriverFilters, DriverStatus, EmploymentType } from '@/types/driver';

const statusStyles: Record<DriverStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-600 border-red-500/30',
  archived: 'bg-gray-400/20 text-gray-500 border-gray-400/30',
};

export default function DriversPage() {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const { data: company } = useCompany(profile?.company_id || '');
  const { toast } = useToast();
  const [filters, setFilters] = useState<DriverFilters>({});
  const { data: drivers, isLoading } = useDrivers(filters);

  const statusFilter = (filters.status ?? 'all') as DriverStatus | 'all';
  const employmentFilter = (filters.employmentType ?? 'all') as EmploymentType | 'all';

  const description = useMemo(() => {
    const count = drivers?.length ?? 0;
    return `Manage drivers · ${count} ${count === 1 ? 'driver' : 'drivers'}`;
  }, [drivers?.length]);

  return (
    <EnhancedDataView
      title="Drivers"
      description={description}
      actionLabel={isAdmin ? 'Add Driver' : undefined}
      actionIcon={<Plus className="w-4 h-4" />}
      onActionClick={
        isAdmin
          ? async () => {
              const link = company?.slug
                ? `${window.location.origin}/apply/${company.slug}`
                : null;
              if (link) {
                await navigator.clipboard.writeText(link);
              }
              toast({
                title: 'Share application link',
                description: link
                  ? 'Link copied to clipboard.'
                  : 'Company link not available yet.',
              });
            }
          : undefined
      }
      searchValue={filters.search || ''}
      onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
      searchPlaceholder="Search by name or email..."
      filters={[
        {
          value: statusFilter,
          onValueChange: (value) =>
            setFilters((prev) => ({ ...prev, status: value as DriverStatus | 'all' })),
          label: 'Status',
          placeholder: 'All Status',
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'archived', label: 'Archived' },
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
        data: drivers || [],
        loading: isLoading,
        children: (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(drivers || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No drivers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                (drivers || []).map((driver) => (
                  <TableRow
                    key={driver.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/drivers/${driver.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary text-sm">
                            {driver.user.full_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{driver.user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {driver.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[driver.status]}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{driver.employment_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {driver.last_active_at
                        ? new Date(driver.last_active_at).toLocaleDateString()
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
        data: drivers || [],
        loading: isLoading,
        emptyState: (
          <Card className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No drivers found</h3>
            <p className="text-muted-foreground">
              {filters.search ? 'Try adjusting your search or filters.' : 'Drivers will appear here.'}
            </p>
          </Card>
        ),
        renderCard: (driver) => (
          <Card
            key={driver.id}
            className="cursor-pointer hover:shadow-soft transition-all"
            onClick={() => navigate(`/admin/drivers/${driver.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {driver.user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{driver.user.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{driver.user.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className={statusStyles[driver.status]}>
                  {driver.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-xs">
                  {driver.employment_type.toUpperCase()}
                </Badge>
                {driver.last_active_at && (
                  <span>Active {new Date(driver.last_active_at).toLocaleDateString()}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ),
      }}
    />
  );
}
