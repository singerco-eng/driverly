# TASK 006: Broker Management (AD-007)

## Context

Build the Broker Management feature for Admins. Brokers are external organizations that contract NEMT trips. This feature allows admins to create brokers, assign drivers, and manage rates.

**Reference:** `docs/features/admin/AD-007-broker-management.md`

## Prerequisites

- Migration `012_broker_management.sql` applied to Supabase
- Admin Layout and authentication complete
- Driver Management (AD-002) complete
- Credential Types (AD-005) complete

## Your Tasks

### Task 1: Broker Types

Create `src/types/broker.ts`:

```typescript
export type BrokerStatus = 'active' | 'inactive';
export type AssignmentStatus = 'pending' | 'assigned' | 'removed';
export type RequestedBy = 'admin' | 'driver';
export type VehicleType = 'sedan' | 'suv' | 'minivan' | 'wheelchair_van' | 'stretcher_van';

export interface Broker {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  website: string | null;
  contract_number: string | null;
  notes: string | null;
  service_states: string[];
  accepted_vehicle_types: VehicleType[];
  accepted_employment_types: ('w2' | '1099')[];
  status: BrokerStatus;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface BrokerFormData {
  name: string;
  code: string;
  logo_url: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
  website: string;
  contract_number: string;
  notes: string;
  service_states: string[];
  accepted_vehicle_types: VehicleType[];
  accepted_employment_types: ('w2' | '1099')[];
}

export interface BrokerWithStats extends Broker {
  assigned_count: number;
  eligible_count: number;
  pending_count: number;
  credential_count: number;
}

export interface DriverBrokerAssignment {
  id: string;
  driver_id: string;
  broker_id: string;
  company_id: string;
  status: AssignmentStatus;
  requested_by: RequestedBy;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  removed_by: string | null;
  removed_at: string | null;
  removal_reason: string | null;
  created_at: string;
  // Joined
  driver?: {
    id: string;
    user: {
      full_name: string;
      email: string;
    };
    employment_type: string;
    status: string;
    state: string;
  };
  broker?: Broker;
}

export interface BrokerRate {
  id: string;
  broker_id: string;
  company_id: string;
  vehicle_type: VehicleType;
  base_rate: number;
  per_mile_rate: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
}

export interface BrokerRateFormData {
  vehicle_type: VehicleType;
  base_rate: number;
  per_mile_rate: number;
}

export interface UpdateRatesFormData {
  effective_from: string;
  rates: BrokerRateFormData[];
}
```

### Task 2: Broker Service

Create `src/services/brokers.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  Broker,
  BrokerFormData,
  BrokerWithStats,
  DriverBrokerAssignment,
  BrokerRate,
  UpdateRatesFormData,
} from '@/types/broker';

export async function getBrokers(companyId: string): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return data as Broker[];
}

export async function getBrokersWithStats(companyId: string): Promise<BrokerWithStats[]> {
  const brokers = await getBrokers(companyId);
  
  // Get assignment counts per broker
  const { data: assignments } = await supabase
    .from('driver_broker_assignments')
    .select('broker_id, status')
    .eq('company_id', companyId);

  // Get credential counts per broker
  const { data: credentials } = await supabase
    .from('credential_types')
    .select('broker_id')
    .eq('company_id', companyId)
    .eq('scope', 'broker');

  return brokers.map((broker) => {
    const brokerAssignments = assignments?.filter((a) => a.broker_id === broker.id) || [];
    const brokerCredentials = credentials?.filter((c) => c.broker_id === broker.id) || [];

    return {
      ...broker,
      assigned_count: brokerAssignments.filter((a) => a.status === 'assigned').length,
      pending_count: brokerAssignments.filter((a) => a.status === 'pending').length,
      eligible_count: 0, // Calculate separately if needed
      credential_count: brokerCredentials.length,
    };
  });
}

export async function getBroker(id: string): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Broker;
}

export async function createBroker(
  companyId: string,
  formData: BrokerFormData,
  userId: string
): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .insert({
      company_id: companyId,
      name: formData.name,
      code: formData.code || null,
      logo_url: formData.logo_url,
      contact_name: formData.contact_name || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      website: formData.website || null,
      contract_number: formData.contract_number || null,
      notes: formData.notes || null,
      service_states: formData.service_states,
      accepted_vehicle_types: formData.accepted_vehicle_types,
      accepted_employment_types: formData.accepted_employment_types,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

export async function updateBroker(
  id: string,
  formData: Partial<BrokerFormData>
): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

export async function updateBrokerStatus(
  id: string,
  status: 'active' | 'inactive'
): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

// ============ Driver Assignments ============

export async function getBrokerAssignments(
  brokerId: string
): Promise<DriverBrokerAssignment[]> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .select(`
      *,
      driver:drivers(
        id,
        employment_type,
        status,
        state,
        user:users(full_name, email)
      )
    `)
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DriverBrokerAssignment[];
}

export async function assignDriverToBroker(
  driverId: string,
  brokerId: string,
  companyId: string,
  requestedBy: 'admin' | 'driver',
  userId: string
): Promise<DriverBrokerAssignment> {
  const status = requestedBy === 'admin' ? 'assigned' : 'pending';
  
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: companyId,
      status,
      requested_by: requestedBy,
      approved_by: requestedBy === 'admin' ? userId : null,
      approved_at: requestedBy === 'admin' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function approveAssignment(
  assignmentId: string,
  userId: string
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'assigned',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function denyAssignment(
  assignmentId: string,
  userId: string,
  reason?: string
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'removed',
      removed_by: userId,
      removed_at: new Date().toISOString(),
      removal_reason: reason || 'Request denied',
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function removeDriverFromBroker(
  assignmentId: string,
  userId: string,
  reason?: string
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'removed',
      removed_by: userId,
      removed_at: new Date().toISOString(),
      removal_reason: reason || 'Removed by admin',
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

// ============ Broker Rates ============

export async function getBrokerRates(brokerId: string): Promise<BrokerRate[]> {
  const { data, error } = await supabase
    .from('broker_rates')
    .select('*')
    .eq('broker_id', brokerId)
    .order('effective_from', { ascending: false });

  if (error) throw error;
  return data as BrokerRate[];
}

export async function getCurrentBrokerRates(brokerId: string): Promise<BrokerRate[]> {
  const { data, error } = await supabase
    .from('broker_rates')
    .select('*')
    .eq('broker_id', brokerId)
    .is('effective_to', null)
    .order('vehicle_type');

  if (error) throw error;
  return data as BrokerRate[];
}

export async function updateBrokerRates(
  brokerId: string,
  companyId: string,
  formData: UpdateRatesFormData,
  userId: string
): Promise<void> {
  const effectiveFrom = new Date(formData.effective_from);
  const dayBefore = new Date(effectiveFrom.getTime() - 86400000);

  // Close out current rates
  await supabase
    .from('broker_rates')
    .update({ effective_to: dayBefore.toISOString().split('T')[0] })
    .eq('broker_id', brokerId)
    .is('effective_to', null);

  // Insert new rates
  const newRates = formData.rates.map((rate) => ({
    broker_id: brokerId,
    company_id: companyId,
    vehicle_type: rate.vehicle_type,
    base_rate: rate.base_rate,
    per_mile_rate: rate.per_mile_rate,
    effective_from: formData.effective_from,
    created_by: userId,
  }));

  const { error } = await supabase.from('broker_rates').insert(newRates);
  if (error) throw error;
}
```

### Task 3: Broker Hooks

Create `src/hooks/useBrokers.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as brokersService from '@/services/brokers';
import type { BrokerFormData, UpdateRatesFormData } from '@/types/broker';
import { useAuth } from '@/contexts/AuthContext';

export function useBrokers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId],
    queryFn: () => brokersService.getBrokers(companyId!),
    enabled: !!companyId,
  });
}

export function useBrokersWithStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', companyId, 'stats'],
    queryFn: () => brokersService.getBrokersWithStats(companyId!),
    enabled: !!companyId,
  });
}

export function useBroker(id: string | undefined) {
  return useQuery({
    queryKey: ['brokers', 'detail', id],
    queryFn: () => brokersService.getBroker(id!),
    enabled: !!id,
  });
}

export function useCreateBroker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: BrokerFormData }) =>
      brokersService.createBroker(companyId, data, user!.id),
    onSuccess: (_, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', companyId] });
    },
  });
}

export function useUpdateBroker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BrokerFormData> }) =>
      brokersService.updateBroker(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['brokers', 'detail', result.id] });
    },
  });
}

export function useUpdateBrokerStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      brokersService.updateBrokerStatus(id, status),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.company_id] });
      queryClient.invalidateQueries({ queryKey: ['brokers', 'detail', result.id] });
    },
  });
}

// Assignments
export function useBrokerAssignments(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'assignments'],
    queryFn: () => brokersService.getBrokerAssignments(brokerId!),
    enabled: !!brokerId,
  });
}

export function useAssignDriverToBroker() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, brokerId }: { driverId: string; brokerId: string }) =>
      brokersService.assignDriverToBroker(
        driverId,
        brokerId,
        profile!.company_id!,
        'admin',
        user!.id
      ),
    onSuccess: (_, { brokerId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', brokerId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useApproveAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (assignmentId: string) =>
      brokersService.approveAssignment(assignmentId, user!.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useDenyAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      brokersService.denyAssignment(assignmentId, user!.id, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

export function useRemoveDriverFromBroker() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason?: string }) =>
      brokersService.removeDriverFromBroker(assignmentId, user!.id, reason),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', result.broker_id, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['brokers'] });
    },
  });
}

// Rates
export function useBrokerRates(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'rates'],
    queryFn: () => brokersService.getBrokerRates(brokerId!),
    enabled: !!brokerId,
  });
}

export function useCurrentBrokerRates(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['brokers', brokerId, 'rates', 'current'],
    queryFn: () => brokersService.getCurrentBrokerRates(brokerId!),
    enabled: !!brokerId,
  });
}

export function useUpdateBrokerRates() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ brokerId, data }: { brokerId: string; data: UpdateRatesFormData }) =>
      brokersService.updateBrokerRates(brokerId, profile!.company_id!, data, user!.id),
    onSuccess: (_, { brokerId }) => {
      queryClient.invalidateQueries({ queryKey: ['brokers', brokerId, 'rates'] });
    },
  });
}
```

### Task 4: Broker List Page

Create `src/pages/admin/Brokers.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBrokersWithStats } from '@/hooks/useBrokers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Building2, Users, FileCheck, MapPin } from 'lucide-react';
import type { BrokerWithStats, BrokerStatus } from '@/types/broker';
import CreateBrokerModal from '@/components/features/admin/CreateBrokerModal';

export default function Brokers() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const { data: brokers, isLoading, error } = useBrokersWithStats(companyId ?? undefined);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BrokerStatus | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredBrokers = brokers?.filter((broker) => {
    const matchesSearch =
      broker.name.toLowerCase().includes(search.toLowerCase()) ||
      broker.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      broker.contact_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || broker.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (error) {
    return (
      <div className="p-8">
        <div className="text-destructive">Error loading brokers: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Brokers</h1>
          <p className="text-muted-foreground">Manage broker relationships and driver assignments</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Broker
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search brokers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
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

      {/* Broker List */}
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
      ) : filteredBrokers?.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No brokers found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? 'Try adjusting your search' : 'Get started by adding your first broker'}
          </p>
          {!search && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Broker
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBrokers?.map((broker) => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              onClick={() => navigate(`/admin/brokers/${broker.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {companyId && (
        <CreateBrokerModal
          companyId={companyId}
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      )}
    </div>
  );
}

function BrokerCard({
  broker,
  onClick,
}: {
  broker: BrokerWithStats;
  onClick: () => void;
}) {
  return (
    <Card
      className={`cursor-pointer hover:border-primary/50 transition-colors ${
        broker.status === 'inactive' ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {broker.logo_url ? (
                <img src={broker.logo_url} alt={broker.name} className="w-10 h-10 object-contain" />
              ) : (
                <Building2 className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{broker.name}</h3>
                <Badge
                  variant={broker.status === 'active' ? 'default' : 'outline'}
                  className={broker.status === 'active' ? 'bg-green-500/20 text-green-400' : ''}
                >
                  {broker.status === 'active' ? '● Active' : '○ Inactive'}
                </Badge>
              </div>
              {(broker.contact_email || broker.contact_phone) && (
                <p className="text-sm text-muted-foreground">
                  {broker.contact_email}
                  {broker.contact_email && broker.contact_phone && ' • '}
                  {broker.contact_phone}
                </p>
              )}
              {broker.service_states.length > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" />
                  <span>Service Area: {broker.service_states.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{broker.assigned_count} Drivers Assigned</span>
            {broker.pending_count > 0 && (
              <Badge variant="outline" className="ml-1">
                {broker.pending_count} pending
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <FileCheck className="w-4 h-4 text-muted-foreground" />
            <span>{broker.credential_count} Required Credentials</span>
          </div>
          <div className="text-muted-foreground">
            Vehicles: {broker.accepted_vehicle_types.length === 5
              ? 'All Types'
              : broker.accepted_vehicle_types.map((v) => v.replace('_', ' ')).join(', ')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Task 5: Create Broker Modal

Create `src/components/features/admin/CreateBrokerModal.tsx` with a multi-tab form:

- **Basic Info Tab**: Name, logo, contact info, address, notes
- **Service Area Tab**: State checkboxes
- **Requirements Tab**: Vehicle types, employment types
- **Rates Tab**: Base rate + per-mile for each vehicle type

(Implementation similar to CreateCredentialTypeModal - use Tabs, RadioGroup, Checkbox components)

### Task 6: Broker Detail Page

Create `src/pages/admin/BrokerDetail.tsx`:

- Header with broker info and status badge
- Tabs: Overview, Drivers, Credentials, Rates
- **Overview Tab**: Stats cards, contact info, requirements summary
- **Drivers Tab**: List of assigned/pending drivers with actions
- **Credentials Tab**: Broker-specific credential types (link to AD-005)
- **Rates Tab**: Current rates + rate history

### Task 7: Assign Drivers Modal

Create `src/components/features/admin/AssignDriversModal.tsx`:

- List available drivers (not yet assigned)
- Show eligibility status per driver
- Multi-select with bulk assign

### Task 8: Update Routes

In `src/App.tsx`, add:

```tsx
import Brokers from '@/pages/admin/Brokers';
import BrokerDetail from '@/pages/admin/BrokerDetail';

// Inside admin routes
<Route path="brokers" element={<Brokers />} />
<Route path="brokers/:id" element={<BrokerDetail />} />
```

### Task 9: Add Navigation Link

In `src/components/layouts/AdminLayout.tsx`, add:

```tsx
{ path: '/admin/brokers', label: 'Brokers', icon: Building2 },
```

## Output Summary

When complete, confirm:
1. ✅ `src/types/broker.ts` - Broker type definitions
2. ✅ `src/services/brokers.ts` - Full CRUD + assignments + rates
3. ✅ `src/hooks/useBrokers.ts` - React Query hooks
4. ✅ `src/pages/admin/Brokers.tsx` - List page with stats
5. ✅ `src/components/features/admin/CreateBrokerModal.tsx` - Multi-tab form
6. ✅ `src/pages/admin/BrokerDetail.tsx` - Detail page with tabs
7. ✅ `src/components/features/admin/AssignDriversModal.tsx` - Bulk assign
8. ✅ Routes added in `src/App.tsx`
9. ✅ Navigation link in AdminLayout

## Testing Notes

To test:
1. Apply migration `012_broker_management.sql` to Supabase
2. Log in as an Admin
3. Navigate to `/admin/brokers`
4. Create a broker with service states and rates
5. View broker detail, assign drivers
6. Test approval/removal flow

## DO NOT

- Implement full eligibility calculation (future enhancement)
- Implement driver portal broker views (Phase 5)
- Modify UI components in src/components/ui/
- Add logo upload functionality (just URL input for now)
