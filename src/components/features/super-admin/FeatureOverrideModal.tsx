import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useSetCompanyOverride } from '@/hooks/useFeatureFlags';
import type { FeatureFlagWithOverride } from '@/types/featureFlags';

interface FeatureOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flag: FeatureFlagWithOverride;
  companyId: string;
  companyName: string;
}

export function FeatureOverrideModal({
  open,
  onOpenChange,
  flag,
  companyId,
  companyName,
}: FeatureOverrideModalProps) {
  const [enabled, setEnabled] = useState(
    flag.override?.enabled ?? !flag.default_enabled
  );
  const [reason, setReason] = useState(flag.override?.reason ?? '');

  const setOverride = useSetCompanyOverride();

  useEffect(() => {
    if (!open) return;
    setEnabled(flag.override?.enabled ?? !flag.default_enabled);
    setReason(flag.override?.reason ?? '');
  }, [flag, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await setOverride.mutateAsync({
      companyId,
      flagId: flag.id,
      enabled,
      reason: reason || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override: {flag.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Set a company-specific override for <strong>{companyName}</strong>.
              This takes precedence over the global default.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base">Enable Feature</Label>
              <p className="text-sm text-muted-foreground">
                Global default: {flag.default_enabled ? 'On' : 'Off'}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="Why is this override being set?"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={setOverride.isPending}>
              {setOverride.isPending ? 'Saving...' : 'Save Override'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
