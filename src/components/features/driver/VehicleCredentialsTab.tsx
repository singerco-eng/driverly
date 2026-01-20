import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Clock, AlertTriangle, XCircle, Eye, Upload, ShieldCheck } from 'lucide-react';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVehicleCredentials, useEnsureVehicleCredential } from '@/hooks/useCredentials';
import type { CredentialType } from '@/types/credential';
import type { ReviewStatus } from '@/types/credentialReview';
import { CredentialRequirementsDisplay } from '@/components/features/credentials/CredentialRequirementsDisplay';
import { cn } from '@/lib/utils';

interface VehicleCredentialsTabProps {
  companyId: string;
  vehicleId: string;
}

type DisplayStatus = ReviewStatus | 'not_submitted';

interface VehicleCredential {
  id: string;
  status: string;
  displayStatus: DisplayStatus;
  submittedAt: string | null;
  expiresAt: string | null;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  credentialType: CredentialType;
  _isPlaceholder?: boolean;
  _credentialTypeId?: string;
}

const statusConfig: Record<DisplayStatus, { 
  label: string; 
  icon: React.ElementType;
  className: string;
}> = {
  pending_review: {
    label: 'Pending Review',
    icon: Clock,
    className: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  },
  awaiting_verification: {
    label: 'Awaiting Verification',
    icon: ShieldCheck,
    className: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
  },
  expiring: {
    label: 'Expiring Soon',
    icon: AlertTriangle,
    className: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
  },
  expired: {
    label: 'Expired',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-green-500/20 text-green-600 border-green-500/30',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-600 border-red-500/30',
  },
  not_submitted: {
    label: 'Not Submitted',
    icon: FileText,
    className: 'bg-muted text-muted-foreground border-muted',
  },
};

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function VehicleCredentialsTab({ companyId, vehicleId }: VehicleCredentialsTabProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data: rawCredentials = [], isLoading, error } = useVehicleCredentials(vehicleId);
  const ensureCredential = useEnsureVehicleCredential();

  // Map to common format
  const credentials: VehicleCredential[] = useMemo(() => {
    return rawCredentials.map((c) => ({
      id: c.id || `placeholder-${c.credentialType.id}`,
      status: c.status,
      displayStatus: c.displayStatus as DisplayStatus,
      submittedAt: c.submittedAt || null,
      expiresAt: c.expiresAt || null,
      isExpiringSoon: c.isExpiringSoon ?? false,
      daysUntilExpiration: c.daysUntilExpiration ?? null,
      credentialType: c.credentialType,
      _isPlaceholder: !c.id,
      _credentialTypeId: c.credentialType.id,
    }));
  }, [rawCredentials]);

  // Filter and search credentials
  const filteredCredentials = useMemo(() => {
    let result = credentials;
    
    if (searchValue) {
      const search = searchValue.toLowerCase();
      result = result.filter(c => 
        c.credentialType.name.toLowerCase().includes(search) ||
        c.credentialType.broker?.name?.toLowerCase().includes(search)
      );
    }
    
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(c => c.displayStatus === statusFilter);
    }
    
    return result;
  }, [credentials, searchValue, statusFilter]);

  // Handle credential action - ensure exists then navigate
  const handleCredentialAction = async (credential: VehicleCredential) => {
    if (credential._isPlaceholder && credential._credentialTypeId) {
      try {
        const id = await ensureCredential.mutateAsync({
          vehicleId,
          credentialTypeId: credential._credentialTypeId,
          companyId,
        });
        navigate(`/driver/vehicles/${vehicleId}/credentials/${id}`);
        return;
      } catch (err) {
        console.error('Failed to ensure credential:', err);
        return;
      }
    }
    navigate(`/driver/vehicles/${vehicleId}/credentials/${credential.id}`);
  };

  // Render credential card
  const renderCredentialCard = (credential: VehicleCredential) => {
    const status = statusConfig[credential.displayStatus] || statusConfig.pending_review;
    const StatusIcon = status.icon;
    const needsAction = credential.displayStatus === 'not_submitted' || 
                        credential.displayStatus === 'rejected' ||
                        credential.displayStatus === 'expired';

    return (
      <Card key={credential.id} className="hover:shadow-soft transition-all h-full flex flex-col">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className={cn('mb-2', status.className)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <CardTitle className="text-base truncate">{credential.credentialType.name}</CardTitle>
              {credential.credentialType.broker?.name && (
                <Badge variant="secondary" className="text-xs mt-1">
                  {credential.credentialType.broker.name}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="space-y-2 text-xs text-muted-foreground mb-3">
            <div className="flex justify-between">
              <span>Submitted:</span>
              <span>{formatDate(credential.submittedAt)}</span>
            </div>
            {credential.expiresAt && (
              <div className="flex justify-between">
                <span>Expires:</span>
                <span className={credential.isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                  {formatDate(credential.expiresAt)}
                  {credential.daysUntilExpiration !== null && credential.daysUntilExpiration > 0 && (
                    <span className="ml-1">({credential.daysUntilExpiration}d)</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Requirements:</span>
              <CredentialRequirementsDisplay
                credentialType={credential.credentialType}
                showLabels={false}
                showStepCount={true}
                size="sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            {needsAction ? (
              <Button size="sm" onClick={() => handleCredentialAction(credential)}>
                <Upload className="w-3 h-3 mr-1" />
                Start
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleCredentialAction(credential)}>
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <EnhancedDataView
        title="Vehicle Credentials"
        description="Manage credentials for this vehicle"
        defaultViewMode="card"
        cardLabel="Cards"
        tableLabel="Table"
        showViewModeToggle={true}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search credentials..."
        filters={[
          {
            value: statusFilter || 'all',
            onValueChange: (val) => setStatusFilter(val === 'all' ? '' : val),
            label: 'Status',
            placeholder: 'All Statuses',
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'not_submitted', label: 'Not Submitted' },
              { value: 'pending_review', label: 'Pending Review' },
              { value: 'awaiting_verification', label: 'Awaiting Verification' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'expiring', label: 'Expiring Soon' },
              { value: 'expired', label: 'Expired' },
            ],
          },
        ]}
        tableProps={{
          data: filteredCredentials,
          loading: isLoading,
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
                {filteredCredentials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {error ? 'Failed to load credentials' : 'No vehicle credentials found'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCredentials.map((credential) => {
                    const status = statusConfig[credential.displayStatus] || statusConfig.pending_review;
                    const StatusIcon = status.icon;
                    const needsAction = credential.displayStatus === 'not_submitted' || 
                                        credential.displayStatus === 'rejected' ||
                                        credential.displayStatus === 'expired';

                    return (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{credential.credentialType.name}</div>
                              <CredentialRequirementsDisplay
                                credentialType={credential.credentialType}
                                showLabels={false}
                                showStepCount={true}
                                size="sm"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {credential.credentialType.broker?.name ? (
                            <Badge variant="secondary">{credential.credentialType.broker.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                        <TableCell>
                          {credential.expiresAt ? (
                            <span className={credential.isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                              {formatDate(credential.expiresAt)}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {needsAction ? (
                            <Button size="sm" onClick={() => handleCredentialAction(credential)}>
                              <Upload className="w-4 h-4 mr-1" />
                              Start
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleCredentialAction(credential)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
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
          data: filteredCredentials,
          loading: isLoading,
          emptyState: (
            <Card className="p-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No credentials found</h3>
              <p className="text-muted-foreground">
                {error ? 'Failed to load credentials' : 'No vehicle credential types configured.'}
              </p>
            </Card>
          ),
          renderCard: renderCredentialCard,
        }}
      />
    </div>
  );
}
