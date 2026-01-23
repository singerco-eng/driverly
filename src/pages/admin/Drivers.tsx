import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Eye } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import { resolveAvatarUrl } from '@/services/profile';
import type { DriverFilters, DriverStatus, EmploymentType, DriverWithUser } from '@/types/driver';
import { AdminDriverCard, AdminDriverCardAction } from '@/components/features/admin/DriverCard';
import { driverStatusVariant } from '@/lib/status-styles';

// Helper component to handle avatar URL resolution
function DriverAvatar({ avatarPath, name }: { avatarPath: string | null | undefined; name: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (avatarPath) {
        const url = await resolveAvatarUrl(avatarPath);
        if (isMounted) setAvatarUrl(url);
      } else {
        if (isMounted) setAvatarUrl(null);
      }
    }
    void load();
    return () => { isMounted = false; };
  }, [avatarPath]);

  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : null}
      <span className={`text-primary text-sm ${avatarUrl ? 'hidden' : ''}`}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

const statusLabels: Record<DriverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  archived: 'Archived',
};

export default function DriversPage() {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const { data: company } = useCompany(profile?.company_id || '');
  const { toast } = useToast();
  const [filters, setFilters] = useState<DriverFilters>({});
  const { data: drivers, isLoading } = useDrivers(filters);

  const handleCardAction = (action: AdminDriverCardAction, driver: DriverWithUser) => {
    if (action === 'view') {
      navigate(`/admin/drivers/${driver.id}`);
    } else if (action === 'edit') {
      navigate(`/admin/drivers/${driver.id}?tab=profile`);
    } else if (action === 'vehicles') {
      navigate(`/admin/drivers/${driver.id}?tab=vehicles`);
    }
  };

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(drivers || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
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
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                      <div className="flex items-center gap-3">
                        <DriverAvatar avatarPath={driver.user.avatar_url} name={driver.user.full_name} />
                        <div>
                          <div className="font-medium">{driver.user.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {driver.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                      <Badge variant={driverStatusVariant[driver.status]}>
                        {statusLabels[driver.status]}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                      <Badge variant="secondary">{driver.employment_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                      {driver.last_active_at
                        ? new Date(driver.last_active_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/drivers/${driver.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
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
          <AdminDriverCard key={driver.id} driver={driver} onAction={handleCardAction} />
        ),
      }}
    />
  );
}
