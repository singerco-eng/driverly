import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CredentialWithDisplayStatus } from '@/types/credential';

interface CredentialAlertBannerProps {
  driverCredentials: CredentialWithDisplayStatus[];
  vehicleCredentials: CredentialWithDisplayStatus[];
  onViewAll?: () => void;
}

export function CredentialAlertBanner({
  driverCredentials,
  vehicleCredentials,
  onViewAll,
}: CredentialAlertBannerProps) {
  const attention = [...driverCredentials, ...vehicleCredentials].filter((cred) =>
    ['rejected', 'expiring', 'expired', 'grace_period', 'missing'].includes(cred.displayStatus),
  );

  if (!attention.length) return null;

  return (
    <Card className="border-orange-200 bg-orange-50 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-semibold">
              {attention.length} credential{attention.length === 1 ? '' : 's'} need attention
            </span>
          </div>
          <ul className="space-y-1 text-sm text-orange-800">
            {attention.slice(0, 5).map((item) => (
              <li key={`${item.credentialType.id}-${item.credential.id ?? 'pending'}`}>
                {item.credentialType.name} - {item.displayStatus.replace('_', ' ')}
              </li>
            ))}
          </ul>
        </div>
        {onViewAll && (
          <Button variant="outline" onClick={onViewAll} className="border-orange-300 text-orange-700">
            View All
          </Button>
        )}
      </div>
    </Card>
  );
}
