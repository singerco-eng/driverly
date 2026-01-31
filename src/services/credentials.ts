import { supabase } from '@/integrations/supabase/client';
import type {
  DriverCredential,
  VehicleCredential,
  CredentialType,
  CredentialSubmissionHistory,
  CredentialWithDisplayStatus,
  CredentialProgressSummary,
  SignatureData,
} from '@/types/credential';
import type { Vehicle } from '@/types/vehicle';
import { isAdminOnlyCredential } from '@/lib/credentialRequirements';

interface RequiredCredentialRow {
  credential_type_id: string;
  credential_type_name: string;
  category: 'driver' | 'vehicle';
  scope: 'global' | 'broker';
  broker_id: string | null;
  broker_name: string | null;
  submission_type: CredentialType['submission_type'];
  requires_driver_action: CredentialType['requires_driver_action'];
  requirement: CredentialType['requirement'];
}

export async function getDriverCredentials(
  driverId: string,
): Promise<CredentialWithDisplayStatus[]> {
  const { data: required, error: reqError } = await supabase
    .rpc('get_driver_required_credentials', { p_driver_id: driverId });

  if (reqError) throw reqError;

  const { data: credentials, error } = await supabase
    .from('driver_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name))
    `,
    )
    .eq('driver_id', driverId);

  if (error) throw error;

  return mergeCredentialsWithTypes(
    (credentials || []) as DriverCredential[],
    (required || []) as RequiredCredentialRow[],
  );
}

export async function getVehicleCredentials(
  vehicleId: string,
): Promise<CredentialWithDisplayStatus[]> {
  const { data: required, error: reqError } = await supabase
    .rpc('get_vehicle_required_credentials', { p_vehicle_id: vehicleId });

  if (reqError) throw reqError;

  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id, year, make, model')
    .eq('id', vehicleId)
    .maybeSingle();

  const { data: credentials, error } = await supabase
    .from('vehicle_credentials')
    .select(
      `
      *,
      credential_type:credential_types(*, broker:brokers(id, name)),
      vehicle:vehicles(id, year, make, model)
    `,
    )
    .eq('vehicle_id', vehicleId);

  if (error) throw error;

  return mergeCredentialsWithTypes(
    (credentials || []) as VehicleCredential[],
    (required || []) as RequiredCredentialRow[],
    vehicleId,
    (vehicle || null) as Vehicle | null,
  );
}

export async function getDriverCredentialProgress(
  driverId: string,
): Promise<CredentialProgressSummary> {
  const credentials = await getDriverCredentials(driverId);
  return calculateProgress(credentials);
}

export async function getVehicleCredentialProgress(
  vehicleId: string,
): Promise<CredentialProgressSummary> {
  const credentials = await getVehicleCredentials(vehicleId);
  return calculateProgress(credentials);
}

export interface SubmitDocumentPayload {
  credentialId: string;
  credentialTable: 'driver_credentials' | 'vehicle_credentials';
  documentUrls: string[];
  notes?: string;
  driverExpirationDate?: string;
}

export async function submitDocumentCredential(payload: SubmitDocumentPayload): Promise<void> {
  const nextVersion = await getNextSubmissionVersion(
    payload.credentialId,
    payload.credentialTable,
  );

  const updateData = {
    document_urls: payload.documentUrls,
    document_url: payload.documentUrls[0] || null,
    notes: payload.notes || null,
    driver_expiration_date: payload.driverExpirationDate || null,
    status: 'pending_review',
    submitted_at: new Date().toISOString(),
    ...(nextVersion ? { submission_version: nextVersion } : {}),
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
  const nextVersion = await getNextSubmissionVersion(
    payload.credentialId,
    payload.credentialTable,
  );

  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      signature_data: payload.signatureData,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      ...(nextVersion ? { submission_version: nextVersion } : {}),
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
  const nextVersion = await getNextSubmissionVersion(
    payload.credentialId,
    payload.credentialTable,
  );

  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      form_data: payload.formData,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      ...(nextVersion ? { submission_version: nextVersion } : {}),
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
  const nextVersion = await getNextSubmissionVersion(
    payload.credentialId,
    payload.credentialTable,
  );

  const { error } = await supabase
    .from(payload.credentialTable)
    .update({
      entered_date: payload.enteredDate,
      notes: payload.notes || null,
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      ...(nextVersion ? { submission_version: nextVersion } : {}),
    })
    .eq('id', payload.credentialId);

  if (error) throw error;
}

export async function ensureDriverCredential(
  driverId: string,
  credentialTypeId: string,
  companyId: string,
): Promise<{ id: string }> {
  // Try to find existing credential first
  const { data: existing } = await supabase
    .from('driver_credentials')
    .select('id')
    .eq('driver_id', driverId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();

  if (existing) return { id: existing.id };

  // Use RPC function to create credential (handles RLS bypass for drivers)
  const { data, error } = await supabase.rpc('ensure_driver_credential', {
    p_driver_id: driverId,
    p_credential_type_id: credentialTypeId,
    p_company_id: companyId,
  });

  if (error) throw error;
  return { id: data as string };
}

/**
 * Admin version - allows admins to create credentials for any driver in their company
 */
export async function adminEnsureDriverCredential(
  driverId: string,
  credentialTypeId: string,
  companyId: string,
): Promise<{ id: string }> {
  // Try to find existing credential first
  const { data: existing } = await supabase
    .from('driver_credentials')
    .select('id')
    .eq('driver_id', driverId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();

  if (existing) return { id: existing.id };

  // Use admin RPC function to create credential
  const { data, error } = await supabase.rpc('admin_ensure_driver_credential', {
    p_driver_id: driverId,
    p_credential_type_id: credentialTypeId,
    p_company_id: companyId,
  });

  if (error) throw error;
  return { id: data as string };
}

export async function ensureVehicleCredential(
  vehicleId: string,
  credentialTypeId: string,
  companyId: string,
): Promise<string> {
  // Try to find existing credential first
  const { data: existing } = await supabase
    .from('vehicle_credentials')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();

  if (existing) return existing.id;

  // Use RPC function to create credential (handles RLS bypass for drivers)
  const { data, error } = await supabase.rpc('ensure_vehicle_credential', {
    p_vehicle_id: vehicleId,
    p_credential_type_id: credentialTypeId,
    p_company_id: companyId,
  });

  if (error) throw error;
  return data as string;
}

/**
 * Admin version - allows admins to create credentials for any vehicle in their company
 */
export async function adminEnsureVehicleCredential(
  vehicleId: string,
  credentialTypeId: string,
  companyId: string,
): Promise<{ id: string }> {
  // Try to find existing credential first
  const { data: existing } = await supabase
    .from('vehicle_credentials')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('credential_type_id', credentialTypeId)
    .maybeSingle();

  if (existing) return { id: existing.id };

  // Use admin RPC function to create credential
  const { data, error } = await supabase.rpc('admin_ensure_vehicle_credential', {
    p_vehicle_id: vehicleId,
    p_credential_type_id: credentialTypeId,
    p_company_id: companyId,
  });

  if (error) throw error;
  return { id: data as string };
}

export async function uploadCredentialDocument(
  file: File,
  userId: string,
  credentialId: string,
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
    .createSignedUrl(path, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Generic submit - marks credential as pending review
 * Used for new instruction-based credentials
 */
export async function submitCredential(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
): Promise<void> {
  const nextVersion = await getNextSubmissionVersion(credentialId, credentialTable);
  
  const { error } = await supabase
    .from(credentialTable)
    .update({
      status: 'pending_review',
      submitted_at: new Date().toISOString(),
      submission_version: nextVersion,
    })
    .eq('id', credentialId);

  if (error) throw error;
}

/**
 * Get submission history for a credential
 * Returns all past submissions with their review outcomes
 */
export async function getCredentialHistory(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
): Promise<CredentialSubmissionHistory[]> {
  const { data, error } = await supabase
    .from('credential_submission_history')
    .select('*')
    .eq('credential_id', credentialId)
    .eq('credential_table', credentialTable)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CredentialSubmissionHistory[];
}

function mergeCredentialsWithTypes(
  credentials: Array<DriverCredential | VehicleCredential>,
  required: RequiredCredentialRow[],
  vehicleId?: string,
  vehicleSummary?: Vehicle | null,
): CredentialWithDisplayStatus[] {
  const result: CredentialWithDisplayStatus[] = [];

  for (const req of required) {
    const existing = credentials.find((c) => c.credential_type_id === req.credential_type_id);

    if (existing) {
      if (vehicleSummary && 'vehicle_id' in existing) {
        const vehicleCredential = existing as VehicleCredential;
        if (!vehicleCredential.vehicle) {
          vehicleCredential.vehicle = vehicleSummary;
        }
      }
      result.push(computeDisplayStatus(existing, existing.credential_type as CredentialType));
      continue;
    }

    const placeholder = {
      id: null,
      credential_type_id: req.credential_type_id,
      status: 'not_submitted' as const,
      vehicle_id: vehicleId,
      vehicle: vehicleSummary ?? undefined,
    };

    result.push(
      computeDisplayStatus(placeholder as any, {
        id: req.credential_type_id,
        name: req.credential_type_name,
        category: req.category || 'vehicle',
        scope: req.scope,
        broker_id: req.broker_id,
        submission_type: req.submission_type,
        requires_driver_action: req.requires_driver_action ?? true,
        requirement: req.requirement,
        broker: req.broker_name ? { id: req.broker_id, name: req.broker_name } : undefined,
      } as CredentialType),
    );
  }

  return result;
}

function computeDisplayStatus(
  credential: DriverCredential | VehicleCredential | any,
  credentialType: CredentialType,
): CredentialWithDisplayStatus {
  let displayStatus: CredentialWithDisplayStatus['displayStatus'] = credential.status;
  let isExpiringSoon = false;
  let daysUntilExpiration: number | null = null;

  if (credential.status === 'approved' && credential.expires_at) {
    const expiresAt = new Date(credential.expires_at);
    const now = new Date();
    const diffDays = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    daysUntilExpiration = diffDays;

    if (diffDays <= 0) {
      displayStatus = 'expired';
    } else if (diffDays <= (credentialType.expiration_warning_days || 30)) {
      displayStatus = 'expiring';
      isExpiringSoon = true;
    }
  }

  if (isAdminOnlyCredential(credentialType) && credential.status === 'not_submitted') {
    displayStatus = 'awaiting';
  }

  const canSubmit =
    !isAdminOnlyCredential(credentialType) && credential.status !== 'pending_review';

  return {
    credential,
    credentialType,
    displayStatus,
    isExpiringSoon,
    daysUntilExpiration,
    canSubmit,
  };
}

function calculateProgress(credentials: CredentialWithDisplayStatus[]): CredentialProgressSummary {
  const required = credentials.filter((c) => c.credentialType.requirement === 'required');
  const complete = required.filter((c) => c.displayStatus === 'approved').length;
  const pending = required.filter((c) => ['pending_review', 'awaiting'].includes(c.displayStatus))
    .length;
  const actionNeeded = required.filter((c) =>
    ['not_submitted', 'rejected', 'expired', 'expiring'].includes(c.displayStatus),
  ).length;

  return {
    total: required.length,
    complete,
    pending,
    actionNeeded,
    percentage:
      required.length > 0 ? Math.round((complete / required.length) * 100) : 100,
  };
}

async function getNextSubmissionVersion(
  credentialId: string,
  credentialTable: 'driver_credentials' | 'vehicle_credentials',
): Promise<number | null> {
  const { data, error } = await supabase
    .from(credentialTable)
    .select('submission_version')
    .eq('id', credentialId)
    .maybeSingle();

  if (error) throw error;
  if (!data?.submission_version) return null;
  return data.submission_version + 1;
}
