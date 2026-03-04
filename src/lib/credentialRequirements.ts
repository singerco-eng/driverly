import type { ComponentType } from 'react';
import { FileUp, PenTool, FileText, Calendar, CheckSquare, HelpCircle, ShieldCheck, Camera } from 'lucide-react';
import type { CredentialType } from '@/types/credential';
import type { CredentialTypeInstructions } from '@/types/instructionBuilder';

export interface CredentialRequirement {
  type: 'upload' | 'photo' | 'signature' | 'form' | 'date' | 'checklist' | 'quiz';
  icon: ComponentType<{ className?: string }>;
  label: string;
}

/**
 * Derive what a credential requires from its instruction_config
 */
export function getCredentialRequirements(
  config: CredentialTypeInstructions | null,
): CredentialRequirement[] {
  if (!config?.steps?.length) return [];

  const requirements: CredentialRequirement[] = [];
  const seen = new Set<string>();

  for (const step of config.steps) {
    for (const block of step.blocks) {
      if (block.type === 'file_upload' && !seen.has('upload')) {
        requirements.push({ type: 'upload', icon: FileUp, label: 'Upload' });
        seen.add('upload');
      }
      if (block.type === 'signature_pad' && !seen.has('signature')) {
        requirements.push({ type: 'signature', icon: PenTool, label: 'Signature' });
        seen.add('signature');
      }
      if (block.type === 'form_field') {
        const fieldType = (block.content as { type?: string }).type;
        if (fieldType === 'date' && !seen.has('date')) {
          requirements.push({ type: 'date', icon: Calendar, label: 'Date' });
          seen.add('date');
        }
        if (fieldType !== 'date' && !seen.has('form')) {
          requirements.push({ type: 'form', icon: FileText, label: 'Form' });
          seen.add('form');
        }
      }
      if (block.type === 'checklist' && !seen.has('checklist')) {
        requirements.push({ type: 'checklist', icon: CheckSquare, label: 'Checklist' });
        seen.add('checklist');
      }
      if (block.type === 'quiz_question' && !seen.has('quiz')) {
        requirements.push({ type: 'quiz', icon: HelpCircle, label: 'Quiz' });
        seen.add('quiz');
      }
    }
  }

  return requirements;
}

/**
 * Get step count for display
 */
export function getStepCount(config: CredentialTypeInstructions | null): number {
  return config?.steps?.length ?? 0;
}

/**
 * Check if credential is admin-only (no driver action required)
 */
export function isAdminOnlyCredential(credentialType: CredentialType): boolean {
  if (typeof credentialType.requires_driver_action === 'boolean') {
    return !credentialType.requires_driver_action;
  }
  return credentialType.submission_type === 'admin_verified';
}

/**
 * Check if credential should be visible to drivers based on status/effective date.
 */
export function isCredentialLiveForDrivers(credentialType: CredentialType): boolean {
  const effectiveDate = credentialType.effective_date
    ? new Date(credentialType.effective_date)
    : null;

  if (credentialType.status === 'active') {
    return !effectiveDate || effectiveDate <= new Date();
  }

  if (credentialType.status === 'scheduled') {
    return !!effectiveDate && effectiveDate <= new Date();
  }

  return false;
}

/**
 * Get legacy submission type display (for backwards compatibility)
 */
export function getLegacyRequirements(
  submissionType: string | undefined | null,
): CredentialRequirement[] {
  switch (submissionType) {
    case 'document_upload':
      return [{ type: 'upload', icon: FileUp, label: 'Upload' }];
    case 'photo':
      return [{ type: 'photo', icon: Camera, label: 'Photo' }];
    case 'signature':
      return [{ type: 'signature', icon: PenTool, label: 'Signature' }];
    case 'form_entry':
    case 'form':
      return [{ type: 'form', icon: FileText, label: 'Form' }];
    case 'date_entry':
      return [{ type: 'date', icon: Calendar, label: 'Date Entry' }];
    case 'admin_verified':
      return [{ type: 'form', icon: ShieldCheck, label: 'Admin Only' }];
    default:
      return [];
  }
}

/**
 * Get all requirements - tries instruction_config first, falls back to legacy
 */
export function getAllRequirements(credentialType: CredentialType): CredentialRequirement[] {
  if (credentialType.instruction_config?.steps?.length) {
    return getCredentialRequirements(credentialType.instruction_config);
  }
  return getLegacyRequirements(credentialType.submission_type);
}

/**
 * Computed credential status for display
 * Priority: expired > expiring > missing > grace_period (due soon) > pending > valid
 */
export type ComputedCredentialStatus = 
  | 'valid' 
  | 'expiring' 
  | 'expired' 
  | 'missing' 
  | 'grace_period' 
  | 'pending';

export interface CredentialStatusResult {
  status: ComputedCredentialStatus;
  count: number;
  total: number;
}

/**
 * Compute aggregate credential status from a list of credentials with displayStatus.
 * This is the single source of truth for credential status display across the app.
 * 
 * Priority order:
 * 1. expired → Expired
 * 2. expiring → Expiring Soon
 * 3. missing (includes not_submitted, rejected) → Missing
 * 4. grace_period → Due Soon
 * 5. pending (includes pending_review, awaiting, awaiting_verification) → Pending Review
 * 6. valid → Complete
 */
export function computeCredentialStatus<T extends { displayStatus: string; credentialType?: { requirement?: string; scope?: string } | null }>(
  credentials: T[],
  options?: { requirementFilter?: 'required' | 'all'; scopeFilter?: 'global' | 'all' }
): CredentialStatusResult {
  const { requirementFilter = 'required', scopeFilter = 'global' } = options ?? {};

  // Filter to relevant credentials
  const filtered = credentials.filter((c) => {
    if (!c.credentialType) return false;
    if (requirementFilter === 'required' && c.credentialType.requirement !== 'required') return false;
    if (scopeFilter === 'global' && c.credentialType.scope !== 'global') return false;
    return true;
  });

  if (filtered.length === 0) {
    return { status: 'valid', count: 0, total: 0 };
  }

  const expired = filtered.filter((c) => c.displayStatus === 'expired');
  const expiring = filtered.filter((c) => c.displayStatus === 'expiring');
  const missing = filtered.filter((c) =>
    ['not_submitted', 'rejected', 'missing'].includes(c.displayStatus)
  );
  const gracePeriod = filtered.filter((c) => c.displayStatus === 'grace_period');
  const pending = filtered.filter((c) =>
    ['pending_review', 'awaiting', 'awaiting_verification'].includes(c.displayStatus)
  );

  if (expired.length > 0) {
    return { status: 'expired', count: expired.length, total: filtered.length };
  }
  if (expiring.length > 0) {
    return { status: 'expiring', count: expiring.length, total: filtered.length };
  }
  if (missing.length > 0) {
    return { status: 'missing', count: missing.length, total: filtered.length };
  }
  if (gracePeriod.length > 0) {
    return { status: 'grace_period', count: gracePeriod.length, total: filtered.length };
  }
  if (pending.length > 0) {
    return { status: 'pending', count: pending.length, total: filtered.length };
  }
  return { status: 'valid', count: 0, total: filtered.length };
}

/**
 * Map computed status to credentialStatusConfig key for badge display
 */
export function getCredentialStatusConfigKey(status: ComputedCredentialStatus): 
  'approved' | 'expiring' | 'expired' | 'missing' | 'grace_period' | 'pending_review' {
  switch (status) {
    case 'valid':
      return 'approved';
    case 'expiring':
      return 'expiring';
    case 'expired':
      return 'expired';
    case 'missing':
      return 'missing';
    case 'grace_period':
      return 'grace_period';
    case 'pending':
      return 'pending_review';
  }
}

/**
 * Map computed status to QuickStat status for visual indicator
 */
export function getQuickStatStatus(status: ComputedCredentialStatus): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'valid':
      return 'success';
    case 'expiring':
    case 'grace_period':
    case 'pending':
      return 'warning';
    case 'expired':
    case 'missing':
      return 'error';
    default:
      return 'neutral';
  }
}
