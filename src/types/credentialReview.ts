import type { CredentialType, DriverCredential, VehicleCredential } from './credential';
import type { DriverWithUser } from './driver';
import type { Vehicle } from './vehicle';

export type ReviewStatus =
  | 'pending_review'
  | 'awaiting_verification'
  | 'expiring'
  | 'expired'
  | 'approved'
  | 'rejected';

export interface CredentialForReview {
  id: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  credentialType: CredentialType;
  status: ReviewStatus;

  // Submission data
  documentUrl: string | null;
  documentUrls: string[] | null;
  signatureData: any | null;
  formData: Record<string, any> | null;
  enteredDate: string | null;
  notes: string | null;
  submittedAt: string | null;

  // Review data
  expiresAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;

  // Related entity
  driver?: DriverWithUser;
  vehicle?: Vehicle & { owner?: DriverWithUser };

  // Computed
  displayStatus: ReviewStatus | 'not_submitted' | 'grace_period' | 'missing';
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  gracePeriodDueDate?: Date;
}

export interface ReviewQueueFilters {
  status: ReviewStatus | 'all' | 'needs_action' | 'not_submitted';
  requirement?: 'required' | 'recommended' | 'optional';
  brokerId?: string;
  driverId?: string;
  vehicleId?: string;
  search?: string;
}

export interface ReviewQueueStats {
  pendingReview: number;
  awaitingVerification: number;
  expiringSoon: number;
  total: number;
}

export interface ApproveCredentialData {
  expiresAt?: string | null;
  reviewNotes?: string;
  internalNotes?: string;
}

export interface RejectCredentialData {
  rejectionReason: string;
  internalNotes?: string;
}

export interface VerifyCredentialData {
  verificationNotes: string;
  expiresAt?: string | null;
  internalNotes?: string;
}

export interface UnverifyCredentialData {
  reason: string;
}

export interface ReviewHistoryItem {
  id: string;
  credentialId: string;
  credentialTable: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewNotes: string | null;
  rejectionReason: string | null;
  submissionData: any;
  reviewer?: { full_name: string };
}
