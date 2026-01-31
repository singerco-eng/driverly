import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Upload } from 'lucide-react';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVehicleCredentials, useEnsureVehicleCredential } from '@/hooks/useCredentials';
import type { CredentialWithDisplayStatus, CredentialDisplayStatus } from '@/types/credential';
import { DriverCredentialCard } from '@/components/features/driver/DriverCredentialCard';
import { credentialStatusVariant } from '@/lib/status-styles';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

interface VehicleCredentialsTabProps {
  companyId: string;
  vehicleId: string;
}

/** Status labels for table view */
const statusLabels: Record<CredentialDisplayStatus, string> = {
  approved: 'Complete',
  rejected: 'Rejected',
  pending_review: 'Pending Review',
  not_submitted: 'Not Submitted',
  expired: 'Expired',
  expiring: 'Expiring Soon',
  awaiting: 'In Review',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

// Extended type with placeholder tracking for unsubmitted credentials
interface CredentialWithPlaceholder extends CredentialWithDisplayStatus {
  id: string; // Required for EnhancedDataView
  _isPlaceholder?: boolean;
  _credentialTypeId?: string;
}

export function VehicleCredentialsTab({ companyId, vehicleId }: VehicleCredentialsTabProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const { data: rawCredentials = [], isLoading, error } = useVehicleCredentials(vehicleId);
  const ensureCredential = useEnsureVehicleCredential();

  // Add placeholder tracking for navigation and id for EnhancedDataView
  const credentials: CredentialWithPlaceholder[] = useMemo(() => {
    return rawCredentials.map((c) => ({
      ...c,
      // Use credential id if exists, otherwise use credentialType id
      id: c.credential?.id || c.credentialType.id,
      _isPlaceholder: !c.credential?.id,
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

  // Handle credential view - ensure exists then navigate
  const handleView = async (credential: CredentialWithPlaceholder) => {
    // For placeholders (no credential id), create the credential first
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
    // For existing credentials, navigate directly
    const credentialId = credential.credential?.id;
    if (credentialId) {
      navigate(`/driver/vehicles/${vehicleId}/credentials/${credentialId}`);
    }
  };

  return (
    <div className="space-y-4">
      <EnhancedDataView
        title="Vehicle Credentials"
        description="Manage credentials for this vehicle"
        defaultViewMode="table"
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
              { value: 'awaiting', label: 'In Review' },
              { value: 'approved', label: 'Complete' },
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
                    const badgeVariant = credentialStatusVariant[credential.displayStatus] || 'outline';
                    const statusLabel = statusLabels[credential.displayStatus] || 'Unknown';
                    const needsAction = ['not_submitted', 'rejected', 'expired', 'expiring'].includes(credential.displayStatus);
                    const isAdminOnly = isAdminOnlyCredential(credential.credentialType);
                    const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;

                    return (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{credential.credentialType.name}</div>
                            {stepCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">{stepCount} steps</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant}>
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {credential.credentialType.broker?.name ? (
                            <span className="text-muted-foreground">{credential.credentialType.broker.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(credential.credential?.submitted_at)}</TableCell>
                        <TableCell>
                          {credential.credential?.expires_at ? (
                            <span className={credential.daysUntilExpiration !== null && credential.daysUntilExpiration <= 30 ? 'text-destructive font-medium' : ''}>
                              {formatDate(credential.credential.expires_at)}
                            </span>
                          ) : credential.credentialType.expiration_type === 'never' ? (
                            'Never'
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleView(credential)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {needsAction && !isAdminOnly && (
                              <Button variant="ghost" size="sm" onClick={() => handleView(credential)} title="Start">
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
          renderCard: (credential) => (
            <DriverCredentialCard
              key={credential.id}
              credential={credential}
              onView={handleView}
            />
          ),
        }}
      />
    </div>
  );
}
