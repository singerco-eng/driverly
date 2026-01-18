# DR-002: Profile Management

> **Last Updated:** 2026-01-16  
> **Status:** Draft  
> **Phase:** 3 - Driver Core

---

## Overview

Profile Management allows drivers to view and edit their personal information, contact details, address, and driver's license information. This is a self-service feature where drivers maintain their own profile data, with certain fields (like employment type) being read-only.

**Key Principle:** Drivers own their profile data. Changes take effect immediately (except email which requires re-verification). License and address changes may affect broker eligibility which is calculated dynamically.

---

## Data Model

### Profile Fields

The driver profile spans multiple tables:

```sql
-- users table (from 02-DATABASE-SCHEMA.md)
-- Contains: email, full_name, phone, avatar_url, address fields

-- drivers table additions for profile
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS
  -- Emergency Contact (optional)
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text;

-- Profile completion is calculated, not stored
-- Based on required field presence
```

### Required Fields for "Profile Complete"

```typescript
const REQUIRED_PROFILE_FIELDS = [
  // Personal
  'full_name',
  'date_of_birth',
  
  // Contact
  'email',
  'phone',
  
  // Address
  'address_line1',
  'city',
  'state',
  'zip_code',
  
  // License
  'license_number',
  'license_state',
  'license_expiration',
  'license_front_url',
  'license_back_url',
] as const;

function isProfileComplete(driver: Driver, user: User): boolean {
  return REQUIRED_PROFILE_FIELDS.every(field => {
    const value = driver[field] ?? user[field];
    return value !== null && value !== undefined && value !== '';
  });
}
```

---

## User Stories

### Driver Stories

1. **As a Driver**, I want to view my profile information so that I can see what's on file.

2. **As a Driver**, I want to edit my contact information so that I can keep it current.

3. **As a Driver**, I want to update my address so that my location is accurate.

4. **As a Driver**, I want to update my license information when I renew so that my eligibility isn't affected.

5. **As a Driver**, I want to add a profile photo so that admins can identify me.

6. **As a Driver**, I want to see which fields are required so that I can complete my profile.

7. **As a Driver**, I want to add an emergency contact for safety.

8. **As a Driver**, I want to change my email address and verify the new one.

9. **As a Driver**, I want to change my password to keep my account secure.

10. **As a Driver**, I want to manage my notification preferences.

---

## UI Specifications

### 1. Profile Page

**Route:** `/driver/profile`

**Layout:** Sectioned form with edit capabilities

```
┌─────────────────────────────────────────────────────────────────┐
│  My Profile                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Profile Completion: 85%                                  │   │
│  │ ═══════════════════════════════════░░░░░░░░░░░░░░░░░░░  │   │
│  │ Missing: Emergency contact (optional)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── Personal Information ─────────────────────────── [Edit]    │
│                                                                 │
│  ┌────────┐                                                    │
│  │  [JS]  │  John Smith                                        │
│  │  📷    │  [Change Photo]                                    │
│  └────────┘                                                    │
│                                                                 │
│  Full Name          John Michael Smith                          │
│  Date of Birth      January 15, 1990 (35 years old)            │
│                                                                 │
│  ── Contact Information ──────────────────────────── [Edit]    │
│                                                                 │
│  Email              john.smith@email.com ✓ Verified            │
│  Phone              (555) 123-4567                              │
│                                                                 │
│  ── Address ──────────────────────────────────────── [Edit]    │
│                                                                 │
│  123 Main Street, Apt 4B                                        │
│  Austin, TX 78701                                               │
│                                                                 │
│  ── Driver's License ─────────────────────────────── [Edit]    │
│                                                                 │
│  License Number     TX-12345678                                 │
│  State              Texas                                       │
│  Expiration         December 31, 2027 (valid)                  │
│                                                                 │
│  [View Front]  [View Back]                                     │
│                                                                 │
│  ── Employment ───────────────────────────────────────────     │
│                                                                 │
│  Type               1099 Independent Contractor                 │
│  Since              January 10, 2026                            │
│                                                                 │
│  ℹ️ Employment type cannot be changed. Contact admin if needed. │
│                                                                 │
│  ── Emergency Contact (Optional) ─────────────────── [Edit]    │
│                                                                 │
│  Not provided                                      [+ Add]      │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  [Account Settings →]                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2. Edit Personal Information Modal

**Trigger:** Edit button on Personal Information section

**Component:** `ElevatedContainer`

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Personal Information                                 [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Profile Photo                                                  │
│  ┌────────────────────────────────────────┐                    │
│  │                                        │                    │
│  │         [Current Photo or             │                    │
│  │              Monogram]                 │                    │
│  │                                        │                    │
│  │   [Upload New]  [Take Photo]  [Remove] │                    │
│  └────────────────────────────────────────┘                    │
│                                                                 │
│  Full Name *                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ John Michael Smith                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Date of Birth *                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ January 15, 1990                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3. Edit Contact Information Modal

**Trigger:** Edit button on Contact Information section

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Contact Information                                  [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Email *                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ john.smith@email.com                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ⚠️ Changing email will require verification                   │
│                                                                 │
│  Phone *                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ (555) 123-4567                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

**Email Change Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Verify New Email                                          [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  We've sent a verification link to:                             │
│  newemail@example.com                                           │
│                                                                 │
│  Click the link in your email to confirm the change.            │
│  Your current email remains active until verified.              │
│                                                                 │
│  Didn't receive it? [Resend Email]                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                    [Done]       │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4. Edit Address Modal

**Trigger:** Edit button on Address section

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Address                                              [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Address Line 1 *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 123 Main Street                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Address Line 2                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Apt 4B                                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ City *           │  │ State *     │  │ ZIP *       │        │
│  │ Austin           │  │ ▼ TX        │  │ 78701       │        │
│  └──────────────────┘  └─────────────┘  └─────────────┘        │
│                                                                 │
│  ⚠️ Changing your state may affect broker eligibility          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. Edit Driver's License Modal

**Trigger:** Edit button on Driver's License section

```
┌─────────────────────────────────────────────────────────────────┐
│  Edit Driver's License                                     [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  License Number *                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ TX-12345678                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────┐  ┌────────────────────────┐        │
│  │ State *                │  │ Expiration *           │        │
│  │ ▼ Texas                │  │ December 31, 2027      │        │
│  └────────────────────────┘  └────────────────────────┘        │
│                                                                 │
│  License Photos                                                 │
│                                                                 │
│  Front *                              Back *                    │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │                         │  │                         │      │
│  │    [Current Photo]      │  │    [Current Photo]      │      │
│  │                         │  │                         │      │
│  │  [Replace] [View Full]  │  │  [Replace] [View Full]  │      │
│  └─────────────────────────┘  └─────────────────────────┘      │
│                                                                 │
│  ℹ️ Renewing your license? Upload new photos after renewal.    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 6. Emergency Contact Modal

**Trigger:** Edit/Add button on Emergency Contact section

```
┌─────────────────────────────────────────────────────────────────┐
│  Emergency Contact                                         [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  This information is optional but recommended for safety.       │
│                                                                 │
│  Contact Name                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Jane Smith                                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Phone Number                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ (555) 987-6543                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Relationship                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▼ Spouse                                                │   │
│  │   • Spouse                                              │   │
│  │   • Parent                                              │   │
│  │   • Sibling                                             │   │
│  │   • Friend                                              │   │
│  │   • Other                                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [Remove Contact]                    [Cancel]  [Save]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. Account Settings Page

**Route:** `/driver/settings`

**Separate page from profile for account/auth settings:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Account Settings                                               │
│                                                                 │
│  ── Security ─────────────────────────────────────────────     │
│                                                                 │
│  Password                                                       │
│  Last changed: January 10, 2026                                │
│                                                [Change Password] │
│                                                                 │
│  Two-Factor Authentication                        Coming Soon   │
│  Add extra security to your account                            │
│                                                                 │
│  ── Email ────────────────────────────────────────────────     │
│                                                                 │
│  Login Email                                                    │
│  john.smith@email.com                     [Change Email]        │
│                                                                 │
│  ── Notifications ────────────────────────────────────────     │
│                                                                 │
│  Email Notifications                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑ Trip assignments and updates                          │   │
│  │ ☑ Credential expiration reminders                       │   │
│  │ ☑ Payment notifications                                 │   │
│  │ ☐ Marketing and announcements                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Push Notifications                             Coming Soon     │
│                                                                 │
│  ── Account ──────────────────────────────────────────────     │
│                                                                 │
│  Joined: January 10, 2026                                       │
│  Status: Active                                                 │
│                                                                 │
│  [Download My Data]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 8. Change Password Modal

**Trigger:** Change Password button

```
┌─────────────────────────────────────────────────────────────────┐
│  Change Password                                           [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Password *                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ••••••••••                                          👁  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  New Password *                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                     👁  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  At least 8 characters, with a number and special character    │
│                                                                 │
│  Confirm New Password *                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                     👁  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Change Password]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 9. Mobile Profile View

**Touch-optimized layout:**

```
┌─────────────────────────────┐
│ ← My Profile                │
├─────────────────────────────┤
│                             │
│ Profile: 85% Complete       │
│ ═══════════════════░░░░░░░░ │
│                             │
│ ┌─────────────────────────┐ │
│ │      [Photo/JS]         │ │
│ │    John Smith           │ │
│ │    [Change Photo]       │ │
│ └─────────────────────────┘ │
│                             │
│ Personal Info          [>] │
│ John Smith • Jan 15, 1990   │
│ ─────────────────────────── │
│                             │
│ Contact                [>] │
│ john.smith@email.com        │
│ (555) 123-4567              │
│ ─────────────────────────── │
│                             │
│ Address                [>] │
│ 123 Main St, Austin TX      │
│ ─────────────────────────── │
│                             │
│ Driver's License       [>] │
│ TX-12345678                 │
│ Expires Dec 31, 2027        │
│ ─────────────────────────── │
│                             │
│ Employment                  │
│ 1099 Contractor             │
│ ─────────────────────────── │
│                             │
│ Emergency Contact      [>] │
│ Not provided                │
│ ─────────────────────────── │
│                             │
│ [Account Settings →]        │
│                             │
└─────────────────────────────┘
```

---

## Acceptance Criteria

### AC-1: Profile View

- [ ] Shows all profile sections: Personal, Contact, Address, License, Employment, Emergency Contact
- [ ] Shows profile completion percentage
- [ ] Shows missing required fields
- [ ] Employment type is read-only with explanation

### AC-2: Edit Personal Info

- [ ] Can edit full name
- [ ] Can edit date of birth
- [ ] Can upload/change/remove profile photo
- [ ] Photo supports upload and camera capture
- [ ] Changes save immediately

### AC-3: Edit Contact Info

- [ ] Can edit phone number
- [ ] Phone validates format
- [ ] Can initiate email change
- [ ] Email change requires verification
- [ ] Current email works until new one verified

### AC-4: Edit Address

- [ ] Can edit all address fields
- [ ] State is dropdown selection
- [ ] Warning shown when changing state
- [ ] Changes save immediately
- [ ] State change triggers broker eligibility recalculation

### AC-5: Edit License

- [ ] Can edit license number
- [ ] Can edit license state
- [ ] Can edit expiration date
- [ ] Can replace license photos (front and back)
- [ ] Can view full-size license photos
- [ ] No admin re-approval required

### AC-6: Emergency Contact

- [ ] Optional section
- [ ] Can add name, phone, relationship
- [ ] Can edit existing contact
- [ ] Can remove contact

### AC-7: Profile Completion

- [ ] Calculates based on required fields
- [ ] Shows percentage and progress bar
- [ ] Lists missing fields
- [ ] Updates in real-time as fields completed

### AC-8: Account Settings

- [ ] Separate settings page
- [ ] Can change password (requires current password)
- [ ] Can change email (requires verification)
- [ ] Can manage notification preferences
- [ ] Shows account info (joined date, status)

### AC-9: Mobile Experience

- [ ] Responsive layout for mobile
- [ ] Touch-friendly edit buttons
- [ ] Camera access for photos
- [ ] Easy navigation between sections

### AC-10: History/Audit

- [ ] Profile changes are logged
- [ ] Can view change history (future enhancement)

---

## API/Queries

### Get Profile

```typescript
async function getDriverProfile(driverId: string) {
  const { data: driver } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users(*)
    `)
    .eq('id', driverId)
    .single();
  
  const isComplete = isProfileComplete(driver, driver.user);
  const missingFields = getMissingProfileFields(driver, driver.user);
  const completionPercent = calculateProfileCompletion(driver, driver.user);
  
  return {
    ...driver,
    user: driver.user,
    isComplete,
    missingFields,
    completionPercent,
  };
}
```

### Update Profile (Personal Info)

```typescript
async function updatePersonalInfo(driverId: string, data: PersonalInfoUpdate) {
  // Update user record
  await supabase
    .from('users')
    .update({
      full_name: data.fullName,
      avatar_url: data.avatarUrl,
    })
    .eq('id', data.userId);
  
  // Update driver record
  await supabase
    .from('drivers')
    .update({
      date_of_birth: data.dateOfBirth,
    })
    .eq('id', driverId);
  
  // Log change
  await logProfileChange(driverId, 'personal_info', data);
}
```

### Update Address

```typescript
async function updateAddress(userId: string, driverId: string, data: AddressUpdate) {
  const oldDriver = await getDriver(driverId);
  const stateChanged = oldDriver.user.state !== data.state;
  
  await supabase
    .from('users')
    .update({
      address_line1: data.addressLine1,
      address_line2: data.addressLine2,
      city: data.city,
      state: data.state,
      zip_code: data.zipCode,
    })
    .eq('id', userId);
  
  // If state changed, broker eligibility will be recalculated automatically
  // via the eligibility functions in AD-007
  
  await logProfileChange(driverId, 'address', data);
}
```

### Update License

```typescript
async function updateLicense(driverId: string, data: LicenseUpdate) {
  await supabase
    .from('drivers')
    .update({
      license_number: data.licenseNumber,
      license_state: data.licenseState,
      license_expiration: data.licenseExpiration,
      license_front_url: data.licenseFrontUrl,
      license_back_url: data.licenseBackUrl,
    })
    .eq('id', driverId);
  
  await logProfileChange(driverId, 'license', data);
}
```

### Change Email

```typescript
async function initiateEmailChange(userId: string, newEmail: string) {
  // Use Supabase auth email change
  const { error } = await supabase.auth.updateUser({
    email: newEmail,
  });
  
  if (error) throw error;
  
  // Supabase will send verification email
  // Current email remains until verified
}
```

### Change Password

```typescript
async function changePassword(currentPassword: string, newPassword: string) {
  // Verify current password by reauthenticating
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: currentUser.email,
    password: currentPassword,
  });
  
  if (authError) {
    throw new Error('Current password is incorrect');
  }
  
  // Update password
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  
  if (error) throw error;
}
```

### Profile Completion

```typescript
function calculateProfileCompletion(driver: Driver, user: User): number {
  const requiredFields = REQUIRED_PROFILE_FIELDS;
  const completedFields = requiredFields.filter(field => {
    const value = driver[field] ?? user[field];
    return value !== null && value !== undefined && value !== '';
  });
  
  return Math.round((completedFields.length / requiredFields.length) * 100);
}

function getMissingProfileFields(driver: Driver, user: User): string[] {
  return REQUIRED_PROFILE_FIELDS.filter(field => {
    const value = driver[field] ?? user[field];
    return value === null || value === undefined || value === '';
  }).map(field => FIELD_LABELS[field]);
}
```

---

## Business Rules

1. **Employment type immutable:** Drivers cannot change their employment type (W2/1099). Contact admin if needed.

2. **Email verification required:** Changing email requires verification. Current email remains active until new one verified.

3. **Phone format validation:** Phone must be valid US format.

4. **License expiration:** Expired license affects driver eligibility. System should warn when approaching expiration.

5. **State change:** Changing state triggers broker eligibility recalculation (service area check).

6. **Profile completion:** Required fields must all be filled for profile to be "complete" (used in onboarding checklist).

7. **Photo storage:** All photos stored in Supabase Storage with appropriate access policies.

8. **Emergency contact optional:** Not required for profile completion or activation.

9. **Audit logging:** All profile changes should be logged for history/audit purposes.

---

## Notification Preferences

| Preference | Description | Default |
|------------|-------------|---------|
| Trip assignments | Notifications about new/updated trips | ✓ On |
| Credential reminders | Expiration warnings | ✓ On |
| Payment notifications | Payment processed alerts | ✓ On |
| Marketing | Announcements, features | ✗ Off |

---

## Dependencies

- `02-DATABASE-SCHEMA.md` - users, drivers tables
- `03-AUTHENTICATION.md` - Supabase Auth for email/password changes
- DR-001 - Onboarding (profile completion tracking)
- AD-007 - Broker Management (eligibility recalculation on state change)

---

## Testing Requirements

### Integration Tests

```typescript
describe('DR-002: Profile Management', () => {
  describe('View Profile', () => {
    it('displays all profile sections');
    it('shows completion percentage');
    it('shows missing required fields');
    it('shows employment as read-only');
  });
  
  describe('Edit Personal Info', () => {
    it('updates name');
    it('updates date of birth');
    it('uploads profile photo');
    it('removes profile photo');
  });
  
  describe('Edit Contact', () => {
    it('updates phone with valid format');
    it('rejects invalid phone format');
    it('initiates email change with verification');
  });
  
  describe('Edit Address', () => {
    it('updates all address fields');
    it('triggers eligibility recalc on state change');
  });
  
  describe('Edit License', () => {
    it('updates license info');
    it('replaces license photos');
    it('does not require admin re-approval');
  });
  
  describe('Account Settings', () => {
    it('changes password with correct current password');
    it('rejects password change with wrong current password');
    it('updates notification preferences');
  });
  
  describe('Profile Completion', () => {
    it('calculates percentage correctly');
    it('identifies missing required fields');
    it('updates in real-time');
  });
});
```

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-16 | Initial spec | - |
