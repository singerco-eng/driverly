import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useApplication, useApproveApplication, useRejectApplication, useUpdateApplicationNotes } from '@/hooks/useApplications';
import { RejectApplicationModal } from '@/components/features/admin/RejectApplicationModal';
import type { ApplicationStatus } from '@/types/driver';

const statusStyles: Record<ApplicationStatus, string> = {
  draft: 'bg-muted text-muted-foreground border-border/40',
  pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  under_review: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  approved: 'bg-green-500/20 text-green-700 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-700 border-red-500/30',
  withdrawn: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
};

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

  if (isLoading || !application) {
    return (
      <Card className="p-8 text-center text-muted-foreground">Loading application...</Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Application Review</h1>
          <p className="text-muted-foreground">Driver application details and actions.</p>
        </div>
        <Badge variant="outline" className={statusStyles[application.application_status]}>
          {application.application_status.replace('_', ' ')}
        </Badge>
      </div>

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

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => approveApplication.mutate(application.id)}
          disabled={approveApplication.isPending}
        >
          {approveApplication.isPending ? 'Approving...' : 'Approve'}
        </Button>
        <Button variant="destructive" onClick={() => setRejectModalOpen(true)}>
          Reject
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin/applications')}>
          Back to Applications
        </Button>
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
