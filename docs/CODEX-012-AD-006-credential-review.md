# CODEX-012: AD-006 Credential Review Queue

## Overview

Build the **Admin Credential Review** feature - a central review queue where admins can approve, reject, and verify driver and vehicle credential submissions. This includes a standalone page at `/admin/credentials` and inline review from driver/vehicle detail pages.

**Key Principle:** All credential submissions require admin review before becoming valid. Admins can approve with expiration dates, reject with reasons, and mark admin-verified credentials as complete.

**Feature Spec:** `docs/features/admin/AD-006-credential-review.md`

## Prerequisites

- Migration `015_credential_submission.sql` already applied (history table exists)
- Credential types configured (AD-005)
- Driver credential submission working (DR-004)
- Admin layout and authentication complete

## User Stories

1. **As an Admin**, I want to see all pending credential submissions so I can review them.
2. **As an Admin**, I want to approve a credential submission so the driver becomes eligible.
3. **As an Admin**, I want to reject a credential with a reason so the driver knows what to fix.
4. **As an Admin**, I want to mark admin-verified credentials as complete.
5. **As an Admin**, I want to view submitted documents/photos in a modal.
6. **As an Admin**, I want to see credential history to understand past submissions.
7. **As an Admin**, I want to filter credentials by status, type, driver, and broker.

---

## Tasks

### Task 1: Credential Review Types

Create `src/types/credentialReview.ts`:

```typescript
import type { CredentialType, DriverCredential, VehicleCredential } from './credential';
import type { DriverWithUser } from './driver';
import type { Vehicle } from './vehicle';

export type ReviewStatus = 
  | 'pending_review'
  | 'awaiting_verification'  // admin_verified types
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
  displayStatus: ReviewStatus;
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
}

export interface ReviewQueueFilters {
  status: ReviewStatus | 'all' | 'needs_action';
  credentialTypeId?: string;
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
```

---

### Task 2: Credential Review Service

Create `src/services/credentialReview.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  CredentialForReview,
  ReviewQueueFilters,
  ReviewQueueStats,
  ApproveCredentialData,
  RejectCredentialData,
  VerifyCredentialData,
  UnverifyCredentialData,
  ReviewHistoryItem,
} from '@/types/credentialReview';

// ============ FETCH QUEUE ============

export async function getDriverCredentialsForReview(
  companyId: string,
  filters: ReviewQueueFilters
): Promise<CredentialForReview[]> {
  let query = supabase
    .from('driver_credentials')
    .select(`
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      driver:drivers(*, user:users(id, full_name, email, phone, avatar_url))
    `)
    .eq('company_id', companyId);
  
  if (filters.status === 'needs_action') {
    query = query.in('status', ['pending_review', 'not_submitted']);
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters.credentialTypeId) {
    query = query.eq('credential_type_id', filters.credentialTypeId);
  }
  
  if (filters.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }
  
  const { data, error } = await query.order('submitted_at', { ascending: true, nullsFirst: false });
  
  if (error) throw error;
  return (data || []).map(mapDriverCredentialToReview);
}

export async function getVehicleCredentialsForReview(
  companyId: string,
  filters: ReviewQueueFilters
): Promise<CredentialForReview[]> {
  let query = supabase
    .from('vehicle_credentials')
    .select(`
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      vehicle:vehicles(*, owner:drivers(*, user:users(id, full_name)))
    `)
    .eq('company_id', companyId);
  
  if (filters.status === 'needs_action') {
    query = query.in('status', ['pending_review', 'not_submitted']);
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  if (filters.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  
  const { data, error } = await query.order('submitted_at', { ascending: true, nullsFirst: false });
  
  if (error) throw error;
  return (data || []).map(mapVehicleCredentialToReview);
}

export async function getReviewQueueStats(companyId: string): Promise<ReviewQueueStats> {
  const { count: driverPending } = await supabase
    .from('driver_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending_review');
  
  const { count: vehiclePending } = await supabase
    .from('vehicle_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending_review');
  
  const { count: awaiting } = await supabase
    .from('driver_credentials')
    .select('*, credential_type:credential_types!inner(*)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'not_submitted')
    .eq('credential_type.submission_type', 'admin_verified');
  
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  
  const { count: expiring } = await supabase
    .from('driver_credentials')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'approved')
    .lte('expires_at', thirtyDays.toISOString())
    .gte('expires_at', new Date().toISOString());
  
  return {
    pendingReview: (driverPending || 0) + (vehiclePending || 0),
    awaitingVerification: awaiting || 0,
    expiringSoon: expiring || 0,
    total: (driverPending || 0) + (vehiclePending || 0) + (awaiting || 0),
  };
}

// ============ REVIEW ACTIONS ============

export async function approveCredential(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  data: ApproveCredentialData,
  reviewerId: string
): Promise<void> {
  const { data: current } = await supabase
    .from(credentialTable)
    .select('*, company_id')
    .eq('id', credentialId)
    .single();
  
  const { error } = await supabase
    .from(credentialTable)
    .update({
      status: 'approved',
      expires_at: data.expiresAt || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_notes: data.reviewNotes || null,
      rejection_reason: null,
    })
    .eq('id', credentialId);
  
  if (error) throw error;
  
  await supabase.from('credential_submission_history').insert({
    credential_id: credentialId,
    credential_table: credentialTable,
    company_id: current.company_id,
    submission_data: {
      document_url: current.document_url,
      document_urls: current.document_urls,
      form_data: current.form_data,
      notes: current.notes,
    },
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
    review_notes: data.internalNotes || null,
    expires_at: data.expiresAt || null,
    submitted_at: current.submitted_at,
  });
}

export async function rejectCredential(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  data: RejectCredentialData,
  reviewerId: string
): Promise<void> {
  const { data: current } = await supabase
    .from(credentialTable)
    .select('*, company_id')
    .eq('id', credentialId)
    .single();
  
  const { error } = await supabase
    .from(credentialTable)
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      rejection_reason: data.rejectionReason,
    })
    .eq('id', credentialId);
  
  if (error) throw error;
  
  await supabase.from('credential_submission_history').insert({
    credential_id: credentialId,
    credential_table: credentialTable,
    company_id: current.company_id,
    submission_data: { document_url: current.document_url },
    status: 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
    review_notes: data.internalNotes || null,
    rejection_reason: data.rejectionReason,
    submitted_at: current.submitted_at,
  });
}

export async function verifyCredential(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  data: VerifyCredentialData,
  reviewerId: string
): Promise<void> {
  const { data: current } = await supabase
    .from(credentialTable)
    .select('*, company_id')
    .eq('id', credentialId)
    .single();
  
  const { error } = await supabase
    .from(credentialTable)
    .update({
      status: 'approved',
      expires_at: data.expiresAt || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      review_notes: data.verificationNotes,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', credentialId);
  
  if (error) throw error;
  
  await supabase.from('credential_submission_history').insert({
    credential_id: credentialId,
    credential_table: credentialTable,
    company_id: current.company_id,
    submission_data: { admin_verified: true },
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
    review_notes: data.internalNotes || null,
    expires_at: data.expiresAt || null,
    submitted_at: new Date().toISOString(),
  });
}

export async function unverifyCredential(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
  data: UnverifyCredentialData,
  reviewerId: string
): Promise<void> {
  const { data: current } = await supabase
    .from(credentialTable)
    .select('*, company_id')
    .eq('id', credentialId)
    .single();
  
  const { error } = await supabase
    .from(credentialTable)
    .update({
      status: 'not_submitted',
      expires_at: null,
      reviewed_at: null,
      reviewed_by: null,
      review_notes: null,
      submitted_at: null,
    })
    .eq('id', credentialId);
  
  if (error) throw error;
  
  await supabase.from('credential_submission_history').insert({
    credential_id: credentialId,
    credential_table: credentialTable,
    company_id: current.company_id,
    submission_data: { unverified: true, reason: data.reason },
    status: 'submitted',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
    review_notes: `Verification removed: ${data.reason}`,
    submitted_at: new Date().toISOString(),
  });
}

// ============ HISTORY ============

export async function getReviewHistory(companyId: string, limit = 50): Promise<ReviewHistoryItem[]> {
  const { data, error } = await supabase
    .from('credential_submission_history')
    .select(`*, reviewer:users!reviewed_by(full_name)`)
    .eq('company_id', companyId)
    .not('reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data as ReviewHistoryItem[];
}

// ============ HELPERS ============

function mapDriverCredentialToReview(raw: any): CredentialForReview {
  const credentialType = raw.credential_type;
  let displayStatus = raw.status;
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  
  if (raw.status === 'approved' && raw.expires_at) {
    const expiresAt = new Date(raw.expires_at);
    const now = new Date();
    daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 0) displayStatus = 'expired';
    else if (daysUntilExpiration <= 30) { displayStatus = 'expiring'; isExpiringSoon = true; }
  }
  
  if (credentialType?.submission_type === 'admin_verified' && raw.status === 'not_submitted') {
    displayStatus = 'awaiting_verification';
  }
  
  return {
    id: raw.id,
    credentialTable: 'driver_credentials',
    credentialType,
    status: raw.status,
    documentUrl: raw.document_url,
    documentUrls: raw.document_urls,
    signatureData: raw.signature_data,
    formData: raw.form_data,
    enteredDate: raw.entered_date,
    notes: raw.notes,
    submittedAt: raw.submitted_at,
    expiresAt: raw.expires_at,
    reviewedAt: raw.reviewed_at,
    reviewedBy: raw.reviewed_by,
    reviewNotes: raw.review_notes,
    rejectionReason: raw.rejection_reason,
    driver: raw.driver,
    displayStatus,
    daysUntilExpiration,
    isExpiringSoon,
  };
}

function mapVehicleCredentialToReview(raw: any): CredentialForReview {
  // Same logic as driver, but with vehicle
  const credentialType = raw.credential_type;
  let displayStatus = raw.status;
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  
  if (raw.status === 'approved' && raw.expires_at) {
    const expiresAt = new Date(raw.expires_at);
    daysUntilExpiration = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiration <= 0) displayStatus = 'expired';
    else if (daysUntilExpiration <= 30) { displayStatus = 'expiring'; isExpiringSoon = true; }
  }
  
  if (credentialType?.submission_type === 'admin_verified' && raw.status === 'not_submitted') {
    displayStatus = 'awaiting_verification';
  }
  
  return {
    id: raw.id,
    credentialTable: 'vehicle_credentials',
    credentialType,
    status: raw.status,
    documentUrl: raw.document_url,
    documentUrls: raw.document_urls,
    signatureData: raw.signature_data,
    formData: raw.form_data,
    enteredDate: raw.entered_date,
    notes: raw.notes,
    submittedAt: raw.submitted_at,
    expiresAt: raw.expires_at,
    reviewedAt: raw.reviewed_at,
    reviewedBy: raw.reviewed_by,
    reviewNotes: raw.review_notes,
    rejectionReason: raw.rejection_reason,
    vehicle: raw.vehicle,
    displayStatus,
    daysUntilExpiration,
    isExpiringSoon,
  };
}
```

---

### Task 3: Credential Review Hooks

Create `src/hooks/useCredentialReview.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as reviewService from '@/services/credentialReview';
import type { ReviewQueueFilters, ApproveCredentialData, RejectCredentialData, VerifyCredentialData, UnverifyCredentialData } from '@/types/credentialReview';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export function useDriverCredentialsForReview(companyId: string | undefined, filters: ReviewQueueFilters) {
  return useQuery({
    queryKey: ['credential-review', 'driver', companyId, filters],
    queryFn: () => reviewService.getDriverCredentialsForReview(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useVehicleCredentialsForReview(companyId: string | undefined, filters: ReviewQueueFilters) {
  return useQuery({
    queryKey: ['credential-review', 'vehicle', companyId, filters],
    queryFn: () => reviewService.getVehicleCredentialsForReview(companyId!, filters),
    enabled: !!companyId,
  });
}

export function useReviewQueueStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-review', 'stats', companyId],
    queryFn: () => reviewService.getReviewQueueStats(companyId!),
    enabled: !!companyId,
    refetchInterval: 60000,
  });
}

export function useReviewHistory(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-review', 'history', companyId],
    queryFn: () => reviewService.getReviewHistory(companyId!),
    enabled: !!companyId,
  });
}

export function useApproveCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: { credentialId: string; credentialTable: 'driver_credentials' | 'vehicle_credentials'; data: ApproveCredentialData }) =>
      reviewService.approveCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential approved' });
    },
    onError: (error: Error) => {
      toast({ title: 'Approval failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: { credentialId: string; credentialTable: 'driver_credentials' | 'vehicle_credentials'; data: RejectCredentialData }) =>
      reviewService.rejectCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential rejected' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rejection failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVerifyCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: { credentialId: string; credentialTable: 'driver_credentials' | 'vehicle_credentials'; data: VerifyCredentialData }) =>
      reviewService.verifyCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Credential verified' });
    },
  });
}

export function useUnverifyCredential() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (params: { credentialId: string; credentialTable: 'driver_credentials' | 'vehicle_credentials'; data: UnverifyCredentialData }) =>
      reviewService.unverifyCredential(params.credentialId, params.credentialTable, params.data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      toast({ title: 'Verification removed' });
    },
  });
}
```

---

### Task 4: Credential Review Page

Create `src/pages/admin/CredentialReview.tsx`:

**Route:** `/admin/credentials`

**Layout:**
- Stats banner showing pending counts
- Tabs: [Driver Credentials] [Vehicle Credentials] [History]
- Filters: Status, Type, Broker, Search
- EnhancedDataView with card/table toggle

---

### Task 5: Credential Review Card

Create `src/components/features/admin/CredentialReviewCard.tsx`:

**Props:** `credential: CredentialForReview, onView, onApprove, onReject, onVerify`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ⏳ PENDING REVIEW                                   │
│                                                     │
│ Background Check                                    │
│ John Smith • 1099 • Global Credential              │
│                                                     │
│ Submitted: Jan 14, 2026                            │
│ Document: background_check.pdf                      │
│                                                     │
│                        [View] [Approve] [Reject]   │
└─────────────────────────────────────────────────────┘
```

**Status badges:** pending_review (yellow), awaiting_verification (blue), expiring (orange), expired (red), approved (green), rejected (red)

---

### Task 6: Credential Detail Modal

Create `src/components/features/admin/CredentialDetailModal.tsx`:

Shows full credential with document preview, driver info, submission history, and action buttons.

---

### Task 7: Approve Credential Modal

Create `src/components/features/admin/ApproveCredentialModal.tsx`:

**Fields:**
- Expiration Date (prefilled from type config)
- Review Notes (visible to driver)
- Internal Notes (staff only)

---

### Task 8: Reject Credential Modal

Create `src/components/features/admin/RejectCredentialModal.tsx`:

**Fields:**
- Rejection Reason (required, shown to driver)
- Internal Notes (staff only)

---

### Task 9: Verify Credential Modal

Create `src/components/features/admin/VerifyCredentialModal.tsx`:

For admin-verified credentials (no driver submission).

**Fields:**
- Verification Notes (required)
- Expiration Date (optional)
- Internal Notes (staff only)

---

### Task 10: Review History Tab

Create `src/components/features/admin/ReviewHistoryTab.tsx`:

Shows timeline of all review actions with filters.

---

### Task 11: Document Viewer

Create `src/components/features/admin/DocumentViewer.tsx`:

Preview PDF/images with download and fullscreen options.

---

### Task 12: Driver/Vehicle Credentials Tabs

Create `src/components/features/admin/DriverCredentialsTab.tsx` and `VehicleCredentialsTab.tsx`:

Inline credential review from detail pages. Reuses review modals.

---

### Task 13: Routes and Navigation

Update `src/App.tsx`:
```tsx
<Route path="credentials" element={<CredentialReview />} />
```

Add nav link with pending badge in admin sidebar.

---

## Output Summary

When complete:
- ✅ Types, service, hooks for credential review
- ✅ `/admin/credentials` page with tabs
- ✅ Review cards with status badges
- ✅ Detail modal with document preview
- ✅ Approve/Reject/Verify modals
- ✅ Review history tab
- ✅ Inline review in Driver/Vehicle detail pages
- ✅ Nav link with badge

## Business Rules

1. All submissions need admin approval
2. Rejection reason required and shown to driver
3. Two note types: public (to driver) and internal (staff only)
4. Expiration prefilled from credential type config
5. Admin-verified credentials: admin marks complete directly
6. Coordinators have same permissions as admins
7. All actions logged to history
