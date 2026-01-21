import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  Shield,
  Eye,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useDriverAssignments } from '@/hooks/useVehicleAssignments';
import { useDriverCredentials } from '@/hooks/useCredentials';
import * as credentialService from '@/services/credentials';
import type { CredentialWithDisplayStatus, CredentialDisplayStatus } from '@/types/credential';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

/** Status config using native Badge variants per design system */
const statusConfig: Record<CredentialDisplayStatus, { 
  label: string; 
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  approved: {
    label: 'Complete',
    badgeVariant: 'default',
  },
  rejected: {
    label: 'Rejected',
    badgeVariant: 'destructive',
  },
  pending_review: {
    label: 'Pending Review',
    badgeVariant: 'secondary',
  },
  not_submitted: {
    label: 'Not Submitted',
    badgeVariant: 'outline',
  },
  expired: {
    label: 'Expired',
    badgeVariant: 'destructive',
  },
  expiring: {
    label: 'Expiring Soon',
    badgeVariant: 'outline',
  },
  awaiting: {
    label: 'In Review',
    badgeVariant: 'secondary',
  },
};

interface CredentialFilters {
  search?: string;
  status?: 'all' | 'action' | 'pending' | 'complete';
  scope?: 'all' | 'global' | 'broker';
  category?: 'all' | 'driver' | 'vehicle';
  broker?: 'all' | string;
}

// Extend for EnhancedDataView compatibility
interface CredentialWithId extends CredentialWithDisplayStatus {
  id: string;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function DriverCredentials() {
  const { user } = useAuth();
  const { brokerId } = useParams<{ brokerId?: string }>();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CredentialFilters>({
    status: 'all',
    scope: brokerId ? 'broker' : 'all',
    category: 'all',
    broker: 'all',
  });
  const activeBrokerId =
    brokerId || (filters.broker && filters.broker !== 'all' ? filters.broker : undefined);

  const { data: driver, isLoading: driverLoading } = useDriverByUserId(user?.id);
  const driverId = driver?.id;

  const { data: driverCredentials, isLoading: driverCredentialsLoading } =
    useDriverCredentials(driverId);
  const { data: assignments } = useDriverAssignments(driverId);

  const vehicleIds = useMemo(
    () => (assignments || []).map((assignment) => assignment.vehicle_id),
    [assignments],
  );

  const vehicleCredentialQueries = useQueries({
    queries: vehicleIds.map((vehicleId) => ({
      queryKey: ['vehicle-credentials', vehicleId],
      queryFn: () => credentialService.getVehicleCredentials(vehicleId),
      enabled: !!vehicleId,
    })),
  });

  const vehicleCredentials = useMemo(
    () => vehicleCredentialQueries.flatMap((query) => query.data || []),
    [vehicleCredentialQueries],
  );

  const credentialsLoading =
    driverCredentialsLoading || vehicleCredentialQueries.some((query) => query.isLoading);

  const allCredentials = useMemo(
    () => [...(driverCredentials || []), ...vehicleCredentials],
    [driverCredentials, vehicleCredentials],
  );

  // Get unique brokers for grouping
  const brokers = useMemo(() => {
    const brokerMap = new Map<string, { id: string; name: string }>();
    allCredentials.forEach((c) => {
      if (c.credentialType.scope === 'broker' && c.credentialType.broker) {
        brokerMap.set(c.credentialType.broker.id, c.credentialType.broker);
      }
    });
    return Array.from(brokerMap.values());
  }, [allCredentials]);

  // Filter credentials
  const filteredCredentials = useMemo(() => {
    if (!allCredentials.length) return [];

    return allCredentials.filter((item) => {
      // If filtering by specific broker
      if (activeBrokerId && item.credentialType.broker?.id !== activeBrokerId) {
        return false;
      }

      if (filters.category && filters.category !== 'all' && item.credentialType.category !== filters.category) {
        return false;
      }

      // Search filter
      const matchesSearch =
        !filters.search ||
        item.credentialType.name.toLowerCase().includes(filters.search.toLowerCase());

      // Status filter
      let matchesStatus = true;
      if (filters.status === 'action') {
        matchesStatus = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus);
      } else if (filters.status === 'pending') {
        matchesStatus = ['pending_review', 'awaiting'].includes(item.displayStatus);
      } else if (filters.status === 'complete') {
        matchesStatus = item.displayStatus === 'approved';
      }

      // Scope filter
      const matchesScope =
        filters.scope === 'all' || item.credentialType.scope === filters.scope;

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [allCredentials, filters, activeBrokerId]);

  // Add id field for EnhancedDataView compatibility
  const credentialsWithId: CredentialWithId[] = useMemo(() => {
    return filteredCredentials.map((item) => ({
      ...item,
      id: `${item.credentialType.id}-${item.credentialType.category}`,
    }));
  }, [filteredCredentials]);

  // Counts for badges
  const counts = useMemo(() => {
    const scoped = allCredentials.filter((item) => {
      if (activeBrokerId && item.credentialType.broker?.id !== activeBrokerId) return false;
      if (filters.category && filters.category !== 'all' && item.credentialType.category !== filters.category) {
        return false;
      }
      if (filters.scope && filters.scope !== 'all' && item.credentialType.scope !== filters.scope) {
        return false;
      }
      return true;
    });

    return {
      action: scoped.filter((item) =>
        ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus)
      ).length,
      pending: scoped.filter((item) =>
        ['pending_review', 'awaiting'].includes(item.displayStatus)
      ).length,
      complete: scoped.filter((item) => item.displayStatus === 'approved').length,
    };
  }, [allCredentials, activeBrokerId, filters.category, filters.scope]);

  // Navigate to credential detail
  const handleView = (credential: CredentialWithDisplayStatus) => {
    navigate(`/driver/credentials/${credential.credentialType.id}`);
  };

  // Description with counts
  const description = useMemo(() => {
    const count = filteredCredentials.length;
    const actionCount = counts.action;
    if (activeBrokerId) {
      const brokerName = brokers.find((b) => b.id === activeBrokerId)?.name || 'Broker';
      return `${brokerName} credentials · ${count} total`;
    }
    return actionCount > 0
      ? `${count} credential${count !== 1 ? 's' : ''} · ${actionCount} need action`
      : `${count} credential${count !== 1 ? 's' : ''}`;
  }, [filteredCredentials.length, counts.action, activeBrokerId, brokers]);

  // Render credential card - matching admin pattern with simplified DS-compliant design
  const renderCredentialCard = (item: CredentialWithId) => {
    const status = statusConfig[item.displayStatus] || statusConfig.not_submitted;
    const stepCount = item.credentialType.instruction_config?.steps?.length || 0;
    const needsAction = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus);
    const isAdminOnly = isAdminOnlyCredential(item.credentialType);

    return (
      <Card 
        key={item.id} 
        className="hover:shadow-soft transition-all cursor-pointer group"
        onClick={() => handleView(item)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{item.credentialType.name}</p>
                {item.credentialType.broker?.name && (
                  <p className="text-xs text-muted-foreground">{item.credentialType.broker.name}</p>
                )}
              </div>
            </div>
            <Badge variant={status.badgeVariant}>
              {status.label}
            </Badge>
          </div>
          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {item.credential?.submitted_at && (
              <span>Submitted {formatDate(item.credential.submitted_at)}</span>
            )}
            {item.credential?.submitted_at && stepCount > 0 && (
              <span className="text-border">·</span>
            )}
            {stepCount > 0 && (
              <span>{stepCount} steps</span>
            )}
            {item.credential?.expires_at && (
              <>
                <span className="text-border">·</span>
                <span className={item.daysUntilExpiration !== null && item.daysUntilExpiration <= 30 ? 'text-destructive' : ''}>
                  Expires {formatDate(item.credential.expires_at)}
                </span>
              </>
            )}
          </div>
          {/* Action hint for items needing attention */}
          {needsAction && !isAdminOnly && (
            <div className="flex justify-end pt-2 border-t">
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleView(item); }}>
                <Upload className="w-3 h-3 mr-1" />
                Start
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Loading skeleton
  if (driverLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!driverId) {
    return (
      <Card className="p-12 text-center">
        <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Driver Profile Not Found</h3>
        <p className="text-muted-foreground">
          We couldn't find your driver profile. Please contact support.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <EnhancedDataView
        title={brokerId ? `Broker Credentials` : 'Credentials'}
        description={description}
        defaultViewMode="card"
        cardLabel="Cards"
        tableLabel="Table"
        showViewModeToggle={true}
        searchValue={filters.search || ''}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        searchPlaceholder="Search credentials..."
        filters={[
          {
            value: filters.category || 'all',
            onValueChange: (value) =>
              setFilters((prev) => ({ ...prev, category: value as CredentialFilters['category'] })),
            label: 'Type',
            placeholder: 'All Types',
            options: [
              { value: 'all', label: 'All Types' },
              { value: 'driver', label: 'Driver' },
              { value: 'vehicle', label: 'Vehicle' },
            ],
          },
          {
            value: filters.status || 'all',
            onValueChange: (value) =>
              setFilters((prev) => ({ ...prev, status: value as CredentialFilters['status'] })),
            label: 'Status',
            placeholder: 'All Status',
            options: [
              { value: 'all', label: 'All Status' },
              { value: 'action', label: `Action Needed (${counts.action})` },
              { value: 'pending', label: `Pending (${counts.pending})` },
              { value: 'complete', label: `Complete (${counts.complete})` },
            ],
          },
          ...(brokerId || brokers.length === 0
            ? []
            : [
                {
                  value: filters.broker || 'all',
                  onValueChange: (value: string) =>
                    setFilters((prev) => ({ ...prev, broker: value })),
                  label: 'Broker',
                  placeholder: 'All Brokers',
                  options: [
                    { value: 'all', label: 'All Brokers' },
                    ...brokers.map((broker) => ({
                      value: broker.id,
                      label: broker.name,
                    })),
                  ],
                },
              ]),
          ...(brokerId
            ? []
            : [
                {
                  value: filters.scope || 'all',
                  onValueChange: (value: string) =>
                    setFilters((prev) => ({ ...prev, scope: value as CredentialFilters['scope'] })),
                  label: 'Scope',
                  placeholder: 'All Scopes',
                  options: [
                    { value: 'all', label: 'All Scopes' },
                    { value: 'global', label: 'Global' },
                    { value: 'broker', label: 'Broker Specific' },
                  ],
                },
              ]),
        ]}
        tableProps={{
          data: credentialsWithId,
          loading: credentialsLoading,
          children: (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Credential</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentialsWithId.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No credentials found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  credentialsWithId.map((item) => {
                    const status = statusConfig[item.displayStatus] || statusConfig.not_submitted;
                    const stepCount = item.credentialType.instruction_config?.steps?.length || 0;
                    const isGlobal = item.credentialType.scope === 'global';
                    const needsAction = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(item.displayStatus);
                    const isAdminOnly = isAdminOnlyCredential(item.credentialType);

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.credentialType.name}</div>
                            {stepCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">{stepCount} steps</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.badgeVariant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isGlobal ? (
                            <span className="text-muted-foreground">Global</span>
                          ) : (
                            <span className="text-muted-foreground">
                              {item.credentialType.broker?.name || 'Broker'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.credential?.submitted_at)}</TableCell>
                        <TableCell>
                          {item.credential?.expires_at ? (
                            <span className={item.daysUntilExpiration !== null && item.daysUntilExpiration <= 30 ? 'text-destructive font-medium' : ''}>
                              {formatDate(item.credential.expires_at)}
                            </span>
                          ) : item.credentialType.expiration_type === 'never' ? (
                            'Never'
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleView(item)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {needsAction && !isAdminOnly && (
                              <Button variant="ghost" size="sm" onClick={() => handleView(item)} title="Start">
                                <Upload className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ),
        }}
        cardProps={{
          data: credentialsWithId,
          loading: credentialsLoading,
          emptyState: (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No credentials found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.status !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'Credentials will appear here once configured.'}
              </p>
            </Card>
          ),
          renderCard: renderCredentialCard,
        }}
      />
    </div>
  );
}
