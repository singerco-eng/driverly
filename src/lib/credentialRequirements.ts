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
