# FF-001 Feature Flags - Test Plan

> **Created:** 2026-01-30  
> **Status:** Ready for Testing  
> **Implementation:** Complete

---

## Overview

This test plan covers the Feature Flags system (FF-001), which enables:
- Super Admin global flag management
- Per-company overrides
- Admin read-only visibility of their company's features
- `useFeatureFlag()` hook for conditional rendering

---

## Test Categories

| Category | Priority | Method |
|----------|----------|--------|
| Database & RLS | Critical | Manual SQL + Supabase Dashboard |
| Service Layer | High | Unit tests or manual API testing |
| React Hooks | High | Component testing |
| Super Admin UI | Critical | Manual E2E |
| Company Features Tab | High | Manual E2E |
| Integration | Critical | Full flow testing |

---

## 1. Database & RLS Tests

### 1.1 Table Structure

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-DB-001** Feature flags table exists | Query `SELECT * FROM feature_flags LIMIT 1;` | Returns seed data (12 flags) |
| **FF-DB-002** Overrides table exists | Query `SELECT * FROM company_feature_overrides LIMIT 1;` | Table exists, may be empty |
| **FF-DB-003** Unique constraint on overrides | Insert duplicate `(company_id, flag_id)` | Fails with unique constraint error |
| **FF-DB-004** Cascade delete on company | Delete a company with overrides | Override records are deleted |
| **FF-DB-005** Cascade delete on flag | Delete a flag with overrides | Override records are deleted |
| **FF-DB-006** Updated_at trigger works | Update a flag's `default_enabled` | `updated_at` timestamp changes |

### 1.2 RLS Policies - Super Admin

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-RLS-001** Super Admin reads all flags | As Super Admin, `SELECT * FROM feature_flags;` | Returns all flags (including `is_internal = true`) |
| **FF-RLS-002** Super Admin updates flags | As Super Admin, update `default_enabled` | Update succeeds |
| **FF-RLS-003** Super Admin reads all overrides | As Super Admin, `SELECT * FROM company_feature_overrides;` | Returns all overrides |
| **FF-RLS-004** Super Admin creates overrides | As Super Admin, insert override | Insert succeeds |
| **FF-RLS-005** Super Admin deletes overrides | As Super Admin, delete override | Delete succeeds |

### 1.3 RLS Policies - Admin

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-RLS-006** Admin reads public flags | As Admin, `SELECT * FROM feature_flags WHERE is_internal = false;` | Returns non-internal flags |
| **FF-RLS-007** Admin cannot read internal flags | As Admin, `SELECT * FROM feature_flags WHERE is_internal = true;` | Returns empty (RLS blocks) |
| **FF-RLS-008** Admin reads own company overrides | As Admin, `SELECT * FROM company_feature_overrides WHERE company_id = <own>;` | Returns own overrides |
| **FF-RLS-009** Admin cannot read other company overrides | As Admin, query overrides for different company | Returns empty |
| **FF-RLS-010** Admin cannot create overrides | As Admin, insert override | Insert fails (permission denied) |
| **FF-RLS-011** Admin cannot update overrides | As Admin, update override | Update fails (permission denied) |
| **FF-RLS-012** Admin cannot delete overrides | As Admin, delete override | Delete fails (permission denied) |

### 1.4 RLS Policies - Driver

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-RLS-013** Driver reads public flags | As Driver, `SELECT * FROM feature_flags WHERE is_internal = false;` | Returns non-internal flags |
| **FF-RLS-014** Driver cannot read overrides | As Driver, `SELECT * FROM company_feature_overrides;` | Returns empty |

### 1.5 Seed Data Verification

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-SEED-001** Billing flags exist | Query flags with category = 'billing' | Returns 3 flags (billing_enabled, billing_self_service, billing_enforcement) |
| **FF-SEED-002** Core flags enabled by default | Query flags with category = 'core' | All 4 have `default_enabled = true` |
| **FF-SEED-003** Future flags disabled by default | Query flags with category in ('operations', 'finance', 'analytics', 'integrations', 'enterprise') | All have `default_enabled = false` |
| **FF-SEED-004** No internal flags seeded | Query `is_internal = true` | Returns 0 (all seed flags are public) |

---

## 2. Service Layer Tests

### 2.1 Flag Fetching

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-SVC-001** getAllFlags() | Call function | Returns array of all FeatureFlag objects |
| **FF-SVC-002** getAllFlagsWithStats() | Call function | Returns flags with `override_count` property |
| **FF-SVC-003** Override count accuracy | Create 3 overrides for a flag, call getAllFlagsWithStats() | Flag shows `override_count: 3` |
| **FF-SVC-004** getFlagsForCompany() | Call with valid companyId | Returns FeatureFlagWithOverride[] with `effective_value` |
| **FF-SVC-005** getFlagsForCompany() excludes internal | Create an internal flag, call function | Internal flag not returned |
| **FF-SVC-006** getOverridesForFlag() | Call with flagId that has overrides | Returns overrides with company name |

### 2.2 Flag Checking

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-SVC-007** isFeatureEnabled() - no override, default true | Check a core flag (default_enabled=true) | Returns `true` |
| **FF-SVC-008** isFeatureEnabled() - no override, default false | Check a billing flag (default_enabled=false) | Returns `false` |
| **FF-SVC-009** isFeatureEnabled() - override enables | Create override with enabled=true for disabled flag | Returns `true` |
| **FF-SVC-010** isFeatureEnabled() - override disables | Create override with enabled=false for enabled flag | Returns `false` |
| **FF-SVC-011** isFeatureEnabled() - non-existent flag | Check flag key that doesn't exist | Returns `false` |
| **FF-SVC-012** getEnabledFlags() batch | Check multiple flags at once | Returns correct Record<string, boolean> |

### 2.3 Caching

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-SVC-013** Cache hit | Call isFeatureEnabled() twice in < 5 min | Second call uses cache (no network request) |
| **FF-SVC-014** Cache invalidation on mutation | Call setGlobalDefault(), then isFeatureEnabled() | Fresh data returned |
| **FF-SVC-015** Cache per-company | Check flag for Company A, then Company B | Cache resets for new company |
| **FF-SVC-016** Cache TTL expiry | Wait > 5 minutes, call isFeatureEnabled() | Makes fresh network request |
| **FF-SVC-017** clearFlagCache() works | Call clearFlagCache(), then isFeatureEnabled() | Cache is cleared, fresh request made |

### 2.4 Mutations

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-SVC-018** setGlobalDefault() enables | Set default_enabled=true | Flag updated in DB, cache cleared |
| **FF-SVC-019** setGlobalDefault() disables | Set default_enabled=false | Flag updated in DB |
| **FF-SVC-020** setCompanyOverride() creates | Create new override | Override inserted |
| **FF-SVC-021** setCompanyOverride() updates | Update existing override | Override upserted |
| **FF-SVC-022** setCompanyOverride() with reason | Include reason text | Reason stored in DB |
| **FF-SVC-023** removeCompanyOverride() | Delete existing override | Override removed, cache cleared |

---

## 3. React Hook Tests

### 3.1 useFeatureFlag()

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-HOOK-001** Returns false when no companyId | Call hook without auth context | Returns `false` |
| **FF-HOOK-002** Returns true for Super Admin | Call hook as Super Admin | Always returns `true` |
| **FF-HOOK-003** Returns effective value for Admin | Call hook as Admin with/without override | Returns correct effective value |
| **FF-HOOK-004** Uses staleTime caching | Multiple renders within 5 min | No refetch |
| **FF-HOOK-005** Updates on cache invalidation | Trigger invalidation | Hook returns new value |

### 3.2 useFeatureFlags() (batch)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-HOOK-006** Returns all keys for Super Admin | Call with array of keys as Super Admin | All keys return `true` |
| **FF-HOOK-007** Returns correct batch values | Call with mixed enabled/disabled flags | Record has correct values |
| **FF-HOOK-008** Returns false for unknown keys | Include non-existent flag key | That key returns `false` |

### 3.3 Data Fetching Hooks

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-HOOK-009** useAllFeatureFlags() | Render Super Admin page | Returns flags with stats |
| **FF-HOOK-010** useCompanyFeatureFlags() | Render CompanyFeaturesTab | Returns flags with overrides |
| **FF-HOOK-011** useOverridesForFlag() | Expand a flag with overrides | Returns override list with company names |

### 3.4 Mutation Hooks

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-HOOK-012** useSetGlobalDefault() success | Toggle a flag | Toast shows success, cache invalidates |
| **FF-HOOK-013** useSetGlobalDefault() error | Simulate network error | Toast shows error message |
| **FF-HOOK-014** useSetCompanyOverride() success | Set override | Toast shows success |
| **FF-HOOK-015** useRemoveCompanyOverride() success | Remove override | Toast shows success, reverts to default |

---

## 4. Super Admin UI Tests

### 4.1 Feature Flags Page (`/super-admin/feature-flags`)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-UI-001** Page loads | Navigate to Feature Flags | Page renders with flags grouped by category |
| **FF-UI-002** Loading state | Refresh page | Skeleton loaders appear, then data |
| **FF-UI-003** Search works | Type "billing" in search | Only billing flags shown |
| **FF-UI-004** Category filter works | Select "Core" category | Only core flags shown |
| **FF-UI-005** Combined filter | Search "driver" + category "core" | Only matching flags shown |
| **FF-UI-006** Clear filters | Clear search and set category to "All" | All flags shown |
| **FF-UI-007** Empty state | Search for non-existent flag | "No flags found" message |

### 4.2 Flag Toggle (Global Default)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-UI-008** Toggle on | Click switch for disabled flag | Switch turns on, toast confirms |
| **FF-UI-009** Toggle off | Click switch for enabled flag | Switch turns off, toast confirms |
| **FF-UI-010** Toggle disabled during mutation | Click toggle | Switch disabled until request completes |
| **FF-UI-011** Toggle error handling | Simulate network failure | Error toast, switch reverts |

### 4.3 Override Count & Expansion

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-UI-012** Override count badge | Create override for a flag | Badge shows "1 override" |
| **FF-UI-013** Expand overrides list | Click override count button | Collapsible expands, shows override table |
| **FF-UI-014** Collapse overrides | Click button again | Collapsible closes |
| **FF-UI-015** No override count shown | Flag with no overrides | No button visible |

### 4.4 Override List Actions

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-UI-016** Override shows company name | Expand flag with overrides | Company name visible in table |
| **FF-UI-017** Override shows status | View override list | Badge shows "Enabled" or "Disabled" |
| **FF-UI-018** Override shows reason | Override with reason | Reason text visible |
| **FF-UI-019** Remove override | Click trash icon | Override removed, toast confirms |
| **FF-UI-020** Remove override loading | During deletion | Button disabled |

---

## 5. Company Features Tab Tests

### 5.1 Tab Access

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-TAB-001** Tab visible on CompanyDetail | Navigate to company detail | "Features" tab exists |
| **FF-TAB-002** Tab loads data | Click Features tab | Flags loaded, grouped by category |
| **FF-TAB-003** Loading state | Initial load | Loading indicator shown |

### 5.2 Flag Display

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-TAB-004** Global column shows default | View any flag row | "On" or "Off" badge in Global column |
| **FF-TAB-005** Override column - no override | Flag without override | Shows "—" dash |
| **FF-TAB-006** Override column - has override | Flag with override | Shows "On" or "Off" badge, clickable |
| **FF-TAB-007** Effective column | View any flag | Checkmark (enabled) or X (disabled) |
| **FF-TAB-008** Effective value calculation | Override=Off, Global=On | Effective shows X (override wins) |

### 5.3 Override Actions

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-TAB-009** Override button visible | Flag without override | "Override" button in actions column |
| **FF-TAB-010** Reset button visible | Flag with override | "Reset" button in actions column |
| **FF-TAB-011** Click Override opens modal | Click "Override" button | FeatureOverrideModal opens |
| **FF-TAB-012** Click Reset removes override | Click "Reset" button | Override removed, toast confirms |
| **FF-TAB-013** Click badge opens modal | Click override badge | Modal opens for editing |

### 5.4 Override Modal

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-TAB-014** Modal shows flag name | Open modal | Title shows flag name |
| **FF-TAB-015** Modal shows company name | Open modal | Description mentions company |
| **FF-TAB-016** Toggle default state - new | Open modal for flag without override | Toggle defaults to opposite of global |
| **FF-TAB-017** Toggle default state - edit | Open modal for existing override | Toggle matches current override value |
| **FF-TAB-018** Reason field | Type reason text | Value captured in form |
| **FF-TAB-019** Save override | Fill form, click Save | Override created/updated, modal closes |
| **FF-TAB-020** Cancel modal | Click Cancel | Modal closes, no changes |
| **FF-TAB-021** Save loading state | During save | Button shows "Saving...", disabled |

---

## 6. Integration Tests (E2E Flows)

### 6.1 Full Flag Lifecycle

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-E2E-001** Enable flag globally | 1. Go to Feature Flags<br>2. Toggle `trip_management` on | Flag enables globally |
| **FF-E2E-002** Create company override | 1. Go to Company Detail > Features<br>2. Override `trip_management` to Off | Override created |
| **FF-E2E-003** Verify override in global view | Go back to Feature Flags | Override count shows "1 override" |
| **FF-E2E-004** Verify override takes effect | Check company's effective value | Shows disabled despite global on |
| **FF-E2E-005** Remove override | Reset override from company detail | Company reverts to global default |
| **FF-E2E-006** Disable flag globally | Toggle `trip_management` off | Flag disabled globally |

### 6.2 Hook Integration

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-E2E-007** useFeatureFlag blocks feature | 1. Create feature gated by `trip_management`<br>2. Disable flag<br>3. Log in as Admin | Feature hidden/disabled |
| **FF-E2E-008** useFeatureFlag allows feature | 1. Enable flag<br>2. Refresh as Admin | Feature visible |
| **FF-E2E-009** Override grants access | 1. Disable flag globally<br>2. Create override for company (enabled)<br>3. Log in as Admin of that company | Feature visible (override works) |
| **FF-E2E-010** Override revokes access | 1. Enable flag globally<br>2. Create override (disabled)<br>3. Log in as Admin | Feature hidden (override blocks) |

### 6.3 Multi-Company Isolation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-E2E-011** Override affects only one company | 1. Create override for Company A<br>2. Check Company B | Company B uses global default |
| **FF-E2E-012** Admin can't see other overrides | Log in as Admin of Company A | Only sees own company's feature status |

---

## 7. Edge Cases & Error Handling

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-EDGE-001** No flags exist | Delete all flags (test only) | Empty state message |
| **FF-EDGE-002** Network failure on load | Disable network, reload | Error state or cached data |
| **FF-EDGE-003** Network failure on mutation | Disable network, toggle flag | Error toast, state reverts |
| **FF-EDGE-004** Concurrent toggles | Rapidly toggle flag on/off | Last state wins, no corruption |
| **FF-EDGE-005** Delete company with overrides | Delete company from SA | Overrides cascade deleted |
| **FF-EDGE-006** Very long flag name | Create flag with 200+ char name | UI handles gracefully (truncate/wrap) |
| **FF-EDGE-007** Very long reason text | Enter 1000+ chars in reason | Saved and displayed (may truncate) |
| **FF-EDGE-008** Special characters in reason | Use quotes, brackets, emoji | Handled without breaking |

---

## 8. Performance Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-PERF-001** Initial page load | Time Feature Flags page load | < 2 seconds |
| **FF-PERF-002** Toggle response time | Time from click to toast | < 1 second |
| **FF-PERF-003** 100+ companies with overrides | Create many overrides, load list | Page remains responsive |
| **FF-PERF-004** Frequent flag checks | Call isFeatureEnabled() in loop | Cache prevents excessive requests |

---

## 9. Accessibility Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| **FF-A11Y-001** Keyboard navigation | Tab through Feature Flags page | All interactive elements focusable |
| **FF-A11Y-002** Toggle switch keyboard | Focus toggle, press Space | Toggle activates |
| **FF-A11Y-003** Modal keyboard trap | Open override modal, Tab | Focus stays in modal |
| **FF-A11Y-004** Screen reader labels | Use VoiceOver/NVDA | Controls announced correctly |
| **FF-A11Y-005** Color contrast | Check badges, buttons | Meets WCAG AA |

---

## Test Execution Checklist

### Pre-requisites
- [ ] Migration 026_feature_flags.sql applied
- [ ] Seed data present (12 flags)
- [ ] At least 2 companies exist for testing
- [ ] Super Admin, Admin, and Driver test accounts

### Critical Path (Must Pass)
- [ ] FF-RLS-001 to FF-RLS-012 (RLS policies)
- [ ] FF-SVC-007 to FF-SVC-010 (Flag checking logic)
- [ ] FF-UI-001, FF-UI-008, FF-UI-009 (Basic functionality)
- [ ] FF-TAB-001, FF-TAB-019 (Company override flow)
- [ ] FF-E2E-001 to FF-E2E-006 (Full lifecycle)

### Sign-off
- [ ] All Critical Path tests pass
- [ ] No regressions in existing functionality
- [ ] Performance acceptable
- [ ] Ready for BILLING-001 integration

---

## Notes

1. **Super Admin always returns true**: The `useFeatureFlag()` hook returns `true` for all flags when the user is a Super Admin. This is by design to ensure Super Admins can always access all features.

2. **Cache behavior**: The service layer caches flag values for 5 minutes per company. Mutations automatically clear the cache.

3. **Integration with BILLING-001**: The `billing_enabled`, `billing_self_service`, and `billing_enforcement` flags are seeded but disabled. BILLING-001 will use these to gate billing UI.

4. **Internal flags**: The `is_internal` column allows flags that are only visible to Super Admins. No internal flags are seeded by default, but the capability exists.
