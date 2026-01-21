import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CredentialDetailView } from '@/components/features/credentials/CredentialDetail';
import { useSubmitCredential } from '@/hooks/useCredentials';
import { useToast } from '@/hooks/use-toast';
import type { CredentialType, VehicleCredential } from '@/types/credential';

/**
 * Driver vehicle credential detail page
 * Uses unified CredentialDetailView
 */
export default function DriverVehicleCredentialDetail() {
  const { vehicleId, credentialId } = useParams<{ vehicleId: string; credentialId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch credential with type
  const { data: credential, isLoading } = useQuery({
    queryKey: ['vehicle-credential', credentialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_credentials')
        .select(`
          *,
          credential_type:credential_types(*, broker:brokers(id, name))
        `)
        .eq('id', credentialId)
        .maybeSingle();

      if (error) throw error;
      return data as (VehicleCredential & {
        credential_type: CredentialType;
      }) | null;
    },
    enabled: !!credentialId,
  });

  // Submit mutation
  const submitCredential = useSubmitCredential();

  const handleSubmit = async () => {
    if (!credentialId) return;

    try {
      await submitCredential.mutateAsync({
        credentialId,
        credentialTable: 'vehicle_credentials',
      });

      toast({
        title: 'Success',
        description: 'Credential submitted for review',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Submission failed',
        variant: 'destructive',
      });
    }
  };

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
          <Button onClick={() => navigate(`/driver/vehicles/${vehicleId}`)}>
            Back to Vehicle
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <CredentialDetailView
      credentialType={credential.credential_type}
      credential={credential}
      credentialTable="vehicle_credentials"
      mode="submit"
      viewerRole="driver"
      onBack={() => navigate(`/driver/vehicles/${vehicleId}`)}
      onSubmit={handleSubmit}
      isSubmitting={submitCredential.isPending}
    />
  );
}
