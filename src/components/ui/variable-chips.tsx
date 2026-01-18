import React from 'react';
import { Chip } from './chip';
import { VariableDefinition } from '@/hooks/useCustomerVariables';

interface VariableChipsProps {
  variables: VariableDefinition[];
  onVariableClick: (variableKey: string) => void;
  className?: string;
}

export const VariableChips: React.FC<VariableChipsProps> = ({
  variables,
  onVariableClick,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${className}`}>
      {variables.map((variable) => (
        <Chip
          key={variable.key}
          variant="suggestion"
          size="sm"
          onClick={() => onVariableClick(variable.key)}
          className="cursor-pointer"
        >
          {variable.label}
        </Chip>
      ))}
    </div>
  );
};