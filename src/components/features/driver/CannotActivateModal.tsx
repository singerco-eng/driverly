import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ONBOARDING_ITEMS } from '@/lib/onboarding-items';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';

interface CannotActivateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockers: string[];
}

export function CannotActivateModal({
  open,
  onOpenChange,
  blockers,
}: CannotActivateModalProps) {
  const blockerRouteOverrides: Record<string, string> = {
    'Active vehicle with required credentials': '/driver/vehicles',
  };

  const blockerItems = blockers.map((label) => ({
    label,
    route:
      blockerRouteOverrides[label] ??
      ONBOARDING_ITEMS.find((item) => item.label === label)?.route,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <DialogTitle>Can't Go Active Yet</DialogTitle>
          <DialogDescription className="text-center">
            Complete these items before going active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {blockerItems.length === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                We're still checking your requirements. Please try again shortly.
              </p>
            </div>
          )}
          {blockerItems.map((blocker) => (
            <div
              key={blocker.label}
              className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-sm">{blocker.label}</span>
              </div>
              {blocker.route && (
                <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                  <Link to={blocker.route}>
                    Fix
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="pt-2">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
