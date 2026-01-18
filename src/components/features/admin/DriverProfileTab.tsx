import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DriverWithDetails } from '@/types/driver';

interface DriverProfileTabProps {
  driver: DriverWithDetails;
}

export function DriverProfileTab({ driver }: DriverProfileTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="text-sm font-medium">
              {driver.date_of_birth ? new Date(driver.date_of_birth).toLocaleDateString() : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">SSN (Last 4)</p>
            <p className="text-sm font-medium">{driver.ssn_last_four || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="text-sm font-medium">
              {driver.address_line1
                ? `${driver.address_line1}${driver.address_line2 ? `, ${driver.address_line2}` : ''}`
                : '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {[driver.city, driver.state, driver.zip].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Emergency Contact</p>
            <p className="text-sm font-medium">
              {driver.emergency_contact_name || '—'}
            </p>
            <p className="text-sm text-muted-foreground">
              {driver.emergency_contact_phone || '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {driver.emergency_contact_relation || '—'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">License Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">License Number</p>
            <p className="text-sm font-medium">{driver.license_number || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">State</p>
            <p className="text-sm font-medium">{driver.license_state || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expiration</p>
            <p className="text-sm font-medium">
              {driver.license_expiration ? new Date(driver.license_expiration).toLocaleDateString() : '—'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
