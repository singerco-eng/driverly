import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverProfile, useProfileCompletion } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import EditPersonalInfoModal from '@/components/features/driver/EditPersonalInfoModal';
import EditContactInfoModal from '@/components/features/driver/EditContactInfoModal';
import EditAddressModal from '@/components/features/driver/EditAddressModal';
import EditLicenseModal from '@/components/features/driver/EditLicenseModal';
import EditEmergencyContactModal from '@/components/features/driver/EditEmergencyContactModal';
import { Calendar, Mail, MapPin, ShieldCheck, User } from 'lucide-react';

export default function DriverProfile() {
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriverProfile(user?.id);
  const completion = driver ? useProfileCompletion(driver) : null;
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  const [showPersonal, setShowPersonal] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadPreviews() {
      if (!driver) return;
      if (driver.license_front_url) {
        const { data } = await supabase.storage
          .from('credential-documents')
          .createSignedUrl(driver.license_front_url, 60 * 60);
        if (isMounted) setFrontPreview(data?.signedUrl || null);
      } else if (isMounted) {
        setFrontPreview(null);
      }

      if (driver.license_back_url) {
        const { data } = await supabase.storage
          .from('credential-documents')
          .createSignedUrl(driver.license_back_url, 60 * 60);
        if (isMounted) setBackPreview(data?.signedUrl || null);
      } else if (isMounted) {
        setBackPreview(null);
      }
    }

    void loadPreviews();

    return () => {
      isMounted = false;
    };
  }, [driver]);

  const initials = useMemo(() => {
    if (!driver?.user?.full_name) return 'DR';
    return driver.user.full_name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [driver]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
          Loading profile...
        </Card>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="space-y-4">
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
          We couldn't find your driver profile yet.
        </Card>
      </div>
    );
  }

  if (driver.application_status !== 'approved') {
    return <Navigate to="/driver/application-status" replace />;
  }

  const emailVerified = !!user?.email_confirmed_at;
  const addressLine = driver.address_line1 || '';
  const addressRest = [driver.city, driver.state, driver.zip].filter(Boolean).join(', ');
  const hasEmergency =
    !!driver.emergency_contact_name || !!driver.emergency_contact_phone || !!driver.emergency_contact_relation;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Driver Profile</h1>
        <p className="text-sm text-muted-foreground">
          Review and update your personal information and documents.
        </p>
      </div>

      {completion && (
        <Card className={cn(cardVariants({ variant: 'stats' }))}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Profile Completion</CardTitle>
              <Badge variant={completion.isComplete ? 'secondary' : 'outline'}>
                {completion.percentage}% Complete
              </Badge>
            </div>
            <CardDescription>
              Complete all sections to unlock the best broker opportunities.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completion.percentage} className="h-2" />
            {completion.missingFields.length > 0 ? (
              <div className="text-sm text-muted-foreground">
                Missing: {completion.missingFields.slice(0, 4).join(', ')}
                {completion.missingFields.length > 4 && ` +${completion.missingFields.length - 4} more`}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">All required fields are complete.</div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Info
            </CardTitle>
            <CardDescription>Basic details about you.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowPersonal(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarImage src={driver.user.avatar_url || undefined} alt={driver.user.full_name} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{driver.user.full_name || '—'}</div>
              <div className="text-sm text-muted-foreground">
                DOB: {driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString() : '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Contact Info
            </CardTitle>
            <CardDescription>Email and phone number.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowContact(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Email:</span>
            <span>{driver.user.email}</span>
            <Badge variant={emailVerified ? 'secondary' : 'outline'}>
              {emailVerified ? 'Verified' : 'Unverified'}
            </Badge>
          </div>
          <div className="text-sm">
            <span className="font-medium">Phone:</span>{' '}
            <span className="text-muted-foreground">{driver.user.phone || '—'}</span>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Address
            </CardTitle>
            <CardDescription>Your current home address.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowAddress(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <div>{addressLine || '—'}</div>
          <div>{addressRest || '—'}</div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              License
            </CardTitle>
            <CardDescription>License details and photos.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowLicense(true)}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <div>
              <span className="font-medium">Number:</span> {driver.license_number || '—'}
            </div>
            <div>
              <span className="font-medium">State:</span> {driver.license_state || '—'}
            </div>
            <div>
              <span className="font-medium">Expires:</span>{' '}
              {driver.license_expiration ? new Date(driver.license_expiration).toLocaleDateString() : '—'}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/10 p-3 text-sm text-muted-foreground">
              {frontPreview ? (
                <img
                  src={frontPreview}
                  alt="License front"
                  className="w-full max-h-40 object-contain rounded-md"
                />
              ) : (
                'Front photo not uploaded'
              )}
            </div>
            <div className="rounded-md border bg-muted/10 p-3 text-sm text-muted-foreground">
              {backPreview ? (
                <img
                  src={backPreview}
                  alt="License back"
                  className="w-full max-h-40 object-contain rounded-md"
                />
              ) : (
                'Back photo not uploaded'
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Employment
          </CardTitle>
          <CardDescription>Read-only employment details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium">Type:</span> {driver.employment_type?.toUpperCase()}
          </div>
          <div>
            <span className="font-medium">Start date:</span>{' '}
            {driver.approved_at
              ? new Date(driver.approved_at).toLocaleDateString()
              : new Date(driver.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Emergency Contact</CardTitle>
            <CardDescription>Optional but recommended.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setShowEmergency(true)}>
            {hasEmergency ? 'Edit' : 'Add'}
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {hasEmergency ? (
            <div className="space-y-1">
              <div>{driver.emergency_contact_name || '—'}</div>
              <div>{driver.emergency_contact_phone || '—'}</div>
              <div className="capitalize">{driver.emergency_contact_relation || '—'}</div>
            </div>
          ) : (
            <div>No emergency contact on file.</div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild variant="ghost">
          <Link to="/driver/settings/account">Account Settings</Link>
        </Button>
      </div>

      <EditPersonalInfoModal
        open={showPersonal}
        onOpenChange={setShowPersonal}
        driver={driver}
        user={driver.user}
      />
      <EditContactInfoModal
        open={showContact}
        onOpenChange={setShowContact}
        driver={driver}
        user={driver.user}
      />
      <EditAddressModal open={showAddress} onOpenChange={setShowAddress} driver={driver} />
      <EditLicenseModal open={showLicense} onOpenChange={setShowLicense} driver={driver} />
      <EditEmergencyContactModal open={showEmergency} onOpenChange={setShowEmergency} driver={driver} />
    </div>
  );
}
