import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverByUserId } from '@/hooks/useDrivers';
import { useDriverAssignments } from '@/hooks/useVehicleAssignments';
import { useDriverCredentials, useSubmitCredential } from '@/hooks/useCredentials';
import * as credentialService from '@/services/credentials';
import { CredentialDetailView } from '@/components/features/credentials/CredentialDetail';
import { useToast } from '@/hooks/use-toast';
import type { DriverCredential, VehicleCredential } from '@/types/credential';

/**
 * Driver credential detail page
 * Uses unified CredentialDetailView for both instruction-based and legacy credentials
 */
export default function CredentialDetailPage() {
  const { id: credentialTypeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const { data: driver, isLoading: driverLoading } = useDriverByUserId(user?.id);
  const driverId = driver?.id;

  const { data: driverCredentials, isLoading: driverCredentialsLoading } = useDriverCredentials(driverId);
  const { data: assignments } = useDriverAssignments(driverId);

  // Submit mutation
  const submitCredential = useSubmitCredential();

  const vehicleIds = useMemo(
    () => (assignments || []).map((assignment) => assignment.vehicle_id),
    [assignments]
  );

  const vehicleCredentialQueries = useQueries({
    queries: vehicleIds.map((vehicleId) => ({
      queryKey: ['vehicle-credentials', vehicleId],
      queryFn: () => credentialService.getVehicleCredentials(vehicleId),
      enabled: !!vehicleId,
    })),
  });

  const vehicleCredentials = useMemo(
    () => vehicleCredentialQueries.flatMap((query) => query.data || []),
    [vehicleCredentialQueries]
  );

  const allCredentials = useMemo(
    () => [...(driverCredentials || []), ...vehicleCredentials],
    [driverCredentials, vehicleCredentials]
  );

  // Find the specific credential
  const credentialData = allCredentials.find(
    (c) => c.credentialType.id === credentialTypeId || c.credential?.id === credentialTypeId
  );

  const isLoading =
    driverLoading ||
    driverCredentialsLoading ||
    vehicleCredentialQueries.some((query) => query.isLoading);

  // Handle submit
  const handleSubmit = async () => {
    if (!credentialData?.credential) {
      toast({
        title: 'Error',
        description: 'Credential not found',
        variant: 'destructive',
      });
      return;
    }

    const isVehicleCredential = 'vehicle_id' in credentialData.credential;

    try {
      await submitCredential.mutateAsync({
        credentialId: credentialData.credential.id,
        credentialTable: isVehicleCredential ? 'vehicle_credentials' : 'driver_credentials',
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
      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Not found state
  if (!credentialData) {
    return (
      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">Credential not found</h3>
          <p className="text-muted-foreground mb-4">
            The credential you're looking for doesn't exist or you don't have access.
          </p>
          <Button onClick={() => navigate('/driver/credentials')}>Back to Credentials</Button>
        </Card>
      </div>
    );
  }

  const { credentialType, credential } = credentialData;
  const isVehicleCredential = credential && 'vehicle_id' in credential;

  // Create a mock credential if none exists yet
  const credentialInstance: DriverCredential | VehicleCredential = credential || {
    id: '',
    driver_id: driverId || '',
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
    <div className="container max-w-3xl mx-auto px-4 py-6">
      <CredentialDetailView
        credentialType={credentialType}
        credential={credentialInstance}
        credentialTable={isVehicleCredential ? 'vehicle_credentials' : 'driver_credentials'}
        mode="submit"
        viewerRole="driver"
        onBack={() => navigate('/driver/credentials')}
        onSubmit={handleSubmit}
        isSubmitting={submitCredential.isPending}
      />
    </div>
  );
}
