import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Eye, ListChecks, Clock, Globe, Building2, Car, User } from 'lucide-react';
import type { CredentialType } from '@/types/credential';

interface CredentialTypeCardProps {
  credentialType: CredentialType;
}

/** Requirement config using native Badge variants per design system */
const requirementConfig: Record<string, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  required: { label: 'Required', badgeVariant: 'default' },
  recommended: { label: 'Recommended', badgeVariant: 'secondary' },
  optional: { label: 'Optional', badgeVariant: 'outline' },
};

/** Status config for publish states */
const statusConfig: Record<string, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  dimmed: boolean;
}> = {
  draft: { label: 'Draft', badgeVariant: 'outline', dimmed: true },
  scheduled: { label: 'Scheduled', badgeVariant: 'secondary', dimmed: false },
  active: { label: '', badgeVariant: 'default', dimmed: false }, // No badge for active
  inactive: { label: 'Inactive', badgeVariant: 'destructive', dimmed: true },
};

export function CredentialTypeCard({ credentialType }: CredentialTypeCardProps) {
  const navigate = useNavigate();
  const stepCount = credentialType.instruction_config?.steps?.length || 0;
  const requirement = requirementConfig[credentialType.requirement] || requirementConfig.optional;
  const publishStatus = statusConfig[credentialType.status] || statusConfig.draft;
  const CategoryIcon =
    credentialType.category === 'vehicle'
      ? Car
      : credentialType.category === 'location'
        ? Building2
        : User;
  const ScopeIcon = credentialType.scope === 'global' ? Globe : Building2;

  const handleClick = () => {
    navigate(`/admin/settings/credentials/${credentialType.id}`);
  };

  const getExpirationLabel = () => {
    if (credentialType.expiration_type === 'never') return 'Never expires';
    if (credentialType.expiration_type === 'fixed_interval') {
      return `${credentialType.expiration_interval_days} day expiry`;
    }
    return 'Driver specifies';
  };

  return (
    <Card className={`h-full flex flex-col hover:shadow-soft transition-all ${
      publishStatus.dimmed ? 'opacity-60' : ''
    }`}>
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
        {/* Header row with badge */}
        <div className="flex items-center justify-between">
          <Badge variant={requirement.badgeVariant}>
            {requirement.label}
          </Badge>
          {publishStatus.label && (
            <Badge variant={publishStatus.badgeVariant}>
              {publishStatus.label}
            </Badge>
          )}
        </div>

        {/* Centered icon and credential type info */}
        <div 
          className="flex flex-col items-center text-center cursor-pointer"
          onClick={handleClick}
        >
          {/* Credential Icon */}
          <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-2">
            <FileText className="h-6 w-6 text-foreground/50" />
          </div>

          {/* Credential Type Name */}
          <h3 className="font-semibold">{credentialType.name}</h3>

          {/* Category */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CategoryIcon className="h-3.5 w-3.5" />
            <span className="capitalize">{credentialType.category}</span>
          </div>
        </div>

        {/* Metadata Section */}
        <div className="border-t pt-3 space-y-2 text-sm">
          {/* Steps */}
          {stepCount > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4 shrink-0" />
              <span>{stepCount} step{stepCount !== 1 ? 's' : ''}</span>
            </div>
          )}

          {/* Expiration */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{getExpirationLabel()}</span>
          </div>

          {/* Scope */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <ScopeIcon className="h-4 w-4 shrink-0" />
            <span className="capitalize">{credentialType.scope}</span>
            {credentialType.broker?.name && (
              <span className="text-muted-foreground">· {credentialType.broker.name}</span>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Button */}
        <Button variant="outline" size="sm" className="w-full mt-auto" onClick={handleClick}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
