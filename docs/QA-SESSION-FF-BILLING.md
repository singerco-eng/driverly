# QA Session: Feature Flags & Billing System

> **Created:** 2026-01-30  
> **Scope:** FF-001 Feature Flags + BILLING-001 Subscription System  
> **Estimated Time:** 45-60 minutes

---

## Prerequisites

Before starting, ensure:

- [ ] You have Super Admin, Admin, and Driver test accounts
- [ ] Database migrations are applied (through 027_billing_system.sql)
- [ ] Dev server is running (`npm run dev`)
- [ ] You're logged out and ready to start fresh

---

## Part 1: Feature Flags System (Super Admin)

### 1.1 Access Feature Flags Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as **Super Admin** | Redirected to `/super-admin` |
| 2 | Click "Feature Flags" in sidebar | `/super-admin/feature-flags` page loads |
| 3 | Verify page content | See flags grouped by category (billing, core, operations, etc.) |

**Screenshot checkpoint:** Feature Flags page with categories

### 1.2 Test Search & Filter

| Step | Action | Expected Result |
|------|--------|-----------------|
| 4 | Type "billing" in search | Only billing-related flags shown |
| 5 | Clear search, select "Core" category | Only core flags shown (driver_management, vehicle_management, etc.) |
| 6 | Set filter to "All Categories" | All flags visible again |

### 1.3 Test Global Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 7 | Find "Trip Management" flag (should be OFF) | Toggle shows "Off" state |
| 8 | Click the toggle to turn ON | Toggle switches, toast says "Flag enabled globally" |
| 9 | Refresh page | Flag still shows ON |
| 10 | Toggle it back OFF | Toast confirms, flag is OFF again |

### 1.4 Test Company Overrides (from Feature Flags page)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 11 | Enable "Trip Management" globally | Toggle ON |
| 12 | Go to **Companies** page | See company list |
| 13 | Click on a test company | Company detail page opens |
| 14 | Click **Features** tab | See feature flags for this company |
| 15 | Find "Trip Management" row | Global column shows "On" |
| 16 | Click **Override** button | Modal opens |
| 17 | Toggle to OFF, add reason "Testing override" | Form populated |
| 18 | Click **Save Override** | Modal closes, toast confirms |
| 19 | Verify Override column | Shows "Off" badge |
| 20 | Verify Effective column | Shows X (disabled for this company) |

### 1.5 Verify Override Count on Feature Flags Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 21 | Go back to Feature Flags page | `/super-admin/feature-flags` |
| 22 | Find "Trip Management" flag | Shows "1 override" button |
| 23 | Click "1 override" | Expands to show override list |
| 24 | Verify company name in list | Your test company appears with "Disabled" badge |

### 1.6 Remove Override

| Step | Action | Expected Result |
|------|--------|-----------------|
| 25 | Click trash icon next to the override | Override removed |
| 26 | Verify override count disappears | No more "1 override" button |
| 27 | Go back to Company > Features tab | Override column shows "—" |

### 1.7 Reset Global Flag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 28 | On Feature Flags page, toggle "Trip Management" OFF | Flag disabled globally |

**Checkpoint:** Feature Flags QA complete ✅

---

## Part 2: Billing System Setup

### 2.1 Enable Billing Feature Flag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 29 | On Feature Flags page, find "Billing System" | Currently OFF |
| 30 | Toggle it ON | Flag enabled globally |

**Note:** This enables the billing nav item for all Admin users.

### 2.2 Verify Company Has Subscription

| Step | Action | Expected Result |
|------|--------|-----------------|
| 31 | Go to Companies page | Company list |
| 32 | Click on your test company | Company detail |
| 33 | Click **Billing** tab | Billing tab content loads |
| 34 | Verify "Current Plan" shows "Free" | Auto-created subscription works |
| 35 | Verify "Operator Usage" shows count | Usage calculation works |

**Screenshot checkpoint:** CompanyBillingTab showing Free plan

---

## Part 3: Billing System (Admin View)

### 3.1 Access Admin Billing Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 36 | **Logout** from Super Admin | Back to login |
| 37 | Login as **Admin** of test company | Redirected to `/admin` dashboard |
| 38 | Check sidebar for "Billing" link | Billing nav item visible |
| 39 | Click "Billing" | `/admin/billing` page loads |

**If Billing link is NOT visible:** The `billing_enabled` flag may not be enabled. Go back to Super Admin and enable it.

### 3.2 Verify Billing Page Content

| Step | Action | Expected Result |
|------|--------|-----------------|
| 40 | Check "Current Plan" card | Shows "Free" plan |
| 41 | Check "Operator Usage" card | Shows "X operators" with breakdown |
| 42 | Verify progress bar color | Green (under 80%), Amber (80-99%), Red (at limit) |
| 43 | Verify "View Plans" button exists | Upgrade section visible for Free plan |

**Screenshot checkpoint:** Admin Billing page

### 3.3 Test Upgrade Modal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 44 | Click "View Plans" button | Upgrade modal opens |
| 45 | Verify 3 plans shown | Starter ($59), Growth ($149), Scale ($349) |
| 46 | Toggle "Annual" switch | Prices update to annual rates |
| 47 | Toggle back to "Monthly" | Monthly prices shown |
| 48 | Click "Select" on a plan | **Expected: Error** (Stripe not configured) |
| 49 | Close modal | Modal closes |

**Note:** The "Select" button will fail unless Stripe is configured. This is expected for now.

---

## Part 4: Operator Limit Enforcement

### 4.1 Check Current Usage

| Step | Action | Expected Result |
|------|--------|-----------------|
| 50 | Note your current operator count | e.g., "2 operators" |
| 51 | Calculate: Free plan limit is 4 | Room for X more operators |

### 4.2 Add Operators to Limit

| Step | Action | Expected Result |
|------|--------|-----------------|
| 52 | Go to **Vehicles** page | Vehicle list |
| 53 | Add vehicles until you reach 4 operators | Each add succeeds |
| 54 | Try to add one more vehicle | **Upgrade modal appears** |
| 55 | Verify modal message | "You've reached your operator limit (4/4)" |
| 56 | Close modal | Modal closes, vehicle NOT added |

**Screenshot checkpoint:** Upgrade modal blocking vehicle creation

### 4.3 Verify Warning Banner on Billing Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 57 | Go to `/admin/billing` | Billing page |
| 58 | Check for banner at top | Red "Over plan limit" banner OR amber warning |

---

## Part 5: Super Admin Overrides

### 5.1 Never-Bill Toggle

| Step | Action | Expected Result |
|------|--------|-----------------|
| 59 | Login as **Super Admin** | Back to Super Admin |
| 60 | Go to Companies > Your test company > **Billing** tab | CompanyBillingTab |
| 61 | Toggle **Never Bill** ON | Toast: "Marked as never-bill" |
| 62 | Verify status badge | Shows "never_bill" |
| 63 | **Login as Admin** of that company | Admin view |
| 64 | Go to Vehicles, try to add a vehicle | **Should succeed** (limits bypassed) |

### 5.2 Operator Limit Override

| Step | Action | Expected Result |
|------|--------|-----------------|
| 65 | Login as **Super Admin** | Super Admin view |
| 66 | Go to Companies > Test company > Billing tab | CompanyBillingTab |
| 67 | Toggle **Never Bill** OFF | Back to normal billing |
| 68 | Enter "10" in Operator Limit Override | Override input |
| 69 | Click "Save Override" | Toast: "Operator limit updated" |
| 70 | **Login as Admin** | Admin view |
| 71 | Go to Billing page | See usage bar shows "X/10 operators" |
| 72 | Try to add vehicles up to 10 | Should succeed |

### 5.3 Admin Notes

| Step | Action | Expected Result |
|------|--------|-----------------|
| 73 | As Super Admin, go to Billing tab | CompanyBillingTab |
| 74 | Type a note: "Test customer - special pricing" | Notes textarea |
| 75 | Click "Save Notes" | Toast: "Admin notes updated" |
| 76 | Refresh page | Note persists |

---

## Part 6: Cleanup

| Step | Action | Expected Result |
|------|--------|-----------------|
| 77 | Remove any test vehicles you added | Back to original state |
| 78 | Remove operator limit override (clear field, save) | Uses plan default |
| 79 | Clear admin notes if desired | Clean state |
| 80 | Optionally disable `billing_enabled` flag | Billing nav hidden |

---

## Known Issues / Not Yet Implemented

| Issue | Status |
|-------|--------|
| **Driver approval doesn't check limits** | CODEX-033 will fix |
| **Dashboard doesn't show usage banner** | CODEX-033 will fix |
| **Stripe not configured** | P1 task, needs Stripe account |
| **No Super Admin billing dashboard** | P2 task |
| **No invoice history** | P2 task |

---

## QA Checklist Summary

### Feature Flags (Part 1)
- [ ] Feature Flags page loads with categories
- [ ] Search and filter work
- [ ] Global toggle changes flag state
- [ ] Company override can be created
- [ ] Override shows in Feature Flags override list
- [ ] Override can be removed

### Billing Setup (Part 2-3)
- [ ] Billing feature flag can be enabled
- [ ] Company auto-has Free subscription
- [ ] Admin can access Billing page
- [ ] Current plan and usage display correctly
- [ ] Upgrade modal shows plans

### Limit Enforcement (Part 4)
- [ ] Adding operators up to limit works
- [ ] Adding operator at limit shows upgrade modal
- [ ] Warning/error banners appear appropriately

### Super Admin Controls (Part 5)
- [ ] Never-bill toggle works
- [ ] Never-bill bypasses limits
- [ ] Operator limit override works
- [ ] Admin notes save and persist

---

## Post-QA Actions

If all tests pass:
1. ✅ Mark FF-001 as tested
2. ✅ Mark BILLING-001 as tested (with known gaps)
3. 📋 Assign CODEX-033 for remaining items

If issues found:
1. Document the issue with steps to reproduce
2. Note which step failed
3. Create a fix task or add to CODEX-033

---

## Quick Reference: Test Accounts

| Role | Purpose |
|------|---------|
| Super Admin | Feature flags, company overrides, billing controls |
| Admin | Billing page, operator management, upgrade flows |
| Driver | (Not needed for this QA session) |

---

Good luck with QA! 🧪
