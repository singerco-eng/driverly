# CODEX-034: DR-005 Trip Sources - Implementation Prompt

> **Copy this entire document when starting the implementation session.**

---

## Context

You are implementing the **Driver Trip Sources** feature for Driverly, a multi-tenant SaaS platform for NEMT (Non-Emergency Medical Transportation) companies.

### What You're Building

A self-service interface for drivers to:
- View available trip sources (brokers)
- See their current assignments and eligibility status
- Request to join new trip sources
- Auto-join trip sources that allow instant signup
- Cancel pending requests
- View trip source requirements (credentials, vehicle types)

### Key Terminology

| Term | Meaning |
|------|---------|
| Trip Source | External organization contracting trips (UI term) |
| Broker | Same as Trip Source (database/code term) |
| Assignment | Link between driver and broker |
| Eligibility | Whether driver can accept trips for a broker |

### The Driver Journey

```
Global Credentials Complete → Trip Sources Unlocked
        ↓
Browse Available Trip Sources
        ↓
Request to Join (admin approves) OR Auto-Join (instant)
        ↓
Complete Broker-Specific Credentials
        ↓
Eligible for Trips
```

### Assignment Modes

| Mode | Behavior |
|------|----------|
| Admin Only | Driver can view, cannot request |
| Driver Requests | Driver requests → Admin approves/denies |
| Auto-Signup | Driver joins instantly (if in service area) |

---

## Prerequisites

- ✅ Driver onboarding flow is implemented (DR-001)
- ✅ Driver credentials page exists (DR-004)
- ✅ Admin broker management is complete (AD-007)
- ✅ Database tables exist (`brokers`, `driver_broker_assignments`, `broker_rates`)
- ✅ RLS policies for driver self-assignment exist
- ✅ `can_driver_join_broker()` RPC function exists

---

## Required Reading (In Order)

### 1. Architecture & Patterns

```
docs/01-ARCHITECTURE.md          # Tech stack, data flow
docs/03-AUTHENTICATION.md        # Auth, roles, JWT claims
docs/04-FRONTEND-GUIDELINES.md   # Design system, components
```

### 2. The Feature Spec (CRITICAL - This is your blueprint)

```
docs/features/driver/DR-005-trip-sources.md   # Full feature specification
```

### 3. Existing Driver Implementation (Follow These Patterns)

```
src/pages/driver/Dashboard.tsx       # Driver page layout
src/pages/driver/Credentials.tsx     # Tabs, cards, filtering
src/pages/driver/VehicleDetail.tsx   # Detail modal patterns
src/components/layouts/DriverLayout.tsx  # Navigation structure
src/components/features/driver/       # All driver components
```

### 4. Existing Broker/Trip Source Code (Admin Side)

```
src/pages/admin/Brokers.tsx          # Broker list (admin view)
src/pages/admin/BrokerDetail.tsx     # Broker detail with tabs
src/services/brokers.ts              # Broker service functions
src/hooks/useBrokers.ts              # Broker React Query hooks
src/types/broker.ts                  # Broker type definitions
```

### 5. Database Schema

```
supabase/migrations/012_broker_management.sql   # Brokers table
supabase/migrations/021_broker_assignment_settings.sql  # Assignment modes, RLS
```

### 6. Onboarding (For Prerequisites Check)

```
src/hooks/useOnboarding.ts           # Onboarding status hook
src/lib/onboarding-items.ts          # Onboarding checklist items
src/services/onboarding.ts           # Onboarding service
```

---

## Key Patterns to Follow

### RLS Policy Pattern (Already Exists)

```sql
-- Drivers can view brokers in their company
SELECT ... FROM brokers WHERE company_id = driver's company

-- Drivers can request/auto-join (already in 021_broker_assignment_settings.sql)
-- Drivers can cancel pending requests (already exists)
```

### Service Layer Pattern

```typescript
// src/services/brokers.ts - ADD these functions

export async function getDriverBrokers(driverId: string, companyId: string) {
  // Get all active brokers for company
  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name');
  
  // Get driver's assignments
  const { data: assignments } = await supabase
    .from('driver_broker_assignments')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['pending', 'assigned']);
  
  return { brokers, assignments };
}

export async function requestBrokerAssignment(
  driverId: string,
  brokerId: string,
  companyId: string
) {
  return supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: companyId,
      status: 'pending',
      requested_by: 'driver',
    })
    .select()
    .single();
}

export async function cancelBrokerRequest(assignmentId: string) {
  return supabase
    .from('driver_broker_assignments')
    .delete()
    .eq('id', assignmentId);
}
```

### React Query Hook Pattern

```typescript
// src/hooks/useDriverBrokers.ts - CREATE this file

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const driverBrokerKeys = {
  all: ['driver-brokers'] as const,
  list: (driverId: string) => [...driverBrokerKeys.all, 'list', driverId] as const,
  assignments: (driverId: string) => [...driverBrokerKeys.all, 'assignments', driverId] as const,
};

export function useDriverBrokers(driverId: string | undefined, companyId: string | undefined) {
  return useQuery({
    queryKey: driverBrokerKeys.list(driverId ?? ''),
    queryFn: () => getDriverBrokers(driverId!, companyId!),
    enabled: !!driverId && !!companyId,
  });
}

export function useRequestBrokerAssignment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: ({ driverId, brokerId }: { driverId: string; brokerId: string }) =>
      requestBrokerAssignment(driverId, brokerId, profile!.company_id!),
    onSuccess: (_, { driverId }) => {
      queryClient.invalidateQueries({ queryKey: driverBrokerKeys.list(driverId) });
    },
  });
}
```

### Checking Join Eligibility (RPC)

```typescript
// Use existing RPC function
export async function canDriverJoinBroker(driverId: string, brokerId: string) {
  const { data, error } = await supabase
    .rpc('can_driver_join_broker', {
      p_driver_id: driverId,
      p_broker_id: brokerId,
    });
  
  if (error) throw error;
  return data[0]; // { can_join, join_mode, reason }
}
```

### Page Component Pattern

Follow `src/pages/driver/Credentials.tsx` for:
- PageHeader with back navigation
- Tabs (Assigned, Pending, Available)
- Card layouts for trip sources
- Filter/search functionality
- Empty states

---

## Implementation Order

Execute tasks in this order:

### Phase 1: Service Layer (No UI Changes)

1. **Task 1: Add driver broker functions to `src/services/brokers.ts`**
   - `getDriverBrokers(driverId, companyId)` - Get brokers with assignment status
   - `getDriverAssignments(driverId)` - Get driver's assignments
   - `requestBrokerAssignment(driverId, brokerId, companyId)` - Request to join
   - `autoJoinBroker(driverId, brokerId, companyId)` - Instant join
   - `cancelBrokerRequest(assignmentId)` - Cancel pending request

2. **Task 2: Create hooks `src/hooks/useDriverBrokers.ts`**
   - `useDriverBrokers(driverId, companyId)` - Query for all brokers with status
   - `useDriverAssignments(driverId)` - Query for assignments only
   - `useRequestBrokerAssignment()` - Mutation for requesting
   - `useAutoJoinBroker()` - Mutation for instant join
   - `useCancelBrokerRequest()` - Mutation for canceling

### Phase 2: Main Page

3. **Task 3: Create `src/pages/driver/TripSources.tsx`**
   - Prerequisites check (global credentials complete)
   - Three tabs: Assigned, Pending, Available
   - Tab counts
   - Search and filter controls
   - Empty states for each tab

### Phase 3: Components

4. **Task 4: Create `src/components/features/driver/TripSourceCard.tsx`**
   - Display broker info (name, type, service area, vehicle types)
   - Assignment status badge
   - Eligibility badge (for assigned)
   - Assignment mode badge (for available)
   - Action buttons (View Requirements, Request, Join Now, Cancel)

5. **Task 5: Create `src/components/features/driver/TripSourceDetailsModal.tsx`**
   - Service area with driver eligibility
   - Accepted vehicle types
   - Driver's vehicles with eligibility
   - Required credentials (global + broker-specific)
   - Action button (Request/Join if applicable)

6. **Task 6: Create `src/components/features/driver/GlobalCredentialsGate.tsx`**
   - Locked state when global credentials incomplete
   - List of missing credentials
   - Link to credentials page

### Phase 4: Confirmation Modals

7. **Task 7: Create `src/components/features/driver/RequestBrokerModal.tsx`**
   - Confirmation for request to join
   - Explains next steps
   - Submit request action

8. **Task 8: Create `src/components/features/driver/JoinBrokerModal.tsx`**
   - Confirmation for auto-join
   - Shows instant assignment info
   - Join now action

9. **Task 9: Create `src/components/features/driver/CancelRequestModal.tsx`**
   - Confirmation for canceling request
   - Cancel action

### Phase 5: Integration

10. **Task 10: Update `src/App.tsx` route**
    - Change `/driver/brokers` from `ComingSoon` to `TripSources`

11. **Task 11: Test all flows**
    - View assigned brokers
    - View pending requests
    - View available brokers
    - Request to join
    - Auto-join
    - Cancel request
    - Prerequisites gate

---

## Component Structure

```
src/components/features/driver/
├── TripSourceCard.tsx           # NEW: Trip source card with actions
├── TripSourceDetailsModal.tsx   # NEW: Requirements/details modal
├── GlobalCredentialsGate.tsx    # NEW: Locked state component
├── RequestBrokerModal.tsx       # NEW: Request confirmation
├── JoinBrokerModal.tsx          # NEW: Auto-join confirmation
├── CancelRequestModal.tsx       # NEW: Cancel confirmation
└── ... existing components

src/pages/driver/
├── TripSources.tsx              # NEW: Main trip sources page
└── ... existing pages

src/hooks/
├── useDriverBrokers.ts          # NEW: Driver broker hooks
└── ... existing hooks
```

---

## UI Design Notes

### Tab Structure

```
[Assigned (2)]  [Pending (1)]  [Available (5)]
```

### Card Badges

| Status | Badge | Color |
|--------|-------|-------|
| Assigned + Eligible | ✓ Eligible | Green |
| Assigned + Ineligible | ⚠ Ineligible | Yellow |
| Pending | ⏳ Pending | Blue |
| Available + Auto-Signup | ⚡ Auto-Signup | Blue |
| Available + Admin Only | 🔒 Admin Only | Gray |
| Not Eligible | ✕ Not Eligible | Gray |

### Source Type Labels

```typescript
const SOURCE_TYPE_LABELS = {
  state_broker: 'State Broker',
  facility: 'Facility',
  insurance: 'Insurance',
  private: 'Private',
  corporate: 'Corporate',
};
```

---

## Testing Checklist

### Prerequisites

- [ ] Page shows locked state when global credentials incomplete
- [ ] Lists specific missing credentials
- [ ] Link navigates to credentials page
- [ ] Trip sources visible after global credentials complete

### Assigned Tab

- [ ] Shows assigned brokers
- [ ] Shows eligibility status (Eligible/Ineligible)
- [ ] Shows missing credentials for ineligible
- [ ] View Requirements modal works
- [ ] Empty state when no assignments

### Pending Tab

- [ ] Shows pending requests
- [ ] Shows request date
- [ ] Cancel request works
- [ ] Confirmation modal before cancel
- [ ] Card moves to Available after cancel

### Available Tab

- [ ] Filters by employment type (only shows matching brokers)
- [ ] Shows assignment mode badges
- [ ] Shows service area
- [ ] Shows vehicle types
- [ ] Shows credential count
- [ ] Not eligible brokers show reason

### Request to Join

- [ ] Request button appears for request-enabled brokers
- [ ] Confirmation modal shows next steps
- [ ] Creates pending assignment
- [ ] Card moves to Pending tab
- [ ] Toast shows success

### Auto-Join

- [ ] Join Now button appears for auto-signup brokers
- [ ] Confirmation modal shows instant join info
- [ ] Creates assigned status (not pending)
- [ ] Card moves to Assigned tab
- [ ] Toast shows success with credentials prompt

### Details Modal

- [ ] Shows service area with driver eligibility
- [ ] Shows vehicle types
- [ ] Shows driver's vehicles with eligibility
- [ ] Shows credential requirements
- [ ] For assigned: shows credential status
- [ ] For available: shows what will be required

---

## Quick Reference: Files to Study

| Pattern | Reference File |
|---------|----------------|
| Driver page layout | `src/pages/driver/Dashboard.tsx` |
| Tabs and filtering | `src/pages/driver/Credentials.tsx` |
| Modal component | `src/components/features/driver/DriverStatusToggle.tsx` |
| Card component | `src/components/features/driver/DriverCredentialCard.tsx` |
| Broker types | `src/types/broker.ts` |
| Broker service | `src/services/brokers.ts` |
| Broker hooks | `src/hooks/useBrokers.ts` |
| Onboarding check | `src/hooks/useOnboarding.ts` |
| RLS patterns | `supabase/migrations/021_broker_assignment_settings.sql` |

---

## Important Notes

1. **No new migrations needed** - All database tables and RLS policies already exist

2. **Employment type filtering** - Only show brokers that accept the driver's employment type (W2/1099)

3. **Use existing broker service** - Add new functions to `src/services/brokers.ts`, don't create a separate file

4. **Use existing RPC** - The `can_driver_join_broker()` function already exists in the database

5. **Global credentials gate** - Check `onboardingStatus.isComplete` before showing trip sources

6. **Broker terminology** - Database uses "broker", UI shows "Trip Source"

7. **Follow Credentials page pattern** - The driver Credentials page has similar tabs/cards/filtering

8. **Toast notifications** - Use `useToast()` for success/error messages

---

## Data Flow

```
Driver opens Trip Sources page
        ↓
Check onboarding status (global credentials complete?)
        ↓
    [NO] → Show GlobalCredentialsGate
    [YES] → Fetch brokers and assignments
        ↓
Categorize into Assigned / Pending / Available
        ↓
For each available broker:
  - Check if employment type matches
  - Call can_driver_join_broker() for join mode
        ↓
Display tabs with counts
        ↓
User clicks action → Show confirmation modal → Execute mutation → Invalidate queries
```

---

## Eligibility Calculation

For each assigned broker, calculate eligibility:

```typescript
function calculateEligibility(driver, broker, credentials, vehicles) {
  const issues = [];
  
  // 1. Check global driver credentials
  const globalCreds = credentials.filter(c => c.scope === 'global');
  const missingGlobal = globalCreds.filter(c => c.status !== 'approved');
  if (missingGlobal.length > 0) {
    issues.push(`${missingGlobal.length} global credential(s) missing`);
  }
  
  // 2. Check broker-specific driver credentials
  const brokerCreds = credentials.filter(c => c.broker_id === broker.id);
  const missingBroker = brokerCreds.filter(c => c.status !== 'approved');
  if (missingBroker.length > 0) {
    issues.push(`${missingBroker.length} ${broker.name} credential(s) missing`);
  }
  
  // 3. Check vehicle eligibility
  const eligibleVehicle = vehicles.find(v => 
    v.status === 'active' &&
    broker.accepted_vehicle_types.includes(v.vehicle_type)
  );
  if (!eligibleVehicle) {
    issues.push('No eligible vehicle');
  }
  
  return {
    eligible: issues.length === 0,
    issues,
  };
}
```

---

## Start Here

1. Read the full feature spec: `docs/features/driver/DR-005-trip-sources.md`
2. Study the driver Credentials page: `src/pages/driver/Credentials.tsx`
3. Study the broker service: `src/services/brokers.ts`
4. Begin with Task 1 (service functions) and work through sequentially
5. Test each phase before moving to the next

Good luck! 🚀
