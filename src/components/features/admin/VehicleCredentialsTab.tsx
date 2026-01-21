import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Check, X, ShieldCheck } from 'lucide-react';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApproveCredentialModal } from '@/components/features/admin/ApproveCredentialModal';
import { RejectCredentialModal } from '@/components/features/admin/RejectCredentialModal';
import { VerifyCredentialModal } from '@/components/features/admin/VerifyCredentialModal';
import { useVehicleCredentialsForAdmin } from '@/hooks/useCredentialReview';
import { useAdminEnsureVehicleCredential } from '@/hooks/useCredentials';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';
import { cn } from '@/lib/utils';

interface VehicleCredentialsTabProps {
  companyId: string;
  vehicleId: string;
}

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

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export function VehicleCredentialsTab({ companyId, vehicleId }: VehicleCredentialsTabProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Use the new admin hook that shows ALL credential types
  const { data, isLoading, error } = useVehicleCredentialsForAdmin(companyId, vehicleId);
  const ensureCredential = useAdminEnsureVehicleCredential();
  
  const [selected, setSelected] = useState<CredentialForReview | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);

  // Filter and search credentials
  const filteredCredentials = useMemo(() => {
    let result = data || [];
    
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
  }, [data, searchValue, statusFilter]);

  // Handle view action - navigates to detail page
  const handleView = async (
    credential: CredentialForReview & { _isPlaceholder?: boolean; _credentialTypeId?: string }
  ) => {
    // If this is a placeholder, create the real record first then navigate
    if (credential._isPlaceholder && credential._credentialTypeId) {
      try {
        const result = await ensureCredential.mutateAsync({
          vehicleId,
          credentialTypeId: credential._credentialTypeId,
          companyId,
        });
        navigate(`/admin/vehicles/${vehicleId}/credentials/${result.id}`);
        return;
      } catch (err) {
        console.error('Failed to ensure credential:', err);
        return;
      }
    }
    navigate(`/admin/vehicles/${vehicleId}/credentials/${credential.id}`);
  };

  // Handle approve/reject/verify actions - opens modals
  const handleCredentialAction = (
    credential: CredentialForReview,
    action: 'approve' | 'reject' | 'verify'
  ) => {
    setSelected(credential);
    if (action === 'approve') setApproveOpen(true);
    if (action === 'reject') setRejectOpen(true);
    if (action === 'verify') setVerifyOpen(true);
  };

  const handleApprove = (credential: CredentialForReview) => handleCredentialAction(credential, 'approve');
  const handleReject = (credential: CredentialForReview) => handleCredentialAction(credential, 'reject');
  const handleVerify = (credential: CredentialForReview) => handleCredentialAction(credential, 'verify');

  // Render credential card for card view - simplified per DS guidelines
  const renderCredentialCard = (credential: CredentialForReview) => {
    const status = statusConfig[credential.displayStatus] || statusConfig.pending_review;
    const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;

    return (
      <Card 
        key={credential.id} 
        className="hover:shadow-soft transition-all cursor-pointer group"
        onClick={() => handleView(credential)}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{credential.credentialType.name}</p>
                {credential.credentialType.broker?.name && (
                  <p className="text-xs text-muted-foreground">{credential.credentialType.broker.name}</p>
                )}
              </div>
            </div>
            <Badge variant={status.badgeVariant}>
              {status.label}
            </Badge>
          </div>
          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {credential.submittedAt && (
              <span>Submitted {formatDate(credential.submittedAt)}</span>
            )}
            {credential.submittedAt && stepCount > 0 && (
              <span className="text-border">·</span>
            )}
            {stepCount > 0 && (
              <span>{stepCount} steps</span>
            )}
            {credential.expiresAt && (
              <>
                <span className="text-border">·</span>
                <span className={credential.isExpiringSoon ? 'text-destructive' : ''}>
                  Expires {formatDate(credential.expiresAt)}
                </span>
              </>
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
        description="Manage and review credentials for this vehicle"
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
                          {error ? 'Failed to load credentials' : 'No vehicle credentials configured'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCredentials.map((credential) => {
                    const status = statusConfig[credential.displayStatus] || statusConfig.pending_review;
                    const isAdminOnly = isAdminOnlyCredential(credential.credentialType);
                    const showApproveReject = credential.displayStatus === 'pending_review' && !isAdminOnly;
                    const showVerify = credential.displayStatus === 'awaiting_verification';

                    return (
                      <TableRow key={credential.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{credential.credentialType.name}</div>
                              {credential.credentialType.broker?.name && (
                                <span className="text-xs text-muted-foreground">{credential.credentialType.broker.name}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.badgeVariant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {credential.credentialType.broker?.name ? (
                            <Badge variant="outline">{credential.credentialType.broker.name}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Global</span>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(credential.submittedAt)}</TableCell>
                        <TableCell>
                          {credential.expiresAt ? (
                            <span className={credential.isExpiringSoon ? 'text-destructive font-medium' : ''}>
                              {formatDate(credential.expiresAt)}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleView(credential)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            {showApproveReject && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleReject(credential)}>
                                  <X className="w-4 h-4 text-destructive" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleApprove(credential)}>
                                  <Check className="w-4 h-4 text-primary" />
                                </Button>
                              </>
                            )}
                            {showVerify && (
                              <Button variant="ghost" size="sm" onClick={() => handleVerify(credential)}>
                                <ShieldCheck className="w-4 h-4" />
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
                {error ? 'Failed to load credentials' : 'No vehicle credential types configured for this company.'}
              </p>
            </Card>
          ),
          renderCard: renderCredentialCard,
        }}
      />

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
