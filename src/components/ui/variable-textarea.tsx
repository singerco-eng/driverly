import React, { useRef, useEffect, useState } from 'react';
import { Textarea, TextareaProps } from './textarea';
import { VariableChips } from './variable-chips';
import { useCustomerVariables } from '@/hooks/useCustomerVariables';
import { Label } from './label';

interface VariableTextareaProps extends Omit<TextareaProps, 'onChange' | 'value'> {
  label: string;
  fieldId: string;
  value: string;
  onChange: (value: string) => void;
  agentName?: string;
  placeholder?: string;
  rows?: number;
}

export const VariableTextarea: React.FC<VariableTextareaProps> = ({
  label,
  fieldId,
  value,
  onChange,
  agentName,
  placeholder,
  rows = 3,
  ...textareaProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { availableVariables, insertVariable, updateFieldText, getUpdatedText, initializeFieldWithTemplate } = useCustomerVariables(agentName);

  // Update cursor position when user interacts with textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCursorPosition(e.target.selectionStart || 0);
    updateFieldText(fieldId, newValue);
    onChange(newValue);
  };

  const handleCursorChange = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart || 0);
    }
  };

  const handleVariableClick = (variableKey: string) => {
    if (textareaRef.current) {
      const result = insertVariable(fieldId, variableKey, value, cursorPosition);
      onChange(result.newText);
      
      // Set cursor position after variable insertion
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
          setCursorPosition(result.newCursorPosition);
        }
      }, 0);
    }
  };

  // Initialize template variables on first load
  useEffect(() => {
    if (!isInitialized && value && value.includes('{{')) {
      const processedText = initializeFieldWithTemplate(fieldId, value);
      if (processedText !== value) {
        onChange(processedText);
      }
      setIsInitialized(true);
    }
  }, [value, fieldId, initializeFieldWithTemplate, onChange, isInitialized]);

  // Update text with real-time variable values when profile data changes
  useEffect(() => {
    if (isInitialized) {
      const updatedText = getUpdatedText(fieldId);
      if (updatedText !== value && updatedText.length > 0) {
        onChange(updatedText);
      }
    }
  }, [getUpdatedText, fieldId, isInitialized, value, onChange]);

  return (
    <div>
      <Label htmlFor={fieldId}>{label}</Label>
      <VariableChips
        variables={availableVariables}
        onVariableClick={handleVariableClick}
        className="mt-1"
      />
      <Textarea
        ref={textareaRef}
        id={fieldId}
        value={value}
        onChange={handleTextareaChange}
        onSelect={handleCursorChange}
        onKeyUp={handleCursorChange}
        onClick={handleCursorChange}
        placeholder={placeholder}
        rows={rows}
        {...textareaProps}
      />
    </div>
  );
};