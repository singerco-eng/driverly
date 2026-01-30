import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent } from '@/components/ui/card';
import { useSetGlobalDefault } from '@/hooks/useFeatureFlags';
import type { FeatureFlagWithStats } from '@/types/featureFlags';
import { FlagOverridesList } from './FlagOverridesList';

interface FeatureFlagTableProps {
  flags: FeatureFlagWithStats[];
}

export function FeatureFlagTable({ flags }: FeatureFlagTableProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {flags.map((flag) => (
            <FeatureFlagRow key={flag.id} flag={flag} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureFlagRow({ flag }: { flag: FeatureFlagWithStats }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const setGlobalDefault = useSetGlobalDefault();

  const handleToggle = (enabled: boolean) => {
    setGlobalDefault.mutate({ flagId: flag.id, enabled });
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{flag.name}</span>
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                {flag.key}
              </code>
            </div>
            {flag.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {flag.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {flag.override_count > 0 && (
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Users className="h-4 w-4" />
                  {flag.override_count} override{flag.override_count !== 1 ? 's' : ''}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            )}

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {flag.default_enabled ? 'On' : 'Off'}
              </span>
              <Switch
                checked={flag.default_enabled}
                onCheckedChange={handleToggle}
                disabled={setGlobalDefault.isPending}
              />
            </div>
          </div>
        </div>
      </div>

      <CollapsibleContent>
        <div className="px-4 pb-4 pt-0">
          <FlagOverridesList flagId={flag.id} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
