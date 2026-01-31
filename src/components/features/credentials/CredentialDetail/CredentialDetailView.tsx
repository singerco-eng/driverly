import { useCallback, useMemo, useState, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Clock, Check, History } from 'lucide-react';
import { CredentialDetailHeader } from './CredentialDetailHeader';
import { LegacyCredentialView } from './LegacyCredentialView';
import { CredentialHistoryTab } from './CredentialHistoryTab';
import { InstructionRenderer } from '../InstructionRenderer';
import { CredentialProgressIndicator, type SectionProgress } from '../CredentialProgressIndicator';
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

  // Section progress for the side indicator (only for instruction-based credentials)
  const [sectionInfo, setSectionInfo] = useState<SectionProgress[]>([]);
  const sectionRefsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Handle section click - scroll to section
  const handleSectionClick = useCallback((sectionId: string) => {
    const el = sectionRefsRef.current.get(sectionId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Store section refs when ready
  const handleSectionRefsReady = useCallback((refs: Map<string, HTMLElement>) => {
    sectionRefsRef.current = refs;
  }, []);

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
  // Both drivers and admins can submit new versions - history is preserved
  const isDisabled = useMemo(() => {
    // Preview mode is always read-only display
    if (mode === 'preview') return true;
    
    // Both drivers (submit mode) and admins (review mode) can edit and resubmit
    // Submitting creates a new version, previous submissions are preserved in history
    return false;
  }, [mode]);

  // Get contextual submit button label
  const submitButtonLabel = useMemo(() => {
    switch (credential.status) {
      case 'not_submitted':
        return 'Submit for Review';
      case 'rejected':
        return 'Resubmit';
      case 'pending_review':
        return 'Submit New Version';
      case 'approved':
      case 'expired':
        return 'Update & Resubmit';
      default:
        return 'Submit';
    }
  }, [credential.status]);

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

  // Show progress indicator for instruction-based credentials with multiple sections
  const showProgressIndicator = hasInstructionConfig && sectionInfo.length > 1 && mode !== 'preview';

  // Show tabs for submit/review modes with existing credential
  const showTabs = (mode === 'submit' || mode === 'review') && credential.id;

  // Tab list component for header
  const tabsList = showTabs ? (
    <TabsList className="grid grid-cols-2">
      <TabsTrigger value="submission">
        Submission
      </TabsTrigger>
      <TabsTrigger value="history" className="flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        History
      </TabsTrigger>
    </TabsList>
  ) : null;

  // Render content (shared between tabbed and non-tabbed views)
  const renderContent = () => (
    hasInstructionConfig && instructionConfig ? (
      <InstructionRenderer
        config={instructionConfig}
        progressData={progressData}
        onProgressChange={handleProgressChange}
        onSubmit={handleSubmit}
        disabled={isDisabled}
        isSubmitting={isSubmitting}
        readOnly={mode === 'preview'}
        submitLabel={submitButtonLabel}
        onSectionInfoChange={setSectionInfo}
        onSectionRefsReady={handleSectionRefsReady}
      />
    ) : (
      <LegacyCredentialView
        credentialType={credentialType}
        credential={credential}
        onSubmit={handleLegacySubmit}
        disabled={isDisabled}
        isSubmitting={isSubmitting}
        submitLabel={submitButtonLabel}
      />
    )
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Right-side sticky progress indicator */}
      {showProgressIndicator && (
        <CredentialProgressIndicator
          sections={sectionInfo}
          onSectionClick={handleSectionClick}
        />
      )}

      {/* Wrap everything in Tabs if we need tabs */}
      {showTabs ? (
        <Tabs defaultValue="submission" className="w-full">
          {/* Full-width header with tabs */}
          <CredentialDetailHeader
            credentialType={credentialType}
            credentialTable={credentialTable}
            status={credential.status}
            expiresAt={credential.expires_at}
            submittedAt={credential.submitted_at}
            onBack={onBack}
            backLabel={backLabel}
            actions={reviewActions}
            rightContent={tabsList}
          />

          {/* Constrained content area */}
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Status alerts */}
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
                    This credential has been approved
                    {credential.reviewed_at && (
                      <> on {new Date(credential.reviewed_at).toLocaleDateString()}</>
                    )}
                    . You can submit an updated version anytime - your previous submission will be saved in history.
                  </AlertDescription>
                </Alert>
              )}

              {credential.status === 'pending_review' && mode === 'submit' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Pending Review</AlertTitle>
                  <AlertDescription>
                    Your submission is being reviewed. You can submit a new version if needed - 
                    the current submission will be saved in history.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tab content */}
              <TabsContent value="submission" className="mt-0">
                {renderContent()}
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <CredentialHistoryTab
                  credentialId={credential.id}
                  credentialTable={credentialTable}
                />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      ) : (
        <>
          {/* Full-width header without tabs */}
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

          {/* Constrained content area */}
          <div className="p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Status alerts */}
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
                    This credential has been approved
                    {credential.reviewed_at && (
                      <> on {new Date(credential.reviewed_at).toLocaleDateString()}</>
                    )}
                    . You can submit an updated version anytime - your previous submission will be saved in history.
                  </AlertDescription>
                </Alert>
              )}

              {credential.status === 'pending_review' && mode === 'submit' && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertTitle>Pending Review</AlertTitle>
                  <AlertDescription>
                    Your submission is being reviewed. You can submit a new version if needed - 
                    the current submission will be saved in history.
                  </AlertDescription>
                </Alert>
              )}

              {/* Main content */}
              {renderContent()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
