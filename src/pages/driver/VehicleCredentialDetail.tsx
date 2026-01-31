import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CredentialDetailView } from '@/components/features/credentials/CredentialDetail';
import { useSubmitCredential, useEnsureVehicleCredential } from '@/hooks/useCredentials';
import { useAuth } from '@/contexts/AuthContext';
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
  const { profile } = useAuth();

  // Fetch credential with type
  // credentialId can be either a vehicle_credentials.id or credential_type_id
  const { data: credentialResult, isLoading, refetch } = useQuery({
    queryKey: ['vehicle-credential', vehicleId, credentialId],
    queryFn: async () => {
      // First try to find by credential id directly
      const { data: byId } = await supabase
        .from('vehicle_credentials')
        .select(`
          *,
          credential_type:credential_types(*, broker:brokers(id, name))
        `)
        .eq('id', credentialId)
        .maybeSingle();

      if (byId) {
        return { 
          credential: byId as VehicleCredential & { credential_type: CredentialType },
          credentialType: byId.credential_type as CredentialType,
        };
      }

      // If not found, try to find by credential_type_id + vehicle_id
      const { data: byTypeId } = await supabase
        .from('vehicle_credentials')
        .select(`
          *,
          credential_type:credential_types(*, broker:brokers(id, name))
        `)
        .eq('credential_type_id', credentialId)
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      if (byTypeId) {
        return {
          credential: byTypeId as VehicleCredential & { credential_type: CredentialType },
          credentialType: byTypeId.credential_type as CredentialType,
        };
      }

      // No credential exists - fetch just the credential type
      const { data: credType, error: credTypeError } = await supabase
        .from('credential_types')
        .select('*, broker:brokers(id, name)')
        .eq('id', credentialId)
        .maybeSingle();

      if (credTypeError) throw credTypeError;
      if (!credType) return null;

      // Return with a placeholder credential
      return {
        credential: null,
        credentialType: credType as CredentialType,
      };
    },
    enabled: !!credentialId && !!vehicleId,
  });

  const credential = credentialResult?.credential;
  const credentialType = credentialResult?.credentialType;

  // Submit and ensure mutations
  const submitCredential = useSubmitCredential();
  const ensureVehicleCredential = useEnsureVehicleCredential();

  const handleSubmit = async () => {
    if (!vehicleId || !credentialId) {
      toast({
        title: 'Error',
        description: 'Missing vehicle or credential information',
        variant: 'destructive',
      });
      return;
    }

    const companyId = profile?.company_id;
    if (!companyId) {
      toast({
        title: 'Error',
        description: 'Company not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If credential doesn't have an ID, ensure it exists first
      let actualCredentialId = credential?.id;
      
      if (!actualCredentialId) {
        // Use the credentialId from URL as credentialTypeId to create the credential
        actualCredentialId = await ensureVehicleCredential.mutateAsync({
          vehicleId,
          credentialTypeId: credentialId, // URL param is the credential_type_id
          companyId,
        });
        // Refetch to get the updated credential data
        await refetch();
      }

      if (!actualCredentialId) {
        throw new Error('Could not create credential');
      }

      await submitCredential.mutateAsync({
        credentialId: actualCredentialId,
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found state - credential type must exist
  if (!credentialType) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
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

  // Create a mock credential instance if none exists yet
  // The actual credential will be created on submit via ensureVehicleCredential
  const credentialInstance: VehicleCredential = credential || {
    id: '',
    vehicle_id: vehicleId || '',
    credential_type_id: credentialType.id,
    company_id: profile?.company_id || '',
    status: 'not_submitted' as const,
    document_url: null,
    document_urls: null,
    signature_data: null,
    form_data: null,
    entered_date: null,
    driver_expiration_date: null,
    notes: null,
    expires_at: null,
    reviewed_at: null,
    reviewed_by: null,
    review_notes: null,
    rejection_reason: null,
    submission_version: 0,
    grace_period_ends: null,
    submitted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <CredentialDetailView
      credentialType={credentialType}
      credential={credentialInstance}
      credentialTable="vehicle_credentials"
      mode="submit"
      viewerRole="driver"
      onBack={() => navigate(`/driver/vehicles/${vehicleId}`)}
      onSubmit={handleSubmit}
      isSubmitting={submitCredential.isPending || ensureVehicleCredential.isPending}
    />
  );
}
