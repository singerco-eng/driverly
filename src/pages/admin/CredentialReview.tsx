import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes, useBrokers } from '@/hooks/useCredentialTypes';
import {
  useDriverCredentialsForReview,
  useVehicleCredentialsForReview,
} from '@/hooks/useCredentialReview';
import type { CredentialForReview, ReviewQueueFilters, ReviewStatus } from '@/types/credentialReview';
import { CredentialReviewCard } from '@/components/features/admin/CredentialReviewCard';
import { ApproveCredentialModal } from '@/components/features/admin/ApproveCredentialModal';
import { RejectCredentialModal } from '@/components/features/admin/RejectCredentialModal';
import { VerifyCredentialModal } from '@/components/features/admin/VerifyCredentialModal';
import { ReviewHistoryTab } from '@/components/features/admin/ReviewHistoryTab';

type DisplayStatus = ReviewStatus | 'not_submitted';

const statusStyles: Record<DisplayStatus, string> = {
  pending_review: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  awaiting_verification: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  expiring: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  expired: 'bg-red-500/20 text-red-600 border-red-500/30',
  approved: 'bg-green-500/20 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-600 border-red-500/30',
  not_submitted: 'bg-muted text-muted-foreground border-muted',
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

  const [selected, setSelected] = useState<CredentialForReview | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  const filteredDriver = useMemo(() => {
    return (driverCredentials || []).filter((credential) => {
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

  const handleApprove = (credential: CredentialForReview) => {
    setSelected(credential);
    setApproveOpen(true);
  };

  const handleReject = (credential: CredentialForReview) => {
    setSelected(credential);
    setRejectOpen(true);
  };

  const handleVerify = (credential: CredentialForReview) => {
    setSelected(credential);
    setVerifyOpen(true);
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
        ...(credentialTypes || []).map((type) => ({ value: type.id, label: type.name })),
      ],
    },
    {
      value: filters.brokerId || 'all',
      onValueChange: (value: string) =>
        setFilters((prev) => ({ ...prev, brokerId: value === 'all' ? undefined : value })),
      label: 'Broker',
      placeholder: 'All Brokers',
      options: [
        { value: 'all', label: 'All Brokers' },
        ...(brokers || []).map((broker) => ({ value: broker.id, label: broker.name })),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Credential Review</h1>
        <p className="text-muted-foreground">Review and approve driver and vehicle credentials.</p>
      </div>

      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="drivers">Driver Credentials</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Credentials</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="mt-6">
          <EnhancedDataView
            title="Driver Credentials"
            description={`Review ${filteredDriver.length} credentials`}
            searchValue={filters.search || ''}
            onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            searchPlaceholder="Search drivers or credentials..."
            filters={commonFilters}
            tableProps={{
              data: filteredDriver,
              loading: driverLoading,
              children: (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credential</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDriver.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileCheck2 className="w-8 h-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No credentials found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDriver.map((credential) => (
                        <TableRow key={credential.id}>
                          <TableCell className="font-medium">
                            {credential.credentialType.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusStyles[credential.displayStatus as DisplayStatus] || statusStyles.not_submitted}
                            >
                              {credential.displayStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{getSubjectLabel(credential)}</TableCell>
                          <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                          <TableCell className="space-x-2">
                            <button
                              className="text-sm text-primary hover:underline"
                              onClick={() => handleView(credential)}
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ),
            }}
            cardProps={{
              data: filteredDriver,
              loading: driverLoading,
              emptyState: (
                <Card className="p-12 text-center">
                  <FileCheck2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No credentials found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </Card>
              ),
              renderCard: (credential) => (
                <CredentialReviewCard
                  key={credential.id}
                  credential={credential}
                  onView={handleView}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onVerify={handleVerify}
                />
              ),
            }}
          />
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6">
          <EnhancedDataView
            title="Vehicle Credentials"
            description={`Review ${filteredVehicle.length} credentials`}
            searchValue={filters.search || ''}
            onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
            searchPlaceholder="Search vehicles or credentials..."
            filters={commonFilters}
            tableProps={{
              data: filteredVehicle,
              loading: vehicleLoading,
              children: (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Credential</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicle.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <FileCheck2 className="w-8 h-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No credentials found</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVehicle.map((credential) => (
                        <TableRow key={credential.id}>
                          <TableCell className="font-medium">
                            {credential.credentialType.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={statusStyles[credential.displayStatus as DisplayStatus] || statusStyles.not_submitted}
                            >
                              {credential.displayStatus.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>{getSubjectLabel(credential)}</TableCell>
                          <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                          <TableCell className="space-x-2">
                            <button
                              className="text-sm text-primary hover:underline"
                              onClick={() => handleView(credential)}
                            >
                              View
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ),
            }}
            cardProps={{
              data: filteredVehicle,
              loading: vehicleLoading,
              emptyState: (
                <Card className="p-12 text-center">
                  <FileCheck2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No credentials found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search or filters.
                  </p>
                </Card>
              ),
              renderCard: (credential) => (
                <CredentialReviewCard
                  key={credential.id}
                  credential={credential}
                  onView={handleView}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onVerify={handleVerify}
                />
              ),
            }}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {companyId ? <ReviewHistoryTab companyId={companyId} /> : null}
        </TabsContent>
      </Tabs>

      <ApproveCredentialModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        credential={selected}
      />
      <RejectCredentialModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        credential={selected}
      />
      <VerifyCredentialModal
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        credential={selected}
      />
    </div>
  );
}
