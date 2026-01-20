import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, Layers } from 'lucide-react';
import type { CredentialType } from '@/types/credential';
import {
  getAllRequirements,
  getStepCount,
  isAdminOnlyCredential,
} from '@/lib/credentialRequirements';
import { cn } from '@/lib/utils';

interface CredentialRequirementsDisplayProps {
  credentialType: CredentialType;
  showLabels?: boolean;
  showStepCount?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Displays credential requirements derived from instruction_config
 * Shows icons for upload, signature, form, etc.
 */
export function CredentialRequirementsDisplay({
  credentialType,
  showLabels = false,
  showStepCount = true,
  size = 'sm',
  className,
}: CredentialRequirementsDisplayProps) {
  const isAdminOnly = isAdminOnlyCredential(credentialType);
  const requirements = getAllRequirements(credentialType);
  const stepCount = getStepCount(credentialType.instruction_config);

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  if (isAdminOnly) {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <ShieldCheck className={iconSize} />
        {showLabels && <span>Admin Only</span>}
      </Badge>
    );
  }

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {showStepCount && stepCount > 1 && (
        <Badge variant="outline" className="gap-1">
          <Layers className={iconSize} />
          {stepCount} Steps
        </Badge>
      )}

      {requirements.map((req) => (
        <Tooltip key={req.type}>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1">
              <req.icon className={iconSize} />
              {showLabels && <span>{req.label}</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{req.label} Required</TooltipContent>
        </Tooltip>
      ))}

      {requirements.length === 0 && !stepCount && (
        <Badge variant="outline" className="text-muted-foreground">
          No requirements
        </Badge>
      )}
    </div>
  );
}
