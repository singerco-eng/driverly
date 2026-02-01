/**
 * Enhanced Credential Type Instruction Builder Types
 * Version 2 schema for multi-step, block-based credential instructions
 */

// ============ TOP-LEVEL SCHEMA ============

export interface CredentialTypeInstructions {
  version: 2;
  settings: InstructionSettings;
  steps: InstructionStep[];
}

export interface InstructionSettings {
  showProgressBar: boolean;
  allowStepSkip: boolean;
  completionBehavior: 'all_steps' | 'required_only';
  externalSubmissionAllowed: boolean;
}

// ============ STEPS ============

export interface InstructionStep {
  id: string;
  order: number;
  title: string;
  type: StepType;
  required: boolean;
  blocks: ContentBlock[];
  conditions: StepCondition[];
  completion: StepCompletion;
}

export type StepType =
  | 'information' // Read-only content
  | 'external_action' // Go to external site
  | 'form_input' // Fill out fields
  | 'document_upload' // Upload files
  | 'signature' // Sign agreement
  | 'knowledge_check' // Quiz questions
  | 'admin_verify'; // Admin marks complete

export interface StepCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in';
  value: string | string[];
}

export interface StepCompletion {
  type: 'auto' | 'manual' | 'form_submit' | 'external_confirm' | 'quiz_pass';
  autoCompleteOnView?: boolean;
  externalCallbackUrl?: string;
  passScore?: number;
}

// ============ BLOCKS ============

export interface ContentBlock {
  id: string;
  order: number;
  type: BlockType;
  content: BlockContent;
}

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'rich_text'
  | 'image'
  | 'video'
  | 'external_link'
  | 'alert'
  | 'checklist'
  | 'button'
  | 'divider'
  | 'form_field'
  | 'file_upload'
  | 'document'
  | 'signature_pad'
  | 'quiz_question';

// Block content types
export type BlockContent =
  | HeadingBlockContent
  | ParagraphBlockContent
  | RichTextBlockContent
  | ImageBlockContent
  | VideoBlockContent
  | ExternalLinkBlockContent
  | AlertBlockContent
  | ChecklistBlockContent
  | ButtonBlockContent
  | DividerBlockContent
  | FormFieldBlockContent
  | FileUploadBlockContent
  | DocumentBlockContent
  | SignaturePadBlockContent
  | QuizQuestionBlockContent;

export interface HeadingBlockContent {
  text: string;
  level: 1 | 2 | 3;
}

export interface ParagraphBlockContent {
  text: string;
}

export interface RichTextBlockContent {
  html: string;
}

export interface ImageBlockContent {
  url: string;
  alt: string;
  caption?: string;
}

export interface VideoBlockContent {
  source: 'youtube' | 'vimeo' | 'upload';
  url: string;
  title?: string;
  requireWatch: boolean;
  watchPercentRequired?: number;
}

export interface ExternalLinkBlockContent {
  url: string;
  title: string;
  description?: string;
  buttonText: string;
  trackVisit: boolean;
  requireVisit: boolean;
  opensInNewTab: boolean;
}

export interface AlertBlockContent {
  variant: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
}

export interface ChecklistBlockContent {
  title?: string;
  items: ChecklistItem[];
  requireAllChecked: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  required: boolean;
}

export interface ButtonBlockContent {
  text: string;
  variant: 'default' | 'outline' | 'ghost';
  action: 'next_step' | 'external_url' | 'submit';
  url?: string;
}

export interface DividerBlockContent {
  style: 'solid' | 'dashed' | 'dotted';
}

export interface FormFieldBlockContent {
  key: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'date'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'email'
    | 'phone';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FileUploadBlockContent {
  label: string;
  accept: string; // e.g., '.pdf,.jpg,.png' or 'image/*'
  maxSizeMB: number;
  multiple: boolean;
  required: boolean;
  helpText?: string;
}

export interface DocumentBlockContent {
  uploadLabel: string;
  uploadDescription?: string;
  acceptedTypes: string[]; // ['image/*', 'application/pdf']
  maxSizeMB: number;
  required: boolean;
  extractionFields: DocumentExtractionField[];
  extractionContext?: string;
}

export interface DocumentExtractionField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone';
  required: boolean;
  placeholder?: string;
  extractionHints?: string[];
  source: 'ai_generated' | 'user_specified';
}

export interface ExtractionResult {
  fields: Record<string, { value: string | null; confidence?: number }>;
}

export interface DocumentBlockState {
  uploadedFileUrl: string | null;
  uploadedFileName: string | null;
  extractionStatus: 'idle' | 'extracting' | 'complete' | 'failed';
  extractionResult: ExtractionResult | null;
  fieldValues: Record<string, string>;
  overrides: string[];
}

export interface SignaturePadBlockContent {
  label: string;
  required: boolean;
  allowTyped: boolean;
  allowDrawn: boolean;
  agreementText?: string;
}

export interface QuizQuestionBlockContent {
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'text';
  options?: QuizOption[];
  correctAnswer?: string;
  explanation?: string;
  allowRetry: boolean;
  required: boolean;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

// ============ TEMPLATES ============

export interface InstructionTemplate {
  id: string;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  config: CredentialTypeInstructions;
}

// ============ HELPERS ============

export function createEmptyInstructions(): CredentialTypeInstructions {
  return {
    version: 2,
    settings: {
      showProgressBar: true,
      allowStepSkip: false,
      completionBehavior: 'required_only',
      externalSubmissionAllowed: false,
    },
    steps: [],
  };
}

export function createStep(title: string, type: StepType = 'information'): InstructionStep {
  return {
    id: crypto.randomUUID(),
    order: 0,
    title,
    type,
    required: true,
    blocks: [],
    conditions: [],
    completion: {
      type: type === 'information' ? 'auto' : 'manual',
      autoCompleteOnView: type === 'information',
    },
  };
}

export function createBlock<T extends BlockContent>(type: BlockType, content: T): ContentBlock {
  return {
    id: crypto.randomUUID(),
    order: 0,
    type,
    content,
  };
}
