import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Plus, Eye, LayoutGrid, List } from 'lucide-react';
import { useLocationsWithStats } from '@/hooks/useLocations';
import { useAuth } from '@/contexts/AuthContext';
import * as locationCredentialService from '@/services/locationCredentials';
import { computeLocationCredentialStatus } from '@/services/locations';
import type { LocationStatus, LocationWithStats } from '@/types/location';
import { AdminLocationCard, AdminLocationCardAction } from '@/components/features/admin/LocationCard';
import { CreateLocationModal } from '@/components/features/admin/CreateLocationModal';
import { credentialStatusConfig, locationStatusConfig } from '@/lib/status-configs';

type LocationFilters = {
  search?: string;
  status?: LocationStatus | 'all';
};

export default function LocationsPage() {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const [filters, setFilters] = useState<LocationFilters>({});
  const [createOpen, setCreateOpen] = useState(false);
  const companyId = profile?.company_id;

  const { data: locations, isLoading } = useLocationsWithStats(companyId);

  // Fetch credentials for all locations in parallel
  const credentialQueries = useQueries({
    queries: (locations || []).map((location) => ({
      queryKey: ['location-credentials', location.id],
      queryFn: () => locationCredentialService.getLocationCredentials(location.id),
      enabled: !!location.id,
    })),
  });

  const credentialQueryById = useMemo(() => {
    return new Map((locations || []).map((location, index) => [location.id, credentialQueries[index]]));
  }, [locations, credentialQueries]);

  // Combine locations with their credential status
  const locationsWithStatus = useMemo<LocationWithStats[]>(() => {
    return (locations || []).map((location, index) => {
      const credentials = credentialQueries[index]?.data || [];
      const credentialStatus = computeLocationCredentialStatus(credentials);
      return { ...location, credentialStatus };
    });
  }, [locations, credentialQueries]);

  const statusFilter = (filters.status ?? 'all') as LocationStatus | 'all';

  const filteredLocations = useMemo(() => {
    const searchTerm = (filters.search || '').trim().toLowerCase();
    return locationsWithStatus.filter((location) => {
      if (statusFilter !== 'all' && location.status !== statusFilter) return false;
      if (!searchTerm) return true;
      return (
        location.name.toLowerCase().includes(searchTerm) ||
        (location.code || '').toLowerCase().includes(searchTerm)
      );
    });
  }, [locationsWithStatus, filters.search, statusFilter]);

  const locationCount = locations?.length ?? 0;

  const handleCardAction = (action: AdminLocationCardAction, location: LocationWithStats) => {
    if (action === 'view') {
      navigate(`/admin/locations/${location.id}`);
    } else if (action === 'edit') {
      navigate(`/admin/locations/${location.id}`);
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
    <>
      <div className="min-h-screen bg-background">
        <Tabs defaultValue="table">
          {/* Full-width header */}
          <div className="border-b bg-background">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: title */}
                <div className="flex-1">
                  <h1 className="text-xl font-bold">Locations</h1>
                  <p className="text-sm text-muted-foreground">
                    Manage locations · {locationCount} {locationCount === 1 ? 'location' : 'locations'}
                  </p>
                </div>

                {/* Center: view toggle */}
                <div className="flex items-center justify-center">
                  {viewToggle}
                </div>

                {/* Right: action button */}
                <div className="flex-1 flex justify-end">
                  {isAdmin && (
                    <Button onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Location
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
                searchPlaceholder="Search by name or code..."
                filters={[
                  {
                    value: statusFilter,
                    onValueChange: (value) =>
                      setFilters((prev) => ({ ...prev, status: value as LocationStatus | 'all' })),
                    label: 'Status',
                    placeholder: 'All Status',
                    options: [
                      { value: 'all', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                      { value: 'archived', label: 'Archived' },
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
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Drivers</TableHead>
                        <TableHead>Vehicles</TableHead>
                        <TableHead>Credentials</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.length === 0 && !isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <MapPin className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">No locations found</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredLocations.map((location) => {
                          const credentialQuery = credentialQueryById.get(location.id);
                          const isCredentialLoading = credentialQuery?.isLoading;
                          const credStatus = location.credentialStatus;

                          return (
                            <TableRow
                              key={location.id}
                              className="cursor-pointer hover:bg-muted/50"
                            >
                              <TableCell onClick={() => navigate(`/admin/locations/${location.id}`)}>
                                <div className="font-medium">{location.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {[
                                    location.code ? `Code: ${location.code}` : null,
                                    [location.city, location.state].filter(Boolean).join(', ') || null,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ') || 'No details'}
                                </div>
                              </TableCell>
                              <TableCell onClick={() => navigate(`/admin/locations/${location.id}`)}>
                                <div className="flex items-center gap-2">
                                  <Badge variant={locationStatusConfig[location.status].variant}>
                                    {locationStatusConfig[location.status].label}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell onClick={() => navigate(`/admin/locations/${location.id}`)}>
                                {location.driver_count}
                              </TableCell>
                              <TableCell onClick={() => navigate(`/admin/locations/${location.id}`)}>
                                {location.vehicle_count}
                              </TableCell>
                              <TableCell onClick={() => navigate(`/admin/locations/${location.id}`)}>
                                {isCredentialLoading ? (
                                  <Skeleton className="h-5 w-20" />
                                ) : !credStatus || credStatus.total === 0 ? (
                                  <span className="text-sm text-muted-foreground">—</span>
                                ) : credStatus.status === 'valid' ? (
                                  <Badge variant={credentialStatusConfig.approved.variant}>
                                    {credentialStatusConfig.approved.label}
                                  </Badge>
                                ) : credStatus.status === 'expiring' ? (
                                  <Badge variant={credentialStatusConfig.expiring.variant}>
                                    {credentialStatusConfig.expiring.label}
                                  </Badge>
                                ) : credStatus.status === 'expired' ? (
                                  <Badge variant={credentialStatusConfig.expired.variant}>
                                    {credentialStatusConfig.expired.label}
                                  </Badge>
                                ) : credStatus.status === 'missing' ? (
                                  <Badge variant={credentialStatusConfig.missing.variant}>
                                    {credentialStatusConfig.missing.label}
                                  </Badge>
                                ) : credStatus.status === 'grace_period' ? (
                                  <Badge variant={credentialStatusConfig.grace_period.variant}>
                                    {credentialStatusConfig.grace_period.label}
                                  </Badge>
                                ) : (
                                  <Badge variant={credentialStatusConfig.pending_review.variant}>
                                    {credentialStatusConfig.pending_review.label}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/locations/${location.id}`)}
                                >
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
                ) : filteredLocations.length === 0 ? (
                  <Card className="p-12 text-center">
                    <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No locations found</h3>
                    <p className="text-muted-foreground">
                      {filters.search ? 'Try adjusting your search or filters.' : 'Locations will appear here.'}
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredLocations.map((location) => (
                      <AdminLocationCard
                        key={location.id}
                        location={location}
                        onAction={handleCardAction}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      {companyId && (
        <CreateLocationModal
          companyId={companyId}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      )}
    </>
  );
}
