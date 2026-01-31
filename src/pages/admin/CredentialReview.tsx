import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FilterBar } from '@/components/ui/filter-bar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnhancedTable, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileCheck2, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes, useBrokers } from '@/hooks/useCredentialTypes';
import {
  useDriverCredentialsForReview,
  useVehicleCredentialsForReview,
} from '@/hooks/useCredentialReview';
import type { CredentialForReview, ReviewQueueFilters, ReviewStatus } from '@/types/credentialReview';
import { CredentialReviewCard } from '@/components/features/admin/CredentialReviewCard';
import { ReviewHistoryTab } from '@/components/features/admin/ReviewHistoryTab';

type DisplayStatus = ReviewStatus | 'not_submitted';

/** Status config using native Badge variants per design system */
const statusConfig: Record<DisplayStatus, { 
  label: string; 
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  pending_review: {
    label: 'Pending Review',
    badgeVariant: 'secondary',
  },
  awaiting_verification: {
    label: 'Awaiting Verification',
    badgeVariant: 'secondary',
  },
  expiring: {
    label: 'Expiring Soon',
    badgeVariant: 'outline',
  },
  expired: {
    label: 'Expired',
    badgeVariant: 'destructive',
  },
  approved: {
    label: 'Approved',
    badgeVariant: 'default',
  },
  rejected: {
    label: 'Rejected',
    badgeVariant: 'destructive',
  },
  not_submitted: {
    label: 'Not Submitted',
    badgeVariant: 'outline',
  },
};

const statusOptions: Array<{ value: ReviewQueueFilters['status']; label: string }> = [
  { value: 'needs_action', label: 'Needs Action' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'awaiting_verification', label: 'Awaiting Verification' },
  { value: 'not_submitted', label: 'Not Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'all', label: 'All Statuses' },
];

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function getSubjectLabel(credential: CredentialForReview) {
  if (credential.driver?.user?.full_name) {
    return `${credential.driver.user.full_name} (${credential.driver.employment_type.toUpperCase()})`;
  }
  if (credential.vehicle) {
    return `${credential.vehicle.make} ${credential.vehicle.model} ${credential.vehicle.year}`;
  }
  return '—';
}

export default function CredentialReviewPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [filters, setFilters] = useState<ReviewQueueFilters>({
    status: 'needs_action',
  });
  const [activeTab, setActiveTab] = useState('drivers');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // These statuses require fetching 'all' from DB then filtering client-side
  const needsClientFilter = ['expiring', 'expired', 'awaiting_verification', 'not_submitted'].includes(filters.status);
  const normalizedStatus = needsClientFilter ? 'all' : filters.status;

  const fetchFilters = useMemo(
    () => ({
      ...filters,
      status: normalizedStatus,
    }),
    [filters, normalizedStatus],
  );

  const { data: driverCredentials, isLoading: driverLoading } = useDriverCredentialsForReview(
    companyId,
    fetchFilters,
  );
  const { data: vehicleCredentials, isLoading: vehicleLoading } = useVehicleCredentialsForReview(
    companyId,
    fetchFilters,
  );
  const { data: credentialTypes } = useCredentialTypes(companyId);
  const { data: brokers } = useBrokers(companyId);


  const filteredDriver = useMemo(() => {
    return (driverCredentials || []).filter((credential) => {
      // Filter out inactive credential types
      if (!credential.credentialType.is_active) return false;
      
      if (filters.status === 'expiring' && credential.displayStatus !== 'expiring') return false;
      if (filters.status === 'expired' && credential.displayStatus !== 'expired') return false;
      if (filters.status === 'not_submitted' && credential.displayStatus !== 'not_submitted') return false;
      if (
        filters.status === 'awaiting_verification' &&
        credential.displayStatus !== 'awaiting_verification'
      )
        return false;
      if (filters.status === 'needs_action') {
        return ['pending_review', 'awaiting_verification'].includes(credential.displayStatus);
      }
      if (filters.status !== 'all' && normalizedStatus === 'all') {
        // already filtered above
      }

      if (filters.credentialTypeId && credential.credentialType.id !== filters.credentialTypeId) {
        return false;
      }
      if (filters.brokerId && credential.credentialType.broker?.id !== filters.brokerId) {
        return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const haystack = [
          credential.credentialType.name,
          credential.driver?.user?.full_name,
          credential.driver?.user?.email,
          credential.credentialType.broker?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [driverCredentials, filters, normalizedStatus]);

  const filteredVehicle = useMemo(() => {
    return (vehicleCredentials || []).filter((credential) => {
      // Filter out inactive credential types
      if (!credential.credentialType.is_active) return false;
      
      if (filters.status === 'expiring' && credential.displayStatus !== 'expiring') return false;
      if (filters.status === 'expired' && credential.displayStatus !== 'expired') return false;
      if (filters.status === 'not_submitted' && credential.displayStatus !== 'not_submitted') return false;
      if (
        filters.status === 'awaiting_verification' &&
        credential.displayStatus !== 'awaiting_verification'
      )
        return false;
      if (filters.status === 'needs_action') {
        return ['pending_review', 'awaiting_verification'].includes(credential.displayStatus);
      }

      if (filters.credentialTypeId && credential.credentialType.id !== filters.credentialTypeId) {
        return false;
      }
      if (filters.brokerId && credential.credentialType.broker?.id !== filters.brokerId) {
        return false;
      }
      if (filters.search) {
        const query = filters.search.toLowerCase();
        const haystack = [
          credential.credentialType.name,
          credential.vehicle?.make,
          credential.vehicle?.model,
          credential.vehicle?.license_plate,
          credential.credentialType.broker?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [vehicleCredentials, filters]);

  const handleView = (credential: CredentialForReview) => {
    // Navigate to the appropriate detail page based on credential type
    if (credential.credentialTable === 'driver_credentials' && credential.driver?.id) {
      navigate(`/admin/drivers/${credential.driver.id}/credentials/${credential.id}`);
    } else if (credential.credentialTable === 'vehicle_credentials' && credential.vehicle?.id) {
      navigate(`/admin/vehicles/${credential.vehicle.id}/credentials/${credential.id}`);
    }
  };


  const commonFilters = [
    {
      value: filters.status,
      onValueChange: (value: string) =>
        setFilters((prev) => ({ ...prev, status: value as ReviewQueueFilters['status'] })),
      label: 'Status',
      placeholder: 'All Status',
      options: statusOptions,
    },
    {
      value: filters.credentialTypeId || 'all',
      onValueChange: (value: string) =>
        setFilters((prev) => ({
          ...prev,
          credentialTypeId: value === 'all' ? undefined : value,
        })),
      label: 'Type',
      placeholder: 'All Types',
      options: [
        { value: 'all', label: 'All Types' },
        ...(credentialTypes || []).filter(type => type.is_active).map((type) => ({ value: type.id, label: type.name })),
      ],
    },
    {
      value: filters.brokerId || 'all',
      onValueChange: (value: string) =>
        setFilters((prev) => ({ ...prev, brokerId: value === 'all' ? undefined : value })),
      label: 'Trip Source',
      placeholder: 'All Trip Sources',
      options: [
        { value: 'all', label: 'All Trip Sources' },
        ...(brokers || []).map((broker) => ({ value: broker.id, label: broker.name })),
      ],
    },
  ];

  // Section tabs in header
  const sectionTabs = (
    <TabsList>
      <TabsTrigger value="drivers">Drivers ({filteredDriver.length})</TabsTrigger>
      <TabsTrigger value="vehicles">Vehicles ({filteredVehicle.length})</TabsTrigger>
      <TabsTrigger value="history">History</TabsTrigger>
    </TabsList>
  );

  // View mode toggle
  const viewToggle = (
    <TabsList>
      <TabsTrigger value="table" className="gap-1.5" onClick={() => setViewMode('table')}>
        <List className="w-4 h-4" />
        Table
      </TabsTrigger>
      <TabsTrigger value="cards" className="gap-1.5" onClick={() => setViewMode('cards')}>
        <LayoutGrid className="w-4 h-4" />
        Cards
      </TabsTrigger>
    </TabsList>
  );

  const renderCredentialTable = (credentials: CredentialForReview[], loading: boolean, type: 'driver' | 'vehicle') => (
    <EnhancedTable loading={loading} skeletonRows={5} skeletonColumns={5}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Credential</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>{type === 'driver' ? 'Driver' : 'Vehicle'}</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <FileCheck2 className="w-8 h-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No credentials found</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            credentials.map((credential) => {
              const status = statusConfig[credential.displayStatus as DisplayStatus] || statusConfig.not_submitted;
              return (
                <TableRow 
                  key={credential.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleView(credential)}
                >
                  <TableCell className="font-medium">
                    {credential.credentialType.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.badgeVariant}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{getSubjectLabel(credential)}</TableCell>
                  <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground">
                      View →
                    </span>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </EnhancedTable>
  );

  const renderCredentialCards = (credentials: CredentialForReview[], loading: boolean) => {
    if (loading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      );
    }

    if (credentials.length === 0) {
      return (
        <Card className="p-12 text-center">
          <FileCheck2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No credentials found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters.
          </p>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {credentials.map((credential) => (
          <CredentialReviewCard
            key={credential.id}
            credential={credential}
            onView={handleView}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Full-width header */}
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Left: title */}
              <div className="flex-1">
                <h1 className="text-xl font-bold">Credential Review</h1>
                <p className="text-sm text-muted-foreground">
                  Review and approve driver and vehicle credentials.
                </p>
              </div>

              {/* Center: section tabs */}
              <div className="flex items-center justify-center">
                {sectionTabs}
              </div>

              {/* Right: view toggle */}
              <div className="flex-1 flex justify-end">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'cards')}>
                  {viewToggle}
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6">
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Filter bar (only for drivers/vehicles tabs) */}
            {activeTab !== 'history' && (
              <FilterBar
                searchValue={filters.search || ''}
                onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
                searchPlaceholder={activeTab === 'drivers' ? 'Search drivers or credentials...' : 'Search vehicles or credentials...'}
                filters={commonFilters}
              />
            )}

            <TabsContent value="drivers" className="mt-0">
              {viewMode === 'table' 
                ? renderCredentialTable(filteredDriver, driverLoading, 'driver')
                : renderCredentialCards(filteredDriver, driverLoading)
              }
            </TabsContent>

            <TabsContent value="vehicles" className="mt-0">
              {viewMode === 'table'
                ? renderCredentialTable(filteredVehicle, vehicleLoading, 'vehicle')
                : renderCredentialCards(filteredVehicle, vehicleLoading)
              }
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              {companyId ? <ReviewHistoryTab companyId={companyId} viewMode={viewMode} /> : null}
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}
