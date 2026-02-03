/**
 * Mock data for the Credential Builder demo
 * 
 * Contains a realistic credential type and AI-generated instruction config
 * that showcases the builder's capabilities.
 */

import type { CredentialType } from '@/types/credential';
import type { CredentialTypeInstructions, InstructionStep } from '@/types/instructionBuilder';
import { createStep, createBlock } from '@/types/instructionBuilder';

// Mock credential type for the demo
export const mockCredentialType: CredentialType = {
  id: 'demo-background-check',
  company_id: 'demo-company',
  broker_id: null,
  name: 'Background Check Authorization',
  description: 'Driver authorization form and identity verification for background screening',
  category: 'driver',
  scope: 'global',
  requirement: 'required',
  employment_type: 'both',
  requires_driver_action: true,
  status: 'active',
  effective_date: new Date().toISOString(),
  published_at: new Date().toISOString(),
  published_by: null,
  is_active: true,
  is_seeded: false,
  vehicle_types: null,
  form_schema: null,
  signature_document_url: null,
  expiration_type: 'fixed_interval',
  expiration_interval_days: 365,
  expiration_warning_days: 30,
  grace_period_days: 14,
  display_order: 1,
  instruction_config: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  created_by: null,
};

// The prompt that "was typed" into the AI generator
export const mockAIPrompt = `Create a background check authorization credential. I need drivers to:
1. Provide their full legal name, date of birth, and Social Security Number
2. Upload a photo of their government ID (driver's license or passport)
3. Read and acknowledge the background check disclosure
4. Sign a consent form authorizing the background check`;

// Helper to create steps with unique IDs
function createMockStep(
  title: string,
  type: InstructionStep['type'],
  blocks: ReturnType<typeof createBlock>[]
): InstructionStep {
  const step = createStep(title, type);
  step.blocks = blocks.map((block, index) => ({
    ...block,
    order: index + 1,
  }));
  step.required = true;
  return step;
}

// The AI-generated config that will be applied
export const mockGeneratedConfig: CredentialTypeInstructions = {
  version: 2,
  settings: {
    showProgressBar: true,
    allowStepSkip: false,
    completionBehavior: 'required_only',
    externalSubmissionAllowed: false,
  },
  steps: [
    // Step 1: Personal Information
    createMockStep('Personal Information', 'form_input', [
      createBlock('heading', { text: 'Your Information', level: 2 }),
      createBlock('paragraph', {
        text: 'Please provide your legal information exactly as it appears on your government-issued ID.',
      }),
      createBlock('form_field', {
        key: 'full_legal_name',
        label: 'Full Legal Name',
        type: 'text',
        required: true,
        placeholder: 'First Middle Last',
      }),
      createBlock('form_field', {
        key: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      }),
      createBlock('form_field', {
        key: 'ssn_last_4',
        label: 'SSN (Last 4 Digits)',
        type: 'text',
        required: true,
        placeholder: '0000',
      }),
    ]),

    // Step 2: ID Upload
    createMockStep('Identity Verification', 'document_upload', [
      createBlock('heading', { text: 'Upload Your ID', level: 2 }),
      createBlock('paragraph', {
        text: 'Upload a clear photo of your valid government-issued ID. Acceptable documents include driver\'s license or passport.',
      }),
      createBlock('alert', {
        variant: 'info',
        title: 'Photo Requirements',
        message: 'Ensure all text is readable and the entire document is visible. No glare or blur.',
      }),
      createBlock('file_upload', {
        label: 'Government ID (Front)',
        accept: 'image/*',
        maxSizeMB: 10,
        required: true,
      }),
      createBlock('file_upload', {
        label: 'Government ID (Back)',
        accept: 'image/*',
        maxSizeMB: 10,
        required: true,
      }),
    ]),

    // Step 3: Disclosure
    createMockStep('Background Check Disclosure', 'information', [
      createBlock('heading', { text: 'Disclosure Statement', level: 2 }),
      createBlock('rich_text', {
        html: `<p>In accordance with the Fair Credit Reporting Act (FCRA), we are providing this disclosure to inform you that a consumer report and/or investigative consumer report may be obtained for employment purposes.</p>
        <p>The report may contain information about your character, general reputation, personal characteristics, and mode of living. This information may be obtained through personal interviews with sources such as neighbors, friends, associates, current or former employers, or others with knowledge about you.</p>
        <p>You have the right to request disclosure of the nature and scope of any investigative consumer report and a written summary of your rights under the FCRA.</p>`,
      }),
      createBlock('checkbox', {
        label: 'I acknowledge that I have read and understand this disclosure statement',
        required: true,
      }),
    ]),

    // Step 4: Consent & Signature
    createMockStep('Authorization & Signature', 'signature', [
      createBlock('heading', { text: 'Consent to Background Check', level: 2 }),
      createBlock('paragraph', {
        text: 'By signing below, you authorize the company to obtain a consumer report and/or investigative consumer report about you for employment purposes.',
      }),
      createBlock('signature_pad', {
        label: 'Your Signature',
        required: true,
        allowTyped: true,
        allowDrawn: true,
        agreementText: 'I authorize the background check and certify that the information I have provided is true and accurate.',
      }),
    ]),
  ].map((step, index) => ({ ...step, order: index + 1 })),
};
