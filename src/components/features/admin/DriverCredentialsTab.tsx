import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Check, X, ShieldCheck, Calendar, Clock, ListChecks, Building2 } from 'lucide-react';
import { EnhancedDataView } from '@/components/ui/enhanced-data-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ApproveCredentialModal } from '@/components/features/admin/ApproveCredentialModal';
import { RejectCredentialModal } from '@/components/features/admin/RejectCredentialModal';
import { VerifyCredentialModal } from '@/components/features/admin/VerifyCredentialModal';
import { useDriverCredentialsForAdmin } from '@/hooks/useCredentialReview';
import { useAdminEnsureDriverCredential } from '@/hooks/useCredentials';
import type { CredentialForReview, ReviewStatus } from '@/types/credentialReview';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';
import { formatDate } from '@/lib/formatters';

interface DriverCredentialsTabProps {
  companyId: string;
  driverId: string;
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

export function DriverCredentialsTab({ companyId, driverId }: DriverCredentialsTabProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Use the new admin hook that shows ALL credential types
  const { data, isLoading, error } = useDriverCredentialsForAdmin(companyId, driverId);
  const ensureCredential = useAdminEnsureDriverCredential();
  
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
          driverId,
          credentialTypeId: credential._credentialTypeId,
          companyId,
        });
        navigate(`/admin/drivers/${driverId}/credentials/${result.id}`);
        return;
      } catch (err) {
        console.error('Failed to ensure credential:', err);
        return;
      }
    }
    navigate(`/admin/drivers/${driverId}/credentials/${credential.id}`);
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

  // Render credential card for card view - standardized pattern
  const renderCredentialCard = (credential: CredentialForReview) => {
    const status = statusConfig[credential.displayStatus] || statusConfig.pending_review;
    const stepCount = credential.credentialType.instruction_config?.steps?.length || 0;
    const isComplete = credential.displayStatus === 'approved';

    return (
      <Card 
        key={credential.id} 
        className="h-full flex flex-col hover:shadow-soft transition-all"
      >
        <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
          {/* Header row with badge */}
          <div className="flex items-center justify-between">
            <Badge variant={status.badgeVariant}>
              {status.label}
            </Badge>
          </div>

          {/* Centered icon and credential info */}
          <div 
            className="flex flex-col items-center text-center cursor-pointer"
            onClick={() => handleView(credential)}
          >
            {/* Credential Icon */}
            <div className={`
              h-12 w-12 rounded-lg flex items-center justify-center mb-2
              ${isComplete ? 'bg-primary-muted/15 text-primary-muted' : 'bg-muted text-muted-foreground'}
            `}>
              <FileText className="h-6 w-6" />
            </div>

            {/* Credential Name */}
            <h3 className="font-semibold">{credential.credentialType.name}</h3>

            {/* Broker info */}
            {credential.credentialType.broker?.name && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{credential.credentialType.broker.name}</span>
              </div>
            )}
          </div>

          {/* Metadata Section */}
          <div className="border-t pt-3 space-y-2 text-sm">
            {/* Submitted Date */}
            {credential.submittedAt && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>Submitted {formatDate(credential.submittedAt)}</span>
              </div>
            )}

            {/* Steps */}
            {stepCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ListChecks className="h-4 w-4 shrink-0" />
                <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
              </div>
            )}

            {/* Expiration */}
            {credential.expiresAt && (
              <div className={`flex items-center gap-2 ${
                credential.isExpiringSoon ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                <Clock className="h-4 w-4 shrink-0" />
                <span>Expires {formatDate(credential.expiresAt)}</span>
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-auto"
            onClick={() => handleView(credential)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <EnhancedDataView
        title="Driver Credentials"
        description="Manage and review credentials for this driver"
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
                          {error ? 'Failed to load credentials' : 'No driver credentials configured'}
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
                {error ? 'Failed to load credentials' : 'No driver credential types configured for this company.'}
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
