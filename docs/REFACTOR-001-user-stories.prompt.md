# REFACTOR-001: User Stories for Codex

> Run these stories ONE AT A TIME in Codex. Each story is self-contained and builds on the previous.

---

## How to Run in Codex

Copy the prompt below into Codex, replacing `[STORY_NUMBER]` with 1, 2, 3, or 4:

```
Read docs/REFACTOR-001-user-stories.prompt.md and execute Story [STORY_NUMBER].

Follow these rules:
1. Use `@/lib/...` import paths (not relative paths)
2. Search for ALL instances of the pattern before making changes
3. Create the unit test if specified
4. Run the test to verify it passes
5. Commit with the specified message

Do not proceed to the next story. Stop after committing.
```

---

## Story 1: Extract formatDate Utility

**As a** developer  
**I want** a shared `formatDate` function  
**So that** date formatting is consistent and maintained in one place

### Acceptance Criteria

- [ ] Create `src/lib/formatters.ts` with `formatDate` function
- [ ] Function signature: `(value: string | Date | null | undefined) => string`
- [ ] Returns `'—'` (em-dash) for null/undefined
- [ ] Returns `toLocaleDateString()` for valid dates
- [ ] All files with local `formatDate` functions now import from `@/lib/formatters`
- [ ] Create `src/lib/__tests__/formatters.test.ts` with 4 test cases
- [ ] Tests pass: `npm run test:run -- src/lib/__tests__/formatters.test.ts`

### Files to Update

Search for `function formatDate` and update these files:
- `src/components/features/driver/VehicleCredentialsTab.tsx`
- `src/components/features/driver/DriverCredentialCard.tsx`
- `src/components/features/admin/VehicleCredentialsTab.tsx`
- `src/components/features/admin/DriverCredentialsTab.tsx`
- `src/components/features/admin/CredentialReviewCard.tsx`
- `src/components/features/admin/AssignmentHistoryList.tsx`
- `src/components/features/admin/VehicleAssignmentsTab.tsx`
- `src/components/features/admin/DriverVehiclesTab.tsx`
- `src/components/features/admin/credential-builder/PublishDialog.tsx`
- `src/pages/driver/Credentials.tsx`
- `src/pages/admin/CredentialReview.tsx`
- `src/pages/website/demo/DemoAdminReview.tsx`

### Test File Content

```typescript
// src/lib/__tests__/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate } from '../formatters';

describe('formatDate', () => {
  it('returns em-dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  it('formats a date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/1\/15\/2024|15\/01\/2024|2024/);
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(result).toMatch(/6\/1\/2024|01\/06\/2024|2024/);
  });
});
```

### Commit

```
git commit -m "refactor: extract formatDate to shared utility"
```

---

## Story 2: Extract Credential Status Config

**As a** developer  
**I want** a shared credential status configuration  
**So that** badge labels and variants are consistent across admin and driver views

### Acceptance Criteria

- [ ] Create `src/lib/status-configs.ts` with `credentialStatusConfig` export
- [ ] Config maps `CredentialDisplayStatus` to `{ label: string, variant: BadgeVariant }`
- [ ] Includes all statuses: approved, rejected, pending_review, not_submitted, expired, expiring, awaiting, grace_period, missing
- [ ] All files with local `statusConfig` for credentials now import from `@/lib/status-configs`
- [ ] Badge appearance unchanged (visual regression check)

### Files to Update

Search for `statusConfig` related to credential statuses:
- `src/pages/driver/Credentials.tsx`
- `src/components/features/admin/DriverCredentialsTab.tsx`
- `src/components/features/admin/VehicleCredentialsTab.tsx`
- `src/components/features/admin/CredentialReviewCard.tsx`

### Implementation Notes

- Check existing `src/lib/status-styles.ts` for any overlap - reuse if possible
- Export type for the config object
- Use the same badge variant names already in use

### Commit

```
git commit -m "refactor: extract credential status config to shared module"
```

---

## Story 3: Extract Vehicle Status Config

**As a** developer  
**I want** a shared vehicle status configuration  
**So that** vehicle badges are consistent across admin and driver views

### Acceptance Criteria

- [ ] Add `vehicleStatusConfig` export to `src/lib/status-configs.ts`
- [ ] Config maps vehicle status to `{ label: string, variant: BadgeVariant }`
- [ ] All files with local vehicle status config now import from `@/lib/status-configs`
- [ ] Badge appearance unchanged

### Files to Update

Search for vehicle status badge configuration:
- `src/pages/admin/Vehicles.tsx`
- `src/pages/driver/VehicleDetail.tsx`
- `src/components/features/driver/VehicleCard.tsx`

### Commit

```
git commit -m "refactor: extract vehicle status config to shared module"
```

---

## Story 4: Extract Application Status Config

**As a** developer  
**I want** a shared application status configuration  
**So that** application badges are consistent across admin views

### Acceptance Criteria

- [ ] Add `applicationStatusConfig` export to `src/lib/status-configs.ts`
- [ ] Config maps application status to `{ label: string, variant: BadgeVariant }`
- [ ] All files with local application status config now import from `@/lib/status-configs`
- [ ] Badge appearance unchanged

### Files to Update

Search for application status badge configuration:
- `src/pages/admin/Applications.tsx`
- `src/pages/admin/ApplicationReview.tsx`
- `src/components/features/admin/ApplicationCard.tsx`

### Commit

```
git commit -m "refactor: extract application status config to shared module"
```

---

## Story 5: Verify CI Gate (Final)

**As a** developer  
**I want** the duplication check to pass  
**So that** future regressions are prevented

### Acceptance Criteria

- [ ] `npm run check:duplication` exits with code 0
- [ ] No local `formatDate` functions exist outside `src/lib/formatters.ts`
- [ ] No local `statusConfig` objects exist outside `src/lib/status-configs.ts`

### Command

```bash
npm run check:duplication
```

### If it fails

Fix any remaining violations by importing from the shared modules.

### Commit (if changes needed)

```
git commit -m "refactor: fix remaining duplication violations"
```

---

## Completion Checklist

After running all stories:

- [ ] Story 1: formatDate extracted ✓
- [ ] Story 2: Credential status config extracted ✓
- [ ] Story 3: Vehicle status config extracted ✓
- [ ] Story 4: Application status config extracted ✓
- [ ] Story 5: CI gate passes ✓

Total commits: 4-5
