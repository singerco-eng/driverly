import type { ButtonBlockContent } from '@/types/instructionBuilder';
import { Button } from '@/components/ui/button';
import { ExternalLink, ArrowRight, Send } from 'lucide-react';

interface ButtonBlockProps {
  content: ButtonBlockContent;
  blockId: string;
  disabled?: boolean;
  readOnly?: boolean;
  onNextStep?: () => void;
  onSubmit?: () => void;
}

export function ButtonBlock({
  content,
  disabled,
  readOnly,
  onNextStep,
  onSubmit,
}: ButtonBlockProps) {
  if (readOnly && content.action !== 'external_url') {
    return null;
  }

  const isDisabled = disabled;

  const handleClick = () => {
    if (isDisabled) return;

    switch (content.action) {
      case 'next_step':
        onNextStep?.();
        break;
      case 'submit':
        onSubmit?.();
        break;
      case 'external_url':
        if (content.url) {
          window.open(content.url, '_blank', 'noopener,noreferrer');
        }
        break;
    }
  };

  const getIcon = () => {
    switch (content.action) {
      case 'next_step':
        return <ArrowRight className="w-4 h-4 ml-2" />;
      case 'submit':
        return <Send className="w-4 h-4 ml-2" />;
      case 'external_url':
        return <ExternalLink className="w-4 h-4 ml-2" />;
      default:
        return null;
    }
  };

  return (
    <Button
      variant={content.variant === 'ghost' ? 'ghost' : content.variant === 'outline' ? 'outline' : 'default'}
      onClick={handleClick}
      disabled={isDisabled}
    >
      {content.text}
      {getIcon()}
    </Button>
  );
}
