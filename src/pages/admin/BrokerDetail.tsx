import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  useApproveAssignment,
  useBroker,
  useBrokerAssignments,
  useBrokerRates,
  useCurrentBrokerRates,
  useDenyAssignment,
  useRemoveDriverFromBroker,
  useUpdateBrokerStatus,
} from '@/hooks/useBrokers';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar } from '@/components/ui/filter-bar';
import {
  EnhancedTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  MoreVertical,
  Users,
  FileCheck,
  MapPin,
  XCircle,
  Trash2,
} from 'lucide-react';
import AssignDriversModal from '@/components/features/admin/AssignDriversModal';
import type { AssignmentStatus, BrokerStatus, DriverBrokerAssignment, VehicleType } from '@/types/broker';

const statusStyles: Record<BrokerStatus, string> = {
  active: 'bg-green-500/20 text-green-600 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

const assignmentStatusStyles: Record<AssignmentStatus, string> = {
  assigned: 'bg-green-500/20 text-green-600 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
  removed: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
};

const vehicleTypeLabels: Record<VehicleType, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  minivan: 'Minivan',
  wheelchair_van: 'Wheelchair Van',
  stretcher_van: 'Stretcher Van',
};

export default function BrokerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const companyId = profile?.company_id;

  const { data: broker, isLoading, error } = useBroker(id || '');
  const { data: assignments, isLoading: assignmentsLoading } = useBrokerAssignments(id || undefined);
  const { data: currentRates, isLoading: ratesLoading } = useCurrentBrokerRates(id || undefined);
  const { data: rateHistory } = useBrokerRates(id || undefined);
  const { data: credentialTypes, isLoading: credentialsLoading } = useCredentialTypes(companyId ?? undefined);

  const updateStatus = useUpdateBrokerStatus();
  const approveAssignment = useApproveAssignment();
  const denyAssignment = useDenyAssignment();
  const removeAssignment = useRemoveDriverFromBroker();

  const [assignOpen, setAssignOpen] = useState(false);

  // Drivers tab filters
  const [driverSearch, setDriverSearch] = useState('');
  const [driverStatusFilter, setDriverStatusFilter] = useState<AssignmentStatus | 'all'>('all');

  const brokerCredentials = useMemo(() => {
    return (credentialTypes || []).filter(
      (type) => type.scope === 'broker' && type.broker_id === broker?.id,
    );
  }, [credentialTypes, broker?.id]);

  const assignedCount = assignments?.filter((a) => a.status === 'assigned').length ?? 0;
  const pendingCount = assignments?.filter((a) => a.status === 'pending').length ?? 0;

  // Filtered assignments for the Drivers tab
  const filteredAssignments = useMemo(() => {
    return (assignments || []).filter((assignment) => {
      const matchesSearch =
        !driverSearch ||
        assignment.driver?.user?.full_name?.toLowerCase().includes(driverSearch.toLowerCase()) ||
        assignment.driver?.user?.email?.toLowerCase().includes(driverSearch.toLowerCase());
      const matchesStatus = driverStatusFilter === 'all' || assignment.status === driverStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [assignments, driverSearch, driverStatusFilter]);

  // Clear all filters handler for Drivers tab
  const handleClearDriverFilters = () => {
    setDriverSearch('');
    setDriverStatusFilter('all');
  };

  const handleStatusChange = (status: BrokerStatus) => {
    if (!broker) return;
    updateStatus.mutate({ id: broker.id, status });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !broker) {
    return (
      <div className="text-center py-12">
        <h2 className="text-lg font-semibold text-destructive">Broker not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/brokers')}>
          Back to Brokers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/brokers"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Brokers
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
            {broker.logo_url ? (
              <img src={broker.logo_url} alt={broker.name} className="w-12 h-12 object-contain" />
            ) : (
              <Building2 className="w-7 h-7 text-muted-foreground" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{broker.name}</h1>
              <Badge variant="outline" className={statusStyles[broker.status]}>
                {broker.status}
              </Badge>
            </div>
            <div className="text-muted-foreground">{broker.contact_email || '—'}</div>
            {broker.code && <Badge variant="secondary" className="mt-2">{broker.code}</Badge>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setAssignOpen(true)}>Assign Drivers</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={!isAdmin}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {broker.status === 'active' && (
                <DropdownMenuItem onClick={() => handleStatusChange('inactive')}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Set Inactive
                </DropdownMenuItem>
              )}
              {broker.status === 'inactive' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Set Active
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAssignOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Assign Drivers
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="rates">Rates</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Driver Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-semibold">{assignedCount}</span>
                  <span className="text-sm text-muted-foreground">Assigned</span>
                </div>
                <div className="text-sm text-muted-foreground">{pendingCount} pending</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Required Credentials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-semibold">{brokerCredentials.length}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => navigate('/admin/settings/credentials')}
                >
                  Manage Credentials
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Service Area
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-semibold">{broker.service_states.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {broker.service_states.length ? broker.service_states.join(', ') : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Contact & Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>{broker.contact_name || '—'}</div>
                <div className="text-muted-foreground">{broker.contact_email || '—'}</div>
                <div className="text-muted-foreground">{broker.contact_phone || '—'}</div>
                <div className="text-muted-foreground">
                  {[broker.address_line1, broker.address_line2, broker.city, broker.state, broker.zip_code]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Vehicle Types</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {broker.accepted_vehicle_types.length ? (
                      broker.accepted_vehicle_types.map((type) => (
                        <Badge key={type} variant="secondary" className="capitalize">
                          {vehicleTypeLabels[type]}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Employment Types</div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {broker.accepted_employment_types.length ? (
                      broker.accepted_employment_types.map((type) => (
                        <Badge key={type} variant="secondary" className="uppercase">
                          {type}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="drivers" className="mt-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium">Driver Assignments</h3>
            <p className="text-sm text-muted-foreground">
              {filteredAssignments.length} {filteredAssignments.length === 1 ? 'assignment' : 'assignments'}
            </p>
          </div>

          {/* DS-compliant FilterBar */}
          <FilterBar
            searchValue={driverSearch}
            onSearchChange={setDriverSearch}
            searchPlaceholder="Search by name or email..."
            searchLabel="Search"
            filters={[
              {
                value: driverStatusFilter,
                onValueChange: (v) => setDriverStatusFilter(v as AssignmentStatus | 'all'),
                label: 'Status',
                placeholder: 'All Status',
                options: [
                  { value: 'all', label: 'All Status' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'removed', label: 'Removed' },
                ],
              },
            ]}
            onClearAll={handleClearDriverFilters}
            showClearAll
          />

          {/* DS-compliant EnhancedTable with loading state */}
          <EnhancedTable
            loading={assignmentsLoading}
            skeletonRows={3}
            skeletonColumns={5}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>Employment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {driverSearch || driverStatusFilter !== 'all'
                            ? 'No matching assignments found'
                            : 'No drivers assigned yet'}
                        </p>
                        {!driverSearch && driverStatusFilter === 'all' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => setAssignOpen(true)}
                          >
                            Assign Drivers
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <DriverAssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      onApprove={() => approveAssignment.mutate(assignment.id)}
                      onDeny={() => denyAssignment.mutate({ assignmentId: assignment.id })}
                      onRemove={() => removeAssignment.mutate({ assignmentId: assignment.id })}
                      isApproving={approveAssignment.isPending}
                      isDenying={denyAssignment.isPending}
                      isRemoving={removeAssignment.isPending}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </EnhancedTable>
        </TabsContent>

        <TabsContent value="credentials" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Broker Credentials</h3>
              <p className="text-sm text-muted-foreground">
                Credentials required specifically for this broker.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/settings/credentials')}>
              Manage Credential Types
            </Button>
          </div>

          {/* DS-compliant EnhancedTable with loading state */}
          <EnhancedTable
            loading={credentialsLoading}
            skeletonRows={3}
            skeletonColumns={3}
          >
            {brokerCredentials.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credential Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Requirement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokerCredentials.map((cred) => (
                    <TableRow key={cred.id}>
                      <TableCell className="font-medium">{cred.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cred.description || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {cred.requirement}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Card className="p-8 text-center">
                <FileCheck className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium">No broker credentials</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Create broker-scoped credential types to track requirements.
                </p>
              </Card>
            )}
          </EnhancedTable>
        </TabsContent>

        <TabsContent value="rates" className="mt-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium">Current Rates</h3>
            <p className="text-sm text-muted-foreground">
              Effective rates currently in use for this broker.
            </p>
          </div>

          {/* DS-compliant EnhancedTable with loading state */}
          <EnhancedTable
            loading={ratesLoading}
            skeletonRows={3}
            skeletonColumns={4}
          >
            {currentRates?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Per Mile Rate</TableHead>
                    <TableHead>Effective From</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell className="font-medium">
                        {vehicleTypeLabels[rate.vehicle_type]}
                      </TableCell>
                      <TableCell>${rate.base_rate.toFixed(2)}</TableCell>
                      <TableCell>${rate.per_mile_rate.toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {rate.effective_from}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Card className="p-8 text-center">
                <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <h4 className="font-medium">No current rates</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Add rates in the broker creation flow or update later.
                </p>
              </Card>
            )}
          </EnhancedTable>

          <div className="pt-4">
            <h4 className="text-md font-medium mb-3">Rate History</h4>
            {rateHistory?.length ? (
              <EnhancedTable>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Type</TableHead>
                      <TableHead>Base Rate</TableHead>
                      <TableHead>Per Mile Rate</TableHead>
                      <TableHead>Effective From</TableHead>
                      <TableHead>Effective To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateHistory.map((rate) => (
                      <TableRow key={rate.id}>
                        <TableCell className="font-medium">
                          {vehicleTypeLabels[rate.vehicle_type]}
                        </TableCell>
                        <TableCell>${rate.base_rate.toFixed(2)}</TableCell>
                        <TableCell>${rate.per_mile_rate.toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {rate.effective_from}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {rate.effective_to || 'Current'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </EnhancedTable>
            ) : (
              <p className="text-sm text-muted-foreground">No rate history available.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <AssignDriversModal broker={broker} open={assignOpen} onOpenChange={setAssignOpen} />
    </div>
  );
}

// Extracted row component for driver assignments
function DriverAssignmentRow({
  assignment,
  onApprove,
  onDeny,
  onRemove,
  isApproving,
  isDenying,
  isRemoving,
}: {
  assignment: DriverBrokerAssignment;
  onApprove: () => void;
  onDeny: () => void;
  onRemove: () => void;
  isApproving: boolean;
  isDenying: boolean;
  isRemoving: boolean;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm">
              {assignment.driver?.user?.full_name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          <div>
            <div className="font-medium">
              {assignment.driver?.user?.full_name || 'Unknown Driver'}
            </div>
            <div className="text-sm text-muted-foreground">
              {assignment.driver?.user?.email || '—'}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary" className="uppercase">
          {assignment.driver?.employment_type || '—'}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={assignmentStatusStyles[assignment.status]}>
          {assignment.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {new Date(assignment.requested_at).toLocaleDateString()}
        </div>
        <div className="text-xs text-muted-foreground">by {assignment.requested_by}</div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {assignment.status === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={onApprove}
                disabled={isApproving}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onDeny}
                disabled={isDenying}
              >
                Deny
              </Button>
            </>
          )}
          {assignment.status === 'assigned' && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={isRemoving}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
