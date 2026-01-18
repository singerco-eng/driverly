# TASK 003: Super Admin - Company Management (SA-001)

## Context
Build the Super Admin company management feature. This is the first real feature - Super Admins manage tenant companies from this interface.

**Reference:** `docs/features/super-admin/SA-001-company-management.md`

## Prerequisites
- Auth layer complete (Task 002)
- Migration applied with `companies` table
- A super_admin user created in database

## Your Tasks

### Task 1: Company Types

Create `src/types/company.ts`:

```typescript
export type CompanyStatus = 'active' | 'inactive' | 'suspended';

export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logo_url: string | null;
  primary_color: string;
  status: CompanyStatus;
  ein: string | null;
  timezone: string;
  deactivation_reason: string | null;
  deactivated_at: string | null;
  deactivated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFormData {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
  primary_color: string;
  ein: string;
  timezone: string;
}

export interface CompanyWithStats extends Company {
  admin_count?: number;
  driver_count?: number;
}
```

### Task 2: Company Service

Create `src/services/companies.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Company, CompanyFormData, CompanyWithStats } from '@/types/company';

// Generate slug from company name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function getCompanies(): Promise<CompanyWithStats[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as CompanyWithStats[];
}

export async function getCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Company;
}

export async function createCompany(formData: CompanyFormData): Promise<Company> {
  const slug = formData.slug || generateSlug(formData.name);
  
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: formData.name,
      slug,
      email: formData.email || null,
      phone: formData.phone || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      primary_color: formData.primary_color || '#3B82F6',
      ein: formData.ein || null,
      timezone: formData.timezone || 'America/New_York',
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function updateCompany(id: string, formData: Partial<CompanyFormData>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function deactivateCompany(id: string, reason: string): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'inactive',
      deactivation_reason: reason,
      deactivated_at: new Date().toISOString(),
      deactivated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function suspendCompany(id: string, reason: string): Promise<Company> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'suspended',
      deactivation_reason: reason,
      deactivated_at: new Date().toISOString(),
      deactivated_by: user?.id,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}

export async function reactivateCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({
      status: 'active',
      deactivation_reason: null,
      deactivated_at: null,
      deactivated_by: null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Company;
}
```

### Task 3: Companies React Query Hooks

Create `src/hooks/useCompanies.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as companiesService from '@/services/companies';
import type { CompanyFormData } from '@/types/company';

export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: companiesService.getCompanies,
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => companiesService.getCompany(id),
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CompanyFormData) => companiesService.createCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CompanyFormData> }) =>
      companiesService.updateCompany(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useDeactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      companiesService.deactivateCompany(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useSuspendCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      companiesService.suspendCompany(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}

export function useReactivateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => companiesService.reactivateCompany(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['companies', id] });
    },
  });
}
```

### Task 4: Company List Page

Create `src/pages/super-admin/Companies.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '@/hooks/useCompanies';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Building2 } from 'lucide-react';
import type { CompanyStatus, CompanyWithStats } from '@/types/company';
import CreateCompanyModal from '@/components/features/super-admin/CreateCompanyModal';

const statusColors: Record<CompanyStatus, string> = {
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  suspended: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function Companies() {
  const navigate = useNavigate();
  const { data: companies, isLoading, error } = useCompanies();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CompanyStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCompanies = companies?.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(search.toLowerCase()) ||
      company.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading companies: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Companies</h1>
          <p className="text-muted-foreground">Manage tenant companies</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CompanyStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Companies Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-6 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                <div className="h-4 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCompanies?.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No companies found</h3>
          <p className="text-muted-foreground mb-4">
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first company'}
          </p>
          {!search && statusFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies?.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onClick={() => navigate(`/super-admin/companies/${company.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateCompanyModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}

function CompanyCard({ company, onClick }: { company: CompanyWithStats; onClick: () => void }) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: company.primary_color }}
            >
              {company.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">/{company.slug}</p>
            </div>
          </div>
          <Badge className={statusColors[company.status]}>{company.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{company.admin_count ?? 0} admins</span>
          <span>{company.driver_count ?? 0} drivers</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Created {new Date(company.created_at).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
```

### Task 5: Create Company Modal

Create `src/components/features/super-admin/CreateCompanyModal.tsx`:

```tsx
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
import { useCreateCompany } from '@/hooks/useCompanies';
import { useToast } from '@/hooks/use-toast';

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
  slug: z.string().optional(),
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

interface CreateCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCompanyModal({ open, onOpenChange }: CreateCompanyModalProps) {
  const { toast } = useToast();
  const createCompany = useCreateCompany();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip: '',
      primary_color: '#3B82F6',
      ein: '',
      timezone: 'America/New_York',
    },
  });

  async function onSubmit(data: CompanyFormValues) {
    try {
      await createCompany.mutateAsync(data as any);
      toast({
        title: 'Company created',
        description: `${data.name} has been created successfully.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Company</DialogTitle>
          <DialogDescription>
            Add a new tenant company to the platform.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Acme Transport"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  {...form.register('slug')}
                  placeholder="acme-transport (auto-generated)"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...form.register('phone')}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ein">EIN (Tax ID)</Label>
                <Input
                  id="ein"
                  {...form.register('ein')}
                  placeholder="XX-XXXXXXX"
                />
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
            <h3 className="font-medium">Address (Optional)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                {...form.register('address_line1')}
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                {...form.register('address_line2')}
                placeholder="Suite 100"
              />
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
                  placeholder="#3B82F6"
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
            <Button type="submit" disabled={createCompany.isPending}>
              {createCompany.isPending ? 'Creating...' : 'Create Company'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 6: Super Admin Layout

Create `src/components/layouts/SuperAdminLayout.tsx`:

```tsx
import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuperAdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/super-admin/companies', label: 'Companies', icon: Building2 },
  { path: '/super-admin/settings', label: 'Settings', icon: Settings },
];

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-6">
            <Link to="/super-admin" className="text-xl font-bold">
              Driverly
            </Link>
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
              Super Admin
            </span>
          </div>
          
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    'gap-2',
                    location.pathname.startsWith(item.path) && 'bg-accent'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || profile?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
```

### Task 7: Update App.tsx Routes

Update `src/App.tsx` to include the new routes:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/layouts/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import Login from '@/pages/auth/Login';
import SuperAdminLayout from '@/components/layouts/SuperAdminLayout';
import Companies from '@/pages/super-admin/Companies';

// Placeholder pages
const AdminDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const DriverDashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Driver Dashboard</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const SuperAdminSettings = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Settings</h1>
    <p className="text-muted-foreground">Coming soon...</p>
  </div>
);

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />

            {/* Super Admin routes */}
            <Route
              path="/super-admin"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminLayout>
                    <Navigate to="/super-admin/companies" replace />
                  </SuperAdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminLayout>
                    <Companies />
                  </SuperAdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/companies/:id"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminLayout>
                    <div className="p-8">Company Detail - Coming Soon</div>
                  </SuperAdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/super-admin/settings"
              element={
                <ProtectedRoute allowedRoles={['super_admin']}>
                  <SuperAdminLayout>
                    <SuperAdminSettings />
                  </SuperAdminLayout>
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Driver routes */}
            <Route
              path="/driver/*"
              element={
                <ProtectedRoute allowedRoles={['driver']}>
                  <DriverDashboard />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

## Output Summary

When complete, confirm:
1. ✅ `src/types/company.ts` - Company types
2. ✅ `src/services/companies.ts` - CRUD operations
3. ✅ `src/hooks/useCompanies.ts` - React Query hooks
4. ✅ `src/pages/super-admin/Companies.tsx` - Company list page
5. ✅ `src/components/features/super-admin/CreateCompanyModal.tsx` - Create modal
6. ✅ `src/components/layouts/SuperAdminLayout.tsx` - Layout with nav
7. ✅ Updated `src/App.tsx` - New routes + Toaster

## Testing Notes

To test, you'll need to:
1. Create a super_admin user in Supabase (Auth + users table)
2. Log in as that user
3. Navigate to /super-admin/companies
4. Try creating a company

## DO NOT
- Implement company detail page yet (Task 004)
- Implement admin invitations yet (Task 005)
- Modify UI components in src/components/ui/
