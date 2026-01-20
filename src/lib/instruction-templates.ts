import type { CredentialTypeInstructions, InstructionTemplate } from '@/types/instructionBuilder';
import { createEmptyInstructions } from '@/types/instructionBuilder';

/**
 * Pre-built templates for common credential types
 * These populate the instruction builder when selected in the create modal
 */

export const instructionTemplates: InstructionTemplate[] = [
  {
    id: 'document_upload',
    label: 'Document Upload',
    description: 'Simple document or certificate upload',
    icon: 'FileText',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Upload Document',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Upload the required document. Accepted formats: PDF, JPG, PNG.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Document',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSizeMB: 50,
                multiple: false,
                required: true,
                helpText: 'Maximum file size: 50MB',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'photo_capture',
    label: 'Photo Capture',
    description: 'Take or upload a photo',
    icon: 'Camera',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Capture Photo',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Take a clear photo or upload an existing image.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Photo',
                accept: 'image/*',
                maxSizeMB: 10,
                multiple: false,
                required: true,
                helpText: 'JPG or PNG, max 10MB',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'signature',
    label: 'Signature Agreement',
    description: 'Review document and sign electronically',
    icon: 'PenTool',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Review Agreement',
          type: 'information',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Agreement', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Please read the following agreement carefully before signing.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'info',
                title: 'Review Required',
                message: 'You must review this document before you can sign.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'auto', autoCompleteOnView: true },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Sign Document',
          type: 'signature',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'signature_pad',
              content: {
                label: 'Your Signature',
                required: true,
                allowTyped: true,
                allowDrawn: true,
                agreementText: 'By signing, I agree to the terms above.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'training_quiz',
    label: 'Training + Quiz',
    description: 'Video training with knowledge check',
    icon: 'GraduationCap',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Watch Training',
          type: 'information',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Training Video', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: {
                text: 'Watch the training video below. You must watch at least 90% to proceed.',
              },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'video',
              content: {
                source: 'youtube',
                url: '',
                title: 'Training Video',
                requireWatch: true,
                watchPercentRequired: 90,
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Knowledge Check',
          type: 'knowledge_check',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Quiz', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Answer the following questions to complete your training.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'quiz_question',
              content: {
                question: 'Sample question?',
                questionType: 'multiple_choice',
                options: [
                  { id: crypto.randomUUID(), text: 'Option A', isCorrect: true },
                  { id: crypto.randomUUID(), text: 'Option B', isCorrect: false },
                  { id: crypto.randomUUID(), text: 'Option C', isCorrect: false },
                ],
                explanation: 'Explanation of correct answer.',
                allowRetry: true,
                required: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'quiz_pass', passScore: 80 },
        },
      ],
    },
  },
  {
    id: 'external_upload',
    label: 'External + Upload',
    description: 'Complete external action then upload proof',
    icon: 'ExternalLink',
    config: {
      version: 2,
      settings: {
        showProgressBar: true,
        allowStepSkip: false,
        completionBehavior: 'all_steps',
        externalSubmissionAllowed: true,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Complete External Action',
          type: 'external_action',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Action Required', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: { text: 'Complete the required action at the external website.' },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'warning',
                title: 'Important',
                message: 'Complete this within the required timeframe.',
              },
            },
            {
              id: crypto.randomUUID(),
              order: 4,
              type: 'external_link',
              content: {
                url: 'https://example.com',
                title: 'Go to External Site',
                description: 'Click to open the external website.',
                buttonText: 'Open Website →',
                trackVisit: true,
                requireVisit: true,
                opensInNewTab: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
        {
          id: crypto.randomUUID(),
          order: 2,
          title: 'Upload Proof',
          type: 'document_upload',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'paragraph',
              content: { text: 'Upload your confirmation or results document.' },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'file_upload',
              content: {
                label: 'Upload Results',
                accept: '.pdf,.jpg,.jpeg,.png',
                maxSizeMB: 50,
                multiple: false,
                required: true,
              },
            },
          ],
          conditions: [],
          completion: { type: 'form_submit' },
        },
      ],
    },
  },
  {
    id: 'admin_verified',
    label: 'Admin Verified',
    description: 'Admin manually marks complete',
    icon: 'CheckCircle',
    config: {
      version: 2,
      settings: {
        showProgressBar: false,
        allowStepSkip: false,
        completionBehavior: 'required_only',
        externalSubmissionAllowed: false,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          order: 1,
          title: 'Awaiting Verification',
          type: 'admin_verify',
          required: true,
          blocks: [
            {
              id: crypto.randomUUID(),
              order: 1,
              type: 'heading',
              content: { text: 'Admin Verification Required', level: 2 },
            },
            {
              id: crypto.randomUUID(),
              order: 2,
              type: 'paragraph',
              content: {
                text: 'This credential will be verified by your administrator. No action is required from you.',
              },
            },
            {
              id: crypto.randomUUID(),
              order: 3,
              type: 'alert',
              content: {
                variant: 'info',
                title: 'Status',
                message: 'Awaiting admin verification. Contact your administrator if you have questions.',
              },
            },
          ],
          conditions: [],
          completion: { type: 'manual' },
        },
      ],
    },
  },
  {
    id: 'blank',
    label: 'Blank Custom',
    description: 'Start with an empty canvas',
    icon: 'Plus',
    config: createEmptyInstructions(),
  },
];

export function getTemplateById(id: string): InstructionTemplate | undefined {
  return instructionTemplates.find((t) => t.id === id);
}

export function getDefaultTemplate(): InstructionTemplate {
  return instructionTemplates.find((t) => t.id === 'document_upload')!;
}
