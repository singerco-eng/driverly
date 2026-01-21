import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialType, useUpdateCredentialType, useDeleteCredentialType } from '@/hooks/useCredentialTypes';
import { useBroker } from '@/hooks/useBrokers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  Car,
  MoreVertical,
  Trash2,
  Power,
  Building2,
  Globe,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { CredentialType } from '@/types/credential';
import { useToast } from '@/hooks/use-toast';

/** Requirement config using native Badge variants per design system */
const requirementConfig: Record<string, {
  label: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
}> = {
  required: { label: 'Required', badgeVariant: 'default' },
  recommended: { label: 'Recommended', badgeVariant: 'secondary' },
  optional: { label: 'Optional', badgeVariant: 'outline' },
};

function DetailItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      {Icon && <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function CredentialTypeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: credentialType, isLoading, error } = useCredentialType(id || '');
  const { data: broker } = useBroker(credentialType?.broker_id || '');
  const updateCredentialType = useUpdateCredentialType();
  const deleteCredentialType = useDeleteCredentialType();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleToggleActive = async () => {
    if (!credentialType) return;
    
    try {
      await updateCredentialType.mutateAsync({
        id: credentialType.id,
        is_active: !credentialType.is_active,
      });
    } catch {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!credentialType) return;
    
    try {
      await deleteCredentialType.mutateAsync(credentialType.id);
      toast({
        title: 'Credential type deleted',
        description: `${credentialType.name} has been deleted.`,
      });
      navigate('/admin/settings/credentials');
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete credential type. It may have existing submissions.',
        variant: 'destructive',
      });
    }
    setDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !credentialType) {
    return (
      <div className="space-y-6">
        <Link
          to="/admin/settings/credentials"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Credential Types
        </Link>
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Credential type not found</h3>
          <p className="text-muted-foreground mb-4">
            The credential type you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate('/admin/settings/credentials')}>
            Back to Credential Types
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/admin/settings/credentials"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Credential Types
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{credentialType.name}</h1>
              <Badge variant={credentialType.is_active ? 'default' : 'secondary'}>
                {credentialType.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              {credentialType.category === 'driver' ? 'Driver' : 'Vehicle'} Credential •{' '}
              {credentialType.scope === 'global' ? 'Global' : 'Trip Source-Specific'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleActive}>
                <Power className="w-4 h-4 mr-2" />
                {credentialType.is_active ? 'Deactivate' : 'Activate'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <DetailItem 
            label="Requirement Level" 
            value={
              <Badge variant={requirementConfig[credentialType.requirement]?.badgeVariant || 'outline'}>
                {requirementConfig[credentialType.requirement]?.label || credentialType.requirement}
              </Badge>
            }
          />
          
          <DetailItem 
            label="Scope"
            icon={credentialType.scope === 'global' ? Globe : Building2}
            value={
              <div className="flex items-center gap-2">
                <span className="capitalize">{credentialType.scope}</span>
                {credentialType.scope === 'broker' && broker && (
                  <Badge variant="secondary">{broker.name}</Badge>
                )}
              </div>
            }
          />

          <DetailItem 
            label="Expiration"
            icon={Clock}
            value={
              credentialType.expiration_type === 'never' 
                ? 'Never expires'
                : credentialType.expiration_type === 'fixed_interval'
                  ? `Expires after ${credentialType.expiration_interval_days} days`
                  : 'Driver specifies expiration date'
            }
          />

          {credentialType.expiration_warning_days && (
            <DetailItem 
              label="Warning Threshold"
              icon={AlertTriangle}
              value={`Warn ${credentialType.expiration_warning_days} days before expiration`}
            />
          )}

          <DetailItem 
            label="Employment Type"
            icon={Users}
            value={
              credentialType.employment_type === 'both' 
                ? 'All drivers (W2 and 1099)'
                : credentialType.employment_type === 'w2_only'
                  ? 'W2 employees only'
                  : '1099 contractors only'
            }
          />

          {credentialType.category === 'vehicle' && (
            <DetailItem 
              label="Vehicle Types"
              icon={Car}
              value={
                !credentialType.vehicle_types || credentialType.vehicle_types.length === 0
                  ? 'All vehicle types'
                  : credentialType.vehicle_types.map(vt => (
                      <Badge key={vt} variant="secondary" className="mr-1 capitalize">
                        {vt.replace('_', ' ')}
                      </Badge>
                    ))
              }
            />
          )}

          {credentialType.instructions && (
            <DetailItem 
              label="Instructions for Drivers"
              value={
                <p className="text-sm whitespace-pre-wrap">{credentialType.instructions}</p>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete credential type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{credentialType.name}". This action cannot be undone.
              {credentialType.is_active && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ This credential type is currently active. Consider deactivating it instead.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
