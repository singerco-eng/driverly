import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import type { CredentialType, DriverCredential, VehicleCredential } from '@/types/credential';
import { cn } from '@/lib/utils';
import { DocumentPreview } from '@/components/ui/document-preview';

interface AdminReviewPanelProps {
  credentialType: CredentialType;
  credential: DriverCredential | VehicleCredential;
  onApprove: (expirationDate: Date | null, notes: string) => void;
  onReject: (reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

/**
 * Admin panel for reviewing and taking actions on credentials
 * Shows submission details and approve/reject buttons
 */
export function AdminReviewPanel({
  credentialType,
  credential,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: AdminReviewPanelProps) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [mode, setMode] = useState<'review' | 'reject'>('review');

  const isPending = credential.status === 'pending';
  const isNotSubmitted = credential.status === 'not_submitted';
  const canReview = isPending;

  // Get document paths
  const documentPaths = credential.document_urls ?? 
    (credential.document_url ? [credential.document_url] : []);

  const handleApprove = () => {
    onApprove(expirationDate || null, reviewNotes);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    onReject(rejectionReason);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-primary" />
          Admin Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Submission details */}
        {isPending && (
          <>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Submission Details</h4>
              
              {/* Documents */}
              {documentPaths.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Documents</Label>
                  <DocumentPreview
                    paths={documentPaths}
                    layout="grid"
                    maxPreviewHeight={120}
                  />
                </div>
              )}

              {/* Signature */}
              {credential.signature_data && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Signature</Label>
                  <div className="p-3 bg-white rounded border">
                    {credential.signature_data.type === 'typed' ? (
                      <p className="text-lg font-semibold italic">{credential.signature_data.value}</p>
                    ) : (
                      <img
                        src={credential.signature_data.value}
                        alt="Signature"
                        className="h-16 w-auto"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Form data */}
              {credential.form_data && Object.keys(credential.form_data).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Form Data</Label>
                  <div className="p-3 bg-muted/50 rounded space-y-1">
                    {Object.entries(credential.form_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Driver notes */}
              {credential.notes && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Driver Notes</Label>
                  <p className="text-sm p-2 bg-muted/50 rounded">{credential.notes}</p>
                </div>
              )}

              {/* Submitted timestamp */}
              {credential.submitted_at && (
                <div className="text-xs text-muted-foreground">
                  Submitted: {new Date(credential.submitted_at).toLocaleString()}
                </div>
              )}
            </div>

            <Separator />
          </>
        )}

        {/* Review actions */}
        {canReview && mode === 'review' && (
          <div className="space-y-4">
            {/* Expiration date for approval */}
            {credentialType.expiration_type !== 'never' && (
              <div className="space-y-2">
                <Label>Set Expiration Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !expirationDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? format(expirationDate, 'PPP') : 'Select expiration date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expirationDate}
                      onSelect={setExpirationDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Review notes */}
            <div className="space-y-2">
              <Label>Review Notes (Optional)</Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes for the driver..."
                rows={2}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
                className="flex-1"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                )}
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => setMode('reject')}
                disabled={isApproving || isRejecting}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        )}

        {/* Rejection form */}
        {canReview && mode === 'reject' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this credential is being rejected..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setMode('review')}
                disabled={isRejecting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || isRejecting}
                className="flex-1"
              >
                {isRejecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}

        {/* Not submitted - admin can fill it out and submit directly */}
        {isNotSubmitted && (
          <div className="text-sm text-muted-foreground">
            This credential hasn't been submitted yet. You can complete it below and submit on behalf of the driver.
          </div>
        )}

        {/* Already reviewed */}
        {credential.status === 'approved' && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <div>
              <p className="font-medium">Approved</p>
              {credential.reviewed_at && (
                <p className="text-xs text-muted-foreground">
                  {new Date(credential.reviewed_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}

        {credential.status === 'rejected' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              <p className="font-medium">Rejected</p>
            </div>
            {credential.rejection_reason && (
              <p className="text-sm p-2 bg-red-500/10 rounded border border-red-500/20">
                {credential.rejection_reason}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
