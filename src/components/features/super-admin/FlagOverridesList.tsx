import { Check, Trash2, X } from 'lucide-react';
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
import {
  useOverridesForFlag,
  useRemoveCompanyOverride,
} from '@/hooks/useFeatureFlags';

interface FlagOverridesListProps {
  flagId: string;
}

export function FlagOverridesList({ flagId }: FlagOverridesListProps) {
  const { data: overrides, isLoading } = useOverridesForFlag(flagId);
  const removeOverride = useRemoveCompanyOverride();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading overrides...</div>;
  }

  if (!overrides?.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No company-specific overrides.
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Override</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map((override) => (
            <TableRow key={override.id}>
              <TableCell className="font-medium">
                {override.company.name}
              </TableCell>
              <TableCell>
                {override.enabled ? (
                  <Badge variant="default">
                    <Check className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Disabled
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {override.reason || '—'}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    removeOverride.mutate({
                      companyId: override.company_id,
                      flagId,
                    })
                  }
                  disabled={removeOverride.isPending}
                  aria-label="Remove override"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
