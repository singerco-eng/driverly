# TASK 009: Credential Submission (DR-004)

## Context

Build the Driver's Credential Submission portal - a **self-service interface** where drivers upload documents, capture photos, sign agreements, and fill forms to meet credential requirements defined by admins (AD-005). This works alongside AD-006 (Credential Review) where admins approve/reject submissions.

**Key Principle:** Drivers never modify existing submissions - they always create NEW submissions. Historical records are preserved for audit.

**Reference:** `docs/features/driver/DR-004-credential-submission.md`

## Prerequisites

- Migration `015_credential_submission.sql` applied to Supabase
- Migration `011_credential_types.sql` applied (credential_types, driver_credentials, vehicle_credentials tables)
- Driver Portal exists with DriverLayout
- Storage bucket `credential-documents` exists
- AD-005 Credential Types implemented

## Your Tasks

### Task 1: Credential Types

Create `src/types/credential.ts` (extend if exists):

```typescript
// Credential Submission Status
export type CredentialStatus = 
  | 'not_submitted'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'expired';

// Computed display status (includes expiring warning)
export type CredentialDisplayStatus = 
  | CredentialStatus
  | 'expiring'   // Approved but within warning threshold
  | 'awaiting';  // Admin-verified, waiting for admin

// Submission types
export type SubmissionType = 
  | 'document_upload'
  | 'photo'
  | 'signature'
  | 'form'
  | 'admin_verified'
  | 'date_entry';

// Driver Credential instance
export interface DriverCredential {
  id: string;
  driver_id: string;
  credential_type_id: string;
  company_id: string;
  
  status: CredentialStatus;
  
  // Submission data
  document_url: string | null;
  document_urls: string[] | null;
  signature_data: SignatureData | null;
  form_data: Record<string, any> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  
  // Expiration
  expires_at: string | null;
  
  // Review
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  
  // Tracking
  submission_version: number;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Joined data
  credential_type?: CredentialType;
}

// Vehicle Credential instance (same structure)
export interface VehicleCredential {
  id: string;
  vehicle_id: string;
  credential_type_id: string;
  company_id: string;
  
  status: CredentialStatus;
  
  document_url: string | null;
  document_urls: string[] | null;
  signature_data: SignatureData | null;
  form_data: Record<string, any> | null;
  entered_date: string | null;
  driver_expiration_date: string | null;
  notes: string | null;
  
  expires_at: string | null;
  
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  
  submission_version: number;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  
  credential_type?: CredentialType;
  vehicle?: Vehicle;
}

// Credential Type (admin-defined)
export interface CredentialType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: 'driver' | 'vehicle';
  scope: 'global' | 'broker';
  broker_id: string | null;
  employment_type: 'both' | 'w2_only' | '1099_only';
  requirement: 'required' | 'optional' | 'recommended';
  vehicle_types: string[] | null;
  submission_type: SubmissionType;
  form_schema: FormSchema | null;
  signature_document_url: string | null;
  expiration_type: 'never' | 'fixed_interval' | 'driver_specified';
  expiration_interval_days: number | null;
  expiration_warning_days: number;
  grace_period_days: number;
  display_order: number;
  is_active: boolean;
  broker?: { id: string; name: string };
}

// E-signature data
export interface SignatureData {
  type: 'typed' | 'drawn';
  value: string;        // Typed name or base64 image
  timestamp: string;    // ISO date
  ip_address?: string;
}

// Form schema for dynamic forms
export interface FormSchema {
  fields: FormField[];
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];  // For select
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Submission history record
export interface CredentialSubmissionHistory {
  id: string;
  credential_id: string;
  credential_table: 'driver_credentials' | 'vehicle_credentials';
  company_id: string;
  submission_data: Record<string, any>;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  expires_at: string | null;
  submitted_at: string;
  created_at: string;
}

// Credential with computed display status
export interface CredentialWithDisplayStatus {
  credential: DriverCredential | VehicleCredential;
  credentialType: CredentialType;
  displayStatus: CredentialDisplayStatus;
  isExpiringSoon: boolean;
  daysUntilExpiration: number | null;
  canSubmit: boolean;  // true if driver can submit/resubmit
}

// Progress summary
export interface CredentialProgress {
  total: number;
  complete: number;      // approved
  pending: number;       // pending_review
  actionNeeded: number;  // not_submitted, rejected, expired, expiring
  percentage: number;    // 0-100
}
```

### Task 2: Credential Service

Create `src/services/credentials.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { 
  DriverCredential, 
  VehicleCredential, 
  CredentialType,
  CredentialSubmissionHistory,
  CredentialWithDisplayStatus,
  CredentialProgress,
  SignatureData,
} from '@/types/credential';

// ============ FETCH CREDENTIALS ============

export async function getDriverCredentials(driverId: string): Promise<CredentialWithDisplayStatus[]> {
  // 1. Get all credential types the driver should have (using SQL function)
  const { data: required, error: reqError } = await supabase
    .rpc('get_driver_required_credentials', { p_driver_id: driverId });
  
  if (reqError) throw reqError;
  
  // 2. Get existing credentials with their types
  const { data: credentials, error } = await supabase
    .from('driver_credentials')
    .select(`
      *,
      credential_type:credential_types(*, broker:brokers(id, name))
    `)
    .eq('driver_id', driverId);
  
  if (error) throw error;
  
  // 3. Merge: return credentials with display status
  return mergeCredentialsWithTypes(credentials || [], required || []);
}

export async function getVehicleCredentials(vehicleId: string): Promise<CredentialWithDisplayStatus[]> {
  const { data: required, error: reqError } = await supabase
    .rpc('get_vehicle_required_credentials', { p_vehicle_id: vehicleId });
  
  if (reqError) throw reqError;
  
  const { data: credentials, error } = await supabase
    .from('vehicle_credentials')
    .select(`
      *,
      credential_type:credential_types(*, broker:brokers(id, name))
    `)
    .eq('vehicle_id', vehicleId);
  
  if (error) throw error;
  
  return mergeCredentialsWithTypes(credentials || [], required || [], vehicleId);
}

export async function getDriverCredentialProgress(driverId: string): Promise<CredentialProgress> {
  const credentials = await getDriverCredentials(driverId);
  return calculateProgress(credentials);
}

export async function getVehicleCredentialProgress(vehicleId: string): Promise<CredentialProgress> {
  const credentials = await getVehicleCredentials(vehicleId);
  return calculateProgress(credentials);
}

// ============ SUBMIT CREDENTIALS ============

export interface SubmitDocumentPayload {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  documentUrls: string[];
  notes?: string;
  driverExpirationDate?: string;
}

export async function submitDocumentCredential(payload: SubmitDocumentPayload): Promise<void> {
  const updateData = {
    document_urls: payload.documentUrls,
    document_url: payload.documentUrls[0] || null,
    notes: payload.notes || null,
    driver_expiration_date: payload.driverExpirationDate || null,
    status: 'pending_review',
    submitted_at: new Date().toISOString(),
    submission_version: supabase.rpc('increment', { row_id: payload.credentialId, table_name: payload.credentialTable, column_name: 'submission_version' }),
  };
  
  const { error } = await supabase
    .from(payload.credentialTable)
    .update(updateData)
    .eq('id', payload.credentialId);
  
  if (error) throw error;
}

export interface SubmitSignaturePayload {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  signatureData: SignatureData;
  notes?: string;
}

export async function submitSignatureCredential(payload: SubmitSignaturePayload): Promise<void> {
  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      signature_data: payload.signatureData,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', payload.credentialId);
  
  if (error) throw error;
}

export interface SubmitFormPayload {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  formData: Record<string, any>;
  notes?: string;
}

export async function submitFormCredential(payload: SubmitFormPayload): Promise<void> {
  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      form_data: payload.formData,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', payload.credentialId);
  
  if (error) throw error;
}

export interface SubmitDatePayload {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  enteredDate: string;
  notes?: string;
}

export async function submitDateCredential(payload: SubmitDatePayload): Promise<void> {
  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      entered_date: payload.enteredDate,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', payload.credentialId);
  
  if (error) throw error;
}

// ============ CREATE CREDENTIAL INSTANCE ============

export async function ensureDriverCredential(
  driverId: string,
  credentialTypeId: string,
  companyId: string
): Promise<string> {
  // Check if exists
  const { data: existing } = await supabase
    .from('driver_credentials')
    .select('id')
    .eq('driver_id', driverId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();
  
  if (existing) return existing.id;
  
  // Create
  const { data, error } = await supabase
    .from('driver_credentials')
    .insert({
      driver_id: driverId,
      credential_type_id: credentialTypeId,
      company_id: companyId,
      status: 'not_submitted',
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

export async function ensureVehicleCredential(
  vehicleId: string,
  credentialTypeId: string,
  companyId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('vehicle_credentials')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();
  
  if (existing) return existing.id;
  
  const { data, error } = await supabase
    .from('vehicle_credentials')
    .insert({
      vehicle_id: vehicleId,
      credential_type_id: credentialTypeId,
      company_id: companyId,
      status: 'not_submitted',
    })
    .select('id')
    .single();
  
  if (error) throw error;
  return data.id;
}

// ============ FILE UPLOAD ============

export async function uploadCredentialDocument(
  file: File,
  userId: string,
  credentialId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const timestamp = Date.now();
  const path = `${userId}/credentials/${credentialId}/${timestamp}.${ext}`;
  
  const { error } = await supabase.storage
    .from('credential-documents')
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  return path;
}

export async function getDocumentUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('credential-documents')
    .createSignedUrl(path, 60 * 60); // 1 hour
  
  if (error) throw error;
  return data.signedUrl;
}

// ============ HISTORY ============

export async function getCredentialHistory(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials'
): Promise<CredentialSubmissionHistory[]> {
  const { data, error } = await supabase
    .from('credential_submission_history')
    .select('*')
    .eq('credential_id', credentialId)
    .eq('credential_table', credentialTable)
    .order('submitted_at', { ascending: false });
  
  if (error) throw error;
  return data as CredentialSubmissionHistory[];
}

// ============ HELPERS ============

function mergeCredentialsWithTypes(
  credentials: any[],
  required: any[],
  vehicleId?: string
): CredentialWithDisplayStatus[] {
  const result: CredentialWithDisplayStatus[] = [];
  
  for (const req of required) {
    const existing = credentials.find(c => c.credential_type_id === req.credential_type_id);
    
    if (existing) {
      result.push(computeDisplayStatus(existing, existing.credential_type));
    } else {
      // Create placeholder for required but not yet created credential
      const placeholder = {
        id: null,
        credential_type_id: req.credential_type_id,
        status: 'not_submitted' as const,
        vehicle_id: vehicleId,
      };
      result.push(computeDisplayStatus(placeholder as any, {
        id: req.credential_type_id,
        name: req.credential_type_name,
        category: req.category || 'vehicle',
        scope: req.scope,
        broker_id: req.broker_id,
        submission_type: req.submission_type,
        requirement: req.requirement,
        broker: req.broker_name ? { id: req.broker_id, name: req.broker_name } : undefined,
      } as CredentialType));
    }
  }
  
  return result;
}

function computeDisplayStatus(
  credential: DriverCredential | VehicleCredential | any,
  credentialType: CredentialType
): CredentialWithDisplayStatus {
  let displayStatus = credential.status;
  let isExpiringSoon = false;
  let daysUntilExpiration: number | null = null;
  
  // Check for expiring soon
  if (credential.status === 'approved' && credential.expires_at) {
    const expiresAt = new Date(credential.expires_at);
    const now = new Date();
    const diffDays = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    daysUntilExpiration = diffDays;
    
    if (diffDays <= 0) {
      displayStatus = 'expired';
    } else if (diffDays <= (credentialType.expiration_warning_days || 30)) {
      displayStatus = 'expiring';
      isExpiringSoon = true;
    }
  }
  
  // Check for admin-verified awaiting
  if (credentialType.submission_type === 'admin_verified' && credential.status === 'not_submitted') {
    displayStatus = 'awaiting';
  }
  
  // Can submit if not pending and not admin_verified
  const canSubmit = 
    credentialType.submission_type !== 'admin_verified' &&
    credential.status !== 'pending_review';
  
  return {
    credential,
    credentialType,
    displayStatus,
    isExpiringSoon,
    daysUntilExpiration,
    canSubmit,
  };
}

function calculateProgress(credentials: CredentialWithDisplayStatus[]): CredentialProgress {
  const required = credentials.filter(c => c.credentialType.requirement === 'required');
  const complete = required.filter(c => c.displayStatus === 'approved').length;
  const pending = required.filter(c => c.displayStatus === 'pending_review').length;
  const actionNeeded = required.filter(c => 
    ['not_submitted', 'rejected', 'expired', 'expiring'].includes(c.displayStatus)
  ).length;
  
  return {
    total: required.length,
    complete,
    pending,
    actionNeeded,
    percentage: required.length > 0 ? Math.round((complete / required.length) * 100) : 100,
  };
}
```

### Task 3: Credential Hooks

Create `src/hooks/useCredentials.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as credentialService from '@/services/credentials';
import type { SubmitDocumentPayload, SubmitSignaturePayload, SubmitFormPayload, SubmitDatePayload } from '@/services/credentials';
import { useToast } from '@/hooks/use-toast';

// ============ QUERIES ============

export function useDriverCredentials(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-credentials', driverId],
    queryFn: () => credentialService.getDriverCredentials(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleCredentials(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-credentials', vehicleId],
    queryFn: () => credentialService.getVehicleCredentials(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useDriverCredentialProgress(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-credential-progress', driverId],
    queryFn: () => credentialService.getDriverCredentialProgress(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleCredentialProgress(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-credential-progress', vehicleId],
    queryFn: () => credentialService.getVehicleCredentialProgress(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useCredentialHistory(
  credentialId: string | undefined,
  credentialTable: 'driver_credentials' | 'vehicle_credentials'
) {
  return useQuery({
    queryKey: ['credential-history', credentialId, credentialTable],
    queryFn: () => credentialService.getCredentialHistory(credentialId!, credentialTable),
    enabled: !!credentialId,
  });
}

// ============ MUTATIONS ============

export function useSubmitDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitDocumentPayload) =>
      credentialService.submitDocumentCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['driver-credential-progress'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential-progress'] });
      toast({ title: 'Document submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitSignature() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitSignaturePayload) =>
      credentialService.submitSignatureCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Signature submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitForm() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitFormPayload) =>
      credentialService.submitFormCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Form submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSubmitDate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: SubmitDatePayload) =>
      credentialService.submitDateCredential(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      toast({ title: 'Date submitted', description: 'Awaiting admin review' });
    },
    onError: (error: Error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUploadCredentialDocument() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, userId, credentialId }: { file: File; userId: string; credentialId: string }) =>
      credentialService.uploadCredentialDocument(file, userId, credentialId),
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useEnsureDriverCredential() {
  return useMutation({
    mutationFn: ({ driverId, credentialTypeId, companyId }: { 
      driverId: string; 
      credentialTypeId: string; 
      companyId: string;
    }) => credentialService.ensureDriverCredential(driverId, credentialTypeId, companyId),
  });
}

export function useEnsureVehicleCredential() {
  return useMutation({
    mutationFn: ({ vehicleId, credentialTypeId, companyId }: { 
      vehicleId: string; 
      credentialTypeId: string; 
      companyId: string;
    }) => credentialService.ensureVehicleCredential(vehicleId, credentialTypeId, companyId),
  });
}
```

### Task 4: Credentials Dashboard Page

Create `src/pages/driver/Credentials.tsx`:

```tsx
// Main credentials page for drivers
// Route: /driver/credentials
// Shows:
// 1. Alert banner if any credentials need attention
// 2. Progress cards for Driver and Vehicle credentials
// 3. Tabs: "Driver Credentials" and "Vehicle Credentials"
// 4. Each tab shows CredentialList component

// Key Components:
// - CredentialAlertBanner: Shows expiring/rejected/missing credentials
// - CredentialProgressCard: Progress bar with stats (X of Y complete)
// - Tabs switching between DriverCredentialList and VehicleCredentialList

// Uses: Card, Tabs, Badge, Progress, Button
// Hooks: useDriverCredentials, useVehicleCredentials, useDriverCredentialProgress
```

### Task 5: Credential List Component

Create `src/components/features/driver/CredentialList.tsx`:

```tsx
// Reusable list component for credentials
// Props:
//   credentials: CredentialWithDisplayStatus[]
//   onSubmit: (credential) => void
//   onView: (credential) => void
//   emptyMessage: string

// Features:
// - Group by scope: Global first, then by broker
// - Filter tabs: All | Action Needed | Pending | Complete
// - Search by name
// - Each credential shows CredentialCard

// Grouping logic:
// 1. Global credentials (scope='global')
// 2. Broker credentials grouped by broker name

// Uses: Card, Input, Badge, Tabs
```

### Task 6: Credential Card Component

Create `src/components/features/driver/CredentialCard.tsx`:

```tsx
// Individual credential display card
// Props:
//   credential: CredentialWithDisplayStatus
//   onSubmit: () => void
//   onView: () => void

// Shows:
// - Status icon (✓ ✕ ⏳ ○ ⏸ ⚠)
// - Credential name
// - Status badge with color
// - Submission type label
// - Required/Optional badge
// - Expiration info (if applicable)
// - Status details (rejection reason, submission date)
// - Action button (Submit, Resubmit, View, Renew)

// Status icon mapping:
// ✓ green = approved
// ✕ red = rejected
// ⏳ yellow = pending_review
// ○ gray = not_submitted
// ⏸ blue = awaiting (admin_verified)
// ⚠ orange = expiring

// Action button mapping:
// not_submitted -> "Submit"
// rejected -> "Resubmit"
// expired, expiring -> "Renew"
// approved -> "View"
// pending_review -> "View"
// awaiting -> (no button)

// Uses: Card, Badge, Button
```

### Task 7: Credential Detail View

Create `src/components/features/driver/CredentialDetail.tsx`:

```tsx
// Full credential detail view (modal or page)
// Props:
//   credential: CredentialWithDisplayStatus
//   onClose: () => void
//   onSubmit: () => void

// Shows:
// - Credential name and status
// - If rejected: rejection reason prominently
// - Current submission details (document preview, form data, signature, date)
// - Instructions from credential type
// - Submission history (collapsible)
// - Action buttons (Resubmit if applicable)

// Uses: Dialog or Sheet, Card, Badge, Button
// Hooks: useCredentialHistory
```

### Task 8: Document Upload Modal

Create `src/components/features/driver/DocumentUploadModal.tsx`:

```tsx
// Modal for document_upload submission type
// Props:
//   open: boolean
//   onOpenChange: (open: boolean) => void
//   credential: CredentialWithDisplayStatus
//   driverId: string
//   onSuccess: () => void

// Shows:
// 1. Credential name and instructions
// 2. Dropzone for files (accept PDF, JPG, PNG; max 50MB)
// 3. Camera button (uses file input with capture="environment")
// 4. Uploaded files list with remove option
// 5. Expiration date picker (if expiration_type='driver_specified')
// 6. Notes textarea (optional)
// 7. Cancel and Submit buttons

// Flow:
// 1. User uploads files -> store temporarily
// 2. On submit: upload to storage, then call submitDocumentCredential

// Uses: Dialog, Button, Input, Textarea, Label
// Hooks: useUploadCredentialDocument, useSubmitDocument, useEnsureDriverCredential
```

### Task 9: Photo Capture Modal

Create `src/components/features/driver/PhotoCaptureModal.tsx`:

```tsx
// Modal for photo submission type
// Same as DocumentUploadModal but:
// - Camera-first UX (camera button prominent)
// - Image preview thumbnails
// - Guidelines displayed (from credential type description)

// Uses same hooks as DocumentUploadModal
```

### Task 10: E-Signature Flow Modal

Create `src/components/features/driver/SignatureModal.tsx`:

```tsx
// Multi-step modal for signature submission type
// Props:
//   open: boolean
//   onOpenChange: (open: boolean) => void
//   credential: CredentialWithDisplayStatus
//   onSuccess: () => void

// Steps:
// Step 1: Review Document
//   - Display signature_document_url (PDF viewer or iframe)
//   - Download button
//   - Checkbox: "I have read and understand this document"
//   - Continue button (disabled until checkbox checked)

// Step 2: Sign
//   - Toggle: "Type Name" | "Draw Signature"
//   - If Type: Input field + script-font preview
//   - If Draw: Canvas drawing area + Clear button
//   - Signature preview
//   - Back and Sign buttons

// Step 3: Confirm
//   - Show signature preview
//   - Timestamp display
//   - "This signature will be legally binding" text
//   - Back and Confirm buttons

// On confirm: create SignatureData and call submitSignatureCredential

// Uses: Dialog, Button, Input, Checkbox, Tabs
// Consider: signature-pad library for drawing
```

### Task 11: Form Submission Modal

Create `src/components/features/driver/FormSubmissionModal.tsx`:

```tsx
// Modal for form submission type
// Props:
//   open: boolean
//   onOpenChange: (open: boolean) => void
//   credential: CredentialWithDisplayStatus
//   onSuccess: () => void

// Shows:
// 1. Credential name and instructions
// 2. Dynamic form based on form_schema
// 3. Notes textarea (optional)
// 4. Save Draft button (stores to localStorage)
// 5. Review & Submit button

// Review mode:
// - Show all answers in read-only format
// - Edit and Submit buttons

// Form rendering: Loop through form_schema.fields and render appropriate inputs
// Validation: Use zod schema generated from form_schema

// Uses: Dialog, Button, Input, Select, Textarea, Checkbox, Label
// Consider: react-hook-form for form management
```

### Task 12: Date Entry Modal

Create `src/components/features/driver/DateEntryModal.tsx`:

```tsx
// Modal for date_entry submission type
// Props:
//   open: boolean
//   onOpenChange: (open: boolean) => void
//   credential: CredentialWithDisplayStatus
//   onSuccess: () => void

// Shows:
// 1. Credential name and instructions
// 2. Date picker
// 3. Notes textarea (optional)
// 4. Cancel and Submit buttons

// Uses: Dialog, Button, Calendar/DatePicker, Textarea
```

### Task 13: Vehicle Credentials Tab

Create `src/components/features/driver/VehicleCredentialsList.tsx`:

```tsx
// Vehicle credentials list with vehicle grouping
// Props:
//   driverId: string

// Shows:
// 1. Vehicle selector dropdown (if multiple vehicles)
// 2. For each vehicle:
//    - Vehicle header (Year Make Model + Primary/Secondary badge)
//    - Progress bar
//    - Credentials grouped by scope (same as DriverCredentialList)
//    - Expandable/collapsible per vehicle

// Hooks: useVehicles (get driver's vehicles), useVehicleCredentials (per vehicle)
```

### Task 14: Credential Alert Banner

Create `src/components/features/driver/CredentialAlertBanner.tsx`:

```tsx
// Alert banner for credentials needing attention
// Props:
//   driverCredentials: CredentialWithDisplayStatus[]
//   vehicleCredentials: CredentialWithDisplayStatus[]

// Shows if any credentials are:
// - Rejected (needs resubmit)
// - Expiring soon
// - Expired

// Format:
// "⚠️ X credentials need attention"
// - Bullet list of credential names + reason
// - "View All" link

// Uses: Card with warning variant, Button
```

### Task 15: Submission History Modal

Create `src/components/features/driver/SubmissionHistoryModal.tsx`:

```tsx
// Modal showing credential submission history
// Props:
//   open: boolean
//   onOpenChange: (open: boolean) => void
//   credentialId: string
//   credentialTable: 'driver_credentials' | 'vehicle_credentials'
//   credentialName: string

// Shows:
// - List of all submissions ordered by date (newest first)
// - Each entry shows:
//   - Status badge
//   - Date submitted
//   - Date reviewed (if applicable)
//   - Rejection reason (if rejected)
//   - Link to view submitted documents

// Uses: Dialog, Card, Badge
// Hooks: useCredentialHistory
```

### Task 16: Add Routes

In `src/App.tsx`, add driver credentials route:

```tsx
import DriverCredentials from '@/pages/driver/Credentials';

// Inside driver routes (under DriverLayout)
<Route path="/credentials" element={<DriverCredentials />} />
<Route path="/credentials/:id" element={<DriverCredentials />} />  // Opens detail modal
```

### Task 17: Update Driver Navigation

In `src/components/layouts/DriverLayout.tsx`, ensure navigation includes:
- Credentials (/driver/credentials) with FileText icon

## Output Summary

When complete, confirm:
1. ✅ `src/types/credential.ts` - Extended types
2. ✅ `src/services/credentials.ts` - Service layer
3. ✅ `src/hooks/useCredentials.ts` - React Query hooks
4. ✅ `src/pages/driver/Credentials.tsx` - Main page
5. ✅ `src/components/features/driver/CredentialList.tsx`
6. ✅ `src/components/features/driver/CredentialCard.tsx`
7. ✅ `src/components/features/driver/CredentialDetail.tsx`
8. ✅ `src/components/features/driver/DocumentUploadModal.tsx`
9. ✅ `src/components/features/driver/PhotoCaptureModal.tsx`
10. ✅ `src/components/features/driver/SignatureModal.tsx`
11. ✅ `src/components/features/driver/FormSubmissionModal.tsx`
12. ✅ `src/components/features/driver/DateEntryModal.tsx`
13. ✅ `src/components/features/driver/VehicleCredentialsList.tsx`
14. ✅ `src/components/features/driver/CredentialAlertBanner.tsx`
15. ✅ `src/components/features/driver/SubmissionHistoryModal.tsx`
16. ✅ Routes added in App.tsx
17. ✅ DriverLayout navigation updated

## Testing Notes

To test:
1. Apply migration `015_credential_submission.sql`
2. Ensure credential types exist (from AD-005)
3. Create a driver via application flow
4. Log in as driver
5. Navigate to /driver/credentials
6. Test each submission type:
   - Upload a document
   - Capture a photo
   - Sign a document
   - Fill a form
   - Enter a date
7. View submission history
8. Test rejection flow (have admin reject, then resubmit)

## UI/UX Guidelines

Follow Design System (`docs/04-FRONTEND-GUIDELINES.md`):
- Use `Card` for credential cards
- Use `Badge` for status indicators
- Use `Dialog` for modals
- Use `Button` variants appropriately (default for primary actions, outline for secondary)
- Status colors: green=approved, yellow=pending, red=rejected/expired, orange=expiring, blue=awaiting, gray=not_submitted

## DO NOT

- Implement admin review flow (that's AD-006)
- Modify `src/components/ui/` core components
- Store file contents in database (use Supabase Storage paths only)
- Allow drivers to modify reviewed credentials (always create new submission)
- Show internal admin notes to drivers
