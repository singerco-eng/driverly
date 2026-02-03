# REFACTOR-001: Code Deduplication Plan

> **For Solo Founders**: This plan is designed for you to execute with AI assistance. Each task includes the exact prompt to use and what to look for in the AI's response.

---

## How To Use This Plan

1. **Work session by session** - Pick ONE task per session
2. **Copy the prompt** - Each task has an exact prompt to give to AI
3. **Review the diff** - AI will show you changes before applying
4. **Test after each change** - Run `npm run dev` and check the affected pages
5. **Commit after each task** - Small commits are easier to revert if something breaks

---

## Import Path Convention

**Always use the `@/` alias for shared utilities:**

```typescript
// ✅ Correct
import { formatDate } from "@/lib/formatters";
import { credentialStatusConfig } from "@/lib/status-configs";

// ❌ Wrong - don't use relative paths for shared utilities
import { formatDate } from "../../lib/formatters";
import { formatDate } from "../../../lib/formatters";
```

This ensures consistent imports across the codebase and prevents AI from creating alternate paths.

---

## Priority Order (Do These In Order)

| # | Task | Time | Risk | Prompt Ready? |
|---|------|------|------|---------------|
| 1 | Extract `formatDate` utility | 15 min | Very Low | ✅ |
| 2 | Extract credential status config | 20 min | Low | ✅ |
| 3 | Extract vehicle status config | 15 min | Low | ✅ |
| 4 | Extract application status config | 15 min | Low | ✅ |
| 5 | Audit hook patterns (read-only) | 10 min | None | ✅ |

**Skip for now:** Component consolidation, hook factories - these are optimizations that can wait.

---

## Task 1: Extract formatDate Utility

**What this fixes**: Same 3-line function copied in 12 files.

**Time**: 15 minutes

**Risk**: Very low - this is a pure utility function with no side effects.

### Step 1: Give AI this prompt

```
Create a new file src/lib/formatters.ts with a formatDate utility function.
Then find ALL files that have a local function formatDate and update them 
to import from the new file instead.

The function should handle: string | Date | null | undefined
Return '—' for null/undefined values.

Show me the list of files you'll change before making changes.
```

### Step 2: Review what AI shows you

AI should list these 12 files:
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

### Step 3: Let AI make the changes

Say: "Yes, make those changes"

### Step 4: Test

```bash
npm run dev
```
Visit any page that shows dates (like Credentials page). Dates should still display correctly.

### Step 5: Add a unit test

Create `src/lib/__tests__/formatters.test.ts`:

```typescript
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
    expect(result).toMatch(/1\/15\/2024|15\/01\/2024|2024/); // locale-flexible
  });

  it('formats a Date object', () => {
    const result = formatDate(new Date('2024-06-01'));
    expect(result).toMatch(/6\/1\/2024|01\/06\/2024|2024/);
  });
});
```

Run: `npm run test:run -- src/lib/__tests__/formatters.test.ts`

### Step 6: Commit

```bash
git add -A
git commit -m "refactor: extract formatDate to shared utility"
```

---

## Task 2: Extract Credential Status Config

**What this fixes**: Same status badge configuration copied in 8+ files.

**Time**: 20 minutes

**Risk**: Low - only affects how status badges display.

### Step 1: Give AI this prompt

```
I have statusConfig objects for credential statuses duplicated across multiple files.

Create src/lib/status-configs.ts and add a credentialStatusConfig export.

Look at these files to see the pattern:
- src/pages/driver/Credentials.tsx
- src/components/features/admin/DriverCredentialsTab.tsx
- src/components/features/admin/VehicleCredentialsTab.tsx
- src/components/features/admin/CredentialReviewCard.tsx

The config maps CredentialDisplayStatus to { label: string, badgeVariant: Badge variant }.

After creating the shared config, update those files to import it instead of defining locally.

Show me the new file first, then list the changes to existing files.
```

### Step 2: Review the shared config

Make sure it includes all statuses:
- approved, rejected, pending_review, not_submitted
- expired, expiring, awaiting, grace_period, missing

### Step 3: Let AI make the changes

### Step 4: Test

Visit the Credentials page as both admin and driver. Check that badges show correctly.

### Step 5: Commit

```bash
git add -A
git commit -m "refactor: extract credential status config to shared module"
```

---

## Task 3: Extract Vehicle Status Config

**What this fixes**: Vehicle status badges duplicated in 3-4 files.

**Time**: 15 minutes

### Step 1: Give AI this prompt

```
Add vehicleStatusConfig to src/lib/status-configs.ts

Look at these files for the pattern:
- src/pages/admin/Vehicles.tsx
- src/pages/driver/VehicleDetail.tsx
- src/components/features/driver/VehicleCard.tsx

Update those files to import from the shared config.
```

### Step 2-5: Same as Task 2

---

## Task 4: Extract Application Status Config

**What this fixes**: Application status badges duplicated in 3 files.

**Time**: 15 minutes

### Step 1: Give AI this prompt

```
Add applicationStatusConfig to src/lib/status-configs.ts

Look at these files for the pattern:
- src/pages/admin/Applications.tsx
- src/pages/admin/ApplicationReview.tsx
- src/components/features/admin/ApplicationCard.tsx

Update those files to import from the shared config.
```

### Step 2-5: Same as Task 2

---

## Task 5: Audit Hook Patterns (Read-Only)

**What this does**: Helps you understand if hook refactoring is worth it later.

**Time**: 10 minutes

**Risk**: None - this is just reading code.

### Give AI this prompt

```
Read src/hooks/useCredentials.ts and identify hooks that have nearly 
identical structure (same queryClient.invalidateQueries pattern, 
same toast pattern).

Don't make any changes. Just tell me:
1. Which hooks are duplicated
2. How many lines would be saved by abstracting
3. Your recommendation: is it worth refactoring or leave as-is?
```

### What to expect

AI will likely say there are 4-5 similar hooks but recommend leaving them as-is because:
- They're explicit and easy to debug
- The "duplication" is only ~10 lines each
- Abstracting would make the code harder to understand

**This is fine.** Not all duplication needs fixing. Move on.

---

## What NOT To Do (Skip These)

### Don't consolidate Admin/Driver components

The admin and driver `VehicleCredentialsTab` files look similar but serve different purposes:
- Admin needs approve/reject actions
- Driver needs upload actions
- They'll diverge more over time

**Leave them separate.** Maintaining two clear files is easier than one complex shared component.

### Don't create hook factories

The mutation hooks in `useCredentials.ts` look repetitive, but:
- They're easy to understand
- They're easy to debug
- A factory pattern would make them harder to modify

**Leave them as-is.**

### Don't abstract service queries

The `supabase.from().select().eq()` pattern appears 100+ times, but each query is different. This is not duplication - it's consistent usage of an API.

**Leave them as-is.**

---

## Progress Tracker

Use this to track what you've done:

- [ ] Task 1: Extract formatDate utility
- [ ] Task 2: Extract credential status config
- [ ] Task 3: Extract vehicle status config
- [ ] Task 4: Extract application status config
- [ ] Task 5: Audit hook patterns (read-only)

**Total time**: ~1.5 hours across multiple sessions

---

## When You're Done

After completing Tasks 1-4, you'll have:

1. **One `src/lib/formatters.ts` file** with date utilities
2. **One `src/lib/status-configs.ts` file** with all status badge configs
3. **~25 fewer duplicated code blocks** across your codebase
4. **Easier future maintenance** - change a status label in one place

### What this improves

- **Consistency**: All "Approved" badges will say the same thing
- **Maintainability**: Want to change "Complete" to "Approved"? One file.
- **Less confusion**: Future AI won't copy-paste the pattern again if there's a shared import

### What this doesn't change

- **Performance**: No impact
- **User experience**: No visible changes
- **Functionality**: Everything works the same

---

## Future Reference: Preventing New Duplication

When asking AI to create new components, add this to your prompt:

```
Before creating any new utility functions, check if they already exist in:
- src/lib/formatters.ts (date formatting)
- src/lib/status-configs.ts (status badge configs)
- src/lib/status-styles.ts (status styling)

Import from these files instead of creating new local functions.
```

This tells AI to reuse existing code instead of duplicating.

---

## CI Duplication Gate

A script at `scripts/check-duplication.mjs` catches regressions automatically.

### What it checks

| Anti-pattern | Allowed in | Error message |
|--------------|------------|---------------|
| `function formatDate` | `src/lib/formatters.ts` only | Use `@/lib/formatters` import |
| `const statusConfig = {` | `src/lib/status-configs.ts`, `src/lib/status-styles.ts` | Use `@/lib/status-configs` import |

### Add to CI

After completing Tasks 1-4, add this to `package.json`:

```json
"scripts": {
  "check:duplication": "node scripts/check-duplication.mjs"
}
```

Run in CI alongside lint:

```bash
npm run lint && npm run check:duplication
```

### Local usage

Run anytime to check for duplication:

```bash
node scripts/check-duplication.mjs
```

**Note:** The script will report violations until you complete the refactoring tasks. Once Tasks 1-4 are done, it prevents future regressions.

---

## Summary

**Gemini's concern about code duplication was valid but manageable.**

| Finding | Severity | Fix |
|---------|----------|-----|
| 12x duplicated `formatDate` | Low | Task 1 (15 min) |
| 17x duplicated `statusConfig` | Low | Tasks 2-4 (45 min) |
| Hook patterns | Skip | Leave as-is, explicit is fine |
| Admin/Driver components | Skip | Separate is clearer |

**Bottom line**: ~1.5 hours of work to clean up the worst duplication. The rest is fine to leave alone - not all duplication is bad, and explicit code is easier to debug than over-abstracted code.
