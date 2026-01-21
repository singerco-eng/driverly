import { useCallback, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Clock, Check } from 'lucide-react';
import { CredentialDetailHeader } from './CredentialDetailHeader';
import { LegacyCredentialView } from './LegacyCredentialView';
import { InstructionRenderer } from '../InstructionRenderer';
import { useCredentialProgress, useUpsertCredentialProgress } from '@/hooks/useCredentialProgress';
import type { CredentialType, DriverCredential, VehicleCredential } from '@/types/credential';
import type { StepProgressData } from '@/types/credentialProgress';
import { createEmptyInstructions } from '@/types/instructionBuilder';

export type CredentialDetailMode = 'submit' | 'review' | 'preview';
export type ViewerRole = 'driver' | 'admin';
export type CredentialTable = 'driver_credentials' | 'vehicle_credentials';

interface CredentialDetailViewProps {
  /**
   * The credential type definition with instruction_config
   */
  credentialType: CredentialType;
  
  /**
   * The credential instance (driver or vehicle)
   */
  credential: DriverCredential | VehicleCredential;
  
  /**
   * Which table the credential belongs to
   */
  credentialTable: CredentialTable;
  
  /**
   * Current mode of the view
   * - submit: Driver filling out credential
   * - review: Admin reviewing/editing credential (can edit if not_submitted)
   * - preview: Preview mode (admin builder)
   */
  mode: CredentialDetailMode;
  
  /**
   * Who is viewing this
   */
  viewerRole: ViewerRole;
  
  /**
   * Called when navigating back
   */
  onBack: () => void;
  
  /**
   * Called when credential is submitted for review
   */
  onSubmit?: () => void;
  
  /**
   * Called when admin approves
   */
  onApprove?: (expirationDate: Date | null, notes: string) => void;
  
  /**
   * Called when admin rejects
   */
  onReject?: (reason: string) => void;
  
  /**
   * Additional header actions
   */
  headerActions?: React.ReactNode;
  
  /**
   * Custom back button label
   */
  backLabel?: string;
  
  /**
   * Loading state
   */
  isLoading?: boolean;
  
  /**
   * Submitting state
   */
  isSubmitting?: boolean;
  
  /**
   * Approving state
   */
  isApproving?: boolean;
  
  /**
   * Rejecting state
   */
  isRejecting?: boolean;
}

/**
 * Unified credential detail view for both drivers and admins
 * Supports both modern instruction_config and legacy submission_type
 */
export function CredentialDetailView({
  credentialType,
  credential,
  credentialTable,
  mode: initialMode,
  viewerRole,
  onBack,
  onSubmit,
  onApprove,
  onReject,
  headerActions,
  backLabel,
  isLoading = false,
  isSubmitting = false,
  isApproving = false,
  isRejecting = false,
}: CredentialDetailViewProps) {
  // Mode is now just passed from parent - no internal state changes
  const mode = initialMode;

  // Fetch existing progress
  const { data: progressRecord, isLoading: progressLoading } = useCredentialProgress(
    credential.id,
    credentialTable
  );
  const upsertProgress = useUpsertCredentialProgress();

  // Determine if we should use the new instruction renderer
  const hasInstructionConfig = Boolean(
    credentialType.instruction_config?.steps?.length
  );

  // Get the instruction config or create a default one for preview
  const instructionConfig = useMemo(() => {
    if (credentialType.instruction_config) {
      return credentialType.instruction_config;
    }
    // For preview mode without config, use empty default
    if (mode === 'preview') {
      return createEmptyInstructions();
    }
    return null;
  }, [credentialType.instruction_config, mode]);

  // Parse progress data from database
  const progressData: StepProgressData | null = useMemo(() => {
    if (progressRecord?.step_data) {
      return progressRecord.step_data as StepProgressData;
    }
    return null;
  }, [progressRecord]);

  // Handle progress changes - save to database
  const handleProgressChange = useCallback(
    (newData: StepProgressData, currentStepId: string) => {
      upsertProgress.mutate({
        credentialId: credential.id,
        credentialTable,
        currentStepId,
        stepData: newData,
      });
    },
    [credential.id, credentialTable, upsertProgress]
  );

  // Handle final submission
  const handleSubmit = useCallback(() => {
    onSubmit?.();
  }, [onSubmit]);

  // Handle legacy submission
  const handleLegacySubmit = useCallback(
    (_data: { document_url?: string; form_data?: Record<string, unknown>; notes?: string }) => {
      onSubmit?.();
    },
    [onSubmit]
  );

  // Determine if editing is disabled
  const isDisabled = useMemo(() => {
    // Preview mode is always read-only display
    if (mode === 'preview') return true;
    
    // Already approved or pending - can't edit
    if (credential.status === 'approved') return true;
    if (credential.status === 'pending_review') return true;
    
    // Admin in review mode with not_submitted credential - can edit (submit on behalf)
    if (viewerRole === 'admin' && mode === 'review' && credential.status === 'not_submitted') {
      return false;
    }
    
    // Admin reviewing a submitted credential - read-only for review
    if (viewerRole === 'admin' && mode === 'review') return true;
    
    // Driver in submit mode with not_submitted or rejected - can edit
    if (mode === 'submit' && (credential.status === 'not_submitted' || credential.status === 'rejected')) {
      return false;
    }
    
    return false;
  }, [mode, credential.status, viewerRole]);

  // Build header actions - review buttons go here for admins
  const reviewActions = useMemo(() => {
    // Show review actions for admin in review mode with pending credential
    if (viewerRole === 'admin' && mode === 'review' && credential.status === 'pending_review' && onApprove && onReject) {
      return (
        <>
          <Button
            variant="outline"
            onClick={() => {
              const reason = prompt('Enter rejection reason:');
              if (reason) onReject(reason);
            }}
            disabled={isRejecting}
          >
            {isRejecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Reject
          </Button>
          <Button
            onClick={() => onApprove(null, '')}
            disabled={isApproving}
          >
            {isApproving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            Approve
          </Button>
        </>
      );
    }
    return headerActions;
  }, [viewerRole, mode, credential.status, onApprove, onReject, isApproving, isRejecting, headerActions]);

  // Loading state
  if (isLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with integrated actions */}
      <CredentialDetailHeader
        credentialType={credentialType}
        credentialTable={credentialTable}
        status={credential.status}
        expiresAt={credential.expires_at}
        submittedAt={credential.submitted_at}
        onBack={onBack}
        backLabel={backLabel}
        actions={reviewActions}
      />

      {/* Status alerts - only show when necessary */}
      {credential.status === 'rejected' && credential.rejection_reason && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Submission Rejected</AlertTitle>
          <AlertDescription>{credential.rejection_reason}</AlertDescription>
        </Alert>
      )}

      {credential.status === 'approved' && mode === 'submit' && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertTitle>Approved</AlertTitle>
          <AlertDescription>
            This credential has been approved.
            {credential.reviewed_at && (
              <> Reviewed on {new Date(credential.reviewed_at).toLocaleDateString()}.</>
            )}
          </AlertDescription>
        </Alert>
      )}

      {credential.status === 'pending_review' && mode === 'submit' && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Pending Review</AlertTitle>
          <AlertDescription>
            Your submission is being reviewed. You'll be notified when it's approved.
          </AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {hasInstructionConfig && instructionConfig ? (
        <InstructionRenderer
          config={instructionConfig}
          progressData={progressData}
          onProgressChange={handleProgressChange}
          onSubmit={handleSubmit}
          disabled={isDisabled}
          isSubmitting={isSubmitting}
          readOnly={viewerRole === 'admin' && mode === 'review' && credential.status !== 'not_submitted'}
        />
      ) : (
        <LegacyCredentialView
          credentialType={credentialType}
          credential={credential}
          onSubmit={handleLegacySubmit}
          disabled={isDisabled}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
