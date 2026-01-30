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
import { AlertCircle, ArrowRight, FileText } from 'lucide-react';

interface MissingCredential {
  name: string;
  credentialTypeId: string;
}

interface CannotActivateVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  missingCredentials: MissingCredential[];
}

export function CannotActivateVehicleModal({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
  missingCredentials,
}: CannotActivateVehicleModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <DialogTitle>Can't Activate Vehicle</DialogTitle>
          <DialogDescription className="text-center">
            Complete the required credentials for <span className="font-medium">{vehicleName}</span> before setting it to active.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {missingCredentials.length === 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/40">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                We're still checking your requirements. Please try again shortly.
              </p>
            </div>
          ) : (
            missingCredentials.map((credential) => (
              <div
                key={credential.credentialTypeId}
                className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 border border-border/40"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-sm">{credential.name}</span>
                </div>
                <Button asChild variant="outline" size="sm" className="gap-1 shrink-0">
                  <Link to={`/driver/vehicles/${vehicleId}?tab=credentials`}>
                    Fix
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            ))
          )}
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
