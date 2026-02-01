import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Plus, Eye, LayoutGrid, List } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import { resolveAvatarUrl } from '@/services/profile';
import * as credentialService from '@/services/credentials';
import type { DriverFilters, DriverStatus, EmploymentType, DriverWithUser } from '@/types/driver';
import { AdminDriverCard, AdminDriverCardAction } from '@/components/features/admin/DriverCard';
import { driverStatusVariant, credentialStatusVariant } from '@/lib/status-styles';

// Compute global credential status for a driver
function computeGlobalCredentialStatus(credentials: Awaited<ReturnType<typeof credentialService.getDriverCredentials>>) {
  const requiredGlobal = credentials.filter(
    (c) => c.credentialType.requirement === 'required' && c.credentialType.scope === 'global'
  );
  
  if (requiredGlobal.length === 0) {
    return { status: 'valid' as const, missing: 0, total: 0 };
  }

  const approved = requiredGlobal.filter((c) => c.displayStatus === 'approved');
  const expired = requiredGlobal.filter((c) => c.displayStatus === 'expired');
  const expiring = requiredGlobal.filter((c) => c.displayStatus === 'expiring');
  const pending = requiredGlobal.filter((c) => c.displayStatus === 'pending_review' || c.displayStatus === 'awaiting');
  const missing = requiredGlobal.filter((c) => 
    ['not_submitted', 'rejected'].includes(c.displayStatus)
  );

  if (expired.length > 0) {
    return { status: 'expired' as const, missing: expired.length, total: requiredGlobal.length };
  }
  if (expiring.length > 0) {
    return { status: 'expiring' as const, missing: 0, total: requiredGlobal.length };
  }
  if (missing.length > 0) {
    return { status: 'missing' as const, missing: missing.length, total: requiredGlobal.length };
  }
  if (pending.length > 0) {
    return { status: 'pending' as const, missing: 0, total: requiredGlobal.length };
  }
  return { status: 'valid' as const, missing: 0, total: requiredGlobal.length };
}

type DriverCredentialStatus = ReturnType<typeof computeGlobalCredentialStatus>;

interface DriverWithCredentialStatus extends DriverWithUser {
  credentialStatus?: DriverCredentialStatus;
}

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

  // Fetch credentials for all drivers in parallel
  const credentialQueries = useQueries({
    queries: (drivers || []).map((driver) => ({
      queryKey: ['driver-credentials', driver.id],
      queryFn: () => credentialService.getDriverCredentials(driver.id),
      enabled: !!driver.id,
    })),
  });

  // Combine drivers with their credential status
  const driversWithStatus = useMemo<DriverWithCredentialStatus[]>(() => {
    return (drivers || []).map((driver, index) => {
      const credentials = credentialQueries[index]?.data || [];
      const credentialStatus = computeGlobalCredentialStatus(credentials);
      return {
        ...driver,
        credentialStatus,
      };
    });
  }, [drivers, credentialQueries]);

  const statusFilter = (filters.status ?? 'all') as DriverStatus | 'all';
  const employmentFilter = (filters.employmentType ?? 'all') as EmploymentType | 'all';

  const driverCount = drivers?.length ?? 0;

  const handleAddDriver = async () => {
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
  };

  const handleCardAction = (action: AdminDriverCardAction, driver: DriverWithUser) => {
    if (action === 'view') {
      navigate(`/admin/drivers/${driver.id}`);
    } else if (action === 'edit') {
      navigate(`/admin/drivers/${driver.id}?tab=profile`);
    } else if (action === 'vehicles') {
      navigate(`/admin/drivers/${driver.id}?tab=vehicles`);
    }
  };

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
                <h1 className="text-xl font-bold">Drivers</h1>
                <p className="text-sm text-muted-foreground">
                  Manage drivers · {driverCount} {driverCount === 1 ? 'driver' : 'drivers'}
                </p>
              </div>

              {/* Center: view toggle */}
              <div className="flex items-center justify-center">
                {viewToggle}
              </div>

              {/* Right: action button */}
              <div className="flex-1 flex justify-end">
                {isAdmin && (
                  <Button onClick={handleAddDriver}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Driver
                  </Button>
                )}
              </div>
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
            />

            {/* Table view */}
            <TabsContent value="table" className="mt-0">
              <EnhancedTable loading={isLoading} skeletonRows={5} skeletonColumns={6}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Credentials</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driversWithStatus.length === 0 && !isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No drivers found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      driversWithStatus.map((driver, index) => {
                        const credentialQuery = credentialQueries[index];
                        const isCredentialLoading = credentialQuery?.isLoading;
                        const credStatus = driver.credentialStatus;
                        
                        return (
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
                              {isCredentialLoading ? (
                                <Skeleton className="h-5 w-20" />
                              ) : !credStatus || credStatus.total === 0 ? (
                                <span className="text-sm text-muted-foreground">—</span>
                              ) : credStatus.status === 'valid' ? (
                                <Badge variant={credentialStatusVariant.approved}>Complete</Badge>
                              ) : credStatus.status === 'expiring' ? (
                                <Badge variant={credentialStatusVariant.expiring}>Expiring Soon</Badge>
                              ) : credStatus.status === 'expired' ? (
                                <Badge variant={credentialStatusVariant.expired}>Expired</Badge>
                              ) : credStatus.status === 'missing' ? (
                                <Badge variant={credentialStatusVariant.not_submitted}>Incomplete</Badge>
                              ) : (
                                <Badge variant={credentialStatusVariant.pending_review}>Pending Review</Badge>
                              )}
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
                        );
                      })
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
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              ) : driversWithStatus.length === 0 ? (
                <Card className="p-12 text-center">
                  <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No drivers found</h3>
                  <p className="text-muted-foreground">
                    {filters.search ? 'Try adjusting your search or filters.' : 'Drivers will appear here.'}
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {driversWithStatus.map((driver) => (
                    <AdminDriverCard key={driver.id} driver={driver} onAction={handleCardAction} />
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
