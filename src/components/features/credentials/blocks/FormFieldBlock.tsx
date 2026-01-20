import type { FormFieldBlockContent } from '@/types/instructionBuilder';
import type { StepState } from '@/types/credentialProgress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormFieldBlockProps {
  content: FormFieldBlockContent;
  blockId: string;
  stepState: StepState;
  onStateChange: (updates: Partial<StepState>) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FormFieldBlock({
  content,
  stepState,
  onStateChange,
  disabled,
  readOnly,
}: FormFieldBlockProps) {
  const value = stepState.formData[content.key] ?? '';
  const isDisabled = disabled || readOnly;

  const handleChange = (newValue: unknown) => {
    if (isDisabled) return;
    
    onStateChange({
      formData: {
        ...stepState.formData,
        [content.key]: newValue,
      },
    });
  };

  const renderField = () => {
    switch (content.type) {
      case 'textarea':
        return (
          <Textarea
            id={content.key}
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder}
            disabled={isDisabled}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select
            value={String(value)}
            onValueChange={handleChange}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={content.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {content.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={content.key}
              checked={!!value}
              onCheckedChange={handleChange}
              disabled={isDisabled}
            />
            <Label htmlFor={content.key} className="cursor-pointer">
              {content.placeholder || content.label}
            </Label>
          </div>
        );

      case 'date':
        return (
          <Input
            id={content.key}
            type="date"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            disabled={isDisabled}
          />
        );

      case 'number':
        return (
          <Input
            id={content.key}
            type="number"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder}
            disabled={isDisabled}
            min={content.validation?.min}
            max={content.validation?.max}
          />
        );

      case 'email':
        return (
          <Input
            id={content.key}
            type="email"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder || 'email@example.com'}
            disabled={isDisabled}
          />
        );

      case 'phone':
        return (
          <Input
            id={content.key}
            type="tel"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder || '(555) 555-5555'}
            disabled={isDisabled}
          />
        );

      case 'text':
      default:
        return (
          <Input
            id={content.key}
            type="text"
            value={String(value)}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={content.placeholder}
            disabled={isDisabled}
          />
        );
    }
  };

  // Checkbox has its own label rendering
  if (content.type === 'checkbox') {
    return (
      <div className="space-y-2">
        {renderField()}
        {content.helpText && (
          <p className="text-xs text-muted-foreground">{content.helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={content.key}>
        {content.label}
        {content.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderField()}
      {content.helpText && (
        <p className="text-xs text-muted-foreground">{content.helpText}</p>
      )}
    </div>
  );
}
