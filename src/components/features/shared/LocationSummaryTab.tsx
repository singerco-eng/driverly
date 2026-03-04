import { useMemo } from 'react';
import { QuickStatsBar, type QuickStat } from '@/components/ui/quick-stats-bar';
import { InfoSection } from '@/components/ui/info-section';
import { PropertyGrid } from '@/components/ui/property-grid';
import { ActionAlertBanner, type ActionAlertItem } from '@/components/ui/action-alert-banner';
import {
  Building2,
  Users,
  Car,
  FileCheck,
  MapPin,
} from 'lucide-react';
import { credentialStatusConfig } from '@/lib/status-configs';
import { computeCredentialStatus, getCredentialStatusConfigKey, getQuickStatStatus } from '@/lib/credentialRequirements';
import {
  useLocationDrivers,
  useLocationVehicles,
  useLocationBrokers,
} from '@/hooks/useLocations';
import { useLocationCredentials } from '@/hooks/useLocationCredentials';
import type { Location } from '@/types/location';

export interface LocationSummaryTabProps {
  location: Location;
  canEdit?: boolean;
}

export function LocationSummaryTab({ location }: LocationSummaryTabProps) {
  const { data: drivers } = useLocationDrivers(location.id);
  const { data: vehicles } = useLocationVehicles(location.id);
  const { data: brokers } = useLocationBrokers(location.id);
  const { data: credentials } = useLocationCredentials(location.id);

  const driverCount = drivers?.length ?? 0;
  const vehicleCount = vehicles?.length ?? 0;
  const brokerCount = brokers?.length ?? 0;

  // Compute location credential status using similar priority logic
  // Location credentials use raw status (not displayStatus), so we handle them separately
  const locationCredStatus = useMemo(() => {
    const creds = credentials ?? [];
    const required = creds.filter(
      (c) => c.credential_type?.requirement === 'required' && c.credential_type?.scope === 'global'
    );

    if (required.length === 0) {
      return { status: 'valid' as const, count: 0, total: 0 };
    }

    const expired = required.filter((c) => c.status === 'expired');
    const expiring = required.filter((c) => {
      if (!c.expires_at || !c.credential_type?.expiration_warning_days) return false;
      const daysUntil = Math.ceil(
        (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return c.status === 'approved' && daysUntil <= c.credential_type.expiration_warning_days;
    });
    const missing = required.filter((c) => ['not_submitted', 'rejected'].includes(c.status));
    const gracePeriod = required.filter(
      (c) =>
        c.grace_period_ends &&
        new Date(c.grace_period_ends) > new Date() &&
        c.status === 'not_submitted'
    );
    const pending = required.filter((c) => c.status === 'pending_review');

    if (expired.length > 0) {
      return { status: 'expired' as const, count: expired.length, total: required.length };
    }
    if (expiring.length > 0) {
      return { status: 'expiring' as const, count: expiring.length, total: required.length };
    }
    if (missing.length > 0) {
      return { status: 'missing' as const, count: missing.length, total: required.length };
    }
    if (gracePeriod.length > 0) {
      return { status: 'grace_period' as const, count: gracePeriod.length, total: required.length };
    }
    if (pending.length > 0) {
      return { status: 'pending' as const, count: pending.length, total: required.length };
    }
    return { status: 'valid' as const, count: 0, total: required.length };
  }, [credentials]);

  // Build alert items for actionable issues
  const alertItems = useMemo<ActionAlertItem[]>(() => {
    const items: ActionAlertItem[] = [];
    
    if (locationCredStatus.total > 0 && locationCredStatus.status !== 'valid') {
      const configKey = getCredentialStatusConfigKey(locationCredStatus.status);
      const config = credentialStatusConfig[configKey];
      const severity = ['expired', 'missing'].includes(locationCredStatus.status) ? 'error' : 'warning';
      
      items.push({
        id: 'credentials-issue',
        message: `${locationCredStatus.count} credential${locationCredStatus.count > 1 ? 's' : ''} ${config.label.toLowerCase()}`,
        severity: severity as 'error' | 'warning',
      });
    }
    
    return items;
  }, [locationCredStatus]);

  // Determine credential status for badge display
  const credentialStatusInfo = useMemo(() => {
    if (locationCredStatus.total === 0) {
      return { label: '—', status: 'neutral' as const };
    }
    
    const configKey = getCredentialStatusConfigKey(locationCredStatus.status);
    const config = credentialStatusConfig[configKey];
    
    return {
      label: config.label,
      status: getQuickStatStatus(locationCredStatus.status),
    };
  }, [locationCredStatus]);

  const quickStats = useMemo<QuickStat[]>(() => {
    return [
      {
        id: 'drivers',
        label: 'Drivers',
        value: driverCount,
        icon: <Users className="h-5 w-5" />,
        status: driverCount > 0 ? 'success' : 'neutral',
      },
      {
        id: 'vehicles',
        label: 'Vehicles',
        value: vehicleCount,
        icon: <Car className="h-5 w-5" />,
        status: vehicleCount > 0 ? 'success' : 'neutral',
      },
      {
        id: 'credentials',
        label: 'Credentials',
        value: credentialStatusInfo.label,
        icon: <FileCheck className="h-5 w-5" />,
        status: credentialStatusInfo.status,
      },
      {
        id: 'trip-sources',
        label: 'Trip Sources',
        value: brokerCount,
        icon: <Building2 className="h-5 w-5" />,
        status: brokerCount > 0 ? 'success' : 'neutral',
      },
    ];
  }, [driverCount, vehicleCount, credentialStatusInfo, brokerCount]);

  return (
    <div className="space-y-6">
      {/* Alert banner for actionable issues */}
      <ActionAlertBanner items={alertItems} />
      
      {/* Compact stats bar */}
      <QuickStatsBar stats={quickStats} columns={4} />

      {/* Consolidated Location Details */}
      <InfoSection
        id="location-details"
        icon={<Building2 className="h-4 w-4" />}
        title="Location Details"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Name', value: location.name },
            { label: 'Code', value: location.code },
            { label: 'Phone', value: location.phone },
            { label: 'Email', value: location.email },
          ]}
          columns={4}
          compact
        />
      </InfoSection>

      {/* Address */}
      <InfoSection
        id="address"
        icon={<MapPin className="h-4 w-4" />}
        title="Address"
        canEdit={false}
      >
        <PropertyGrid
          properties={[
            { label: 'Street Address', value: location.address_line1 },
            {
              label: 'Address Line 2',
              value: location.address_line2,
              hidden: !location.address_line2,
            },
            { label: 'City', value: location.city },
            { label: 'State', value: location.state },
            { label: 'ZIP Code', value: location.zip },
          ]}
          columns={4}
          compact
        />
      </InfoSection>
    </div>
  );
}
