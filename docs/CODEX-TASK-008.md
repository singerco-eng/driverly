# TASK 008: Driver Onboarding (DR-001)

## Context

Build the Driver Onboarding experience - a **post-approval, self-service, checklist-driven** flow that guides new drivers through completing their profile, credentials, vehicle setup, and other requirements to become "active" and eligible for trips.

**Key Principle:** Drivers can explore the portal freely while seeing clear indicators of incomplete items. No forced wizard - just helpful guidance.

**Reference:** `docs/features/driver/DR-001-onboarding.md`

## Prerequisites

- Migration `014_driver_onboarding.sql` applied to Supabase
- Driver Layout (`DriverLayout.tsx`) exists
- Driver Applications (AD-001) complete (provides approved drivers)

## Your Tasks

### Task 1: Onboarding Types

Create `src/types/onboarding.ts`:

```typescript
export type OnboardingItemKey = 
  | 'profile_complete'
  | 'vehicle_added'
  | 'vehicle_complete'
  | 'global_credentials'
  | 'availability_set'
  | 'payment_info'
  | 'broker_requested'
  | 'broker_credentials'
  | 'profile_photo';

export type OnboardingCategory = 'setup' | 'credentials' | 'schedule' | 'payment' | 'brokers';

export interface OnboardingItem {
  key: OnboardingItemKey;
  label: string;
  description: string;
  required: boolean;
  category: OnboardingCategory;
  forEmploymentType?: 'w2' | '1099';
  route: string;  // Route to navigate to complete this item
}

export interface OnboardingItemStatus extends OnboardingItem {
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
  missingInfo?: string[];  // What's missing for incomplete items
}

export interface OnboardingStatus {
  items: OnboardingItemStatus[];
  progress: number;  // 0-100 percentage
  isComplete: boolean;
  canActivate: boolean;
  blockers: string[];  // Labels of items blocking activation
}

export interface DriverAvailability {
  id: string;
  driver_id: string;
  company_id: string;
  day_of_week: number;  // 0 = Sunday
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DriverPaymentInfo {
  id: string;
  driver_id: string;
  company_id: string;
  payment_method: 'direct_deposit' | 'check' | 'paycard';
  bank_name: string | null;
  account_type: 'checking' | 'savings' | null;
  routing_number_last4: string | null;
  account_number_last4: string | null;
  check_address_line1: string | null;
  check_address_line2: string | null;
  check_city: string | null;
  check_state: string | null;
  check_zip: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInfoFormData {
  payment_method: 'direct_deposit' | 'check' | 'paycard';
  bank_name?: string;
  account_type?: 'checking' | 'savings';
  routing_number?: string;  // Full for input, last4 stored
  account_number?: string;  // Full for input, last4 stored
  check_address_line1?: string;
  check_address_line2?: string;
  check_city?: string;
  check_state?: string;
  check_zip?: string;
}
```

### Task 2: Onboarding Constants

Create `src/lib/onboarding-items.ts`:

```typescript
import type { OnboardingItem } from '@/types/onboarding';

export const ONBOARDING_ITEMS: OnboardingItem[] = [
  // Required for "active" status
  {
    key: 'profile_complete',
    label: 'Complete Your Profile',
    description: 'Verify your personal information',
    required: true,
    category: 'setup',
    route: '/driver/profile',
  },
  {
    key: 'vehicle_added',
    label: 'Add a Vehicle',
    description: 'Add vehicle details and photos',
    required: true,
    category: 'setup',
    forEmploymentType: '1099',
    route: '/driver/vehicles',
  },
  {
    key: 'vehicle_complete',
    label: 'Complete Vehicle Information',
    description: 'Add VIN, photos, and documentation',
    required: true,
    category: 'setup',
    forEmploymentType: '1099',
    route: '/driver/vehicles',
  },
  {
    key: 'global_credentials',
    label: 'Submit Required Credentials',
    description: 'Upload required documents',
    required: true,
    category: 'credentials',
    route: '/driver/credentials',
  },
  {
    key: 'availability_set',
    label: 'Set Your Availability',
    description: 'Tell us when you can drive',
    required: true,
    category: 'schedule',
    route: '/driver/availability',
  },
  {
    key: 'payment_info',
    label: 'Add Payment Information',
    description: 'Set up how to receive payments',
    required: true,
    category: 'payment',
    route: '/driver/settings/payment',
  },

  // Optional / Recommended
  {
    key: 'broker_requested',
    label: 'Request Broker Assignment',
    description: 'Expand your trip opportunities',
    required: false,
    category: 'brokers',
    route: '/driver/brokers',
  },
  {
    key: 'broker_credentials',
    label: 'Complete Broker Credentials',
    description: 'Submit broker-specific documents',
    required: false,
    category: 'credentials',
    route: '/driver/credentials',
  },
  {
    key: 'profile_photo',
    label: 'Add Profile Photo',
    description: 'Add a professional photo',
    required: false,
    category: 'setup',
    route: '/driver/profile',
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  setup: 'Setup',
  credentials: 'Credentials',
  schedule: 'Schedule & Payment',
  payment: 'Schedule & Payment',
  brokers: 'Brokers',
};
```

### Task 3: Onboarding Service

Create `src/services/onboarding.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_ITEMS } from '@/lib/onboarding-items';
import type { 
  OnboardingStatus, 
  OnboardingItemStatus,
  DriverAvailability,
  DriverPaymentInfo,
  PaymentInfoFormData,
} from '@/types/onboarding';

export async function getOnboardingStatus(driverId: string): Promise<OnboardingStatus> {
  // Get driver info
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (driverError) throw driverError;

  // Get saved progress
  const { data: progress } = await supabase
    .from('driver_onboarding_progress')
    .select('*')
    .eq('driver_id', driverId);

  // Get vehicle count (for 1099)
  const { count: vehicleCount } = await supabase
    .from('driver_vehicle_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .is('ended_at', null);

  // Get credential status
  const { data: credentials } = await supabase
    .from('driver_credentials')
    .select('*')
    .eq('driver_id', driverId);

  const { data: requiredCredentials } = await supabase
    .from('credential_types')
    .select('id')
    .eq('company_id', driver.company_id)
    .eq('category', 'driver')
    .eq('scope', 'global')
    .eq('requirement', 'required')
    .eq('is_active', true);

  const approvedCredentials = credentials?.filter(c => c.status === 'approved') || [];
  const requiredCount = requiredCredentials?.length || 0;
  const approvedCount = approvedCredentials.length;

  // Build item statuses
  const items: OnboardingItemStatus[] = ONBOARDING_ITEMS
    .filter(item => {
      if (item.forEmploymentType && item.forEmploymentType !== driver.employment_type) {
        return false;
      }
      return true;
    })
    .map(item => {
      const saved = progress?.find(p => p.item_key === item.key);
      let completed = false;
      let missingInfo: string[] = [];

      switch (item.key) {
        case 'profile_complete':
          completed = isProfileComplete(driver);
          if (!completed) missingInfo = getMissingProfileFields(driver);
          break;
        case 'vehicle_added':
          completed = (vehicleCount || 0) > 0;
          if (!completed) missingInfo = ['Add at least one vehicle'];
          break;
        case 'vehicle_complete':
          completed = (vehicleCount || 0) > 0; // Simplified - would check VIN, photos
          break;
        case 'global_credentials':
          completed = approvedCount >= requiredCount && requiredCount > 0;
          if (!completed) missingInfo = [`${requiredCount - approvedCount} credentials remaining`];
          break;
        case 'availability_set':
          completed = driver.has_availability;
          if (!completed) missingInfo = ['Set your weekly availability'];
          break;
        case 'payment_info':
          completed = driver.has_payment_info;
          if (!completed) missingInfo = ['Add payment information'];
          break;
        default:
          completed = saved?.completed || false;
      }

      return {
        ...item,
        completed,
        completedAt: saved?.completed_at || null,
        skipped: saved?.skipped || false,
        missingInfo,
      };
    });

  const requiredItems = items.filter(i => i.required);
  const completedRequired = requiredItems.filter(i => i.completed);
  const progress_pct = requiredItems.length > 0 
    ? Math.round((completedRequired.length / requiredItems.length) * 100)
    : 100;

  return {
    items,
    progress: progress_pct,
    isComplete: completedRequired.length === requiredItems.length,
    canActivate: completedRequired.length === requiredItems.length,
    blockers: requiredItems.filter(i => !i.completed).map(i => i.label),
  };
}

function isProfileComplete(driver: any): boolean {
  return !!(
    driver.date_of_birth &&
    driver.address_line1 &&
    driver.city &&
    driver.state &&
    driver.zip &&
    driver.license_number &&
    driver.license_state &&
    driver.license_expiration &&
    driver.emergency_contact_name &&
    driver.emergency_contact_phone
  );
}

function getMissingProfileFields(driver: any): string[] {
  const missing: string[] = [];
  if (!driver.date_of_birth) missing.push('Date of birth');
  if (!driver.address_line1) missing.push('Address');
  if (!driver.license_number) missing.push('License number');
  if (!driver.emergency_contact_name) missing.push('Emergency contact');
  return missing;
}

export async function dismissWelcomeModal(driverId: string, dontShowAgain: boolean): Promise<void> {
  if (dontShowAgain) {
    const { error } = await supabase
      .from('drivers')
      .update({ welcome_modal_dismissed: true })
      .eq('id', driverId);
    if (error) throw error;
  }
}

export async function toggleDriverActive(
  driverId: string, 
  active: boolean, 
  reason?: string
): Promise<void> {
  if (active) {
    const status = await getOnboardingStatus(driverId);
    if (!status.canActivate) {
      throw new Error(`Cannot activate: ${status.blockers.join(', ')}`);
    }
  }

  const { error } = await supabase
    .from('drivers')
    .update({
      status: active ? 'active' : 'inactive',
      status_reason: active ? null : reason,
      status_changed_at: new Date().toISOString(),
      onboarding_completed_at: active ? new Date().toISOString() : undefined,
    })
    .eq('id', driverId);

  if (error) throw error;
}

// ============ Availability ============

export async function getDriverAvailability(driverId: string): Promise<DriverAvailability[]> {
  const { data, error } = await supabase
    .from('driver_availability')
    .select('*')
    .eq('driver_id', driverId)
    .order('day_of_week');

  if (error) throw error;
  return data as DriverAvailability[];
}

export async function saveDriverAvailability(
  driverId: string,
  companyId: string,
  availability: Omit<DriverAvailability, 'id' | 'driver_id' | 'company_id' | 'created_at' | 'updated_at'>[]
): Promise<void> {
  // Delete existing
  await supabase.from('driver_availability').delete().eq('driver_id', driverId);

  // Insert new
  if (availability.length > 0) {
    const rows = availability.map(a => ({
      ...a,
      driver_id: driverId,
      company_id: companyId,
    }));

    const { error } = await supabase.from('driver_availability').insert(rows);
    if (error) throw error;
  }
}

// ============ Payment Info ============

export async function getDriverPaymentInfo(driverId: string): Promise<DriverPaymentInfo | null> {
  const { data, error } = await supabase
    .from('driver_payment_info')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) throw error;
  return data as DriverPaymentInfo | null;
}

export async function saveDriverPaymentInfo(
  driverId: string,
  companyId: string,
  formData: PaymentInfoFormData
): Promise<DriverPaymentInfo> {
  const payload = {
    driver_id: driverId,
    company_id: companyId,
    payment_method: formData.payment_method,
    bank_name: formData.bank_name || null,
    account_type: formData.account_type || null,
    routing_number_last4: formData.routing_number?.slice(-4) || null,
    account_number_last4: formData.account_number?.slice(-4) || null,
    check_address_line1: formData.check_address_line1 || null,
    check_address_line2: formData.check_address_line2 || null,
    check_city: formData.check_city || null,
    check_state: formData.check_state || null,
    check_zip: formData.check_zip || null,
  };

  const { data, error } = await supabase
    .from('driver_payment_info')
    .upsert(payload, { onConflict: 'driver_id' })
    .select()
    .single();

  if (error) throw error;
  return data as DriverPaymentInfo;
}
```

### Task 4: Onboarding Hooks

Create `src/hooks/useOnboarding.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as onboardingService from '@/services/onboarding';
import type { PaymentInfoFormData } from '@/types/onboarding';
import { useAuth } from '@/contexts/AuthContext';

export function useOnboardingStatus(driverId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-status', driverId],
    queryFn: () => onboardingService.getOnboardingStatus(driverId!),
    enabled: !!driverId,
    refetchInterval: 30000, // Refresh every 30s to catch updates
  });
}

export function useDismissWelcomeModal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverId, dontShowAgain }: { driverId: string; dontShowAgain: boolean }) =>
      onboardingService.dismissWelcomeModal(driverId, dontShowAgain),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}

export function useToggleDriverActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ driverId, active, reason }: { driverId: string; active: boolean; reason?: string }) =>
      onboardingService.toggleDriverActive(driverId, active, reason),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
    },
  });
}

export function useDriverAvailability(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-availability', driverId],
    queryFn: () => onboardingService.getDriverAvailability(driverId!),
    enabled: !!driverId,
  });
}

export function useSaveDriverAvailability() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, availability }: { driverId: string; availability: any[] }) =>
      onboardingService.saveDriverAvailability(driverId, profile!.company_id!, availability),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-availability', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}

export function useDriverPaymentInfo(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver-payment-info', driverId],
    queryFn: () => onboardingService.getDriverPaymentInfo(driverId!),
    enabled: !!driverId,
  });
}

export function useSaveDriverPaymentInfo() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ driverId, formData }: { driverId: string; formData: PaymentInfoFormData }) =>
      onboardingService.saveDriverPaymentInfo(driverId, profile!.company_id!, formData),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: ['driver-payment-info', driverId] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
    },
  });
}
```

### Task 5: Welcome Modal

Create `src/components/features/driver/WelcomeModal.tsx`:

```tsx
// Modal shown on first login after approval
// Props: open, onOpenChange, driverId, companyName
// Content:
// - "Welcome to [Company Name]! 🎉"
// - List of 4 steps: Profile, Vehicle, Credentials, Availability/Payment
// - Checkbox: "Don't show this again"
// - Buttons: "Skip for Now", "Get Started"
// Uses: Dialog, Checkbox, Button
// "Get Started" navigates to first incomplete item
```

### Task 6: Getting Started Checklist

Create `src/components/features/driver/GettingStartedChecklist.tsx`:

```tsx
// Component for dashboard showing onboarding progress
// Props: onboardingStatus: OnboardingStatus
// Shows:
// - Progress bar with percentage
// - Items grouped by category
// - Each item shows: icon (✓, ⚠, ○), label, description/missing info, action button
// - Action buttons link to item.route
// Uses: Card, Progress, Badge, Button
// State icons:
// - ✓ green check = complete
// - ⚠ yellow warning = in progress (has missing info)
// - ○ gray circle = not started
```

### Task 7: Status Toggle Component

Create `src/components/features/driver/DriverStatusToggle.tsx`:

```tsx
// Component for toggling driver active/inactive status
// Props: driverId, currentStatus, canActivate, blockers
// Shows:
// - Current status with indicator (● Active or ○ Inactive)
// - Toggle switch or button
// - If can't activate and user tries, show blockers modal
// Uses: Switch, Card, Dialog (for blockers)
```

### Task 8: Cannot Activate Modal

Create `src/components/features/driver/CannotActivateModal.tsx`:

```tsx
// Modal shown when driver tries to activate but has blockers
// Props: open, onOpenChange, blockers: string[]
// Content:
// - "Can't Go Active Yet"
// - List of blocking items with "Fix" links
// Uses: Dialog, Button
```

### Task 9: Go Inactive Modal

Create `src/components/features/driver/GoInactiveModal.tsx`:

```tsx
// Modal for selecting reason when going inactive
// Props: open, onOpenChange, onConfirm
// Content:
// - Reason dropdown: Taking a break, Vacation, Vehicle maintenance, Personal, Other
// - Confirm button
// Uses: Dialog, Select, Button
```

### Task 10: Driver Dashboard

Create `src/pages/driver/Dashboard.tsx`:

```tsx
// Main driver dashboard page
// Shows:
// - Greeting: "Good morning, [Name]! 👋"
// - If onboarding incomplete: GettingStartedChecklist
// - If onboarding complete but inactive: "Ready to drive" card with Go Active button
// - Status section with DriverStatusToggle
// - Quick Actions: Credentials, Vehicles, Availability
// - Recent Activity (placeholder)
// Uses: Card, Button, Badge
// Shows WelcomeModal if welcome_modal_dismissed = false
```

### Task 11: Availability Page

Create `src/pages/driver/Availability.tsx`:

```tsx
// Page for setting weekly availability
// Shows:
// - Week view with days (Sun-Sat)
// - For each day: toggle active, time range (start/end)
// - Save button
// Uses: Card, Switch, Select (for times), Button
```

### Task 12: Payment Settings Page

Create `src/pages/driver/PaymentSettings.tsx`:

```tsx
// Page for setting payment information
// Shows:
// - Payment method selection: Direct Deposit, Check, Paycard
// - If Direct Deposit: Bank name, Account type, Routing #, Account #
// - If Check: Mailing address
// - Save button
// Uses: Card, RadioGroup, Input, Select, Button
// Note: Only store last 4 digits of sensitive numbers
```

### Task 13: Update Routes

In `src/App.tsx`, add driver routes:

```tsx
import DriverDashboard from '@/pages/driver/Dashboard';
import DriverAvailability from '@/pages/driver/Availability';
import PaymentSettings from '@/pages/driver/PaymentSettings';

// Inside driver routes
<Route path="/" element={<DriverDashboard />} />
<Route path="/availability" element={<DriverAvailability />} />
<Route path="/settings/payment" element={<PaymentSettings />} />
```

### Task 14: Update Driver Layout Navigation

In `src/components/layouts/DriverLayout.tsx`, ensure navigation includes:
- Dashboard (/)
- Profile (/profile)
- Vehicles (/vehicles)
- Credentials (/credentials)
- Availability (/availability)
- Settings (/settings)

## Output Summary

When complete, confirm:
1. ✅ `src/types/onboarding.ts` - Types
2. ✅ `src/lib/onboarding-items.ts` - Constants
3. ✅ `src/services/onboarding.ts` - Service layer
4. ✅ `src/hooks/useOnboarding.ts` - React Query hooks
5. ✅ `src/components/features/driver/WelcomeModal.tsx`
6. ✅ `src/components/features/driver/GettingStartedChecklist.tsx`
7. ✅ `src/components/features/driver/DriverStatusToggle.tsx`
8. ✅ `src/components/features/driver/CannotActivateModal.tsx`
9. ✅ `src/components/features/driver/GoInactiveModal.tsx`
10. ✅ `src/pages/driver/Dashboard.tsx`
11. ✅ `src/pages/driver/Availability.tsx`
12. ✅ `src/pages/driver/PaymentSettings.tsx`
13. ✅ Routes added in App.tsx
14. ✅ DriverLayout navigation updated

## Testing Notes

To test:
1. Apply migration `014_driver_onboarding.sql`
2. Create a test driver via application flow
3. Log in as that driver
4. See welcome modal on first login
5. Navigate through checklist items
6. Complete required items and try to go active
7. Test going inactive with reason

## DO NOT

- Implement full credential submission flow (that's DR-004)
- Implement full vehicle management (that's DR-003)
- Implement profile editing (that's DR-002)
- Store full bank account numbers (security risk)
- Modify core UI components in `src/components/ui/`
