import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { ActionAlertBanner, type ActionAlertItem } from '@/components/ui/action-alert-banner';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { resolveAvatarUrl } from '@/services/profile';
import { useLocations, useAssignDriverToLocation } from '@/hooks/useLocations';
import { useDriverCredentials } from '@/hooks/useCredentials';
import { DriverNotesSection } from '@/components/features/admin/DriverNotesSection';
import {
  FileCheck,
  Car,
  User,
  MapPin,
  ShieldCheck,
  Phone,
} from 'lucide-react';
import { credentialStatusConfig } from '@/lib/status-configs';
import { computeCredentialStatus, getCredentialStatusConfigKey, getQuickStatStatus } from '@/lib/credentialRequirements';
import EditPersonalInfoModal from '@/components/features/driver/EditPersonalInfoModal';
import EditAddressModal from '@/components/features/driver/EditAddressModal';
import EditLicenseModal from '@/components/features/driver/EditLicenseModal';
import EditEmergencyContactModal from '@/components/features/driver/EditEmergencyContactModal';
import type { DriverWithDetails } from '@/types/driver';

export interface DriverSummaryTabProps {
  driver: DriverWithDetails;
  companyId: string;
  canEdit?: boolean;
}

export function DriverSummaryTab({ driver, companyId, canEdit = true }: DriverSummaryTabProps) {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isOwner = user?.id === driver.user_id;
  const effectiveCanEdit = canEdit && (isAdmin || isOwner);

  // Always fetch credentials to compute proper status display
  const { data: credentials = [] } = useDriverCredentials(driver.id);
  const { data: locations } = useLocations(companyId);
  const assignToLocation = useAssignDriverToLocation();
  const activeLocations = (locations ?? []).filter((location) => location.status === 'active');

  const [showPersonal, setShowPersonal] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showLicense, setShowLicense] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAssets() {
      if (driver.user?.avatar_url) {
        const resolved = await resolveAvatarUrl(driver.user.avatar_url);
        if (isMounted) setAvatarUrl(resolved);
      } else if (isMounted) {
        setAvatarUrl(null);
      }

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

    void loadAssets();

    return () => {
      isMounted = false;
    };
  }, [driver.license_back_url, driver.license_front_url, driver.user?.avatar_url]);

  // Compute credential status from actual credentials using shared utility
  const computedCredStatus = useMemo(() => computeCredentialStatus(credentials), [credentials]);

  // Build alert items for actionable issues
  const alertItems = useMemo<ActionAlertItem[]>(() => {
    const items: ActionAlertItem[] = [];
    
    // License expiration alerts
    const licenseExpiration = driver.license_expiration ? new Date(driver.license_expiration) : null;
    const daysUntilExpiry = licenseExpiration
      ? Math.ceil((licenseExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    
    if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
      items.push({
        id: 'license-expired',
        message: 'Driver license has expired',
        severity: 'error',
      });
    } else if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
      items.push({
        id: 'license-expiring',
        message: `License expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
        severity: 'warning',
      });
    }
    
    // Credential issues using computed status
    if (computedCredStatus.total > 0 && computedCredStatus.status !== 'valid') {
      const configKey = getCredentialStatusConfigKey(computedCredStatus.status);
      const config = credentialStatusConfig[configKey];
      const severity = ['expired', 'missing'].includes(computedCredStatus.status) ? 'error' : 'warning';
      
      items.push({
        id: 'credentials-issue',
        message: `${computedCredStatus.count} credential${computedCredStatus.count > 1 ? 's' : ''} ${config.label.toLowerCase()}`,
        severity: severity as 'error' | 'warning',
      });
    }
    
    return items;
  }, [computedCredStatus, driver.license_expiration]);

  // Determine credential status for badge display
  const credentialStatusInfo = useMemo(() => {
    if (computedCredStatus.total === 0) {
      return { label: '—', status: 'neutral' as const };
    }
    
    const configKey = getCredentialStatusConfigKey(computedCredStatus.status);
    const config = credentialStatusConfig[configKey];
    
    return {
      label: config.label,
      status: getQuickStatStatus(computedCredStatus.status),
    };
  }, [computedCredStatus]);

  const quickStats = useMemo<QuickStat[]>(() => {
    const licenseExpiration = driver.license_expiration ? new Date(driver.license_expiration) : null;
    const daysUntilExpiry = licenseExpiration
      ? Math.ceil((licenseExpiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    let licenseStatus: QuickStat['status'] = 'neutral';
    let licenseValue = 'Not provided';
    if (daysUntilExpiry !== null) {
      if (daysUntilExpiry < 0) {
        licenseStatus = 'error';
        licenseValue = 'Expired';
      } else if (daysUntilExpiry <= 90) {
        licenseStatus = 'warning';
        licenseValue = `${daysUntilExpiry}d left`;
      } else {
        licenseStatus = 'success';
        licenseValue = 'Valid';
      }
    }

    const locationName = activeLocations.find(l => l.id === driver.location_id)?.name;

    return [
      {
        id: 'license',
        label: 'License',
        value: licenseValue,
        icon: <ShieldCheck className="h-5 w-5" />,
        status: licenseStatus,
        description: driver.license_state || undefined,
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: credentialStatusInfo.label,
        icon: <FileCheck className="h-5 w-5" />,
        status: credentialStatusInfo.status,
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        value: driver.vehicles?.length ?? 0,
        icon: <Car className="h-5 w-5" />,
        status: (driver.vehicles?.length ?? 0) > 0 ? 'success' : 'neutral',
      },
      {
        id: 'location',
        label: 'Company Location',
        value: locationName || 'Unassigned',
        icon: <MapPin className="h-5 w-5" />,
        status: driver.location_id ? 'success' : 'neutral',
      },
    ];
  }, [activeLocations, credentialStatusInfo, driver]);

  const initials = useMemo(() => {
    if (!driver.user?.full_name && !driver.user?.email) return 'DR';
    return (driver.user.full_name || driver.user.email || 'DR')
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [driver.user?.email, driver.user?.full_name]);

  const emailVerified = isOwner ? !!user?.email_confirmed_at : false;

  const hasEmergency =
    !!driver.emergency_contact_name || !!driver.emergency_contact_phone || !!driver.emergency_contact_relation;

  return (
    <div className="space-y-6">
      {/* Alert banner for actionable issues */}
      <ActionAlertBanner items={alertItems} />
      
      {/* Compact stats bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Personal Information - with avatar */}
      <InfoSection
        id="personal"
        icon={<User className="h-4 w-4" />}
        title="Personal Information"
        onEdit={() => setShowPersonal(true)}
        canEdit={effectiveCanEdit}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar size="lg">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={driver.user?.full_name || 'Driver'} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <PropertyGrid
            properties={[
              { label: 'Full Name', value: driver.user?.full_name },
              {
                label: 'Date of Birth',
                value: driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString() : null,
              },
              {
                label: 'SSN',
                value: driver.ssn_last_four ? `****-****-${driver.ssn_last_four}` : null,
                hidden: !isAdmin && !isOwner,
              },
              {
                label: 'Email',
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{driver.user?.email}</span>
                    {emailVerified && (
                      <Badge variant="secondary" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </span>
                ),
              },
              { label: 'Phone', value: driver.user?.phone },
            ]}
            columns={2}
            compact
          />
        </div>
      </InfoSection>

      {/* Address - consolidated */}
      <InfoSection
        id="address"
        icon={<MapPin className="h-4 w-4" />}
        title="Address"
        onEdit={() => setShowAddress(true)}
        canEdit={effectiveCanEdit}
      >
        <PropertyGrid
          properties={[
            { label: 'Street Address', value: driver.address_line1 },
            { label: 'Address Line 2', value: driver.address_line2, hidden: !driver.address_line2 },
            { label: 'City', value: driver.city },
            { label: 'State', value: driver.state },
            { label: 'ZIP Code', value: driver.zip },
          ]}
          columns={4}
          compact
        />
      </InfoSection>

      {/* License & Employment - consolidated */}
      <InfoSection
        id="license"
        icon={<ShieldCheck className="h-4 w-4" />}
        title="License & Employment"
        onEdit={() => setShowLicense(true)}
        canEdit={effectiveCanEdit}
      >
        <div className="space-y-4">
          <PropertyGrid
            properties={[
              { label: 'License Number', value: driver.license_number },
              { label: 'State', value: driver.license_state },
              {
                label: 'Expiration',
                value: driver.license_expiration ? new Date(driver.license_expiration).toLocaleDateString() : null,
              },
              { label: 'Employment Type', value: driver.employment_type?.toUpperCase() },
              {
                label: 'Start Date',
                value: driver.approved_at
                  ? new Date(driver.approved_at).toLocaleDateString()
                  : driver.created_at
                    ? new Date(driver.created_at).toLocaleDateString()
                    : null,
              },
              {
                label: 'Location',
                value: isAdmin ? (
                  <Select
                    value={driver.location_id || 'unassigned'}
                    onValueChange={(value) => {
                      assignToLocation.mutate({
                        driverId: driver.id,
                        locationId: value === 'unassigned' ? null : value,
                      });
                    }}
                    disabled={!effectiveCanEdit}
                  >
                    <SelectTrigger className="w-full max-w-[200px] h-8">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {activeLocations.length === 0 ? (
                        <SelectItem value="no-locations" disabled>
                          No active locations
                        </SelectItem>
                      ) : (
                        activeLocations.map((location) => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} {location.code ? `(${location.code})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  driver.location?.name || 'Unassigned'
                ),
              },
            ]}
            columns={3}
            compact
          />
          {/* License photos - compact grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">License Front</p>
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border bg-muted/10">
                {frontPreview ? (
                  <img src={frontPreview} alt="License front" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Not uploaded</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">License Back</p>
              <div className="flex h-24 items-center justify-center overflow-hidden rounded-md border bg-muted/10">
                {backPreview ? (
                  <img src={backPreview} alt="License back" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </InfoSection>

      <InfoSection
        id="emergency"
        icon={<Phone className="h-4 w-4" />}
        title="Emergency Contact"
        description="Contact in case of emergency"
        onEdit={() => setShowEmergency(true)}
        canEdit={effectiveCanEdit}
      >
        {hasEmergency ? (
          <PropertyGrid
            properties={[
              { label: 'Name', value: driver.emergency_contact_name },
              { label: 'Phone', value: driver.emergency_contact_phone },
              { label: 'Relationship', value: driver.emergency_contact_relation },
            ]}
            columns={3}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No emergency contact on file</p>
        )}
      </InfoSection>

      {isAdmin && <DriverNotesSection driverId={driver.id} canEdit={effectiveCanEdit} />}

      <EditPersonalInfoModal
        open={showPersonal}
        onOpenChange={setShowPersonal}
        driver={driver}
        user={driver.user}
      />
      <EditAddressModal open={showAddress} onOpenChange={setShowAddress} driver={driver} />
      <EditLicenseModal open={showLicense} onOpenChange={setShowLicense} driver={driver} />
      <EditEmergencyContactModal open={showEmergency} onOpenChange={setShowEmergency} driver={driver} />
    </div>
  );
}
