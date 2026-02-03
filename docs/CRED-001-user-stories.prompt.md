# CRED-001: Credential Publishing System - User Stories

> **For AI Implementation**: Read the context document first, then implement these stories in order.

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [`docs/CRED-001-credential-publishing-system.prompt.md`](./CRED-001-credential-publishing-system.prompt.md) | **Read first** - Technical context, schema, code examples |
| **This document** | User stories with acceptance criteria |

---

## Implementation Order Summary

**Start here - implement in this sequence:**

1. **T1: Database Migration** - `supabase/migrations/030_credential_publishing.sql`
2. **T3: Type Safety** - `src/types/credential.ts`
3. **Story 1: Draft Credentials** - Default status change
4. **Story 9: Admin Status Badge** - Visual feedback in editor
5. **Story 2: Publish Immediately** - Core publish flow with dialog
6. **Story 3: Schedule Publication** - Add date picker and scheduling
7. **T2: Scheduled Activation** - RPC query-time check
8. **Story 7: Grace Period Display** - Driver "Due by" badges
9. **Story 8: Missing Status** - Driver "Missing" badges
10. **Story 10: Dialog Grace Info** - Grace period info in publish dialog
11. **Stories 4-6, 11-12** - Additional actions (cancel, deactivate, reactivate, edit)

---

## Epic: Credential Publishing Workflow

As a fleet admin, I want to build and refine credentials without immediately affecting drivers, so that I can safely prepare new requirements and schedule their rollout.

---

## User Stories

### Story 1: Draft Credentials

**As an** admin creating a new credential type  
**I want** the credential to start in draft status  
**So that** I can work on it without drivers seeing it

**Acceptance Criteria:**
- [ ] New credential types are created with `status = 'draft'`
- [ ] Draft credentials do NOT appear in driver credential lists
- [ ] Draft credentials show "Draft" badge in admin UI
- [ ] Admin can edit and save draft credentials freely
- [ ] Draft status persists across browser sessions

**Technical Notes:**
- Update `createCredentialType()` in `src/services/credentialTypes.ts` to set `status: 'draft'`
- Update `get_driver_required_credentials()` RPC to filter `status = 'active'`

---

### Story 2: Publish Immediately

**As an** admin with a completed credential  
**I want** to publish it immediately  
**So that** drivers can start submitting right away

**Acceptance Criteria:**
- [ ] "Publish" button available for draft credentials
- [ ] Clicking opens PublishDialog with options
- [ ] "Publish Now" option sets `effective_date = NOW()` and `status = 'active'`
- [ ] Credential immediately appears in driver lists
- [ ] Status badge changes from "Draft" to "Active"
- [ ] `published_at` and `published_by` are recorded

**UI Flow:**
```
[Publish...] → PublishDialog opens
            → Select "Publish Now"
            → [Publish] button
            → Credential is live
            → Success toast: "Credential published"
```

---

### Story 3: Schedule Publication

**As an** admin planning a credential rollout  
**I want** to schedule when a credential goes live  
**So that** I can prepare drivers and align with company timelines

**Acceptance Criteria:**
- [ ] "Schedule for later" option in PublishDialog
- [ ] Date picker for selecting future effective date
- [ ] Scheduled credentials have `status = 'scheduled'`
- [ ] Scheduled credentials show "Scheduled · [date]" badge
- [ ] Scheduled credentials do NOT appear to drivers until effective date
- [ ] When effective date is reached, credential becomes active automatically

**UI Flow:**
```
[Publish...] → PublishDialog opens
            → Select "Schedule for later"
            → Pick date: March 15, 2026
            → [Publish] button
            → Status changes to "Scheduled · Mar 15, 2026"
```

**Technical Notes:**
- Need scheduled job or RPC check to transition `scheduled` → `active` when `effective_date <= NOW()`
- Could be handled at query time in RPC (simpler) or via pg_cron job (explicit)

---

### Story 4: Cancel Scheduled Publication

**As an** admin who scheduled a credential  
**I want** to cancel the scheduled publication  
**So that** I can make changes before it goes live

**Acceptance Criteria:**
- [ ] "Cancel Schedule" or "Return to Draft" action available for scheduled credentials
- [ ] Only allowed if no drivers have submitted (even in `not_submitted` state counts as "started")
- [ ] Returns credential to `draft` status
- [ ] Clears `effective_date`, `published_at`, `published_by`

**Error Case:**
- If drivers have submissions: Show error "Cannot unpublish: drivers have already started this credential"

---

### Story 5: Deactivate Credential

**As an** admin  
**I want** to deactivate an active credential  
**So that** drivers no longer see or are required to submit it

**Acceptance Criteria:**
- [ ] "Deactivate" action available for active credentials
- [ ] Confirmation dialog: "Are you sure? Drivers will no longer see this credential."
- [ ] Sets `status = 'inactive'`
- [ ] Credential hidden from driver lists
- [ ] Existing submissions are preserved (not deleted)
- [ ] Status badge shows "Inactive"

---

### Story 6: Reactivate Credential

**As an** admin  
**I want** to reactivate an inactive credential  
**So that** drivers can see and submit it again

**Acceptance Criteria:**
- [ ] "Reactivate" action available for inactive credentials
- [ ] Reactivation dialog with options:
  - Reactivate now (immediate)
  - Schedule reactivation (future date)
- [ ] Grace period applies from reactivation date
- [ ] Existing approved submissions remain valid

---

### Story 7: Grace Period Display for Drivers

**As a** driver  
**I want** to see when a credential is due  
**So that** I know how much time I have to submit

**Acceptance Criteria:**
- [ ] Credentials in grace period show "Due by [date]" badge
- [ ] Badge is yellow/warning color
- [ ] Due date is calculated as `effective_date + grace_period_days` (or `driver_created_at + grace_period_days` if joined after)
- [ ] Countdown is accurate to the day

**UI Example:**
```
┌────────────────────────────────────────┐
│  Driver's License         [Due Mar 15] │
│  Upload your driver's license          │
└────────────────────────────────────────┘
```

---

### Story 8: Missing Credential Status

**As a** driver  
**I want** to see credentials I've missed  
**So that** I know what's overdue

**Acceptance Criteria:**
- [ ] Credentials past grace period show "Missing" badge
- [ ] Badge is red/destructive color
- [ ] "Missing" credentials appear in "Action Needed" filter
- [ ] Clear visual distinction from "Not Submitted"

**Note:** In Phase 1, "Missing" is visual only. Auto-deactivation is Phase 2.

---

### Story 9: Status Badge in Admin Header

**As an** admin editing a credential  
**I want** to clearly see the credential's publication status  
**So that** I understand its current state

**Acceptance Criteria:**
- [ ] Status badge visible in credential editor header
- [ ] Badge colors:
  - Draft: Gray
  - Scheduled: Blue (with date)
  - Active: Green
  - Inactive: Red
- [ ] Badge updates immediately after status changes

---

### Story 10: Publish Dialog Grace Period Info

**As an** admin publishing a credential  
**I want** to see the grace period information  
**So that** I understand when drivers must comply

**Acceptance Criteria:**
- [ ] PublishDialog shows grace period days from credential settings
- [ ] Shows calculated due date based on selected effective date
- [ ] Info box: "Existing drivers will have until [date] to comply"
- [ ] For immediate publish: due date = NOW + grace_period_days
- [ ] For scheduled publish: due date = effective_date + grace_period_days

---

### Story 11: Edit Scheduled Credential

**As an** admin  
**I want** to edit a scheduled credential before it goes live  
**So that** I can make corrections

**Acceptance Criteria:**
- [ ] Can edit all fields of scheduled credential
- [ ] Can change scheduled date via "Edit Schedule" action
- [ ] Cannot change to past date (must be future or "now")
- [ ] Changes save without affecting scheduled status

---

### Story 12: Edit Active Credential

**As an** admin  
**I want** to edit an active credential  
**So that** I can update instructions or fields

**Acceptance Criteria:**
- [ ] Can edit most fields of active credential
- [ ] Warning: "Changes will apply to all drivers immediately"
- [ ] Cannot change certain fields that would invalidate submissions (TBD)
- [ ] Save applies changes immediately

**Note:** For major changes, recommend creating new credential type and deactivating old one.

---

## Technical Stories

### Story T1: Database Migration

**As a** developer  
**I want** to migrate the database schema  
**So that** the publishing system has proper data structure

**Acceptance Criteria:**
- [ ] Add `status`, `effective_date`, `published_at`, `published_by` columns
- [ ] Migrate existing credentials: `is_active=true` → `status='active'`, `is_active=false` → `status='inactive'`
- [ ] Set `effective_date = created_at` for existing credentials
- [ ] Add CHECK constraint for status values
- [ ] Update RPC functions to use new status column

---

### Story T2: Scheduled Credential Activation

**As the** system  
**I want** scheduled credentials to become active at their effective date  
**So that** the workflow is automatic

**Implementation Options:**

**Option A: Query-time check (Recommended for Phase 1)**
- RPC checks `status = 'active' OR (status = 'scheduled' AND effective_date <= NOW())`
- Simpler, no background job needed
- Status doesn't visually change until next query

**Option B: Background job**
- pg_cron job runs every minute
- Updates `status = 'active'` WHERE `status = 'scheduled' AND effective_date <= NOW()`
- More explicit, status is accurate
- Requires pg_cron extension

---

### Story T3: Type Safety Updates

**As a** developer  
**I want** TypeScript types updated  
**So that** the codebase has proper type safety

**Acceptance Criteria:**
- [ ] Add `CredentialTypeStatus` type
- [ ] Update `CredentialType` interface with new fields
- [ ] Add `CredentialDisplayStatus` with new states
- [ ] Update all usages to handle new status values

---

## Story Sizing (Estimates)

| Story | Size | Notes |
|-------|------|-------|
| Story 1: Draft Credentials | S | Default status change |
| Story 2: Publish Immediately | M | New dialog + service function |
| Story 3: Schedule Publication | M | Date picker + scheduling logic |
| Story 4: Cancel Scheduled | S | Validation + status reset |
| Story 5: Deactivate | S | Status change with confirm |
| Story 6: Reactivate | S | Similar to publish |
| Story 7: Grace Period Display | M | Display logic + badge |
| Story 8: Missing Status | S | New status + styling |
| Story 9: Admin Status Badge | S | UI component |
| Story 10: Dialog Grace Info | S | Calculation + display |
| Story 11: Edit Scheduled | S | Allow edits, date validation |
| Story 12: Edit Active | S | Warning + save |
| Story T1: Migration | M | Schema + data migration |
| Story T2: Scheduled Activation | S-M | Depends on approach |
| Story T3: Type Safety | S | Type definitions |

---

## Implementation Order

**Recommended sequence:**

1. **T1: Database Migration** - Foundation for all other work
2. **T3: Type Safety** - Update types before UI work
3. **Story 1: Draft Credentials** - Basic draft support
4. **Story 9: Admin Status Badge** - Visual feedback
5. **Story 2: Publish Immediately** - Core publish flow
6. **Story 3: Schedule Publication** - Add scheduling
7. **T2: Scheduled Activation** - Make scheduling work
8. **Story 7: Grace Period Display** - Driver visibility
9. **Story 8: Missing Status** - Complete driver states
10. **Story 10: Dialog Grace Info** - Polish publish dialog
11. **Story 4-6, 11-12** - Additional actions

---

## Definition of Done

- [ ] Feature works as described in acceptance criteria
- [ ] TypeScript types are properly defined
- [ ] No linter errors
- [ ] Existing tests pass
- [ ] New functionality has test coverage where appropriate
- [ ] UI matches design specifications
- [ ] Works on mobile viewport
- [ ] Accessible (keyboard navigation, screen readers)
