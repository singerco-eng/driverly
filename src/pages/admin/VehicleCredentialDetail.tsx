import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CredentialDetailView } from '@/components/features/credentials/CredentialDetail';
import { useToast } from '@/hooks/use-toast';
import type { CredentialType, VehicleCredential } from '@/types/credential';

/**
 * Admin vehicle credential detail page with review capabilities
 */
export default function VehicleCredentialDetail() {
  const { vehicleId, credentialId } = useParams<{ vehicleId: string; credentialId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const backPath = `/admin/vehicles/${vehicleId}`;

  // Fetch credential with type and vehicle info
  const { data: credential, isLoading } = useQuery({
    queryKey: ['vehicle-credential', credentialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_credentials')
        .select(`
          *,
          credential_type:credential_types(*, broker:brokers(id, name)),
          vehicle:vehicles!vehicle_credentials_vehicle_id_fkey(id, make, model, year, license_plate)
        `)
        .eq('id', credentialId)
        .maybeSingle();

      if (error) throw error;
      return data as (VehicleCredential & {
        credential_type: CredentialType;
        vehicle: { id: string; make: string; model: string; year: number; license_plate: string };
      }) | null;
    },
    enabled: !!credentialId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({
      expirationDate,
      notes,
    }: {
      expirationDate: Date | null;
      notes: string;
    }) => {
      const { error } = await supabase
        .from('vehicle_credentials')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          expires_at: expirationDate?.toISOString() || null,
          rejection_reason: null,
        })
        .eq('id', credentialId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Credential approved' });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      navigate(backPath);
    },
    onError: (error: Error) => {
      toast({
        title: 'Approval failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase
        .from('vehicle_credentials')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
        })
        .eq('id', credentialId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Credential rejected' });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['credential-review'] });
      navigate(backPath);
    },
    onError: (error: Error) => {
      toast({
        title: 'Rejection failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Submit on behalf mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('vehicle_credentials')
        .update({
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', credentialId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Credential submitted for review' });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credential'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-credentials'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found state
  if (!credential) {
    return (
      <div className="space-y-6">
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Credential not found</h3>
          <p className="text-muted-foreground mb-4">
            The credential you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate(backPath)}>Back to Vehicle</Button>
        </Card>
      </div>
    );
  }

  return (
    <CredentialDetailView
      credentialType={credential.credential_type}
      credential={credential}
      credentialTable="vehicle_credentials"
      mode="review"
      viewerRole="admin"
      onBack={() => navigate(backPath)}
      onSubmit={() => submitMutation.mutate()}
      onApprove={(expirationDate, notes) =>
        approveMutation.mutate({ expirationDate, notes })
      }
      onReject={(reason) => rejectMutation.mutate(reason)}
      isSubmitting={submitMutation.isPending}
      isApproving={approveMutation.isPending}
      isRejecting={rejectMutation.isPending}
    />
  );
}
