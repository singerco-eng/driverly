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
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

// ============ FETCH QUEUE ============

export async function getDriverCredentialsForReview(
  companyId: string,
  filters: ReviewQueueFilters,
): Promise<CredentialForReview[]> {
  let query = supabase
    .from('driver_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      driver:drivers!driver_credentials_driver_id_fkey(*, user:users!drivers_user_id_fkey(id, full_name, email, phone, avatar_url))
    `,
    )
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

  if (filters.brokerId) {
    query = query.eq('credential_type.broker_id', filters.brokerId);
  }

  const { data, error } = await query.order('submitted_at', {
    ascending: true,
    nullsFirst: false,
  });

  if (error) throw error;
  return (data || []).map(mapDriverCredentialToReview);
}

export async function getVehicleCredentialsForReview(
  companyId: string,
  filters: ReviewQueueFilters,
): Promise<CredentialForReview[]> {
  let query = supabase
    .from('vehicle_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      vehicle:vehicles(*, owner:drivers!owner_driver_id(*, user:users!drivers_user_id_fkey(id, full_name)))
    `,
    )
    .eq('company_id', companyId);

  if (filters.status === 'needs_action') {
    query = query.in('status', ['pending_review', 'not_submitted']);
  } else if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }

  if (filters.credentialTypeId) {
    query = query.eq('credential_type_id', filters.credentialTypeId);
  }

  if (filters.brokerId) {
    query = query.eq('credential_type.broker_id', filters.brokerId);
  }

  const { data, error } = await query.order('submitted_at', {
    ascending: true,
    nullsFirst: false,
  });

  if (error) throw error;
  return (data || []).map(mapVehicleCredentialToReview);
}

export async function getReviewQueueStats(companyId: string): Promise<ReviewQueueStats> {
  // Only count credentials where the credential type is active
  const { count: driverPending } = await supabase
    .from('driver_credentials')
    .select('*, credential_type:credential_types!inner(*)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending_review')
    .eq('credential_type.is_active', true);

  const { count: vehiclePending } = await supabase
    .from('vehicle_credentials')
    .select('*, credential_type:credential_types!inner(*)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending_review')
    .eq('credential_type.is_active', true);

  const { count: awaiting } = await supabase
    .from('driver_credentials')
    .select('*, credential_type:credential_types!inner(*)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'not_submitted')
    .eq('credential_type.is_active', true)
    .eq('credential_type.requires_driver_action', false);

  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  const { count: expiring } = await supabase
    .from('driver_credentials')
    .select('*, credential_type:credential_types!inner(*)', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'approved')
    .eq('credential_type.is_active', true)
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
  reviewerId: string,
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
  reviewerId: string,
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
  reviewerId: string,
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
  reviewerId: string,
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

export async function getReviewHistory(
  companyId: string,
  limit = 50,
): Promise<ReviewHistoryItem[]> {
  const { data, error } = await supabase
    .from('credential_submission_history')
    .select(`*, reviewer:users!reviewed_by(full_name)`)
    .eq('company_id', companyId)
    .not('reviewed_at', 'is', null)
    .order('reviewed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((item: any) => ({
    id: item.id,
    credentialId: item.credential_id,
    credentialTable: item.credential_table,
    status: item.status,
    submittedAt: item.submitted_at,
    reviewedAt: item.reviewed_at,
    reviewedBy: item.reviewed_by,
    reviewNotes: item.review_notes,
    rejectionReason: item.rejection_reason,
    submissionData: item.submission_data,
    reviewer: item.reviewer,
  })) as ReviewHistoryItem[];
}

// ============ ADMIN: GET ALL VEHICLE CREDENTIALS WITH TYPES ============

/**
 * For admin view: Gets all vehicle credential types for the company and merges
 * with existing credential records. This is different from the driver view
 * which only shows "required" credentials based on broker assignments.
 */
export async function getVehicleCredentialsForAdmin(
  companyId: string,
  vehicleId: string,
): Promise<CredentialForReview[]> {
  // Get all vehicle credential types for this company (global and broker-scoped)
  const { data: credentialTypes, error: typesError } = await supabase
    .from('credential_types')
    .select('*, broker:brokers(id, name)')
    .eq('company_id', companyId)
    .eq('category', 'vehicle')
    .eq('is_active', true)
    .order('display_order');

  if (typesError) throw typesError;

  // Get existing vehicle credentials
  // Note: Use explicit foreign key hints to avoid ambiguity
  const { data: existingCredentials, error: credError } = await supabase
    .from('vehicle_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      vehicle:vehicles(*, owner:drivers!owner_driver_id(*, user:users!drivers_user_id_fkey(id, full_name)))
    `,
    )
    .eq('vehicle_id', vehicleId);

  if (credError) throw credError;

  // Get vehicle info for placeholder credentials
  // Note: Use explicit foreign key hints to avoid ambiguity
  const { data: vehicle, error: vehError } = await supabase
    .from('vehicles')
    .select('*, owner:drivers!owner_driver_id(*, user:users!drivers_user_id_fkey(id, full_name))')
    .eq('id', vehicleId)
    .maybeSingle();

  if (vehError) throw vehError;

  // Map existing credentials to lookup
  const existingByType = new Map<string, any>();
  for (const cred of existingCredentials || []) {
    existingByType.set(cred.credential_type_id, cred);
  }

  const result: CredentialForReview[] = [];

  const vehicleCreatedAt = vehicle?.created_at ? new Date(vehicle.created_at) : null;

  for (const credType of credentialTypes || []) {
    const existing = existingByType.get(credType.id);

    if (existing) {
      result.push(mapVehicleCredentialToReview(existing, vehicleCreatedAt));
    } else {
      // Calculate grace period for placeholder
      let displayStatus: CredentialForReview['displayStatus'] = 'not_submitted';
      let gracePeriodDueDate: Date | undefined;
      
      if (isAdminOnlyCredential(credType)) {
        displayStatus = 'awaiting_verification';
      } else {
        const gracePeriodEnds = calculateGracePeriodEnd(credType, vehicleCreatedAt);
        if (gracePeriodEnds) {
          const now = new Date();
          if (now < gracePeriodEnds) {
            displayStatus = 'grace_period';
            gracePeriodDueDate = gracePeriodEnds;
          } else {
            displayStatus = 'missing';
          }
        }
      }

      // Create a placeholder for display (not persisted yet)
      result.push({
        id: `placeholder-${credType.id}`,
        credentialTable: 'vehicle_credentials',
        credentialType: credType,
        status: 'pending_review',
        documentUrl: null,
        documentUrls: null,
        signatureData: null,
        formData: null,
        enteredDate: null,
        notes: null,
        submittedAt: null,
        expiresAt: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        rejectionReason: null,
        vehicle: vehicle || undefined,
        displayStatus,
        daysUntilExpiration: null,
        isExpiringSoon: false,
        gracePeriodDueDate,
        // Extra fields for ensuring credential
        _isPlaceholder: true,
        _credentialTypeId: credType.id,
      } as CredentialForReview & { _isPlaceholder?: boolean; _credentialTypeId?: string });
    }
  }

  return result;
}

// ============ ADMIN: GET ALL DRIVER CREDENTIALS WITH TYPES ============

/**
 * For admin view: Gets all driver credential types for the company and merges
 * with existing credential records. This shows all credential types the driver
 * should have, regardless of whether they've been submitted.
 */
export async function getDriverCredentialsForAdmin(
  companyId: string,
  driverId: string,
): Promise<CredentialForReview[]> {
  // Get all driver credential types for this company (global and broker-scoped)
  const { data: credentialTypes, error: typesError } = await supabase
    .from('credential_types')
    .select('*, broker:brokers(id, name)')
    .eq('company_id', companyId)
    .eq('category', 'driver')
    .eq('is_active', true)
    .order('display_order');

  if (typesError) throw typesError;

  // Get existing driver credentials
  // Note: Use explicit foreign key hints to avoid ambiguity
  const { data: existingCredentials, error: credError } = await supabase
    .from('driver_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      driver:drivers!driver_credentials_driver_id_fkey(*, user:users!drivers_user_id_fkey(id, full_name, email))
    `,
    )
    .eq('driver_id', driverId);

  if (credError) throw credError;

  // Get driver info for placeholder credentials
  // Note: Use explicit foreign key hints to avoid ambiguity
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('*, user:users!drivers_user_id_fkey(id, full_name, email)')
    .eq('id', driverId)
    .maybeSingle();

  if (driverError) throw driverError;

  // Map existing credentials to lookup
  const existingByType = new Map<string, any>();
  for (const cred of existingCredentials || []) {
    existingByType.set(cred.credential_type_id, cred);
  }

  const result: CredentialForReview[] = [];

  const driverCreatedAt = driver?.created_at ? new Date(driver.created_at) : null;

  for (const credType of credentialTypes || []) {
    const existing = existingByType.get(credType.id);

    if (existing) {
      result.push(mapDriverCredentialToReview(existing, driverCreatedAt));
    } else {
      // Calculate grace period for placeholder
      let displayStatus: CredentialForReview['displayStatus'] = 'not_submitted';
      let gracePeriodDueDate: Date | undefined;
      
      if (isAdminOnlyCredential(credType)) {
        displayStatus = 'awaiting_verification';
      } else {
        const gracePeriodEnds = calculateGracePeriodEnd(credType, driverCreatedAt);
        if (gracePeriodEnds) {
          const now = new Date();
          if (now < gracePeriodEnds) {
            displayStatus = 'grace_period';
            gracePeriodDueDate = gracePeriodEnds;
          } else {
            displayStatus = 'missing';
          }
        }
      }

      // Create a placeholder for display (not persisted yet)
      result.push({
        id: `placeholder-${credType.id}`,
        credentialTable: 'driver_credentials',
        credentialType: credType,
        status: 'pending_review',
        documentUrl: null,
        documentUrls: null,
        signatureData: null,
        formData: null,
        enteredDate: null,
        notes: null,
        submittedAt: null,
        expiresAt: null,
        reviewedAt: null,
        reviewedBy: null,
        reviewNotes: null,
        rejectionReason: null,
        driver: driver || undefined,
        displayStatus,
        daysUntilExpiration: null,
        isExpiringSoon: false,
        gracePeriodDueDate,
        // Extra fields for ensuring credential
        _isPlaceholder: true,
        _credentialTypeId: credType.id,
      } as CredentialForReview & { _isPlaceholder?: boolean; _credentialTypeId?: string });
    }
  }

  return result;
}

// ============ HELPERS ============

function calculateGracePeriodEnd(
  credentialType: any,
  entityCreatedAt?: Date | null,
): Date | null {
  if (!credentialType?.effective_date || !credentialType?.grace_period_days) {
    return null;
  }

  const effectiveDate = new Date(credentialType.effective_date);
  const baseDate =
    entityCreatedAt && entityCreatedAt > effectiveDate ? entityCreatedAt : effectiveDate;
  const gracePeriodEnds = new Date(baseDate);
  gracePeriodEnds.setDate(gracePeriodEnds.getDate() + credentialType.grace_period_days);
  return gracePeriodEnds;
}

function mapDriverCredentialToReview(raw: any, driverCreatedAt?: Date | null): CredentialForReview {
  const credentialType = raw.credential_type;
  // Keep the original status - 'not_submitted' is a valid display status
  let displayStatus: CredentialForReview['displayStatus'] = raw.status;
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  let gracePeriodDueDate: Date | undefined;

  if (raw.status === 'approved' && raw.expires_at) {
    const expiresAt = new Date(raw.expires_at);
    const now = new Date();
    daysUntilExpiration = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiration <= 0) displayStatus = 'expired';
    else if (daysUntilExpiration <= 30) {
      displayStatus = 'expiring';
      isExpiringSoon = true;
    }
  }

  // Calculate grace period for not_submitted credentials
  if (raw.status === 'not_submitted') {
    const gracePeriodEnds = calculateGracePeriodEnd(credentialType, driverCreatedAt);
    if (gracePeriodEnds) {
      const now = new Date();
      if (now < gracePeriodEnds) {
        displayStatus = 'grace_period';
        gracePeriodDueDate = gracePeriodEnds;
      } else {
        displayStatus = 'missing';
      }
    }
  }

  if (credentialType && isAdminOnlyCredential(credentialType) && raw.status === 'not_submitted') {
    displayStatus = 'awaiting_verification';
    gracePeriodDueDate = undefined;
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
    gracePeriodDueDate,
  };
}

function mapVehicleCredentialToReview(raw: any, vehicleCreatedAt?: Date | null): CredentialForReview {
  const credentialType = raw.credential_type;
  // Keep the original status - 'not_submitted' is a valid display status
  let displayStatus: CredentialForReview['displayStatus'] = raw.status;
  let daysUntilExpiration: number | null = null;
  let isExpiringSoon = false;
  let gracePeriodDueDate: Date | undefined;

  if (raw.status === 'approved' && raw.expires_at) {
    const expiresAt = new Date(raw.expires_at);
    daysUntilExpiration = Math.ceil(
      (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilExpiration <= 0) displayStatus = 'expired';
    else if (daysUntilExpiration <= 30) {
      displayStatus = 'expiring';
      isExpiringSoon = true;
    }
  }

  // Calculate grace period for not_submitted credentials
  if (raw.status === 'not_submitted') {
    const gracePeriodEnds = calculateGracePeriodEnd(credentialType, vehicleCreatedAt);
    if (gracePeriodEnds) {
      const now = new Date();
      if (now < gracePeriodEnds) {
        displayStatus = 'grace_period';
        gracePeriodDueDate = gracePeriodEnds;
      } else {
        displayStatus = 'missing';
      }
    }
  }

  if (credentialType && isAdminOnlyCredential(credentialType) && raw.status === 'not_submitted') {
    displayStatus = 'awaiting_verification';
    gracePeriodDueDate = undefined;
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
    gracePeriodDueDate,
  };
}
