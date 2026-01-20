import { supabase } from '@/integrations/supabase/client';
import type {
  CredentialType,
  CredentialTypeFormData,
  CredentialTypeWithStats,
  Broker,
  CreateCredentialTypeSimple,
} from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';
import { getDefaultTemplate, getTemplateById } from '@/lib/instruction-templates';

export async function getCredentialTypes(companyId: string): Promise<CredentialType[]> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(
      `
      *,
      broker:brokers(id, name)
    `,
    )
    .eq('company_id', companyId)
    .order('scope')
    .order('category')
    .order('display_order');

  if (error) throw error;
  return data as CredentialType[];
}

export async function getCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(
      `
      *,
      broker:brokers(id, name)
    `,
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function getCredentialTypeWithStats(
  id: string,
): Promise<CredentialTypeWithStats> {
  const credType = await getCredentialType(id);

  // Get counts based on category
  const table = credType.category === 'driver' ? 'driver_credentials' : 'vehicle_credentials';

  const { data: stats, error: statsError } = await supabase
    .from(table)
    .select('status')
    .eq('credential_type_id', id);

  if (statsError) throw statsError;

  const counts = {
    total_count: stats?.length ?? 0,
    approved_count: stats?.filter((s) => s.status === 'approved').length ?? 0,
    pending_count: stats?.filter((s) => s.status === 'pending_review').length ?? 0,
    rejected_count: stats?.filter((s) => s.status === 'rejected').length ?? 0,
    expired_count: stats?.filter((s) => s.status === 'expired').length ?? 0,
  };

  return { ...credType, ...counts };
}

export async function createCredentialType(
  companyId: string,
  formData: CredentialTypeFormData,
  userId: string,
): Promise<CredentialType> {
  const submissionType = deriveSubmissionType(
    formData.instruction_config ?? null,
    formData.requires_driver_action,
  );

  const { data, error } = await supabase
    .from('credential_types')
    .insert({
      company_id: companyId,
      name: formData.name,
      description: formData.description || null,
      instruction_config: formData.instruction_config ?? null,
      category: formData.category,
      scope: formData.scope,
      broker_id: formData.scope === 'broker' ? formData.broker_id : null,
      requires_driver_action: formData.requires_driver_action,
      employment_type: formData.employment_type,
      requirement: formData.requirement,
      // Save NULL if no vehicle types selected (empty array means "apply to all")
      vehicle_types: formData.category === 'vehicle' && formData.vehicle_types?.length 
        ? formData.vehicle_types 
        : null,
      submission_type: submissionType,
      form_schema: formData.form_schema,
      signature_document_url: formData.signature_document_url,
      expiration_type: formData.expiration_type,
      expiration_interval_days:
        formData.expiration_type === 'fixed_interval'
          ? formData.expiration_interval_days
          : null,
      expiration_warning_days: formData.expiration_warning_days,
      grace_period_days: formData.grace_period_days,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

/**
 * Create a new credential type with minimal info (simple modal)
 * Returns the created credential type ID for redirect to editor
 */
export async function createCredentialTypeSimple(
  companyId: string,
  data: CreateCredentialTypeSimple,
  createdBy: string,
): Promise<string> {
  const template = data.template_id ? getTemplateById(data.template_id) : getDefaultTemplate();
  const instructionConfig = template?.config ?? null;
  const requiresDriverAction = template?.id !== 'admin_verified';
  const submissionType = deriveSubmissionType(instructionConfig, requiresDriverAction);

  const { data: created, error } = await supabase
    .from('credential_types')
    .insert({
      company_id: companyId,
      name: data.name,
      category: data.category,
      scope: data.scope,
      broker_id: data.scope === 'broker' ? data.broker_id : null,
      instruction_config: instructionConfig,
      requires_driver_action: requiresDriverAction,
      // Defaults
      submission_type: submissionType,
      employment_type: 'both',
      requirement: 'required',
      expiration_type: 'never',
      expiration_warning_days: 30,
      grace_period_days: 30,
      is_active: true,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

/**
 * Update instruction config for a credential type
 */
export async function updateInstructionConfig(
  credentialTypeId: string,
  config: CredentialTypeInstructions,
): Promise<void> {
  const submissionType = deriveSubmissionType(config);

  const { error } = await supabase
    .from('credential_types')
    .update({
      instruction_config: config,
      submission_type: submissionType,
      updated_at: new Date().toISOString(),
    })
    .eq('id', credentialTypeId);

  if (error) throw error;
}

export async function updateCredentialType(
  id: string,
  formData: Partial<CredentialTypeFormData>,
): Promise<CredentialType> {
  const updates = { ...formData };

  if (updates.requires_driver_action === false) {
    updates.submission_type = 'admin_verified';
  } else if (updates.requires_driver_action === true && updates.instruction_config) {
    updates.submission_type = deriveSubmissionType(
      updates.instruction_config,
      updates.requires_driver_action,
    );
  }

  const { data, error } = await supabase
    .from('credential_types')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

/**
 * Get a single credential type by ID with instruction config
 */
export async function getCredentialTypeById(id: string): Promise<CredentialType | null> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(
      `
      *,
      broker:brokers(id, name)
    `,
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as CredentialType;
}

export async function deactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function reactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function deleteCredentialType(id: string): Promise<void> {
  const { error } = await supabase
    .from('credential_types')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updateCredentialTypeOrder(
  companyId: string,
  orderedIds: string[],
): Promise<void> {
  // Update display_order for each credential type
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('credential_types')
      .update({ display_order: index })
      .eq('id', id)
      .eq('company_id', companyId),
  );

  await Promise.all(updates);
}

// Brokers (minimal for credential type form)
export async function getBrokers(companyId: string): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('id, company_id, name, code, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Broker[];
}

/**
 * Derive legacy submission_type from instruction config blocks
 * For backward compatibility with existing credential submission flow
 */
function deriveSubmissionType(
  config: CredentialTypeInstructions | null,
  requiresDriverAction = true,
): CredentialType['submission_type'] {
  if (!requiresDriverAction) return 'admin_verified';
  if (!config || config.steps.length === 0) return null;

  const allBlocks = config.steps.flatMap((step) => step.blocks);
  const hasSignature = allBlocks.some((block) => block.type === 'signature_pad');
  const hasFileUpload = allBlocks.some((block) => block.type === 'file_upload');
  const hasFormField = allBlocks.some((block) => block.type === 'form_field');
  const hasNonDateFormField = allBlocks.some(
    (block) => block.type === 'form_field' && (block.content as { type?: string }).type !== 'date',
  );
  const hasDateField = allBlocks.some(
    (block) => block.type === 'form_field' && (block.content as { type?: string }).type === 'date',
  );
  const hasQuiz = allBlocks.some((block) => block.type === 'quiz_question');
  const hasAdminVerify = config.steps.some((step) => step.type === 'admin_verify');

  if (hasAdminVerify && !hasSignature && !hasFileUpload && !hasFormField) {
    return 'admin_verified';
  }
  if (hasSignature) return 'signature';
  if (hasFileUpload) return 'document_upload';
  if (hasNonDateFormField || hasQuiz) return 'form';
  if (hasDateField) return 'date_entry';

  return null;
}
