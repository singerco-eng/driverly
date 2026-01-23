# TASK 011: Driver Vehicle Management (DR-003)

## Context

Build the Driver Vehicle Management feature - a **dual-mode interface** where drivers view and manage their vehicles. **1099 drivers** have full control (add, edit, retire). **W2 drivers** can only view assigned company vehicles and update photos.

**Key Principle:** 1099 drivers own their vehicles. W2 drivers use company vehicles assigned by admins.

**Reference:** `docs/features/driver/DR-003-vehicle-management.md`

## Prerequisites

- Migration `017_driver_vehicle_management.sql` applied to Supabase
- Driver Layout and authentication complete
- Vehicle types exist (`src/types/vehicle.ts`)
- Vehicle service exists (`src/services/vehicles.ts`)
- Driver has approved application and can access portal

## Your Tasks

### Task 1: Driver Vehicle Types

Create `src/types/driverVehicle.ts`:

```typescript
import type { Vehicle, VehicleType } from './vehicle';

export interface DriverVehicle extends Vehicle {
  assignment?: {
    id: string;
    is_primary: boolean;
    assignment_type: 'owned' | 'assigned' | 'borrowed';
    starts_at: string;
    ends_at: string | null;
  };
}

export interface DriverVehicleWithStatus extends DriverVehicle {
  credentialStatus: 'valid' | 'expiring' | 'expired' | 'missing';
  credentialSummary: string;
  eligibleBrokers: string[];
  ineligibleBrokers: { name: string; reason: string }[];
}

export interface VehicleCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  percentage: number;
}

export interface AddVehicleWizardData {
  // Step 1: Basic Info
  make: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: VehicleType;
  
  // Step 2: Identification
  license_plate: string;
  license_state: string;
  vin: string;
  
  // Step 3: Capacity
  seat_capacity: number;
  wheelchair_capacity: number;
  stretcher_capacity: number;
  
  // Step 4: Photos
  exterior_photo_url: string | null;
  interior_photo_url: string | null;
  wheelchair_lift_photo_url: string | null;
}

export type WizardStep = 'basic' | 'identification' | 'capacity' | 'photos';

export interface SetInactiveData {
  reason: 'maintenance' | 'repairs' | 'personal_use' | 'other';
  details?: string;
}

export interface RetireVehicleData {
  reason: 'sold' | 'totaled' | 'no_longer_using' | 'other';
}
```

### Task 2: Driver Vehicle Service

Create `src/services/driverVehicles.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { 
  DriverVehicle, 
  AddVehicleWizardData,
  SetInactiveData,
  RetireVehicleData 
} from '@/types/driverVehicle';

// ============ FETCH FUNCTIONS ============

/**
 * Get all vehicles for a 1099 driver (owned)
 */
export async function getOwnedVehicles(driverId: string): Promise<DriverVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      assignment:driver_vehicle_assignments!vehicle_id(
        id, is_primary, assignment_type, starts_at, ends_at
      )
    `)
    .eq('owner_driver_id', driverId)
    .neq('status', 'retired')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data.map(v => ({
    ...v,
    assignment: v.assignment?.find((a: any) => a.ends_at === null) || null
  }));
}

/**
 * Get all assigned vehicles for a W2 driver
 */
export async function getAssignedVehicles(driverId: string): Promise<DriverVehicle[]> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(`
      id, is_primary, assignment_type, starts_at, ends_at,
      vehicle:vehicles(*)
    `)
    .eq('driver_id', driverId)
    .is('ended_at', null)
    .order('is_primary', { ascending: false });

  if (error) throw error;

  return data.map(a => ({
    ...a.vehicle,
    assignment: {
      id: a.id,
      is_primary: a.is_primary,
      assignment_type: a.assignment_type,
      starts_at: a.starts_at,
      ends_at: a.ends_at
    }
  }));
}

/**
 * Get single vehicle by ID (for detail page)
 */
export async function getDriverVehicle(vehicleId: string): Promise<DriverVehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      assignment:driver_vehicle_assignments!vehicle_id(
        id, is_primary, assignment_type, starts_at, ends_at, driver_id
      )
    `)
    .eq('id', vehicleId)
    .single();

  if (error) throw error;
  return data;
}

// ============ CREATE (1099 ONLY) ============

export async function createVehicle(
  driverId: string,
  companyId: string,
  data: AddVehicleWizardData
): Promise<DriverVehicle> {
  // Create vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      company_id: companyId,
      owner_driver_id: driverId,
      ownership: 'driver',
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vehicle_type: data.vehicle_type,
      license_plate: data.license_plate,
      license_state: data.license_state,
      vin: data.vin,
      seat_capacity: data.seat_capacity,
      wheelchair_capacity: data.wheelchair_capacity || 0,
      stretcher_capacity: data.stretcher_capacity || 0,
      exterior_photo_url: data.exterior_photo_url,
      interior_photo_url: data.interior_photo_url,
      wheelchair_lift_photo_url: data.wheelchair_lift_photo_url,
      status: 'active',
    })
    .select()
    .single();

  if (vehicleError) throw vehicleError;

  // Create self-assignment (1099 driver owns the vehicle)
  const { error: assignError } = await supabase
    .from('driver_vehicle_assignments')
    .insert({
      driver_id: driverId,
      vehicle_id: vehicle.id,
      company_id: companyId,
      assignment_type: 'owned',
      starts_at: new Date().toISOString(),
    });

  if (assignError) throw assignError;

  return vehicle;
}

// ============ UPDATE ============

export async function updateVehicle(
  vehicleId: string,
  data: Partial<AddVehicleWizardData>
): Promise<DriverVehicle> {
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .update({
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vehicle_type: data.vehicle_type,
      license_plate: data.license_plate,
      license_state: data.license_state,
      vin: data.vin,
      seat_capacity: data.seat_capacity,
      wheelchair_capacity: data.wheelchair_capacity,
      stretcher_capacity: data.stretcher_capacity,
      exterior_photo_url: data.exterior_photo_url,
      interior_photo_url: data.interior_photo_url,
      wheelchair_lift_photo_url: data.wheelchair_lift_photo_url,
    })
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;
  return vehicle;
}

/**
 * W2 drivers can only update photos
 */
export async function updateVehiclePhotos(
  vehicleId: string,
  photos: {
    exterior_photo_url?: string | null;
    interior_photo_url?: string | null;
    wheelchair_lift_photo_url?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update(photos)
    .eq('id', vehicleId);

  if (error) throw error;
}

// ============ STATUS MANAGEMENT ============

export async function setVehicleActive(vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({
      status: 'active',
      status_reason: null,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}

export async function setVehicleInactive(
  vehicleId: string,
  data: SetInactiveData
): Promise<void> {
  const reasonText = data.reason === 'other' 
    ? data.details 
    : `${data.reason}${data.details ? `: ${data.details}` : ''}`;

  const { error } = await supabase
    .from('vehicles')
    .update({
      status: 'inactive',
      status_reason: reasonText,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}

export async function retireVehicle(
  vehicleId: string,
  driverId: string,
  data: RetireVehicleData
): Promise<void> {
  // Update vehicle status
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({
      status: 'retired',
      status_reason: data.reason,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (vehicleError) throw vehicleError;

  // End the assignment
  const { error: assignError } = await supabase
    .from('driver_vehicle_assignments')
    .update({
      ended_at: new Date().toISOString(),
      end_reason: `Vehicle retired: ${data.reason}`,
    })
    .eq('vehicle_id', vehicleId)
    .eq('driver_id', driverId)
    .is('ended_at', null);

  if (assignError) throw assignError;
}

// ============ PRIMARY VEHICLE ============

export async function setPrimaryVehicle(
  driverId: string,
  vehicleId: string
): Promise<void> {
  const { error } = await supabase.rpc('set_primary_vehicle', {
    p_driver_id: driverId,
    p_vehicle_id: vehicleId,
  });

  if (error) throw error;
}

// ============ PHOTO UPLOAD ============

export async function uploadVehiclePhoto(
  vehicleId: string,
  file: File,
  photoType: 'exterior' | 'interior' | 'lift'
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${vehicleId}/${photoType}.${ext}`;

  const { error } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('vehicle-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}
```

### Task 3: Driver Vehicle Hooks

Create `src/hooks/useDriverVehicles.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as driverVehicleService from '@/services/driverVehicles';
import type { AddVehicleWizardData, SetInactiveData, RetireVehicleData } from '@/types/driverVehicle';
import { useToast } from '@/hooks/use-toast';

export function useOwnedVehicles(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicles', 'owned', driverId],
    queryFn: () => driverVehicleService.getOwnedVehicles(driverId!),
    enabled: !!driverId,
  });
}

export function useAssignedVehicles(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicles', 'assigned', driverId],
    queryFn: () => driverVehicleService.getAssignedVehicles(driverId!),
    enabled: !!driverId,
  });
}

export function useDriverVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ['driver-vehicle', vehicleId],
    queryFn: () => driverVehicleService.getDriverVehicle(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { driverId: string; companyId: string; data: AddVehicleWizardData }) =>
      driverVehicleService.createVehicle(params.driverId, params.companyId, params.data),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles', 'owned', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Vehicle added successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add vehicle', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; data: Partial<AddVehicleWizardData> }) =>
      driverVehicleService.updateVehicle(params.vehicleId, params.data),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-vehicle', vehicle.id] });
      toast({ title: 'Vehicle updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVehiclePhotos() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { 
      vehicleId: string; 
      photos: { 
        exterior_photo_url?: string | null;
        interior_photo_url?: string | null;
        wheelchair_lift_photo_url?: string | null;
      } 
    }) => driverVehicleService.updateVehiclePhotos(params.vehicleId, params.photos),
    onSuccess: (_, { vehicleId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver-vehicle', vehicleId] });
      toast({ title: 'Photos updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useSetVehicleActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (vehicleId: string) => driverVehicleService.setVehicleActive(vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle set to active' });
    },
  });
}

export function useSetVehicleInactive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; data: SetInactiveData }) =>
      driverVehicleService.setVehicleInactive(params.vehicleId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle set to inactive' });
    },
  });
}

export function useRetireVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { vehicleId: string; driverId: string; data: RetireVehicleData }) =>
      driverVehicleService.retireVehicle(params.vehicleId, params.driverId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Vehicle retired' });
    },
  });
}

export function useSetPrimaryVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { driverId: string; vehicleId: string }) =>
      driverVehicleService.setPrimaryVehicle(params.driverId, params.vehicleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-vehicles'] });
      toast({ title: 'Primary vehicle updated' });
    },
  });
}

export function useUploadVehiclePhoto() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { 
      vehicleId: string; 
      file: File; 
      photoType: 'exterior' | 'interior' | 'lift' 
    }) => driverVehicleService.uploadVehiclePhoto(params.vehicleId, params.file, params.photoType),
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}
```

### Task 4: Vehicle List Page

Replace `src/pages/driver/Vehicles.tsx`:

```tsx
// Vehicle list page with dual behavior based on employment type
// Route: /driver/vehicles
//
// 1099 Driver View:
// - Shows all owned vehicles
// - [+ Add] button to add new vehicle
// - Card/table toggle via EnhancedDataView
// - Each card shows: photo, make/model/year, type, plate, primary badge, status
// - Shows completion status and credential status
// - Shows broker eligibility count
// - 3-dot menu: Set Primary, Edit, Set Active/Inactive, Retire
//
// W2 Driver View:
// - Shows assigned company vehicles
// - No add button
// - Each card shows: photo, name, type, plate, assignment dates
// - Shows credential status and broker eligibility
// - View Details link only (no edit menu)
// - Info message: "Company vehicles are managed by your administrator"
//
// Components:
// - EnhancedDataView for card/table toggle
// - VehicleCard component for each vehicle
// - EmptyState if no vehicles
// - Loading skeleton while fetching

// Determine view based on driver.employment_type from useDriverProfile()
// Use useOwnedVehicles() for 1099, useAssignedVehicles() for W2
```

### Task 5: Vehicle Card Component

Create `src/components/features/driver/VehicleCard.tsx`:

```tsx
// Reusable vehicle card for list view
// Props: vehicle, driver (for employment type), onAction
//
// Layout:
// ┌─────────────────────────────────────────┐
// │ [PHOTO]  Year Make Model    ★ Primary   │
// │          Type • Plate       ● Status    │
// │          ──────────────────────────     │
// │          ✓ Complete                     │
// │          ✓ All credentials valid        │
// │          ──────────────────────────     │
// │          Eligible: 2 brokers    [•••]   │
// └─────────────────────────────────────────┘
//
// Features:
// - Photo with placeholder if missing
// - Primary badge (★) for primary vehicle
// - Status badge (Active=green, Inactive=gray with reason)
// - Completion status (✓ Complete or ⚠ Incomplete with missing)
// - Credential summary
// - Broker eligibility count
// - 3-dot dropdown menu (1099 only) or View Details link (W2)
//
// Uses: Card, Badge, Avatar, DropdownMenu
```

### Task 6: Add Vehicle Wizard

Create `src/components/features/driver/AddVehicleWizard.tsx`:

```tsx
// Multi-step wizard for 1099 drivers to add a vehicle
// Props: open, onOpenChange, driverId, companyId, onSuccess
//
// Steps:
// 1. Basic Info: make, model, year, color, vehicle_type (radio)
// 2. Identification: license_plate, license_state (dropdown), vin
// 3. Capacity: seat_capacity, wheelchair_capacity (if type), stretcher_capacity (if type)
// 4. Photos: exterior (required), interior (optional), lift (if wheelchair)
//
// Features:
// - Progress indicator showing current step
// - Back/Next navigation
// - Form validation per step
// - Camera-first photo capture on mobile
// - Photo preview with retake option
// - Final "Add Vehicle" button
//
// State: useReducer for wizard data, step tracking
// Validation: zod schema per step
// 
// On success: calls onSuccess, closes wizard, invalidates queries
```

### Task 7: Vehicle Detail Page

Create `src/pages/driver/VehicleDetail.tsx`:

```tsx
// Vehicle detail page
// Route: /driver/vehicles/:id
//
// 1099 View:
// - Large exterior photo
// - Vehicle name (Year Make Model) with primary badge and status
// - [Edit Vehicle] button and 3-dot menu
// - Vehicle Information section (all fields)
// - Photos section (thumbnails, click to enlarge)
// - Credentials section (summary with link to credentials page)
// - Broker Eligibility section (list with eligibility status per broker)
//
// W2 View:
// - Same layout but read-only
// - [Update Photos] button instead of Edit
// - No 3-dot menu
// - Info message about admin changes
//
// Components:
// - Card for each section
// - ImageLightbox for photo viewing
// - Badge for status
// - Credential status list
// - Broker eligibility list
```

### Task 8: Edit Vehicle Modal

Create `src/components/features/driver/EditVehicleModal.tsx`:

```tsx
// Modal for 1099 drivers to edit vehicle (all fields)
// Props: open, onOpenChange, vehicle
//
// Layout: Tabs for Basic Info, Identification, Capacity, Photos
// 
// Each tab matches wizard step fields
// Warning when changing vehicle_type: "Changing type may affect credential requirements"
//
// Features:
// - Pre-populated from vehicle data
// - Photo replace with camera/upload
// - Save Changes button
// - Form validation
//
// Uses: Dialog, Tabs, Input, Select, file upload
```

### Task 9: Update Photos Modal (W2)

Create `src/components/features/driver/UpdatePhotosModal.tsx`:

```tsx
// Modal for W2 drivers to update only photos
// Props: open, onOpenChange, vehicle
//
// Shows:
// - Vehicle name header
// - Exterior photo with Replace button
// - Interior photo with Replace button
// - Lift photo with Replace button (if wheelchair_van)
//
// Each photo slot:
// - Current photo preview
// - [Camera] [Upload] buttons to replace
//
// Uses: Dialog, photo upload component
```

### Task 10: Set Inactive Modal

Create `src/components/features/driver/SetInactiveModal.tsx`:

```tsx
// Modal for setting vehicle inactive
// Props: open, onOpenChange, vehicle
//
// Form:
// - Reason dropdown: Maintenance, Repairs needed, Personal use, Other
// - Details textarea (optional)
//
// Message: "Vehicle will not be available for trips while inactive"
//
// Buttons: Cancel, Set Inactive
```

### Task 11: Retire Vehicle Modal

Create `src/components/features/driver/RetireVehicleModal.tsx`:

```tsx
// Confirmation modal for retiring a vehicle
// Props: open, onOpenChange, vehicle, driverId
//
// Content:
// - Warning about permanent action
// - Vehicle name
// - Bullet points explaining what happens
// - Reason dropdown: Sold, Totaled/Damaged, No longer using, Other
//
// Buttons: Cancel, Retire Vehicle (destructive)
```

### Task 12: Vehicle Completion Helper

Create `src/lib/vehicleCompletion.ts`:

```typescript
import type { Vehicle, VehicleType } from '@/types/vehicle';

interface VehicleCompletionResult {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
}

const REQUIRED_FIELDS: { key: keyof Vehicle; label: string; vehicleTypes?: VehicleType[] }[] = [
  { key: 'make', label: 'Make' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year' },
  { key: 'color', label: 'Color' },
  { key: 'license_plate', label: 'License Plate' },
  { key: 'license_state', label: 'License State' },
  { key: 'vin', label: 'VIN' },
  { key: 'exterior_photo_url', label: 'Exterior Photo' },
  { key: 'wheelchair_lift_photo_url', label: 'Wheelchair Lift Photo', vehicleTypes: ['wheelchair_van'] },
];

export function calculateVehicleCompletion(vehicle: Vehicle): VehicleCompletionResult {
  const applicableFields = REQUIRED_FIELDS.filter(
    f => !f.vehicleTypes || f.vehicleTypes.includes(vehicle.vehicle_type)
  );
  
  const missingFields: string[] = [];
  
  for (const field of applicableFields) {
    const value = vehicle[field.key];
    if (value === null || value === undefined || value === '') {
      missingFields.push(field.label);
    }
  }
  
  const percentage = Math.round(
    ((applicableFields.length - missingFields.length) / applicableFields.length) * 100
  );
  
  return {
    isComplete: missingFields.length === 0,
    percentage,
    missingFields,
  };
}
```

### Task 13: Update App Routes

Update `src/App.tsx`:

```tsx
// Replace placeholder for vehicle routes:

import DriverVehicles from '@/pages/driver/Vehicles';
import DriverVehicleDetail from '@/pages/driver/VehicleDetail';

// In driver routes:
<Route path="vehicles" element={<DriverVehicles />} />
<Route path="vehicles/:id" element={<DriverVehicleDetail />} />
```

## Output Summary

When complete, confirm:
1. ✅ Migration `017_driver_vehicle_management.sql` applied
2. ✅ `src/types/driverVehicle.ts` - Types for driver vehicle management
3. ✅ `src/services/driverVehicles.ts` - Service functions
4. ✅ `src/hooks/useDriverVehicles.ts` - React Query hooks
5. ✅ `src/pages/driver/Vehicles.tsx` - Vehicle list page (1099/W2 dual mode)
6. ✅ `src/components/features/driver/VehicleCard.tsx` - Reusable card component
7. ✅ `src/components/features/driver/AddVehicleWizard.tsx` - Multi-step add wizard
8. ✅ `src/pages/driver/VehicleDetail.tsx` - Vehicle detail page
9. ✅ `src/components/features/driver/EditVehicleModal.tsx` - Edit vehicle (1099)
10. ✅ `src/components/features/driver/UpdatePhotosModal.tsx` - Update photos (W2)
11. ✅ `src/components/features/driver/SetInactiveModal.tsx`
12. ✅ `src/components/features/driver/RetireVehicleModal.tsx`
13. ✅ `src/lib/vehicleCompletion.ts` - Completion calculator
14. ✅ Routes updated in App.tsx

## Testing Notes

To test:
1. Apply migration `017_driver_vehicle_management.sql`
2. Log in as a 1099 driver:
   - See vehicle list with [+ Add] button
   - Add a new vehicle via wizard
   - Edit vehicle, set inactive, retire
   - Set primary vehicle
3. Log in as a W2 driver:
   - See assigned company vehicles (read-only)
   - No add button
   - Can only update photos
4. Test vehicle completion calculation
5. Test photo upload/camera capture

## UI/UX Guidelines

Follow Design System:
- Use `EnhancedDataView` for list with card/table toggle
- Use `Dialog` for all modals
- Use `Card` for vehicle cards and detail sections
- Use `Badge` for status indicators
- Use `DropdownMenu` for 3-dot menu
- Primary badge: ★ with accent color
- Status badges: Active (green), Inactive (gray), Retired (muted)
- Photo placeholders with car icon
- Mobile-first responsive design

## Business Rules

1. **1099 full control** - Can add, edit, status change, retire own vehicles
2. **W2 photos only** - Can only update photos on assigned vehicles
3. **Auto-primary** - First vehicle auto-set as primary
4. **One primary** - Must always have exactly one primary vehicle
5. **Completion required** - Incomplete vehicles shown with warnings
6. **Retire is permanent** - Cannot un-retire a vehicle
7. **Wheelchair lift required** - wheelchair_van requires lift photo

## DO NOT

- Allow W2 drivers to add/edit/retire vehicles
- Allow changing ownership after creation
- Allow deleting vehicles (use retire instead)
- Show SSN or sensitive data on vehicle pages
- Skip photo validation for required photos
- Modify core UI components in `src/components/ui/`
