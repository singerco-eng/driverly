# End-to-End Testing Guide

> **Created:** 2026-03-04
> **Purpose:** Walk through every feature in order, from fresh platform setup through full driver lifecycle.
> **Approach:** Follow this guide top-to-bottom. Each section builds on the previous one.
> **Bonus:** This walkthrough creates a realistic demo company you can use for sales pitches and VC demos.

---

## Prerequisites

- Super Admin account (your `singerco@gmail.com` account)
- A modern browser (Chrome recommended for DevTools)
- Access to Supabase dashboard for checking data if needed
- Use a separate email alias (e.g., Gmail `+` trick) for the admin and driver accounts

---

## Demo Company & Test Data Reference

Use this data throughout the guide. Everything below is designed to feel like a real mid-size NEMT/rideshare operator.

### Company

| Field | Value |
|-------|-------|
| Name | **Acme Driver Services** |
| Slug | `acme-drivers` |
| Email | `ops@acmedrivers.com` |
| Phone | `(512) 555-0100` |
| EIN | `84-1234567` |
| Timezone | `America/Chicago` |
| Primary Color | `#1E40AF` (deep blue) |
| Address | 1200 Congress Ave, Suite 300, Austin, TX 78701 |

### Admin

| Field | Value |
|-------|-------|
| Full Name | **Sarah Chen** |
| Email | `yourname+sarah@gmail.com` (use your real Gmail with `+` alias) |
| Phone | `(512) 555-0101` |
| Password | Pick something you'll remember — you'll switch to this account often |

### Locations

| Location | Code | Address | Phone | Email |
|----------|------|---------|-------|-------|
| **Austin HQ** | `ATX` | 1200 Congress Ave, Suite 300, Austin, TX 78701 | `(512) 555-0100` | `austin@acmedrivers.com` |
| **Dallas Branch** | `DFW` | 2501 Cedar Springs Rd, Suite 200, Dallas, TX 75201 | `(214) 555-0200` | `dallas@acmedrivers.com` |

### Trip Sources (Brokers)

| Name | Type | Assignment Mode | Service Area | Contact |
|------|------|----------------|--------------|---------|
| **ModivCare Texas** | State Broker | Admin Assign | Austin, Dallas metro | `dispatch@modivcare-tx.example.com` |
| **Mercy Hospital Network** | Facility | Auto-Join | Austin metro | `transport@mercyhospital.example.com` |
| **SafeRide Insurance** | Insurance | Driver Request | Statewide TX | `partners@saferide.example.com` |

### Credential Types to Create

| Name | Category | Build With | Key Blocks | Scope |
|------|----------|-----------|------------|-------|
| **Driver's License** | Driver | AI Builder — "driver's license upload with extraction" | Document block (license #, state, expiration, class) | Global |
| **Auto Insurance** | Vehicle | AI Builder — "insurance card with policy number and expiration" | Document block (policy #, carrier, expiration) | Global |
| **Vehicle Registration** | Vehicle | Manual — heading + document upload | Document block (plate #, VIN, expiration) | Global |
| **Background Check** | Driver | Manual — external link + admin verify | External link to Checkr, alert block | Global |
| **ModivCare Training** | Driver | Manual — video + quiz + signature | Video, quiz question, checklist, signature pad | Trip Source (ModivCare) |

### Driver Applicants

Create **two** drivers to test both employment types and see a populated list:

| Field | Driver 1 (1099) | Driver 2 (W2) |
|-------|----------------|---------------|
| Email | `yourname+marcus@gmail.com` | `yourname+elena@gmail.com` |
| Full Name | **Marcus Johnson** | **Elena Rodriguez** |
| Phone | `(512) 555-0301` | `(214) 555-0302` |
| DOB | `1988-03-15` | `1992-07-22` |
| Address | 4500 Guadalupe St, Austin, TX 78751 | 3200 Main St, Apt 4B, Dallas, TX 75226 |
| Employment Type | **1099 (Independent)** | **W2 (Employee)** |
| License # | `DL-98234571` | `DL-44219836` |
| License State | TX | TX |
| License Expiration | `2028-03-15` | `2027-11-30` |

**Marcus's Vehicle (1099):**

| Field | Value |
|-------|-------|
| Year | 2022 |
| Make | Toyota |
| Model | Camry |
| Color | Silver |
| Plate | `ABC-1234` |
| VIN | `4T1BF1FK5CU123456` |
| Type | Sedan |

**Elena's Assigned Vehicle (W2 — admin creates and assigns):**

| Field | Value |
|-------|-------|
| Year | 2023 |
| Make | Honda |
| Model | Accord |
| Color | White |
| Plate | `XYZ-5678` |
| VIN | `1HGCV1F38PA654321` |
| Type | Sedan |
| Ownership | Company-owned |

---

## Phase 1: Super Admin — Platform Setup

### 1.1 Login & Navigation

| # | Test | Expected |
|---|------|----------|
| 1 | Go to `/login`, sign in as Super Admin | Redirects to `/super-admin/companies` |
| 2 | Verify sidebar shows: Companies, Billing, Feature Flags, Settings | All nav items visible |
| 3 | Click user menu (bottom-left) | Shows Settings, color mode toggle, Sign Out |
| 4 | Toggle dark/light mode | Theme switches immediately |

### 1.2 Feature Flags

| # | Test | Expected |
|---|------|----------|
| 5 | Navigate to Feature Flags | See flags grouped by category (Billing, Core, Operations, etc.) |
| 6 | Search for a flag by name | List filters correctly |
| 7 | Filter by category | Only that category's flags show |
| 8 | Toggle a flag on/off | Switch changes, persists on refresh |
| 9 | Verify `billing_enabled` flag is ON | Needed for billing tests later |

### 1.3 Create Acme Driver Services

| # | Test | Expected |
|---|------|----------|
| 10 | Go to Companies, click "Add Company" | Create modal opens with 3 tabs |
| 11 | **Basic Info:** Name=`Acme Driver Services`, Slug=`acme-drivers`, Email=`ops@acmedrivers.com`, Phone=`(512) 555-0100` | Fields validate |
| 12 | **Address:** 1200 Congress Ave, Suite 300, Austin, TX 78701 | Address fields accept input |
| 13 | **Branding:** Primary color `#1E40AF` (deep blue) | Color picker works |
| 14 | Submit | Company appears in list with "Active" status |
| 15 | Switch between Table and Cards view | Both render correctly |
| 16 | Search for "Acme" | Filters correctly |
| 17 | Filter by status: Active | Acme shows |

### 1.4 Company Detail

| # | Test | Expected |
|---|------|----------|
| 18 | Click into Acme Driver Services | Detail page loads with Overview tab |
| 19 | Check Overview tab | Stats: Admins 0, Drivers 0, Vehicles 0 |
| 20 | Check Company Info tab | Info matches what you entered |
| 21 | Click Edit, add EIN=`84-1234567`, Timezone=`America/Chicago` | Edit modal pre-filled, saves |
| 22 | Verify changes on Company Info tab | Updated fields shown |

### 1.5 Invite Sarah Chen (Admin)

| # | Test | Expected |
|---|------|----------|
| 23 | Go to Admins tab | Empty state — no admins yet |
| 24 | Click "Invite Admin" | Modal opens |
| 25 | Enter: Name=`Sarah Chen`, Email=`yourname+sarah@gmail.com`, Phone=`(512) 555-0101` | Fields validate |
| 26 | Submit | Invitation created |
| 27 | Go to Invitations tab | Pending invitation for Sarah Chen with Resend/Revoke |
| 28 | Click Resend | Confirmation dialog, invitation resent |

### 1.6 Company Feature Overrides

| # | Test | Expected |
|---|------|----------|
| 29 | Go to Features tab on Acme detail | Shows global flags with override column |
| 30 | Enable `billing_enabled` for Acme specifically | Override saved |
| 31 | Remove the override | Falls back to global default |

### 1.7 Company Billing Tab

| # | Test | Expected |
|---|------|----------|
| 32 | Go to Billing tab on Acme detail | Plan info, usage, overrides |
| 33 | Toggle "Never Bill" ON (this is your demo company) | Persists |
| 34 | Set Operator Limit Override to `50` (generous for demo) | Persists |
| 35 | Add Admin Notes: "Demo company for E2E testing and sales demos" | Text saves |

### 1.8 Company Status Changes

| # | Test | Expected |
|---|------|----------|
| 36 | Use More menu > Suspend | Confirmation modal with reason field |
| 37 | Suspend with reason "Testing status flow" | Status changes to "Suspended" |
| 38 | Reactivate the company | Status returns to "Active" |

### 1.9 Super Admin Billing Dashboard

| # | Test | Expected |
|---|------|----------|
| 39 | Navigate to Billing (sidebar) | See MRR, Total Companies, Paid Subscribers, Free Tier stats |
| 40 | Review subscriptions table | Company subscriptions listed |

### 1.10 Super Admin Settings

| # | Test | Expected |
|---|------|----------|
| 41 | Navigate to Settings | Theme presets shown in cards or table |
| 42 | Switch theme preset | UI updates to new theme |
| 43 | Switch between Cards and Table view | Both render |

---

## Phase 2: Admin Account Setup (Sarah Chen)

### 2.1 Accept Admin Invitation

| # | Test | Expected |
|---|------|----------|
| 44 | Check email for `yourname+sarah@gmail.com`, click accept link | Accept invitation page loads |
| 45 | Create password and accept | Account created, redirected to admin portal |
| 46 | Verify you land on `/admin` dashboard | Dashboard shows Acme branding (deep blue, "A" logo) |

### 2.2 Admin Dashboard & Navigation

| # | Test | Expected |
|---|------|----------|
| 47 | Check dashboard | Shows driver count (0), vehicle count (0) |
| 48 | Verify sidebar: Dashboard, Applicants, Drivers, Vehicles, Locations, Trip Sources, Credential Builder, Credential Review | All present |
| 49 | Billing nav item visible | Shows (feature flag is on) |
| 50 | Click user menu | Shows "Sarah Chen", email, Settings, color mode, Sign Out |

---

## Phase 3: Admin — Credential Types (Build Before Drivers Apply)

> Create credential types FIRST so they exist when drivers onboard.

### 3.1 Create All Five Credential Types

| # | Test | Expected |
|---|------|----------|
| 51 | Go to Credential Builder (sidebar) | Empty state |
| 52 | Click "Add Type" | Create modal: name, category, description |
| 53 | Create **"Driver's License"** — category: Driver | Created in Draft status |
| 54 | Create **"Auto Insurance"** — category: Vehicle | Created in Draft |
| 55 | Create **"Vehicle Registration"** — category: Vehicle | Created in Draft |
| 56 | Create **"Background Check"** — category: Driver | Created in Draft |
| 57 | Create **"ModivCare Training"** — category: Driver | Created in Draft |
| 58 | Switch Table/Cards view | All 5 show in both views |
| 59 | Filter by category: Driver | Shows 3 (License, Background, Training) |
| 60 | Filter by category: Vehicle | Shows 2 (Insurance, Registration) |

### 3.2 Build "Driver's License" with AI Builder

| # | Test | Expected |
|---|------|----------|
| 61 | Click into Driver's License, click "AI Editor" | Two-panel chat view |
| 62 | Type: "I need a driver's license upload with extraction" | AI shows field selection (license #, state, expiration, class) |
| 63 | Check all fields, click Done | Document block appears in preview |
| 64 | Verify preview shows upload area + extraction fields | Interactive preview works |
| 65 | Save | Config persists |

### 3.3 Build "Auto Insurance" with AI Builder

| # | Test | Expected |
|---|------|----------|
| 66 | Click into Auto Insurance, click "AI Editor" | Chat opens |
| 67 | Type: "insurance card with policy number and expiration" | AI shows field selection (policy #, carrier, expiration) |
| 68 | Select fields and click Done | Document block in preview |
| 69 | Type a vague follow-up (e.g., "looks good") | AI responds with text only — **no crash** (our bug fix!) |
| 70 | Save | Persists |

### 3.4 Build "Vehicle Registration" Manually

| # | Test | Expected |
|---|------|----------|
| 71 | Click into Vehicle Registration, stay in manual editor | Editor with Instructions, Requirements, Expiration, Settings tabs |
| 72 | Add a step, add blocks: heading ("Vehicle Registration"), paragraph, document upload | Blocks appear in preview |
| 73 | Drag to reorder blocks | Order updates |
| 74 | Configure Requirements: required, scope=Global | Settings save |
| 75 | Configure Expiration: enable expiration tracking | Settings save |
| 76 | Save Draft | Saves |
| 77 | Open Full Page Preview | Renders as driver would see it |

### 3.5 Build "Background Check" Manually

| # | Test | Expected |
|---|------|----------|
| 78 | Click into Background Check | Editor loads |
| 79 | Add step with: heading, paragraph ("Complete your background check through Checkr"), external_link block (URL: `https://checkr.com`, button: "Start Background Check"), alert block (variant: info, "An admin will review your results") | Preview shows full flow |
| 80 | Set completion type to `external_confirm` | Admin must verify |
| 81 | Save | Persists |

### 3.6 Build "ModivCare Training" Manually

| # | Test | Expected |
|---|------|----------|
| 82 | Click into ModivCare Training | Editor loads |
| 83 | Add step 1: heading ("Safety Training Video"), video block (YouTube placeholder URL, require watch) | Video step in preview |
| 84 | Add step 2: heading ("Knowledge Check"), quiz_question block (question about safety, multiple choice, allow retry) | Quiz step in preview |
| 85 | Add step 3: heading ("Acknowledgment"), checklist (2 items: "I completed training", "I understand policies"), signature_pad | Signature step in preview |
| 86 | Configure Requirements: scope=**Trip Source** (ModivCare only) | Settings save |
| 87 | Save | Persists |

### 3.7 Publish All Credentials

| # | Test | Expected |
|---|------|----------|
| 88 | On Driver's License: click Publish, publish immediately | Status: Active |
| 89 | On Auto Insurance: Publish immediately | Status: Active |
| 90 | On Vehicle Registration: Publish immediately | Status: Active |
| 91 | On Background Check: Publish immediately | Status: Active |
| 92 | On ModivCare Training: try **Schedule** for tomorrow's date | Status: Scheduled |
| 93 | Cancel the schedule on ModivCare Training | Returns to Draft |
| 94 | Publish ModivCare Training immediately | Status: Active |
| 95 | Deactivate ModivCare Training, then Reactivate | Status toggles correctly |

---

## Phase 4: Admin — Trip Sources (Brokers)

### 4.1 Create Three Trip Sources

| # | Test | Expected |
|---|------|----------|
| 96 | Go to Trip Sources (sidebar) | Empty state |
| 97 | Click "Add Trip Source" | Create modal |
| 98 | Create **ModivCare Texas**: Type=State Broker, Mode=Admin Assign, Area="Austin, Dallas metro", Contact=`dispatch@modivcare-tx.example.com` | Appears in list |
| 99 | Create **Mercy Hospital Network**: Type=Facility, Mode=Auto-Join, Area="Austin metro", Contact=`transport@mercyhospital.example.com` | Appears |
| 100 | Create **SafeRide Insurance**: Type=Insurance, Mode=Driver Request, Area="Statewide TX", Contact=`partners@saferide.example.com` | Appears |
| 101 | Switch Table/Cards, search "Mercy", filter by type=Facility | All work |

### 4.2 Trip Source Detail

| # | Test | Expected |
|---|------|----------|
| 102 | Click into ModivCare Texas | Detail: Overview, Drivers, Credentials, Rates tabs |
| 103 | Check Overview | Stats, "Admin Assign" mode, contact info |
| 104 | Edit: change service area text | Edit modal pre-filled, saves |
| 105 | Click into SafeRide Insurance | "Driver Request" mode visible |
| 106 | Set SafeRide Inactive, then reactivate | Status toggles |

---

## Phase 5: Admin — Locations

### 5.1 Create Two Locations

| # | Test | Expected |
|---|------|----------|
| 107 | Go to Locations (sidebar) | Empty state |
| 108 | Click "Add Location" | Create modal |
| 109 | Create **Austin HQ**: Code=`ATX`, Address=1200 Congress Ave Suite 300 Austin TX 78701, Phone=`(512) 555-0100`, Email=`austin@acmedrivers.com` | Appears in list |
| 110 | Create **Dallas Branch**: Code=`DFW`, Address=2501 Cedar Springs Rd Suite 200 Dallas TX 75201, Phone=`(214) 555-0200`, Email=`dallas@acmedrivers.com` | Appears |
| 111 | Switch Table/Cards, search "Dallas", filter by status | All work |

### 5.2 Location Detail

| # | Test | Expected |
|---|------|----------|
| 112 | Click into Austin HQ | Detail: Summary, Drivers, Vehicles, Credentials, Trip Sources tabs |
| 113 | Edit Austin HQ: change phone number | Edit modal, saves |
| 114 | Go to Trip Sources tab, assign **ModivCare Texas** to Austin HQ | Unified Assignment Modal, broker linked |
| 115 | Go to Trip Sources tab, assign **Mercy Hospital** to Austin HQ | Second broker linked |
| 116 | Click into Dallas Branch | Detail loads |
| 117 | Assign **ModivCare Texas** and **SafeRide Insurance** to Dallas | Both linked |
| 118 | Set Dallas Branch Inactive, then reactivate | Status toggles |

---

## Phase 6: Driver Applications (Public)

### 6.1 Apply as Marcus Johnson (1099 Independent)

| # | Test | Expected |
|---|------|----------|
| 119 | Go to `/apply/acme-drivers` | Application wizard with Acme branding (deep blue) |
| 120 | Step 1: Create account — email=`yourname+marcus@gmail.com`, pick a password | Account created |
| 121 | Step 2: Name=Marcus Johnson, Phone=`(512) 555-0301`, DOB=`1988-03-15`, Address=4500 Guadalupe St, Austin TX 78751 | Fields validate |
| 122 | Step 3: Employment type = **1099 (Independent Contractor)** | Selection saves |
| 123 | Step 4: License #=`DL-98234571`, State=TX, Expiration=`2028-03-15`, upload sample front/back photos | Photos upload |
| 124 | Step 5: Vehicle — 2022 Toyota Camry, Silver, Plate=`ABC-1234`, VIN=`4T1BF1FK5CU123456`, Sedan | Vehicle fields work |
| 125 | Review step: verify all info | Everything shown correctly |
| 126 | Submit | Redirects to `/driver/application-status`, shows "Pending" |

### 6.2 Apply as Elena Rodriguez (W2 Employee)

| # | Test | Expected |
|---|------|----------|
| 127 | Open incognito/new browser, go to `/apply/acme-drivers` | Fresh application wizard |
| 128 | Step 1: email=`yourname+elena@gmail.com`, pick a password | Account created |
| 129 | Step 2: Name=Elena Rodriguez, Phone=`(214) 555-0302`, DOB=`1992-07-22`, Address=3200 Main St Apt 4B, Dallas TX 75226 | Validates |
| 130 | Step 3: Employment type = **W2 (Employee)** | Selection saves |
| 131 | Step 4: License #=`DL-44219836`, State=TX, Expiration=`2027-11-30`, upload photos | Photos upload |
| 132 | (No Step 5 — W2 skips vehicle) | Wizard goes to Review |
| 133 | Review and Submit | Redirects to application status, "Pending" |
| 134 | Verify auto-save: start a third application, close tab, reopen | Progress restored |

---

## Phase 7: Admin — Application Review

> Log back in as Sarah Chen (admin).

### 7.1 Review Marcus's Application (Approve)

| # | Test | Expected |
|---|------|----------|
| 135 | Log in as Sarah (`yourname+sarah@gmail.com`), go to Applicants | Both applications visible (Marcus + Elena) |
| 136 | Filter by type: 1099 | Only Marcus shows |
| 137 | Click into Marcus Johnson | Review page: personal info, license photos, vehicle info |
| 138 | View license front/back photos | Images load |
| 139 | Add admin notes: "Experienced 1099 driver, approved for Austin HQ" | Notes save |
| 140 | Click Approve | Status: Approved. Driver record created. |

### 7.2 Review Elena's Application (Reject, Then Approve)

| # | Test | Expected |
|---|------|----------|
| 141 | Click into Elena Rodriguez | Review page: personal info, license photos (no vehicle — W2) |
| 142 | Click Reject | Rejection modal appears |
| 143 | Enter reason: "Testing rejection flow" and reject | Status: Rejected |
| 144 | **(If reapply is supported):** Note the rejection shows on Elena's status page | Elena sees reason |
| 145 | Back in Applicants, filter by Rejected | Elena shows |
| 146 | Re-review Elena and Approve (or create a new application for her) | Status: Approved, driver record created |

---

## Phase 8: Driver Portal — Marcus Johnson (1099 Onboarding)

> Log in as Marcus (`yourname+marcus@gmail.com`).

### 8.1 First Login & Dashboard

| # | Test | Expected |
|---|------|----------|
| 147 | Log in as Marcus | Redirects to `/driver` dashboard with Acme branding |
| 148 | Welcome box visible | Shows **1099 Independent Contractor** welcome message |
| 149 | Getting Started checklist visible | Shows incomplete onboarding steps |
| 150 | Dismiss welcome box (check "don't show again") | Box hides, stays hidden on refresh |

### 8.2 Complete Profile

| # | Test | Expected |
|---|------|----------|
| 151 | Go to Profile | Completion banner showing partial percentage (app data pre-filled) |
| 152 | Edit Personal Info | Pre-filled: Marcus Johnson, phone, DOB |
| 153 | Edit Address | Pre-filled: 4500 Guadalupe St |
| 154 | Edit License | Pre-filled: DL-98234571, TX, 2028-03-15 |
| 155 | Add Emergency Contact: Name=Lisa Johnson, Phone=`(512) 555-0399`, Relationship=Spouse | Modal saves |
| 156 | Profile completion percentage increases | Banner updates or disappears |
| 157 | Dashboard checklist | "Complete profile" checked off |

### 8.3 Vehicle (Marcus already has one from application)

| # | Test | Expected |
|---|------|----------|
| 158 | Go to Vehicles | Toyota Camry from application is listed |
| 159 | View vehicle detail | Summary: 2022 Toyota Camry, Silver, ABC-1234 |
| 160 | Edit vehicle: add color if missing | Edit modal saves |
| 161 | Set as primary | Primary badge appears |
| 162 | Check Credentials tab on vehicle | Vehicle credentials listed (Auto Insurance, Registration) |
| 163 | Dashboard checklist | "Add vehicle" already checked |

### 8.4 Submit Credentials

| # | Test | Expected |
|---|------|----------|
| 164 | Go to Credentials | Shows: Driver's License, Background Check (driver), Auto Insurance, Vehicle Registration (vehicle) |
| 165 | Filter by type: Driver | Shows License + Background Check |
| 166 | Filter by type: Vehicle | Shows Insurance + Registration |
| 167 | Click into **Driver's License** | Instruction steps: heading, paragraph, document upload with extraction fields |
| 168 | Upload a sample license image | Upload works, extraction fields appear |
| 169 | Submit | Status: "Pending Review" |
| 170 | Click into **Auto Insurance** (vehicle credential) | Document upload with policy #, carrier, expiration fields |
| 171 | Upload and submit | Status: "Pending Review" |
| 172 | Click into **Vehicle Registration** | Upload flow |
| 173 | Upload and submit | Status: "Pending Review" |
| 174 | Click into **Background Check** | External link to Checkr, info alert |
| 175 | Click external link (opens in new tab) | Link tracked |
| 176 | Dashboard checklist | "Submit credentials" progresses |

### 8.5 Trip Sources (Before Credentials Approved)

| # | Test | Expected |
|---|------|----------|
| 177 | Go to Trip Sources | GlobalCredentialsGate blocks — credentials still pending |
| 178 | Message explains what's needed | Clear blocker list shown |

> **Pause Marcus here** — switch to admin to review his credentials, then come back.

### 8.6 Set Availability

| # | Test | Expected |
|---|------|----------|
| 179 | Go to Availability | Weekly schedule grid |
| 180 | Turn on Mon–Fri, 7:00 AM to 6:00 PM | Days toggle on |
| 181 | Turn on Saturday, 8:00 AM to 2:00 PM | Weekend partial |
| 182 | Save | Persists on refresh |
| 183 | Dashboard checklist | "Set availability" checked off |

### 8.7 Payment Settings (If Feature Enabled)

| # | Test | Expected |
|---|------|----------|
| 184 | Go to Settings > Payment | Payment method selection |
| 185 | Select Direct Deposit, enter: Bank=Chase, Routing=`021000021`, Account=`123456789`, Type=Checking | Fields work |
| 186 | Save | Persists |
| 187 | Dashboard checklist | "Add payment info" checked off |

### 8.8 Account Settings

| # | Test | Expected |
|---|------|----------|
| 188 | Go to Settings > Account | Security, email, appearance, notifications |
| 189 | Toggle notification preferences ON for all | Settings save |
| 190 | Change theme | Theme updates |

---

## Phase 9: Admin — Review Marcus's Credentials & Assign

> Log back in as Sarah Chen (admin).

### 9.1 Credential Review Queue

| # | Test | Expected |
|---|------|----------|
| 191 | Go to Credential Review | Badge shows pending count (3–4 from Marcus) |
| 192 | Drivers tab | Marcus's Driver's License, Background Check |
| 193 | Vehicles tab | Marcus's Auto Insurance, Vehicle Registration |
| 194 | Filter by status, search | Works |

### 9.2 Approve Marcus's Credentials

| # | Test | Expected |
|---|------|----------|
| 195 | Click into Driver's License | Submitted document visible, extraction fields shown |
| 196 | Approve with expiration date `2028-03-15` | Status: Approved |
| 197 | Click into Auto Insurance | Document visible |
| 198 | Approve with expiration date 1 year from now | Approved |
| 199 | Click into Vehicle Registration | Document visible |
| 200 | Approve | Approved |
| 201 | Click into Background Check | External link visited marker |
| 202 | Approve (admin verify) | Approved |
| 203 | Check History tab | All 4 reviews appear |

### 9.3 Assign Marcus to Austin HQ

| # | Test | Expected |
|---|------|----------|
| 204 | Go to Drivers > Marcus Johnson | Detail page |
| 205 | (If location assignment is on summary) Assign to **Austin HQ** | Marcus linked to ATX |

### 9.4 Assign Marcus to ModivCare (Admin Assign)

| # | Test | Expected |
|---|------|----------|
| 206 | Go to Trip Sources > ModivCare Texas > Drivers tab | Driver list |
| 207 | Click "Assign Drivers", select Marcus | Assignment modal, Marcus assigned |

---

## Phase 10: Driver Portal — Marcus Goes Active

> Log back in as Marcus.

### 10.1 Trip Sources (After Credentials Approved)

| # | Test | Expected |
|---|------|----------|
| 208 | Go to Trip Sources | Gate removed — tabs visible |
| 209 | **Assigned tab** | ModivCare Texas shows (admin-assigned) |
| 210 | **Available tab** | Mercy Hospital (auto-join), SafeRide Insurance (driver request) |
| 211 | Click Mercy Hospital > auto-join | Immediately assigned, moves to Assigned tab |
| 212 | Click SafeRide Insurance > Request | Confirmation modal, moves to Pending tab |
| 213 | **Pending tab** | SafeRide shows |
| 214 | Cancel SafeRide request | Moves back to Available |
| 215 | View trip source details modal | Details, eligibility info |

### 10.2 Go Active

| # | Test | Expected |
|---|------|----------|
| 216 | All checklist items complete | "Ready to drive" card on dashboard |
| 217 | Click "Go Active" | Status: Active |
| 218 | Toggle to Inactive | GoInactiveModal asks for reason, enter "Taking a break" |
| 219 | Toggle back to Active | Active again |

---

## Phase 11: Driver Portal — Elena Rodriguez (W2 Onboarding)

> Log in as Elena (`yourname+elena@gmail.com`). This tests the W2 flow which differs from 1099.

### 11.1 Dashboard & Profile

| # | Test | Expected |
|---|------|----------|
| 220 | Log in as Elena | Dashboard with **W2 Employee** welcome message |
| 221 | Complete profile: add emergency contact (Maria Rodriguez, `(214) 555-0398`, Mother) | Saves |
| 222 | Dashboard checklist shows W2-specific items | No "add vehicle" item (W2 drivers don't own vehicles) |

### 11.2 Vehicles (W2 — Admin Assigns)

| # | Test | Expected |
|---|------|----------|
| 223 | Go to Vehicles | Empty or shows "Vehicles are assigned by your company" message |
| 224 | No "Add Vehicle" button | W2 drivers can't add vehicles |

> **Switch to admin** to create and assign Elena's vehicle.

### 11.3 Admin: Create & Assign Vehicle for Elena

| # | Test | Expected |
|---|------|----------|
| 225 | Log in as Sarah, go to Vehicles > Add Vehicle | Create modal |
| 226 | Enter: 2023 Honda Accord, White, Plate=`XYZ-5678`, VIN=`1HGCV1F38PA654321`, Sedan, Company-owned | Created |
| 227 | Go to Drivers > Elena Rodriguez > Vehicles tab | Empty |
| 228 | Click "Assign Vehicle", select Honda Accord | Unified Assignment Modal, vehicle assigned |
| 229 | Assign Elena to **Dallas Branch** | Elena linked to DFW |

### 11.4 Elena Continues Onboarding

| # | Test | Expected |
|---|------|----------|
| 230 | Log back in as Elena | Dashboard checklist updated |
| 231 | Go to Vehicles | Honda Accord visible (read-only — assigned by admin) |
| 232 | View vehicle detail | Summary shows, no edit/retire options for W2 |
| 233 | Go to Credentials | Driver + vehicle credentials listed |
| 234 | Submit Driver's License (same flow as Marcus) | Pending Review |
| 235 | Submit vehicle credentials (Insurance, Registration for Honda) | Pending Review |
| 236 | Set availability: Mon–Fri, 8:00 AM to 5:00 PM | Saves |

---

## Phase 12: Admin — Bulk Operations

> Log back in as Sarah. You now have 2 drivers, 2 vehicles, 2 locations — test management at scale.

### 12.1 Driver Management

---

| # | Test | Expected |
|---|------|----------|
| 237 | Go to Drivers | Marcus + Elena both listed |
| 238 | Search "Elena" | Filters to Elena only |
| 239 | Filter by type: W2 | Elena only |
| 240 | Filter by type: 1099 | Marcus only |
| 241 | Click into Marcus > Summary | Full info: personal, address, license, emergency contact |
| 242 | Edit Marcus: add a note or change phone | Edit modal works |
| 243 | Suspend Marcus with reason "Testing suspension" | Status: Suspended |
| 244 | Reactivate Marcus | Status: Active |

### 12.2 Vehicle Management

| # | Test | Expected |
|---|------|----------|
| 245 | Go to Vehicles | Toyota Camry (Marcus, 1099) + Honda Accord (company-owned) |
| 246 | Filter by ownership: Company | Honda only |
| 247 | Filter by ownership: Driver | Toyota only |
| 248 | Click Toyota Camry > Assignments tab | Shows Marcus as assigned driver |
| 249 | Click Honda Accord > Assignments tab | Shows Elena as assigned driver |
| 250 | Edit Honda Accord: change color to "Pearl White" | Saves |
| 251 | Set Honda Inactive, then reactivate | Status toggles |

### 12.3 Review Elena's Credentials

| # | Test | Expected |
|---|------|----------|
| 252 | Go to Credential Review | Elena's submissions pending |
| 253 | Approve Elena's Driver's License | Approved |
| 254 | Reject Elena's Auto Insurance with reason "Image too blurry, please resubmit" | Rejected — Elena sees reason |
| 255 | Approve Vehicle Registration | Approved |
| 256 | Check History tab | All reviews logged |

### 12.4 Location Assignments (Full Picture)

| # | Test | Expected |
|---|------|----------|
| 257 | Go to Locations > Austin HQ > Drivers tab | Marcus listed |
| 258 | Assign Marcus's Toyota Camry to Austin HQ (Vehicles tab) | Vehicle linked |
| 259 | Go to Dallas Branch > Drivers tab | Elena listed |
| 260 | Assign Honda Accord to Dallas Branch | Vehicle linked |
| 261 | Check Dallas Trip Sources tab | ModivCare + SafeRide linked |
| 262 | Remove SafeRide from Dallas | Unlinks |
| 263 | Re-add SafeRide | Re-links |

---

## Phase 13: Admin — Billing

### 13.1 Billing Page

| # | Test | Expected |
|---|------|----------|
| 264 | Go to Billing (sidebar) | Current plan, operator usage bar (should show 2 drivers + 2 vehicles) |
| 265 | Free plan: see upgrade CTA | Upgrade modal available |
| 266 | Click "Manage Plan" or "Upgrade" | Opens Stripe checkout or billing portal |
| 267 | After Stripe success redirect (`?success=true`) | Success state shown |
| 268 | After Stripe cancel redirect (`?canceled=true`) | Canceled state shown |

---

## Phase 14: Admin — Settings

| # | Test | Expected |
|---|------|----------|
| 269 | Go to Settings (sidebar or user menu) | Company profile shows Acme Driver Services info |
| 270 | Review company profile | Name, color, email, phone, timezone, address all correct |
| 271 | Change theme preset | Theme applies across admin portal |

---

## Phase 15: Cross-Cutting Concerns

### 15.1 Role-Based Access

| # | Test | Expected |
|---|------|----------|
| 272 | As Marcus (driver): navigate to `/admin` | Redirected or blocked |
| 273 | As Sarah (admin): navigate to `/super-admin` | Redirected or blocked |
| 274 | As Super Admin: navigate to `/driver` | Redirected or blocked |

### 15.2 Mobile Responsiveness

| # | Test | Expected |
|---|------|----------|
| 275 | Resize browser to mobile width | Sidebar collapses, hamburger menu appears |
| 276 | Test as Sarah: dashboard, driver list, credential review | Layouts adapt |
| 277 | Test as Marcus: dashboard, credentials, vehicle detail | Layouts adapt |

### 15.3 Error States

| # | Test | Expected |
|---|------|----------|
| 278 | Navigate to `/admin/drivers/fake-uuid-here` | Graceful error or "not found" |
| 279 | Submit a form with missing required fields | Validation errors shown |
| 280 | Trigger network error (DevTools > Network > Offline) | Error toast or message |

### 15.4 Empty States

| # | Test | Expected |
|---|------|----------|
| 281 | As Sarah: view Credential Review with nothing pending | Helpful empty state |
| 282 | Create a new company via Super Admin, check its admin portal | All list pages show empty states |

### 15.5 Dark/Light Mode

| # | Test | Expected |
|---|------|----------|
| 283 | Toggle color mode on admin dashboard, driver dashboard, credential detail, and location detail | No broken colors, readable text, proper contrast |

---

## Demo Environment Summary

After completing this guide, your **Acme Driver Services** demo has:

| Entity | Count | Details |
|--------|-------|---------|
| Company | 1 | Acme Driver Services (Austin, TX) |
| Admin | 1 | Sarah Chen |
| Locations | 2 | Austin HQ (ATX), Dallas Branch (DFW) |
| Trip Sources | 3 | ModivCare (admin assign), Mercy Hospital (auto-join), SafeRide (driver request) |
| Credential Types | 5 | License, Insurance, Registration, Background Check, ModivCare Training |
| Drivers | 2 | Marcus Johnson (1099, Austin), Elena Rodriguez (W2, Dallas) |
| Vehicles | 2 | Toyota Camry (driver-owned), Honda Accord (company-owned) |

**Demo-ready scenarios you can walk through in a pitch:**
- "Here's what a driver sees when they apply" → `/apply/acme-drivers`
- "Here's the admin reviewing applications" → Sarah's Applicants page
- "AI-powered credential builder" → Credential Builder with AI chat
- "Multi-location management" → Austin HQ vs Dallas Branch with different brokers
- "Driver onboarding checklist" → Marcus's dashboard with getting started
- "Credential review queue" → Sarah's review page with badge count

---

## Quick Reference: Test Accounts

| Role | Name | Email | Password |
|------|------|-------|----------|
| Super Admin | You | `singerco@gmail.com` | Your existing password |
| Admin | Sarah Chen | `yourname+sarah@gmail.com` | Whatever you set |
| Driver (1099) | Marcus Johnson | `yourname+marcus@gmail.com` | Whatever you set |
| Driver (W2) | Elena Rodriguez | `yourname+elena@gmail.com` | Whatever you set |

> **Tip:** Replace `yourname` with your actual Gmail username (before the @). Gmail ignores everything after `+`, so all emails land in your inbox.

## Quick Reference: Order of Operations

```
1.  Super Admin: Create Acme Driver Services
2.  Super Admin: Set feature flags (billing ON)
3.  Super Admin: Invite Sarah Chen as admin
4.  Sarah: Accept invite, log in
5.  Sarah: Create 5 credential types (AI + manual), publish all
6.  Sarah: Create 3 trip sources (ModivCare, Mercy, SafeRide)
7.  Sarah: Create 2 locations (Austin HQ, Dallas Branch)
8.  Sarah: Link trip sources to locations
9.  Marcus: Apply at /apply/acme-drivers (1099 with vehicle)
10. Elena: Apply at /apply/acme-drivers (W2, no vehicle)
11. Sarah: Approve Marcus, reject then re-approve Elena
12. Marcus: Complete profile, submit 4 credentials, set availability
13. Sarah: Approve Marcus's credentials
14. Marcus: Join trip sources, go active
15. Sarah: Create Honda Accord, assign to Elena + Dallas Branch
16. Elena: Complete profile, submit credentials
17. Sarah: Review Elena's credentials (approve some, reject one)
18. Cross-cutting: role access, mobile, errors, dark mode
```
