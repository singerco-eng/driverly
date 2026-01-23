# TASK 007: Vehicle Assignment (AD-004)

## Context

Build the Vehicle Assignment feature for Admins. This allows assigning company vehicles to W2 drivers, managing temporary "borrowed" assignments, transferring vehicles between drivers, and tracking assignment history.

**Key Principle:** A vehicle can only be actively assigned to ONE driver at a time.

**Reference:** `docs/features/admin/AD-004-vehicle-assignment.md`

## Prerequisites

- Migration `013_vehicle_assignment.sql` applied to Supabase
- Driver Management (AD-002) complete
- Vehicle Management (AD-003) complete

## Your Tasks

### Task 1: Vehicle Assignment Types

Create `src/types/vehicleAssignment.ts`:

```typescript
export type AssignmentType = 'owned' | 'assigned' | 'borrowed';
export type AssignmentAction = 'assigned' | 'unassigned' | 'transferred' | 'primary_changed' | 'extended' | 'ended_early';

export interface VehicleAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  company_id: string;
  assignment_type: AssignmentType;
  is_primary: boolean;
  starts_at: string;
  ends_at: string | null;
  assigned_at: string;
  assigned_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
  end_reason: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  driver?: {
    id: string;
    employment_type: string;
    status: string;
    user: {
      full_name: string;
      email: string;
    };
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
    vehicle_type: string;
    status: string;
  };
}

export interface AssignmentHistory {
  id: string;
  vehicle_id: string;
  driver_id: string;
  company_id: string;
  assignment_type: string;
  is_primary: boolean;
  action: AssignmentAction;
  started_at: string | null;
  ended_at: string | null;
  performed_by: string | null;
  reason: string | null;
  notes: string | null;
  assignment_id: string | null;
  transferred_to_driver_id: string | null;
  created_at: string;
  // Joined
  driver?: {
    id: string;
    user: {
      full_name: string;
    };
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    license_plate: string;
  };
  performed_by_user?: {
    full_name: string;
  };
  transferred_to_driver?: {
    id: string;
    user: {
      full_name: string;
    };
  };
}

export interface AssignVehicleFormData {
  vehicle_id: string;
  driver_id: string;
  assignment_type: AssignmentType;
  is_primary: boolean;
  starts_at?: string;
  ends_at?: string; // Required for 'borrowed'
}

export interface TransferVehicleFormData {
  to_driver_id: string;
  reason: string;
  notes?: string;
  is_primary: boolean;
}

export interface UnassignVehicleFormData {
  reason: string;
  notes?: string;
}

export interface ExtendAssignmentFormData {
  new_ends_at: string;
  reason?: string;
}
```

### Task 2: Vehicle Assignment Service

Create `src/services/vehicleAssignments.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  VehicleAssignment,
  AssignmentHistory,
  AssignVehicleFormData,
  TransferVehicleFormData,
  UnassignVehicleFormData,
  ExtendAssignmentFormData,
} from '@/types/vehicleAssignment';

// ============ Get Assignments ============

export async function getDriverAssignments(driverId: string): Promise<VehicleAssignment[]> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(`
      *,
      vehicle:vehicles(id, make, model, year, license_plate, vehicle_type, status)
    `)
    .eq('driver_id', driverId)
    .is('ended_at', null)
    .order('is_primary', { ascending: false });

  if (error) throw error;
  return data as VehicleAssignment[];
}

export async function getVehicleAssignment(vehicleId: string): Promise<VehicleAssignment | null> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(`
      *,
      driver:drivers(
        id,
        employment_type,
        status,
        user:users(full_name, email)
      )
    `)
    .eq('vehicle_id', vehicleId)
    .is('ended_at', null)
    .maybeSingle();

  if (error) throw error;
  return data as VehicleAssignment | null;
}

export async function getAvailableVehicles(companyId: string): Promise<any[]> {
  // Get all company vehicles
  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      current_assignment:driver_vehicle_assignments(
        id,
        driver_id,
        assignment_type,
        driver:drivers(
          id,
          user:users(full_name)
        )
      )
    `)
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('make');

  if (error) throw error;

  // Filter to show vehicles without active assignment first
  return vehicles?.map((v) => ({
    ...v,
    current_assignment: v.current_assignment?.find((a: any) => !a.ended_at) || null,
  })) || [];
}

export async function getAvailableDrivers(companyId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users(full_name, email),
      assignments:driver_vehicle_assignments(
        id,
        vehicle_id,
        is_primary,
        assignment_type
      )
    `)
    .eq('company_id', companyId)
    .in('status', ['active', 'inactive'])
    .order('created_at');

  if (error) throw error;

  // Filter to active assignments only
  return data?.map((d) => ({
    ...d,
    active_assignments: d.assignments?.filter((a: any) => !a.ended_at) || [],
  })) || [];
}

// ============ Assign Vehicle ============

export async function assignVehicle(
  formData: AssignVehicleFormData,
  companyId: string,
  userId: string
): Promise<VehicleAssignment> {
  // Check if vehicle currently assigned
  const existingAssignment = await getVehicleAssignment(formData.vehicle_id);

  if (existingAssignment && existingAssignment.driver_id !== formData.driver_id) {
    // Transfer - end current assignment first
    await endAssignment(existingAssignment.id, userId, `Transferred to another driver`);

    // Log transfer history
    await logAssignmentHistory({
      vehicle_id: formData.vehicle_id,
      driver_id: existingAssignment.driver_id,
      company_id: companyId,
      assignment_type: existingAssignment.assignment_type,
      is_primary: existingAssignment.is_primary,
      action: 'transferred',
      started_at: existingAssignment.starts_at,
      ended_at: new Date().toISOString(),
      performed_by: userId,
      reason: 'Transferred to another driver',
      transferred_to_driver_id: formData.driver_id,
    });
  }

  // If setting as primary, unset other primaries for this driver
  if (formData.is_primary) {
    await supabase
      .from('driver_vehicle_assignments')
      .update({ is_primary: false })
      .eq('driver_id', formData.driver_id)
      .is('ended_at', null);
  }

  // Create new assignment
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .insert({
      driver_id: formData.driver_id,
      vehicle_id: formData.vehicle_id,
      company_id: companyId,
      assignment_type: formData.assignment_type,
      is_primary: formData.is_primary,
      starts_at: formData.starts_at || new Date().toISOString(),
      ends_at: formData.ends_at || null,
      assigned_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  // Log history
  await logAssignmentHistory({
    vehicle_id: formData.vehicle_id,
    driver_id: formData.driver_id,
    company_id: companyId,
    assignment_type: formData.assignment_type,
    is_primary: formData.is_primary,
    action: 'assigned',
    started_at: formData.starts_at || new Date().toISOString(),
    performed_by: userId,
    assignment_id: data.id,
  });

  return data as VehicleAssignment;
}

// ============ Transfer Vehicle ============

export async function transferVehicle(
  assignmentId: string,
  formData: TransferVehicleFormData,
  companyId: string,
  userId: string
): Promise<VehicleAssignment> {
  // Get current assignment
  const { data: current, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  // End current assignment
  await endAssignment(assignmentId, userId, formData.reason);

  // Log transfer history for old driver
  await logAssignmentHistory({
    vehicle_id: current.vehicle_id,
    driver_id: current.driver_id,
    company_id: companyId,
    assignment_type: current.assignment_type,
    is_primary: current.is_primary,
    action: 'transferred',
    started_at: current.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason: formData.reason,
    notes: formData.notes,
    transferred_to_driver_id: formData.to_driver_id,
  });

  // Create new assignment for new driver
  return assignVehicle(
    {
      vehicle_id: current.vehicle_id,
      driver_id: formData.to_driver_id,
      assignment_type: 'assigned',
      is_primary: formData.is_primary,
    },
    companyId,
    userId
  );
}

// ============ Unassign Vehicle ============

export async function unassignVehicle(
  assignmentId: string,
  formData: UnassignVehicleFormData,
  userId: string
): Promise<void> {
  // Get assignment details
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  // End the assignment
  await endAssignment(assignmentId, userId, formData.reason);

  // Log history
  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'unassigned',
    started_at: assignment.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason: formData.reason,
    notes: formData.notes,
    assignment_id: assignmentId,
  });

  // If was primary, try to set another as primary
  if (assignment.is_primary) {
    const { data: other } = await supabase
      .from('driver_vehicle_assignments')
      .select('id')
      .eq('driver_id', assignment.driver_id)
      .is('ended_at', null)
      .neq('id', assignmentId)
      .limit(1)
      .single();

    if (other) {
      await supabase
        .from('driver_vehicle_assignments')
        .update({ is_primary: true })
        .eq('id', other.id);
    }
  }
}

// ============ Borrowed Assignment Actions ============

export async function extendAssignment(
  assignmentId: string,
  formData: ExtendAssignmentFormData,
  userId: string
): Promise<VehicleAssignment> {
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .update({ ends_at: formData.new_ends_at })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  // Log history
  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'extended',
    started_at: assignment.starts_at,
    ended_at: formData.new_ends_at,
    performed_by: userId,
    reason: formData.reason,
    assignment_id: assignmentId,
  });

  return data as VehicleAssignment;
}

export async function endAssignmentEarly(
  assignmentId: string,
  reason: string,
  userId: string
): Promise<void> {
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  await endAssignment(assignmentId, userId, reason);

  // Log history
  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'ended_early',
    started_at: assignment.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason,
    assignment_id: assignmentId,
  });
}

// ============ Set Primary ============

export async function setPrimaryVehicle(
  assignmentId: string,
  driverId: string,
  userId: string
): Promise<void> {
  // Unset all primaries for this driver
  await supabase
    .from('driver_vehicle_assignments')
    .update({ is_primary: false })
    .eq('driver_id', driverId)
    .is('ended_at', null);

  // Set this one as primary
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .update({ is_primary: true })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  // Log history
  await logAssignmentHistory({
    vehicle_id: data.vehicle_id,
    driver_id: driverId,
    company_id: data.company_id,
    assignment_type: data.assignment_type,
    is_primary: true,
    action: 'primary_changed',
    performed_by: userId,
    assignment_id: assignmentId,
  });
}

// ============ History ============

export async function getVehicleAssignmentHistory(vehicleId: string): Promise<AssignmentHistory[]> {
  const { data, error } = await supabase
    .from('vehicle_assignment_history')
    .select(`
      *,
      driver:drivers(id, user:users(full_name)),
      performed_by_user:users!vehicle_assignment_history_performed_by_fkey(full_name),
      transferred_to_driver:drivers!vehicle_assignment_history_transferred_to_driver_id_fkey(id, user:users(full_name))
    `)
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AssignmentHistory[];
}

export async function getDriverAssignmentHistory(driverId: string): Promise<AssignmentHistory[]> {
  const { data, error } = await supabase
    .from('vehicle_assignment_history')
    .select(`
      *,
      vehicle:vehicles(id, make, model, year, license_plate),
      performed_by_user:users!vehicle_assignment_history_performed_by_fkey(full_name)
    `)
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AssignmentHistory[];
}

// ============ Helpers ============

async function endAssignment(assignmentId: string, userId: string, reason: string) {
  const { error } = await supabase
    .from('driver_vehicle_assignments')
    .update({
      ended_at: new Date().toISOString(),
      ended_by: userId,
      end_reason: reason,
    })
    .eq('id', assignmentId);

  if (error) throw error;
}

async function logAssignmentHistory(data: Partial<AssignmentHistory>) {
  const { error } = await supabase.from('vehicle_assignment_history').insert(data);
  if (error) console.error('Failed to log assignment history:', error);
}
```

### Task 3: Vehicle Assignment Hooks

Create `src/hooks/useVehicleAssignments.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as assignmentService from '@/services/vehicleAssignments';
import type {
  AssignVehicleFormData,
  TransferVehicleFormData,
  UnassignVehicleFormData,
  ExtendAssignmentFormData,
} from '@/types/vehicleAssignment';
import { useAuth } from '@/contexts/AuthContext';

export function useDriverAssignments(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-assignments', driverId],
    queryFn: () => assignmentService.getDriverAssignments(driverId!),
    enabled: !!driverId,
  });
}

export function useVehicleAssignment(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['vehicle-assignment', vehicleId],
    queryFn: () => assignmentService.getVehicleAssignment(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useAvailableVehicles(companyId: string | undefined) {
  return useQuery({
    queryKey: ['available-vehicles', companyId],
    queryFn: () => assignmentService.getAvailableVehicles(companyId!),
    enabled: !!companyId,
  });
}

export function useAvailableDrivers(companyId: string | undefined) {
  return useQuery({
    queryKey: ['available-drivers', companyId],
    queryFn: () => assignmentService.getAvailableDrivers(companyId!),
    enabled: !!companyId,
  });
}

export function useAssignVehicle() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: (formData: AssignVehicleFormData) =>
      assignmentService.assignVehicle(formData, profile!.company_id!, user!.id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments', variables.driver_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment', variables.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useTransferVehicle() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: TransferVehicleFormData }) =>
      assignmentService.transferVehicle(assignmentId, data, profile!.company_id!, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useUnassignVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: UnassignVehicleFormData }) =>
      assignmentService.unassignVehicle(assignmentId, data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['available-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useExtendAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, data }: { assignmentId: string; data: ExtendAssignmentFormData }) =>
      assignmentService.extendAssignment(assignmentId, data, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useEndAssignmentEarly() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      assignmentService.endAssignmentEarly(assignmentId, reason, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-assignment'] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useSetPrimaryVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ assignmentId, driverId }: { assignmentId: string; driverId: string }) =>
      assignmentService.setPrimaryVehicle(assignmentId, driverId, user!.id),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-assignments', driverId] });
      queryClient.invalidateQueries({ queryKey: ['assignment-history'] });
    },
  });
}

export function useVehicleAssignmentHistory(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-history', 'vehicle', vehicleId],
    queryFn: () => assignmentService.getVehicleAssignmentHistory(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useDriverAssignmentHistory(driverId: string | undefined) {
  return useQuery({
    queryKey: ['assignment-history', 'driver', driverId],
    queryFn: () => assignmentService.getDriverAssignmentHistory(driverId!),
    enabled: !!driverId,
  });
}
```

### Task 4: Assign Vehicle Modal (from Driver)

Create `src/components/features/admin/AssignVehicleToDriverModal.tsx`:

```tsx
// Modal triggered from Driver detail -> Vehicles tab
// - Select from available company vehicles
// - Shows if vehicle is currently assigned (transfer warning)
// - Assignment type: Assigned / Borrowed
// - If Borrowed: date range picker for ends_at
// - Checkbox for is_primary
// Uses: Dialog, RadioGroup, DatePicker, Checkbox, Button
```

### Task 5: Assign Driver Modal (from Vehicle)

Create `src/components/features/admin/AssignDriverToVehicleModal.tsx`:

```tsx
// Modal triggered from Vehicle detail -> Assignments tab
// - Select from available drivers
// - Groups by employment type (W2 first)
// - Shows current vehicle count per driver
// - Assignment type: Assigned / Borrowed
// - Checkbox for is_primary
```

### Task 6: Transfer Vehicle Modal

Create `src/components/features/admin/TransferVehicleModal.tsx`:

```tsx
// Modal triggered from vehicle's current assignment
// Props: assignmentId, vehicleId, currentDriverId, currentDriverName
// - Select new driver
// - Reason dropdown: Driver reassignment, Route optimization, Driver request, Other
// - Notes textarea
// - Checkbox for is_primary for new driver
// - Warning if source driver will have no vehicle
```

### Task 7: Unassign Vehicle Modal

Create `src/components/features/admin/UnassignVehicleModal.tsx`:

```tsx
// Modal triggered from driver's vehicle or vehicle's assignment
// Props: assignmentId, vehicleName, driverName, isOnlyVehicle
// - Reason dropdown: Vehicle needs maintenance, Driver no longer needs, Driver terminated, Reassigning, Other
// - Notes textarea
// - Warning if driver's only/primary vehicle
```

### Task 8: Borrowed Assignment Modals

Create `src/components/features/admin/ExtendAssignmentModal.tsx`:

```tsx
// Modal for extending borrowed assignment end date
// Props: assignmentId, currentEndDate, vehicleName
// - New end date picker (must be after current)
// - Reason textarea
```

Create `src/components/features/admin/EndAssignmentEarlyModal.tsx`:

```tsx
// Modal for ending borrowed assignment before scheduled end
// Props: assignmentId, scheduledEndDate, vehicleName
// - Shows: ending today vs original end date
// - Reason textarea
```

### Task 9: Driver Vehicles Tab Component

Create `src/components/features/admin/DriverVehiclesTab.tsx`:

```tsx
// Component for driver detail page Vehicles tab
// Shows:
// - Current assignments list with cards
//   - Vehicle photo placeholder, name, type, plate
//   - Assignment type badge (ASSIGNED, BORROWED, OWNED)
//   - PRIMARY badge if applicable
//   - Dates (assigned date, ends date for borrowed)
//   - Actions: Set Primary, Unassign, Extend/End Early for borrowed
// - Empty state for W2 with no vehicle
// - Assignment history (recent 5, "View All" link)
// - "+ Assign Vehicle" button
```

### Task 10: Vehicle Assignments Tab Component

Create `src/components/features/admin/VehicleAssignmentsTab.tsx`:

```tsx
// Component for vehicle detail page Assignments tab
// Shows:
// - Current assignment card (if any)
//   - Driver avatar, name, employment type
//   - Assignment type, PRIMARY badge
//   - Since date
//   - Actions: Transfer, Unassign
// - Empty state if unassigned
// - Assignment history (chronological)
// - "+ Assign to Driver" button
```

### Task 11: Assignment History Component

Create `src/components/features/admin/AssignmentHistoryList.tsx`:

```tsx
// Reusable component for showing assignment history
// Props: history: AssignmentHistory[], mode: 'vehicle' | 'driver'
// - Chronological cards with:
//   - Date range
//   - Action badge (ASSIGNED, UNASSIGNED, TRANSFERRED, etc.)
//   - Driver name (for vehicle mode) or Vehicle name (for driver mode)
//   - PRIMARY indicator if applicable
//   - Performed by + reason if available
//   - "Ended: reason" for ended assignments
```

### Task 12: Integration with Existing Pages

Update `src/pages/admin/DriverDetail.tsx` (or create if not exists):
- Add Vehicles tab using `DriverVehiclesTab` component

Update `src/pages/admin/VehicleDetail.tsx` (or create if not exists):
- Add Assignments tab using `VehicleAssignmentsTab` component

## Output Summary

When complete, confirm:
1. ✅ `src/types/vehicleAssignment.ts` - Types
2. ✅ `src/services/vehicleAssignments.ts` - Full assignment logic
3. ✅ `src/hooks/useVehicleAssignments.ts` - React Query hooks
4. ✅ `src/components/features/admin/AssignVehicleToDriverModal.tsx`
5. ✅ `src/components/features/admin/AssignDriverToVehicleModal.tsx`
6. ✅ `src/components/features/admin/TransferVehicleModal.tsx`
7. ✅ `src/components/features/admin/UnassignVehicleModal.tsx`
8. ✅ `src/components/features/admin/ExtendAssignmentModal.tsx`
9. ✅ `src/components/features/admin/EndAssignmentEarlyModal.tsx`
10. ✅ `src/components/features/admin/DriverVehiclesTab.tsx`
11. ✅ `src/components/features/admin/VehicleAssignmentsTab.tsx`
12. ✅ `src/components/features/admin/AssignmentHistoryList.tsx`
13. ✅ Driver detail page updated with Vehicles tab
14. ✅ Vehicle detail page updated with Assignments tab

## Testing Notes

To test:
1. Apply migration `013_vehicle_assignment.sql`
2. Log in as Admin
3. Go to `/admin/drivers/[id]` → Vehicles tab
4. Assign a company vehicle
5. Try transfer to another driver
6. Test borrowed assignment with date range
7. View assignment history on vehicle detail

## DO NOT

- Modify the `driver_vehicle_assignments` table schema beyond what's in migration
- Implement driver self-assignment (admin only feature)
- Add credential validation to assignments
- Modify core UI components in `src/components/ui/`
