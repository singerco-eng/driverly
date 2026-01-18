import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Power } from 'lucide-react';
import { useDeactivateCompany, useSuspendCompany, useReactivateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import type { CompanyDetail } from '@/types/company';

interface CompanyStatusModalProps {
  company: CompanyDetail;
  action: 'deactivate' | 'suspend' | 'reactivate';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionConfig = {
  deactivate: {
    title: 'Deactivate Company',
    description: 'Are you sure you want to deactivate this company?',
    bullets: [
      'All admins and drivers will be locked out',
      'Data will be preserved',
      'You can reactivate at any time',
    ],
    defaultReason: 'Account deactivated at company request',
    buttonText: 'Deactivate',
    buttonVariant: 'default' as const,
    icon: Power,
  },
  suspend: {
    title: 'Suspend Company',
    description: 'Are you sure you want to suspend this company?',
    bullets: [
      'All admins and drivers will be locked out',
      'Company will see the reason below when trying to log in',
      'You can reactivate at any time',
    ],
    defaultReason: 'Account suspended - please contact support',
    buttonText: 'Suspend',
    buttonVariant: 'destructive' as const,
    icon: AlertTriangle,
  },
  reactivate: {
    title: 'Reactivate Company',
    description: 'Are you sure you want to reactivate this company?',
    bullets: [
      'All admins and drivers will regain access',
      'Previous deactivation reason will be cleared',
    ],
    defaultReason: '',
    buttonText: 'Reactivate',
    buttonVariant: 'default' as const,
    icon: Power,
  },
};

export default function CompanyStatusModal({
  company,
  action,
  open,
  onOpenChange,
}: CompanyStatusModalProps) {
  const config = actionConfig[action];
  const { toast } = useToast();
  const [reason, setReason] = useState(config.defaultReason);

  useEffect(() => {
    if (open) {
      setReason(config.defaultReason);
    }
  }, [config.defaultReason, open]);

  const deactivate = useDeactivateCompany();
  const suspend = useSuspendCompany();
  const reactivate = useReactivateCompany();
  const isPending = deactivate.isPending || suspend.isPending || reactivate.isPending;

  async function handleConfirm() {
    try {
      if (action === 'deactivate') {
        await deactivate.mutateAsync({ id: company.id, reason });
      } else if (action === 'suspend') {
        await suspend.mutateAsync({ id: company.id, reason });
      } else {
        await reactivate.mutateAsync(company.id);
      }

      toast({
        title: `Company ${action}d`,
        description: `${company.name} has been ${action}d successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} company`,
        variant: 'destructive',
      });
    }
  }

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">{company.name}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {config.bullets.map((bullet, i) => (
                <li key={i}>• {bullet}</li>
              ))}
            </ul>
          </div>

          {action !== 'reactivate' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (shown to users)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isPending || (action !== 'reactivate' && !reason.trim())}
          >
            {isPending ? `${config.buttonText.slice(0, -1)}ing...` : config.buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
