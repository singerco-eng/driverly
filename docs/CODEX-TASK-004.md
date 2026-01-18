# TASK 004: Super Admin - Company Detail Page (SA-001 Continued)

## Context
Complete the Company Management feature by building the Company Detail page with tabs, edit functionality, and status management (deactivate/suspend/reactivate).

**Reference:** `docs/features/super-admin/SA-001-company-management.md`

## Prerequisites
- Task 003 complete (Company list + create modal)
- Companies service and hooks exist
- SuperAdminLayout exists

## Your Tasks

### Task 1: Company Detail Types

Update `src/types/company.ts` to add detail-specific types:

```typescript
// Add to existing file

export interface CompanyDetail extends Company {
  admin_count: number;
  driver_count: number;
  vehicle_count: number;
}

export interface CompanyAdmin {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: 'admin' | 'coordinator';
  status: 'active' | 'pending';
  avatar_url: string | null;
  created_at: string;
  invited_at: string | null;
}
```

### Task 2: Update Company Service

Add to `src/services/companies.ts`:

```typescript
// Add these imports if not present
import type { CompanyDetail, CompanyAdmin } from '@/types/company';

export async function getCompanyDetail(id: string): Promise<CompanyDetail> {
  // Get company with counts
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (companyError) throw companyError;

  // Get admin count
  const { count: adminCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .in('role', ['admin', 'coordinator']);

  // Get driver count
  const { count: driverCount } = await supabase
    .from('drivers')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id);

  // Get active vehicle count
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', id)
    .eq('status', 'active');

  return {
    ...company,
    admin_count: adminCount ?? 0,
    driver_count: driverCount ?? 0,
    vehicle_count: vehicleCount ?? 0,
  } as CompanyDetail;
}

export async function getCompanyAdmins(companyId: string): Promise<CompanyAdmin[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, avatar_url, created_at')
    .eq('company_id', companyId)
    .in('role', ['admin', 'coordinator'])
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map to include status (for now, all returned users are 'active')
  return (data ?? []).map((user) => ({
    ...user,
    status: 'active' as const,
    invited_at: null,
  }));
}
```

### Task 3: Update Company Hooks

Add to `src/hooks/useCompanies.ts`:

```typescript
// Add import
import type { CompanyDetail, CompanyAdmin } from '@/types/company';
import * as companiesService from '@/services/companies';

export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: ['companies', id, 'detail'],
    queryFn: () => companiesService.getCompanyDetail(id),
    enabled: !!id,
  });
}

export function useCompanyAdmins(companyId: string) {
  return useQuery({
    queryKey: ['companies', companyId, 'admins'],
    queryFn: () => companiesService.getCompanyAdmins(companyId),
    enabled: !!companyId,
  });
}
```

### Task 4: Company Detail Page

Create `src/pages/super-admin/CompanyDetail.tsx`:

```tsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCompanyDetail } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Building2,
  Users,
  Car,
  Calendar,
  Clock,
  Globe,
  MoreHorizontal,
  Pencil,
  UserPlus,
  Power,
  AlertTriangle,
} from 'lucide-react';
import type { CompanyStatus } from '@/types/company';
import EditCompanyModal from '@/components/features/super-admin/EditCompanyModal';
import CompanyStatusModal from '@/components/features/super-admin/CompanyStatusModal';
import CompanyInfoTab from '@/components/features/super-admin/CompanyInfoTab';
import CompanyAdminsTab from '@/components/features/super-admin/CompanyAdminsTab';

const statusColors: Record<CompanyStatus, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading, error } = useCompanyDetail(id!);

  const [showEditModal, setShowEditModal] = useState(false);
  const [statusAction, setStatusAction] = useState<'deactivate' | 'suspend' | 'reactivate' | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-24 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="p-8">
        <div className="text-destructive">
          Error loading company: {error?.message || 'Company not found'}
        </div>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/super-admin/companies')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Back Link */}
      <Link
        to="/super-admin/companies"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Companies
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: company.primary_color }}
          >
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
            ) : (
              company.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <Badge className={statusColors[company.status]}>{company.status}</Badge>
            </div>
            <p className="text-muted-foreground">/{company.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditModal(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Company
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {company.status === 'active' ? (
                <>
                  <DropdownMenuItem onClick={() => setStatusAction('deactivate')}>
                    <Power className="w-4 h-4 mr-2" />
                    Deactivate Company
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusAction('suspend')}
                    className="text-destructive focus:text-destructive"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Suspend Company
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={() => setStatusAction('reactivate')}>
                  <Power className="w-4 h-4 mr-2" />
                  Reactivate Company
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="info">Company Info</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="billing" disabled>
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={Users} label="Admins" value={company.admin_count} />
            <StatCard icon={Users} label="Drivers" value={company.driver_count} />
            <StatCard icon={Car} label="Vehicles" value={company.vehicle_count} />
            <StatCard
              icon={Calendar}
              label="Created"
              value={new Date(company.created_at).toLocaleDateString()}
            />
            <StatCard
              icon={Clock}
              label="Updated"
              value={new Date(company.updated_at).toLocaleDateString()}
            />
            <StatCard icon={Globe} label="Timezone" value={company.timezone.split('/')[1] || company.timezone} />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button variant="outline" disabled>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Admin
              </Button>
              <Button variant="outline" disabled>
                View as Admin
              </Button>
            </CardContent>
          </Card>

          {/* Deactivation Info */}
          {company.status !== 'active' && company.deactivation_reason && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg text-destructive">
                  {company.status === 'suspended' ? 'Suspension' : 'Deactivation'} Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{company.deactivation_reason}</p>
                {company.deactivated_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Since {new Date(company.deactivated_at).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Company Info Tab */}
        <TabsContent value="info">
          <CompanyInfoTab company={company} />
        </TabsContent>

        {/* Admins Tab */}
        <TabsContent value="admins">
          <CompanyAdminsTab companyId={company.id} />
        </TabsContent>

        {/* Billing Tab (Placeholder) */}
        <TabsContent value="billing">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Billing management coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditCompanyModal
        company={company}
        open={showEditModal}
        onOpenChange={setShowEditModal}
      />

      {statusAction && (
        <CompanyStatusModal
          company={company}
          action={statusAction}
          open={!!statusAction}
          onOpenChange={(open) => !open && setStatusAction(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 5: Company Info Tab Component

Create `src/components/features/super-admin/CompanyInfoTab.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Phone, MapPin, Hash, Globe } from 'lucide-react';
import type { CompanyDetail } from '@/types/company';

interface CompanyInfoTabProps {
  company: CompanyDetail;
}

export default function CompanyInfoTab({ company }: CompanyInfoTabProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Company Name" value={company.name} />
          <InfoRow label="URL Slug" value={`/${company.slug}`} />
          <InfoRow label="Status" value={company.status} />
          <InfoRow label="Timezone" value={company.timezone} />
          {company.ein && <InfoRow label="EIN" value={company.ein} />}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoRow label="Email" value={company.email || '—'} />
          <InfoRow label="Phone" value={company.phone || '—'} />
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {company.address_line1 || company.city ? (
            <>
              {company.address_line1 && <InfoRow label="Address Line 1" value={company.address_line1} />}
              {company.address_line2 && <InfoRow label="Address Line 2" value={company.address_line2} />}
              {company.city && <InfoRow label="City" value={company.city} />}
              {company.state && <InfoRow label="State" value={company.state} />}
              {company.zip && <InfoRow label="ZIP" value={company.zip} />}
            </>
          ) : (
            <p className="text-muted-foreground">No address provided</p>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Primary Color</span>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border"
                style={{ backgroundColor: company.primary_color }}
              />
              <span className="text-sm font-mono">{company.primary_color}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Logo</span>
            <span className="text-sm">{company.logo_url ? 'Uploaded' : 'None'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
```

### Task 6: Company Admins Tab Component

Create `src/components/features/super-admin/CompanyAdminsTab.tsx`:

```tsx
import { useCompanyAdmins } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { UserPlus, Users } from 'lucide-react';

interface CompanyAdminsTabProps {
  companyId: string;
}

export default function CompanyAdminsTab({ companyId }: CompanyAdminsTabProps) {
  const { data: admins, isLoading } = useCompanyAdmins(companyId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Company Admins</CardTitle>
        <Button disabled>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Admin
        </Button>
      </CardHeader>
      <CardContent>
        {admins?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No admins yet</h3>
            <p className="text-muted-foreground mb-4">
              Invite an admin to manage this company
            </p>
            <Button disabled>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Admin
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins?.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.full_name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {admin.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        admin.status === 'active'
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      }
                    >
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

### Task 7: Edit Company Modal

Create `src/components/features/super-admin/EditCompanyModal.tsx`:

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import type { CompanyDetail } from '@/types/company';

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
];

const companySchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  ein: z.string().optional(),
  timezone: z.string(),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface EditCompanyModalProps {
  company: CompanyDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditCompanyModal({ company, open, onOpenChange }: EditCompanyModalProps) {
  const { toast } = useToast();
  const updateCompany = useUpdateCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || '',
      primary_color: company.primary_color,
      ein: company.ein || '',
      timezone: company.timezone,
    },
  });

  // Reset form when company changes
  useEffect(() => {
    form.reset({
      name: company.name,
      email: company.email || '',
      phone: company.phone || '',
      address_line1: company.address_line1 || '',
      address_line2: company.address_line2 || '',
      city: company.city || '',
      state: company.state || '',
      zip: company.zip || '',
      primary_color: company.primary_color,
      ein: company.ein || '',
      timezone: company.timezone,
    });
  }, [company, form]);

  async function onSubmit(data: CompanyFormValues) {
    try {
      await updateCompany.mutateAsync({ id: company.id, data });
      toast({
        title: 'Company updated',
        description: `${data.name} has been updated successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update company',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>Update company information.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input value={`/${company.slug}`} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Slug cannot be changed</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register('email')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...form.register('phone')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ein">EIN (Tax ID)</Label>
                <Input id="ein" {...form.register('ein')} placeholder="XX-XXXXXXX" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={form.watch('timezone')}
                  onValueChange={(v) => form.setValue('timezone', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4">
            <h3 className="font-medium">Address</h3>

            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input id="address_line1" {...form.register('address_line1')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input id="address_line2" {...form.register('address_line2')} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...form.register('city')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" {...form.register('state')} placeholder="NY" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" {...form.register('zip')} placeholder="10001" />
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="space-y-4">
            <h3 className="font-medium">Branding</h3>

            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  {...form.register('primary_color')}
                  className="flex-1"
                />
                <input
                  type="color"
                  value={form.watch('primary_color')}
                  onChange={(e) => form.setValue('primary_color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateCompany.isPending}>
              {updateCompany.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 8: Company Status Modal (Deactivate/Suspend/Reactivate)

Create `src/components/features/super-admin/CompanyStatusModal.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Power } from 'lucide-react';
import { useDeactivateCompany, useSuspendCompany, useReactivateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';
import type { CompanyDetail } from '@/types/company';

interface CompanyStatusModalProps {
  company: CompanyDetail;
  action: 'deactivate' | 'suspend' | 'reactivate';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const actionConfig = {
  deactivate: {
    title: 'Deactivate Company',
    description: 'Are you sure you want to deactivate this company?',
    bullets: [
      'All admins and drivers will be locked out',
      'Data will be preserved',
      'You can reactivate at any time',
    ],
    defaultReason: 'Account deactivated at company request',
    buttonText: 'Deactivate',
    buttonVariant: 'default' as const,
    icon: Power,
  },
  suspend: {
    title: 'Suspend Company',
    description: 'Are you sure you want to suspend this company?',
    bullets: [
      'All admins and drivers will be locked out',
      'Company will see the reason below when trying to log in',
      'You can reactivate at any time',
    ],
    defaultReason: 'Account suspended - please contact support',
    buttonText: 'Suspend',
    buttonVariant: 'destructive' as const,
    icon: AlertTriangle,
  },
  reactivate: {
    title: 'Reactivate Company',
    description: 'Are you sure you want to reactivate this company?',
    bullets: [
      'All admins and drivers will regain access',
      'Previous deactivation reason will be cleared',
    ],
    defaultReason: '',
    buttonText: 'Reactivate',
    buttonVariant: 'default' as const,
    icon: Power,
  },
};

export default function CompanyStatusModal({
  company,
  action,
  open,
  onOpenChange,
}: CompanyStatusModalProps) {
  const config = actionConfig[action];
  const { toast } = useToast();

  const [reason, setReason] = useState(config.defaultReason);

  const deactivate = useDeactivateCompany();
  const suspend = useSuspendCompany();
  const reactivate = useReactivateCompany();

  const isPending = deactivate.isPending || suspend.isPending || reactivate.isPending;

  async function handleConfirm() {
    try {
      if (action === 'deactivate') {
        await deactivate.mutateAsync({ id: company.id, reason });
      } else if (action === 'suspend') {
        await suspend.mutateAsync({ id: company.id, reason });
      } else {
        await reactivate.mutateAsync(company.id);
      }

      toast({
        title: `Company ${action}d`,
        description: `${company.name} has been ${action}d successfully.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || `Failed to ${action} company`,
        variant: 'destructive',
      });
    }
  }

  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">{company.name}</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {config.bullets.map((bullet, i) => (
                <li key={i}>• {bullet}</li>
              ))}
            </ul>
          </div>

          {action !== 'reactivate' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (shown to users)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isPending || (action !== 'reactivate' && !reason.trim())}
          >
            {isPending ? `${config.buttonText.slice(0, -1)}ing...` : config.buttonText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 9: Update App.tsx Route

Update the company detail route in `src/App.tsx`:

```tsx
// Add import at top
import CompanyDetail from '@/pages/super-admin/CompanyDetail';

// Replace the placeholder route with:
<Route
  path="/super-admin/companies/:id"
  element={
    <ProtectedRoute allowedRoles={['super_admin']}>
      <SuperAdminLayout>
        <CompanyDetail />
      </SuperAdminLayout>
    </ProtectedRoute>
  }
/>
```

## Output Summary

When complete, confirm:
1. ✅ Updated `src/types/company.ts` - Added CompanyDetail and CompanyAdmin types
2. ✅ Updated `src/services/companies.ts` - Added getCompanyDetail and getCompanyAdmins
3. ✅ Updated `src/hooks/useCompanies.ts` - Added useCompanyDetail and useCompanyAdmins
4. ✅ `src/pages/super-admin/CompanyDetail.tsx` - Company detail page with tabs
5. ✅ `src/components/features/super-admin/CompanyInfoTab.tsx` - Info display component
6. ✅ `src/components/features/super-admin/CompanyAdminsTab.tsx` - Admins table component
7. ✅ `src/components/features/super-admin/EditCompanyModal.tsx` - Edit company form
8. ✅ `src/components/features/super-admin/CompanyStatusModal.tsx` - Deactivate/Suspend/Reactivate
9. ✅ Updated `src/App.tsx` - Route for company detail

## Testing Notes

To test:
1. Navigate to `/super-admin/companies`
2. Click on a company card to open detail page
3. Test Overview tab stats display
4. Test Company Info tab read-only view
5. Test Admins tab (empty state if no admins)
6. Test Edit button → update company info
7. Test Actions menu → Deactivate/Suspend
8. Test Reactivate on inactive/suspended company

## DO NOT
- Implement admin invitations yet (Task 005)
- Implement "View as Admin" feature (future)
- Implement Billing tab (future)
- Implement logo upload (simplify for MVP)
- Modify UI components in src/components/ui/
