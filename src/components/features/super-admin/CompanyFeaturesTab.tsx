import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useCompanyFeatureFlags,
  useRemoveCompanyOverride,
} from '@/hooks/useFeatureFlags';
import { FeatureOverrideModal } from './FeatureOverrideModal';
import type { FeatureFlagWithOverride } from '@/types/featureFlags';

interface CompanyFeaturesTabProps {
  companyId: string;
  companyName: string;
}

export function CompanyFeaturesTab({ companyId, companyName }: CompanyFeaturesTabProps) {
  const { data: flags, isLoading } = useCompanyFeatureFlags(companyId);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagWithOverride | null>(null);

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading features...</div>;
  }

  const groupedFlags = (flags ?? []).reduce(
    (acc, flag) => {
      const category = flag.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(flag);
      return acc;
    },
    {} as Record<string, FeatureFlagWithOverride[]>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Feature Access</h3>
        <p className="text-sm text-muted-foreground">
          Manage which features are enabled for {companyName}.
        </p>
      </div>

      {Object.entries(groupedFlags).map(([category, categoryFlags]) => (
        <Card key={category}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium capitalize">
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  <TableHead className="w-[100px]">Global</TableHead>
                  <TableHead className="w-[100px]">Override</TableHead>
                  <TableHead className="w-[100px]">Effective</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryFlags.map((flag) => (
                  <FlagRow
                    key={flag.id}
                    flag={flag}
                    companyId={companyId}
                    onEdit={() => setSelectedFlag(flag)}
                  />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {selectedFlag && (
        <FeatureOverrideModal
          open={!!selectedFlag}
          onOpenChange={(open) => !open && setSelectedFlag(null)}
          flag={selectedFlag}
          companyId={companyId}
          companyName={companyName}
        />
      )}
    </div>
  );
}

function FlagRow({
  flag,
  companyId,
  onEdit,
}: {
  flag: FeatureFlagWithOverride;
  companyId: string;
  onEdit: () => void;
}) {
  const removeOverride = useRemoveCompanyOverride();

  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">{flag.name}</div>
          {flag.description && (
            <div className="text-xs text-muted-foreground">{flag.description}</div>
          )}
        </div>
      </TableCell>

      <TableCell>
        {flag.default_enabled ? (
          <Badge variant="default">On</Badge>
        ) : (
          <Badge variant="secondary">Off</Badge>
        )}
      </TableCell>

      <TableCell>
        {flag.override ? (
          <Badge
            variant={flag.override.enabled ? 'default' : 'destructive'}
            className="cursor-pointer"
            onClick={onEdit}
          >
            {flag.override.enabled ? 'On' : 'Off'}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell>
        {flag.effective_value ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </TableCell>

      <TableCell>
        {flag.override ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              removeOverride.mutate({ companyId, flagId: flag.id })
            }
            disabled={removeOverride.isPending}
          >
            Reset
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Override
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
