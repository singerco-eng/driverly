import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/hooks/useCompanies';
import { ThemePresetSelector } from '@/components/features/driver/ThemePresetSelector';

export default function AdminSettings() {
  const { profile } = useAuth();
  const { data: company, isLoading } = useCompany(profile?.company_id || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b bg-background">
          <div className="px-6 py-4">
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="max-w-5xl mx-auto text-center py-12">
            <h2 className="text-lg font-semibold text-destructive">Company not found</h2>
            <p className="text-muted-foreground">Unable to load company settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">View your company information and settings.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: company.primary_color || '#3B82F6' }}
                >
                  {company.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Company Profile</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Color</p>
                    <p className="font-medium" style={{ color: company.primary_color }}>
                      {company.primary_color}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{company.email || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{company.phone || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Timezone:</span>
                  <span className="font-medium">{company.timezone || '—'}</span>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Address:</p>
                <p className="font-medium">{company.address_line1 || '—'}</p>
                {company.address_line2 && <p className="font-medium">{company.address_line2}</p>}
                <p className="font-medium">
                  {[company.city, company.state, company.zip].filter(Boolean).join(', ') || '—'}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">{company.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                Appearance
              </CardTitle>
              <CardDescription>Choose your preferred color theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <ThemePresetSelector />
            </CardContent>
          </Card>

          <Card className="p-12 text-center">
            <Palette className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">More Settings Coming Soon</h3>
            <p className="text-muted-foreground">
              Additional company settings, vehicle types, and integrations will be available here.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
