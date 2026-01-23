# TASK 005: Credential Types Management (AD-005)

## Context

Build the Credential Types management feature for Admins. Credential Types define what credentials drivers and vehicles must submit (e.g., Background Check, Driver's License, Vehicle Insurance).

**Reference:** `docs/features/admin/AD-005-credential-types.md`

## Prerequisites

- Migration `011_credential_types.sql` applied to Supabase
- Admin Layout and authentication complete
- Company context available in Admin pages

## Your Tasks

### Task 1: Credential Type Types

Create `src/types/credential.ts`:

```typescript
export type CredentialCategory = 'driver' | 'vehicle';
export type CredentialScope = 'global' | 'broker';
export type EmploymentType = 'both' | 'w2_only' | '1099_only';
export type RequirementLevel = 'required' | 'optional' | 'recommended';
export type SubmissionType = 
  | 'document_upload' 
  | 'photo' 
  | 'signature' 
  | 'form' 
  | 'admin_verified' 
  | 'date_entry';
export type ExpirationType = 'never' | 'fixed_interval' | 'driver_specified';
export type CredentialStatus = 
  | 'not_submitted' 
  | 'pending_review' 
  | 'approved' 
  | 'rejected' 
  | 'expired';

export interface CredentialType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[] | null;
  submission_type: SubmissionType;
  form_schema: Record<string, unknown> | null;
  signature_document_url: string | null;
  expiration_type: ExpirationType;
  expiration_interval_days: number | null;
  expiration_warning_days: number;
  grace_period_days: number;
  display_order: number;
  is_active: boolean;
  is_seeded: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined data
  broker?: {
    id: string;
    name: string;
  } | null;
}

export interface CredentialTypeFormData {
  name: string;
  description: string;
  category: CredentialCategory;
  scope: CredentialScope;
  broker_id: string | null;
  employment_type: EmploymentType;
  requirement: RequirementLevel;
  vehicle_types: string[];
  submission_type: SubmissionType;
  form_schema: Record<string, unknown> | null;
  signature_document_url: string | null;
  expiration_type: ExpirationType;
  expiration_interval_days: number | null;
  expiration_warning_days: number;
  grace_period_days: number;
}

export interface CredentialTypeWithStats extends CredentialType {
  total_count: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  expired_count: number;
}

// For driver/vehicle credential instances
export interface DriverCredential {
  id: string;
  driver_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  signature_data: Record<string, unknown> | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
}

export interface VehicleCredential {
  id: string;
  vehicle_id: string;
  credential_type_id: string;
  company_id: string;
  status: CredentialStatus;
  document_url: string | null;
  signature_data: Record<string, unknown> | null;
  form_data: Record<string, unknown> | null;
  entered_date: string | null;
  notes: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  rejection_reason: string | null;
  grace_period_ends: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  credential_type?: CredentialType;
}

// Broker (minimal for this task)
export interface Broker {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  is_active: boolean;
}
```

### Task 2: Credential Types Service

Create `src/services/credentialTypes.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { 
  CredentialType, 
  CredentialTypeFormData, 
  CredentialTypeWithStats,
  Broker 
} from '@/types/credential';

export async function getCredentialTypes(companyId: string): Promise<CredentialType[]> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(`
      *,
      broker:brokers(id, name)
    `)
    .eq('company_id', companyId)
    .order('scope')
    .order('category')
    .order('display_order');

  if (error) throw error;
  return data as CredentialType[];
}

export async function getCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .select(`
      *,
      broker:brokers(id, name)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function getCredentialTypeWithStats(id: string): Promise<CredentialTypeWithStats> {
  const credType = await getCredentialType(id);
  
  // Get counts based on category
  const table = credType.category === 'driver' ? 'driver_credentials' : 'vehicle_credentials';
  
  const { data: stats, error: statsError } = await supabase
    .from(table)
    .select('status')
    .eq('credential_type_id', id);

  if (statsError) throw statsError;

  const counts = {
    total_count: stats?.length ?? 0,
    approved_count: stats?.filter(s => s.status === 'approved').length ?? 0,
    pending_count: stats?.filter(s => s.status === 'pending_review').length ?? 0,
    rejected_count: stats?.filter(s => s.status === 'rejected').length ?? 0,
    expired_count: stats?.filter(s => s.status === 'expired').length ?? 0,
  };

  return { ...credType, ...counts };
}

export async function createCredentialType(
  companyId: string, 
  formData: CredentialTypeFormData,
  userId: string
): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .insert({
      company_id: companyId,
      name: formData.name,
      description: formData.description || null,
      category: formData.category,
      scope: formData.scope,
      broker_id: formData.scope === 'broker' ? formData.broker_id : null,
      employment_type: formData.employment_type,
      requirement: formData.requirement,
      vehicle_types: formData.category === 'vehicle' ? formData.vehicle_types : null,
      submission_type: formData.submission_type,
      form_schema: formData.form_schema,
      signature_document_url: formData.signature_document_url,
      expiration_type: formData.expiration_type,
      expiration_interval_days: formData.expiration_type === 'fixed_interval' 
        ? formData.expiration_interval_days 
        : null,
      expiration_warning_days: formData.expiration_warning_days,
      grace_period_days: formData.grace_period_days,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function updateCredentialType(
  id: string, 
  formData: Partial<CredentialTypeFormData>
): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function deactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function reactivateCredentialType(id: string): Promise<CredentialType> {
  const { data, error } = await supabase
    .from('credential_types')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as CredentialType;
}

export async function updateCredentialTypeOrder(
  companyId: string,
  orderedIds: string[]
): Promise<void> {
  // Update display_order for each credential type
  const updates = orderedIds.map((id, index) => 
    supabase
      .from('credential_types')
      .update({ display_order: index })
      .eq('id', id)
      .eq('company_id', companyId)
  );

  await Promise.all(updates);
}

// Brokers (minimal for credential type form)
export async function getBrokers(companyId: string): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('id, company_id, name, code, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data as Broker[];
}
```

### Task 3: Credential Types Hooks

Create `src/hooks/useCredentialTypes.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as credentialTypesService from '@/services/credentialTypes';
import type { CredentialTypeFormData } from '@/types/credential';
import { useAuth } from '@/contexts/AuthContext';

export function useCredentialTypes(companyId: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', companyId],
    queryFn: () => credentialTypesService.getCredentialTypes(companyId!),
    enabled: !!companyId,
  });
}

export function useCredentialType(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', 'detail', id],
    queryFn: () => credentialTypesService.getCredentialType(id!),
    enabled: !!id,
  });
}

export function useCredentialTypeWithStats(id: string | undefined) {
  return useQuery({
    queryKey: ['credential-types', 'detail', id, 'stats'],
    queryFn: () => credentialTypesService.getCredentialTypeWithStats(id!),
    enabled: !!id,
  });
}

export function useCreateCredentialType() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: CredentialTypeFormData }) =>
      credentialTypesService.createCredentialType(companyId, data, user!.id),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', companyId] });
    },
  });
}

export function useUpdateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CredentialTypeFormData> }) =>
      credentialTypesService.updateCredentialType(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
    },
  });
}

export function useDeactivateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.deactivateCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
    },
  });
}

export function useReactivateCredentialType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => credentialTypesService.reactivateCredentialType(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['credential-types', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['credential-types', 'detail', result.id] });
    },
  });
}

export function useBrokers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId],
    queryFn: () => credentialTypesService.getBrokers(companyId!),
    enabled: !!companyId,
  });
}
```

### Task 4: Credential Types List Page

Create `src/pages/admin/CredentialTypes.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCredentialTypes } from '@/hooks/useCredentialTypes';
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
import { 
  Plus, 
  Search, 
  FileText, 
  Camera, 
  PenTool, 
  ClipboardList,
  CheckCircle,
  Calendar,
  Users,
  Car,
} from 'lucide-react';
import type { CredentialType, CredentialCategory, CredentialScope } from '@/types/credential';
import CreateCredentialTypeModal from '@/components/features/admin/CreateCredentialTypeModal';

const submissionTypeIcons: Record<string, React.ElementType> = {
  document_upload: FileText,
  photo: Camera,
  signature: PenTool,
  form: ClipboardList,
  admin_verified: CheckCircle,
  date_entry: Calendar,
};

const submissionTypeLabels: Record<string, string> = {
  document_upload: 'Document Upload',
  photo: 'Photo',
  signature: 'E-Signature',
  form: 'Form',
  admin_verified: 'Admin Verified',
  date_entry: 'Date Entry',
};

const requirementColors: Record<string, string> = {
  required: 'bg-red-500/20 text-red-400 border-red-500/30',
  recommended: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  optional: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export default function CredentialTypes() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  
  const { data: credentialTypes, isLoading, error } = useCredentialTypes(companyId ?? undefined);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CredentialCategory | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<CredentialScope | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter and group credential types
  const filteredTypes = credentialTypes?.filter((ct) => {
    const matchesSearch = ct.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ct.category === categoryFilter;
    const matchesScope = scopeFilter === 'all' || ct.scope === scopeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? ct.is_active : !ct.is_active);
    return matchesSearch && matchesCategory && matchesScope && matchesStatus;
  });

  // Group by scope and category
  const groupedTypes = filteredTypes?.reduce((acc, ct) => {
    const scopeKey = ct.scope === 'global' 
      ? 'Global' 
      : `Broker: ${ct.broker?.name || 'Unknown'}`;
    const categoryKey = ct.category === 'driver' ? 'Driver' : 'Vehicle';
    const groupKey = `${scopeKey} - ${categoryKey} Credentials`;
    
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(ct);
    return acc;
  }, {} as Record<string, CredentialType[]>);

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading credential types: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Credential Types</h1>
          <p className="text-muted-foreground">Define requirements for drivers and vehicles</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Credential Type
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search credential types..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
            <SelectItem value="vehicle">Vehicle</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scopeFilter} onValueChange={(v) => setScopeFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Scope" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scopes</SelectItem>
            <SelectItem value="global">Global</SelectItem>
            <SelectItem value="broker">Broker</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Credential Types List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : Object.keys(groupedTypes ?? {}).length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No credential types found</h3>
          <p className="text-muted-foreground mb-4">
            {search || categoryFilter !== 'all' || scopeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by creating your first credential type'}
          </p>
          {!search && categoryFilter === 'all' && scopeFilter === 'all' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Credential Type
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTypes ?? {}).map(([groupName, types]) => (
            <div key={groupName}>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">{groupName}</h2>
              <div className="space-y-3">
                {types.map((ct) => (
                  <CredentialTypeCard
                    key={ct.id}
                    credentialType={ct}
                    onClick={() => navigate(`/admin/settings/credentials/${ct.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {companyId && (
        <CreateCredentialTypeModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </div>
  );
}

function CredentialTypeCard({ 
  credentialType, 
  onClick 
}: { 
  credentialType: CredentialType; 
  onClick: () => void;
}) {
  const Icon = submissionTypeIcons[credentialType.submission_type] || FileText;
  const CategoryIcon = credentialType.category === 'driver' ? Users : Car;

  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-colors ${
        !credentialType.is_active ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{credentialType.name}</h3>
                <Badge className={requirementColors[credentialType.requirement]}>
                  {credentialType.requirement}
                </Badge>
                {!credentialType.is_active && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Inactive
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <CategoryIcon className="w-3 h-3" />
                <span className="capitalize">{credentialType.category}</span>
                <span>•</span>
                <span>{submissionTypeLabels[credentialType.submission_type]}</span>
                <span>•</span>
                <span>
                  {credentialType.expiration_type === 'never' 
                    ? 'Never Expires' 
                    : credentialType.expiration_type === 'fixed_interval'
                    ? `${credentialType.expiration_interval_days} days`
                    : 'Driver Specifies'}
                </span>
              </div>
              {credentialType.employment_type !== 'both' && (
                <div className="text-xs text-muted-foreground mt-1">
                  {credentialType.employment_type === 'w2_only' ? 'W2 Only' : '1099 Only'}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 5: Create Credential Type Modal

Create `src/components/features/admin/CreateCredentialTypeModal.tsx`:

```tsx
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateCredentialType, useBrokers } from '@/hooks/useCredentialTypes';
import { useToast } from '@/hooks/use-toast';
import type { CredentialTypeFormData } from '@/types/credential';

const credentialTypeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category: z.enum(['driver', 'vehicle']),
  scope: z.enum(['global', 'broker']),
  broker_id: z.string().nullable(),
  employment_type: z.enum(['both', 'w2_only', '1099_only']),
  requirement: z.enum(['required', 'optional', 'recommended']),
  vehicle_types: z.array(z.string()),
  submission_type: z.enum([
    'document_upload', 'photo', 'signature', 'form', 'admin_verified', 'date_entry'
  ]),
  form_schema: z.record(z.unknown()).nullable(),
  signature_document_url: z.string().nullable(),
  expiration_type: z.enum(['never', 'fixed_interval', 'driver_specified']),
  expiration_interval_days: z.number().nullable(),
  expiration_warning_days: z.number().default(30),
  grace_period_days: z.number().default(30),
});

interface CreateCredentialTypeModalProps {
  companyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCredentialTypeModal({
  companyId,
  open,
  onOpenChange,
}: CreateCredentialTypeModalProps) {
  const { toast } = useToast();
  const createCredentialType = useCreateCredentialType();
  const { data: brokers } = useBrokers(companyId);
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<CredentialTypeFormData>({
    resolver: zodResolver(credentialTypeSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'driver',
      scope: 'global',
      broker_id: null,
      employment_type: 'both',
      requirement: 'required',
      vehicle_types: [],
      submission_type: 'document_upload',
      form_schema: null,
      signature_document_url: null,
      expiration_type: 'never',
      expiration_interval_days: null,
      expiration_warning_days: 30,
      grace_period_days: 30,
    },
  });

  const watchScope = form.watch('scope');
  const watchCategory = form.watch('category');
  const watchExpirationType = form.watch('expiration_type');

  async function onSubmit(data: CredentialTypeFormData) {
    try {
      await createCredentialType.mutateAsync({ companyId, data });
      toast({
        title: 'Credential type created',
        description: `${data.name} has been created successfully.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create credential type',
        variant: 'destructive',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Credential Type</DialogTitle>
          <DialogDescription>
            Define a new credential requirement for drivers or vehicles.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="submission">Submission</TabsTrigger>
              <TabsTrigger value="expiration">Expiration</TabsTrigger>
              <TabsTrigger value="requirements">Requirements</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" {...form.register('name')} placeholder="Background Check" />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description & Instructions</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Provide instructions for drivers..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <RadioGroup
                  value={form.watch('category')}
                  onValueChange={(v) => form.setValue('category', v as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver" id="cat-driver" />
                    <Label htmlFor="cat-driver">Driver Credential</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vehicle" id="cat-vehicle" />
                    <Label htmlFor="cat-vehicle">Vehicle Credential</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Scope *</Label>
                <RadioGroup
                  value={form.watch('scope')}
                  onValueChange={(v) => form.setValue('scope', v as any)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="global" id="scope-global" />
                    <Label htmlFor="scope-global">Global (Required for all)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="broker" id="scope-broker" />
                    <Label htmlFor="scope-broker">Broker-Specific</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchScope === 'broker' && (
                <div className="space-y-2">
                  <Label>Broker *</Label>
                  <Select
                    value={form.watch('broker_id') || ''}
                    onValueChange={(v) => form.setValue('broker_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select broker" />
                    </SelectTrigger>
                    <SelectContent>
                      {brokers?.map((broker) => (
                        <SelectItem key={broker.id} value={broker.id}>
                          {broker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* Submission Tab */}
            <TabsContent value="submission" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>How should this credential be submitted? *</Label>
                <RadioGroup
                  value={form.watch('submission_type')}
                  onValueChange={(v) => form.setValue('submission_type', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="document_upload" id="sub-doc" />
                    <div>
                      <Label htmlFor="sub-doc" className="font-medium">Document Upload</Label>
                      <p className="text-sm text-muted-foreground">Upload a PDF or image file</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="photo" id="sub-photo" />
                    <div>
                      <Label htmlFor="sub-photo" className="font-medium">Photo Capture</Label>
                      <p className="text-sm text-muted-foreground">Take or upload a photo</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="signature" id="sub-sig" />
                    <div>
                      <Label htmlFor="sub-sig" className="font-medium">E-Signature</Label>
                      <p className="text-sm text-muted-foreground">Sign a document electronically</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="date_entry" id="sub-date" />
                    <div>
                      <Label htmlFor="sub-date" className="font-medium">Date Entry</Label>
                      <p className="text-sm text-muted-foreground">Enter a date (e.g., last drug test)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="admin_verified" id="sub-admin" />
                    <div>
                      <Label htmlFor="sub-admin" className="font-medium">Admin Verified</Label>
                      <p className="text-sm text-muted-foreground">Admin manually marks as complete</p>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </TabsContent>

            {/* Expiration Tab */}
            <TabsContent value="expiration" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Does this credential expire? *</Label>
                <RadioGroup
                  value={form.watch('expiration_type')}
                  onValueChange={(v) => form.setValue('expiration_type', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="exp-never" />
                    <Label htmlFor="exp-never">Never expires (one-time completion)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed_interval" id="exp-fixed" />
                    <Label htmlFor="exp-fixed">Fixed interval (valid for set period)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="driver_specified" id="exp-driver" />
                    <Label htmlFor="exp-driver">Driver specifies expiration date</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchExpirationType === 'fixed_interval' && (
                <div className="space-y-2">
                  <Label>Valid for (days) *</Label>
                  <Input
                    type="number"
                    {...form.register('expiration_interval_days', { valueAsNumber: true })}
                    placeholder="365"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Warning threshold (days before expiration)</Label>
                <Input
                  type="number"
                  {...form.register('expiration_warning_days', { valueAsNumber: true })}
                  placeholder="30"
                />
              </div>
            </TabsContent>

            {/* Requirements Tab */}
            <TabsContent value="requirements" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Requirement Level *</Label>
                <RadioGroup
                  value={form.watch('requirement')}
                  onValueChange={(v) => form.setValue('requirement', v as any)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="required" id="req-required" />
                    <Label htmlFor="req-required">Required - Must be completed to be eligible</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recommended" id="req-recommended" />
                    <Label htmlFor="req-recommended">Recommended - Shows warning but doesn't block</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="optional" id="req-optional" />
                    <Label htmlFor="req-optional">Optional - Nice to have</Label>
                  </div>
                </RadioGroup>
              </div>

              {watchCategory === 'driver' && (
                <div className="space-y-2">
                  <Label>Employment Type *</Label>
                  <RadioGroup
                    value={form.watch('employment_type')}
                    onValueChange={(v) => form.setValue('employment_type', v as any)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="both" id="emp-both" />
                      <Label htmlFor="emp-both">Both W2 and 1099</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="w2_only" id="emp-w2" />
                      <Label htmlFor="emp-w2">W2 Only</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1099_only" id="emp-1099" />
                      <Label htmlFor="emp-1099">1099 Only</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label>Grace period for existing drivers (days)</Label>
                <Input
                  type="number"
                  {...form.register('grace_period_days', { valueAsNumber: true })}
                  placeholder="30"
                />
                <p className="text-sm text-muted-foreground">
                  When this credential is created, existing drivers have this many days to submit.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCredentialType.isPending}>
              {createCredentialType.isPending ? 'Creating...' : 'Create Credential Type'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 6: Add Route to App.tsx

Update `src/App.tsx` to add the credential types route:

```tsx
// Add import
import CredentialTypes from '@/pages/admin/CredentialTypes';

// Add route inside Admin routes section
<Route
  path="/admin/settings/credentials"
  element={
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminLayout>
        <CredentialTypes />
      </AdminLayout>
    </ProtectedRoute>
  }
/>
```

### Task 7: Add Navigation Link

Update the Admin navigation to include a link to Credential Types (in Settings or as a main nav item).

In `src/components/layouts/AdminLayout.tsx`, add to the navigation items:

```tsx
{ path: '/admin/settings/credentials', label: 'Credentials', icon: FileText },
```

## Output Summary

When complete, confirm:
1. ✅ `src/types/credential.ts` - Credential type definitions
2. ✅ `src/services/credentialTypes.ts` - CRUD operations
3. ✅ `src/hooks/useCredentialTypes.ts` - React Query hooks
4. ✅ `src/pages/admin/CredentialTypes.tsx` - List page with grouping
5. ✅ `src/components/features/admin/CreateCredentialTypeModal.tsx` - Multi-tab form
6. ✅ Route added in `src/App.tsx`
7. ✅ Navigation link added in AdminLayout

## Testing Notes

To test:
1. Apply migration `011_credential_types.sql` to Supabase
2. Log in as an Admin
3. Navigate to `/admin/settings/credentials`
4. Create a new credential type
5. Verify it appears in the list
6. Filter by category, scope, status

## DO NOT

- Implement credential type detail page (separate task)
- Implement form builder for form submission type (future)
- Implement signature document upload (future)
- Implement drag-to-reorder (future)
- Modify UI components in src/components/ui/
