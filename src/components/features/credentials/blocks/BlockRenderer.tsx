import type { ContentBlock } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { HeadingBlock } from './HeadingBlock';
import { ParagraphBlock } from './ParagraphBlock';
import { RichTextBlock } from './RichTextBlock';
import { ImageBlock } from './ImageBlock';
import { VideoBlock } from './VideoBlock';
import { AlertBlock } from './AlertBlock';
import { DividerBlock } from './DividerBlock';
import { ExternalLinkBlock } from './ExternalLinkBlock';
import { ChecklistBlock } from './ChecklistBlock';
import { FormFieldBlock } from './FormFieldBlock';
import { FileUploadBlock } from './FileUploadBlock';
import { SignatureBlock } from './SignatureBlock';
import { QuizQuestionBlock } from './QuizQuestionBlock';
import { ButtonBlock } from './ButtonBlock';

export interface BlockRendererProps {
  block: ContentBlock;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  /** Read-only mode for admin review - shows submitted data */
  readOnly?: boolean;
}

/**
 * Dispatcher component that renders the appropriate block component
 * based on the block type
 */
export function BlockRenderer({
  block,
  stepState,
  onStateChange,
  disabled = false,
  readOnly = false,
}: BlockRendererProps) {
  const commonProps = { stepState, onStateChange, disabled, readOnly, blockId: block.id };

  switch (block.type) {
    case 'heading':
      return <HeadingBlock content={block.content} {...commonProps} />;

    case 'paragraph':
      return <ParagraphBlock content={block.content} {...commonProps} />;

    case 'rich_text':
      return <RichTextBlock content={block.content} {...commonProps} />;

    case 'image':
      return <ImageBlock content={block.content} {...commonProps} />;

    case 'video':
      return <VideoBlock content={block.content} {...commonProps} />;

    case 'alert':
      return <AlertBlock content={block.content} {...commonProps} />;

    case 'divider':
      return <DividerBlock content={block.content} {...commonProps} />;

    case 'external_link':
      return <ExternalLinkBlock content={block.content} {...commonProps} />;

    case 'checklist':
      return <ChecklistBlock content={block.content} {...commonProps} />;

    case 'form_field':
      return <FormFieldBlock content={block.content} {...commonProps} />;

    case 'file_upload':
      return <FileUploadBlock content={block.content} {...commonProps} />;

    case 'signature_pad':
      return <SignatureBlock content={block.content} {...commonProps} />;

    case 'quiz_question':
      return <QuizQuestionBlock content={block.content} {...commonProps} />;

    case 'button':
      return <ButtonBlock content={block.content} {...commonProps} />;

    default:
      return (
        <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm">
          Unknown block type: {block.type}
        </div>
      );
  }
}
