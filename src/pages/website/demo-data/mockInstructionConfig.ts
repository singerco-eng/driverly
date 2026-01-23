// Realistic mock instruction config for credential builder demo

export interface MockBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
}

export interface MockStep {
  id: string;
  title: string;
  type: string;
  required: boolean;
  order: number;
  blocks: MockBlock[];
}

export interface MockInstructionConfig {
  steps: MockStep[];
  settings: {
    showProgressBar: boolean;
    allowStepNavigation: boolean;
    requireSequentialCompletion: boolean;
  };
}

// Empty config for initial state
export const emptyInstructionConfig: MockInstructionConfig = {
  steps: [],
  settings: {
    showProgressBar: true,
    allowStepNavigation: true,
    requireSequentialCompletion: false,
  },
};

// Background Check credential config
export const backgroundCheckConfig: MockInstructionConfig = {
  steps: [
    {
      id: 'step-1',
      title: 'Consent & Authorization',
      type: 'form',
      required: true,
      order: 1,
      blocks: [
        {
          id: 'block-1-1',
          type: 'heading',
          content: { text: 'Background Check Authorization', level: 2 },
        },
        {
          id: 'block-1-2',
          type: 'paragraph',
          content: {
            text: 'Before we can proceed with your background check, we need your written consent. Please read the following authorization carefully.',
          },
        },
        {
          id: 'block-1-3',
          type: 'alert',
          content: {
            type: 'info',
            title: 'What We Check',
            message: 'Our background check includes criminal history, driving record, and identity verification.',
          },
        },
        {
          id: 'block-1-4',
          type: 'form_field',
          content: {
            key: 'ssn_last_4',
            label: 'Last 4 digits of SSN',
            type: 'text',
            required: true,
            placeholder: '0000',
          },
        },
      ],
    },
    {
      id: 'step-2',
      title: 'Identity Verification',
      type: 'upload',
      required: true,
      order: 2,
      blocks: [
        {
          id: 'block-2-1',
          type: 'heading',
          content: { text: 'Upload Government ID', level: 2 },
        },
        {
          id: 'block-2-2',
          type: 'paragraph',
          content: {
            text: 'Please upload a clear photo of your government-issued ID (driver\'s license, passport, or state ID).',
          },
        },
        {
          id: 'block-2-3',
          type: 'file_upload',
          content: {
            label: 'Government-Issued ID',
            accept: ['image/*', 'application/pdf'],
            maxSize: 10,
            required: true,
          },
        },
      ],
    },
    {
      id: 'step-3',
      title: 'Knowledge Check',
      type: 'quiz',
      required: true,
      order: 3,
      blocks: [
        {
          id: 'block-3-1',
          type: 'heading',
          content: { text: 'Verification Questions', level: 2 },
        },
        {
          id: 'block-3-2',
          type: 'quiz_question',
          content: {
            question: 'What is the purpose of a background check?',
            type: 'multiple_choice',
            required: true,
            options: [
              'To verify your identity and ensure passenger safety',
              'To check your credit score',
              'To verify your employment history only',
            ],
            correctAnswer: 0,
          },
        },
        {
          id: 'block-3-3',
          type: 'quiz_question',
          content: {
            question: 'How long is a background check valid?',
            type: 'multiple_choice',
            required: true,
            options: ['30 days', '1 year', '2 years'],
            correctAnswer: 1,
          },
        },
      ],
    },
    {
      id: 'step-4',
      title: 'Final Authorization',
      type: 'signature',
      required: true,
      order: 4,
      blocks: [
        {
          id: 'block-4-1',
          type: 'heading',
          content: { text: 'Sign Authorization', level: 2 },
        },
        {
          id: 'block-4-2',
          type: 'checklist',
          content: {
            items: [
              { id: 'check-1', label: 'I authorize a background check to be performed' },
              { id: 'check-2', label: 'I confirm all information provided is accurate' },
              { id: 'check-3', label: 'I understand the results will be shared with my employer' },
            ],
            requireAllChecked: true,
          },
        },
        {
          id: 'block-4-3',
          type: 'signature_pad',
          content: {
            label: 'Your Signature',
            required: true,
          },
        },
      ],
    },
  ],
  settings: {
    showProgressBar: true,
    allowStepNavigation: true,
    requireSequentialCompletion: true,
  },
};

// Steps for AI generation demo - these will appear one by one
export const aiGeneratedSteps: MockStep[] = [
  {
    id: 'ai-step-1',
    title: 'Consent & Authorization',
    type: 'form',
    required: true,
    order: 1,
    blocks: [
      { id: 'ai-1-1', type: 'heading', content: { text: 'Background Check Authorization' } },
      { id: 'ai-1-2', type: 'paragraph', content: { text: 'Read and acknowledge the authorization terms' } },
      { id: 'ai-1-3', type: 'form_field', content: { label: 'Last 4 of SSN', required: true } },
    ],
  },
  {
    id: 'ai-step-2',
    title: 'Identity Verification',
    type: 'upload',
    required: true,
    order: 2,
    blocks: [
      { id: 'ai-2-1', type: 'heading', content: { text: 'Upload Government ID' } },
      { id: 'ai-2-2', type: 'file_upload', content: { label: 'Government ID', required: true } },
    ],
  },
  {
    id: 'ai-step-3',
    title: 'Knowledge Check',
    type: 'quiz',
    required: true,
    order: 3,
    blocks: [
      { id: 'ai-3-1', type: 'quiz_question', content: { question: 'What is the purpose of a background check?' } },
      { id: 'ai-3-2', type: 'quiz_question', content: { question: 'How often must background checks be renewed?' } },
    ],
  },
  {
    id: 'ai-step-4',
    title: 'Final Authorization',
    type: 'signature',
    required: true,
    order: 4,
    blocks: [
      { id: 'ai-4-1', type: 'checklist', content: { items: ['I authorize this check', 'I confirm accuracy'] } },
      { id: 'ai-4-2', type: 'signature_pad', content: { label: 'Sign here', required: true } },
    ],
  },
];

// Block type labels for display
export const BLOCK_TYPE_LABELS: Record<string, string> = {
  heading: 'Heading',
  paragraph: 'Instructions',
  alert: 'Alert Notice',
  form_field: 'Form Field',
  file_upload: 'File Upload',
  quiz_question: 'Quiz Question',
  checklist: 'Checklist',
  signature_pad: 'E-Signature',
  video: 'Training Video',
  image: 'Image',
  external_link: 'External Link',
  button: 'Button',
  divider: 'Divider',
};

// Block type icons (using Lucide icon names)
export const BLOCK_TYPE_ICONS: Record<string, string> = {
  heading: 'Type',
  paragraph: 'FileText',
  alert: 'AlertTriangle',
  form_field: 'FormInput',
  file_upload: 'Upload',
  quiz_question: 'CircleHelp',
  checklist: 'ListChecks',
  signature_pad: 'PenTool',
  video: 'Video',
  image: 'Image',
  external_link: 'ExternalLink',
  button: 'MousePointer',
  divider: 'Minus',
};
