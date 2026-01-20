import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDriverProfile, useNotificationPreferences, useSaveNotificationPreferences } from '@/hooks/useProfile';
import { cardVariants } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import ChangePasswordModal from '@/components/features/driver/ChangePasswordModal';
import EditContactInfoModal from '@/components/features/driver/EditContactInfoModal';
import { ThemeSelector } from '@/components/features/driver/ThemeSelector';
import { Bell, Lock, Mail, Palette, UserCheck } from 'lucide-react';

const DEFAULT_PREFS = {
  email_trip_assignments: true,
  email_credential_reminders: true,
  email_payment_notifications: true,
  email_marketing: false,
  push_trip_assignments: true,
  push_credential_reminders: true,
  push_payment_notifications: true,
  sms_enabled: false,
};

const NOTIFICATION_OPTIONS = [
  {
    key: 'email_trip_assignments',
    label: 'Trip assignments',
    description: 'Get an email when you receive a trip assignment.',
  },
  {
    key: 'email_credential_reminders',
    label: 'Credential reminders',
    description: 'Get an email when credentials are about to expire.',
  },
  {
    key: 'email_payment_notifications',
    label: 'Payment notifications',
    description: 'Get an email when a payment is issued.',
  },
  {
    key: 'email_marketing',
    label: 'Marketing updates',
    description: 'Receive occasional product updates and tips.',
  },
] as const;

export default function AccountSettings() {
  const { user } = useAuth();
  const { data: driver, isLoading } = useDriverProfile(user?.id);
  const { data: prefsData } = useNotificationPreferences(user?.id);
  const savePrefs = useSaveNotificationPreferences();
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (!prefsData) {
      setPrefs(DEFAULT_PREFS);
      return;
    }
    setPrefs({
      ...DEFAULT_PREFS,
      ...prefsData,
    });
  }, [prefsData]);

  const handleToggle = (key: keyof typeof DEFAULT_PREFS, value: boolean) => {
    if (!user?.id) return;
    setPrefs((prev) => ({ ...prev, [key]: value }));
    savePrefs.mutate({ userId: user.id, prefs: { [key]: value } });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
          Loading account settings...
        </Card>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Card className={cn(cardVariants({ variant: 'glass' }), 'p-6 text-center text-muted-foreground')}>
          We couldn't find your driver profile yet.
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage security and notification preferences.</p>
      </div>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Update your password and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Password last changed: <span className="text-foreground">Not available</span>
          </div>
          <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
            Change Password
          </Button>
        </CardContent>
        <CardContent className="pt-0">
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Two-Factor Authentication is coming soon.
          </div>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Email
          </CardTitle>
          <CardDescription>Manage your login email.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">{driver.user.email}</div>
          <Button variant="outline" onClick={() => setShowEmailModal(true)}>
            Change Email
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Choose how the app looks to you.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notifications
          </CardTitle>
          <CardDescription>These update automatically when you toggle them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {NOTIFICATION_OPTIONS.map((option) => (
            <div key={option.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
              <Switch
                checked={prefs[option.key]}
                onCheckedChange={(value) => handleToggle(option.key, value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={cn(cardVariants({ variant: 'default' }))}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Basic account status details.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm text-muted-foreground">
          <div>
            <span className="font-medium">Joined:</span>{' '}
            {new Date(driver.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge variant="secondary" className="capitalize">
              {driver.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <ChangePasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
      <EditContactInfoModal
        open={showEmailModal}
        onOpenChange={setShowEmailModal}
        driver={driver}
        user={driver.user}
      />
    </div>
  );
}
