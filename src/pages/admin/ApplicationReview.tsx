import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPageHeader } from '@/components/ui/DetailPageHeader';
import { supabase } from '@/integrations/supabase/client';
import { useApplication, useApproveApplication, useRejectApplication, useUpdateApplicationNotes } from '@/hooks/useApplications';
import { RejectApplicationModal } from '@/components/features/admin/RejectApplicationModal';
import { applicationStatusConfig } from '@/lib/status-configs';

export default function ApplicationReviewPage() {
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { data: application, isLoading } = useApplication(id);
  const approveApplication = useApproveApplication();
  const rejectApplication = useRejectApplication();
  const updateNotes = useUpdateApplicationNotes();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [frontPhotoUrl, setFrontPhotoUrl] = useState<string | null>(null);
  const [backPhotoUrl, setBackPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    setNotes(application?.admin_notes || '');
  }, [application?.admin_notes]);

  useEffect(() => {
    let isMounted = true;

    async function loadPhotos() {
      if (!application) return;
      if (application.license_front_url) {
        const { data } = await supabase.storage
          .from('credential-documents')
          .createSignedUrl(application.license_front_url, 60 * 60);
        if (isMounted) setFrontPhotoUrl(data?.signedUrl ?? null);
      }
      if (application.license_back_url) {
        const { data } = await supabase.storage
          .from('credential-documents')
          .createSignedUrl(application.license_back_url, 60 * 60);
        if (isMounted) setBackPhotoUrl(data?.signedUrl ?? null);
      }
    }

    void loadPhotos();

    return () => {
      isMounted = false;
    };
  }, [application]);

  const primaryVehicle = useMemo(() => application?.vehicles?.[0]?.vehicle, [application?.vehicles]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold">Application Not Found</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 text-center text-muted-foreground">
              Application not found.
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const status = applicationStatusConfig[application.application_status];

  // Action buttons for the header
  const actions = (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => approveApplication.mutate(application.id)}
        disabled={approveApplication.isPending || application.application_status === 'approved'}
      >
        {approveApplication.isPending ? 'Approving...' : 'Approve'}
      </Button>
      <Button 
        variant="destructive" 
        onClick={() => setRejectModalOpen(true)}
        disabled={application.application_status === 'rejected'}
      >
        Reject
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <DetailPageHeader
        title={application.user.full_name}
        subtitle="Driver application details and actions"
        badges={
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        }
        avatar={
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {application.user.full_name.charAt(0).toUpperCase()}
            </span>
          </div>
        }
        onBack={() => navigate('/admin/applications')}
        backLabel="Back to Applications"
        actions={actions}
      />

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Applicant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">Name: {application.user.full_name}</div>
              <div className="text-sm">Email: {application.user.email}</div>
              {application.user.phone && <div className="text-sm">Phone: {application.user.phone}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Date of birth: {application.date_of_birth || '—'}</div>
              <div>
                Address: {application.address_line1 || '—'} {application.address_line2 || ''}
              </div>
              <div>
                {application.city || ''} {application.state || ''} {application.zip || ''}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>License</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">Number: {application.license_number || '—'}</div>
              <div className="text-sm">State: {application.license_state || '—'}</div>
              <div className="text-sm">
                Expiration: {application.license_expiration || '—'}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {frontPhotoUrl ? (
                  <img src={frontPhotoUrl} alt="License front" className="rounded-md border" />
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Front photo not available
                  </div>
                )}
                {backPhotoUrl ? (
                  <img src={backPhotoUrl} alt="License back" className="rounded-md border" />
                ) : (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    Back photo not available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {primaryVehicle && (
            <Card>
              <CardHeader>
                <CardTitle>Vehicle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  {primaryVehicle.year} {primaryVehicle.make} {primaryVehicle.model}
                </div>
                <div>Plate: {primaryVehicle.license_plate}</div>
                <div>Type: {primaryVehicle.vehicle_type}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Experience: {application.experience_notes || '—'}</div>
              <div>Referral: {application.referral_source || '—'}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admin Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => updateNotes.mutate({ driverId: application.id, notes })}
                  disabled={updateNotes.isPending}
                >
                  {updateNotes.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RejectApplicationModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        applicantName={application.user.full_name}
        onReject={(reason, details) =>
          rejectApplication.mutate({ driverId: application.id, reason, details })
        }
        isSubmitting={rejectApplication.isPending}
      />
    </div>
  );
}
