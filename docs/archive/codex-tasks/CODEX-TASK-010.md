# TASK 010: Driver Profile Management (DR-002)

## Context

Build the Driver Profile Management feature - a **self-service interface** where drivers view and edit their personal information, contact details, address, driver's license, and emergency contact. This replaces the "Coming Soon" placeholder currently at `/driver/profile`.

**Key Principle:** Drivers own their profile data. Changes take effect immediately (except email which requires re-verification). License and address changes may affect broker eligibility which is calculated dynamically.

**Reference:** `docs/features/driver/DR-002-profile-management.md`

## Prerequisites

- Migration `016_driver_profile.sql` applied to Supabase
- Driver Layout and authentication complete
- Driver Onboarding (DR-001) complete
- Driver has approved application and can access portal

## Your Tasks

### Task 1: Profile Types

Create `src/types/profile.ts`:

```typescript
export interface ProfileSection {
  key: 'personal' | 'contact' | 'address' | 'license' | 'emergency' | 'employment';
  label: string;
  isComplete: boolean;
  fields: ProfileFieldStatus[];
}

export interface ProfileFieldStatus {
  key: string;
  label: string;
  value: string | null;
  required: boolean;
  isFilled: boolean;
}

export interface ProfileCompletionStatus {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  sections: ProfileSection[];
}

export interface PersonalInfoFormData {
  full_name: string;
  date_of_birth: string;
  avatar_url: string | null;
}

export interface ContactInfoFormData {
  email: string;
  phone: string;
}

export interface AddressFormData {
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip_code: string;
}

export interface LicenseFormData {
  license_number: string;
  license_state: string;
  license_expiration: string;
  license_front_url: string | null;
  license_back_url: string | null;
}

export interface EmergencyContactFormData {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_trip_assignments: boolean;
  email_credential_reminders: boolean;
  email_payment_notifications: boolean;
  email_marketing: boolean;
  push_trip_assignments: boolean;
  push_credential_reminders: boolean;
  push_payment_notifications: boolean;
  sms_enabled: boolean;
}

export interface ProfileChangeRecord {
  id: string;
  driver_id: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface ChangePasswordFormData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
```

### Task 2: Profile Service

Create `src/services/profile.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type {
  ProfileCompletionStatus,
  PersonalInfoFormData,
  ContactInfoFormData,
  AddressFormData,
  LicenseFormData,
  EmergencyContactFormData,
  NotificationPreferences,
  ProfileChangeRecord,
} from '@/types/profile';
import type { DriverWithUser } from '@/types/driver';

// Required fields for profile completion
const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'Full Name', source: 'user' },
  { key: 'date_of_birth', label: 'Date of Birth', source: 'driver' },
  { key: 'email', label: 'Email', source: 'user' },
  { key: 'phone', label: 'Phone', source: 'user' },
  { key: 'address_line1', label: 'Address', source: 'driver' },
  { key: 'city', label: 'City', source: 'driver' },
  { key: 'state', label: 'State', source: 'driver' },
  { key: 'zip', label: 'ZIP Code', source: 'driver' },
  { key: 'license_number', label: 'License Number', source: 'driver' },
  { key: 'license_state', label: 'License State', source: 'driver' },
  { key: 'license_expiration', label: 'License Expiration', source: 'driver' },
  { key: 'license_front_url', label: 'License Front Photo', source: 'driver' },
  { key: 'license_back_url', label: 'License Back Photo', source: 'driver' },
];

export function calculateProfileCompletion(driver: DriverWithUser): ProfileCompletionStatus {
  const missingFields: string[] = [];
  
  for (const field of REQUIRED_FIELDS) {
    const value = field.source === 'user' 
      ? driver.user[field.key as keyof typeof driver.user]
      : driver[field.key as keyof typeof driver];
    
    if (!value || value === '') {
      missingFields.push(field.label);
    }
  }
  
  const percentage = Math.round(
    ((REQUIRED_FIELDS.length - missingFields.length) / REQUIRED_FIELDS.length) * 100
  );
  
  return {
    percentage,
    isComplete: missingFields.length === 0,
    missingFields,
    sections: [], // Populated by getSections helper if needed
  };
}

// ============ UPDATE FUNCTIONS ============

export async function updatePersonalInfo(
  userId: string,
  driverId: string,
  companyId: string,
  data: PersonalInfoFormData,
  oldData: PersonalInfoFormData
): Promise<void> {
  // Update user record
  const { error: userError } = await supabase
    .from('users')
    .update({
      full_name: data.full_name,
      avatar_url: data.avatar_url,
    })
    .eq('id', userId);

  if (userError) throw userError;

  // Update driver record
  const { error: driverError } = await supabase
    .from('drivers')
    .update({
      date_of_birth: data.date_of_birth,
    })
    .eq('id', driverId);

  if (driverError) throw driverError;

  // Log changes
  if (data.full_name !== oldData.full_name) {
    await logProfileChange(driverId, userId, companyId, 'personal_info', 'full_name', oldData.full_name, data.full_name);
  }
  if (data.date_of_birth !== oldData.date_of_birth) {
    await logProfileChange(driverId, userId, companyId, 'personal_info', 'date_of_birth', oldData.date_of_birth, data.date_of_birth);
  }
  if (data.avatar_url !== oldData.avatar_url) {
    await logProfileChange(driverId, userId, companyId, 'avatar', 'avatar_url', oldData.avatar_url || '', data.avatar_url || '');
  }
}

export async function updateContactInfo(
  userId: string,
  driverId: string,
  companyId: string,
  data: ContactInfoFormData,
  oldData: ContactInfoFormData
): Promise<void> {
  // Update phone in users table
  const { error } = await supabase
    .from('users')
    .update({ phone: data.phone })
    .eq('id', userId);

  if (error) throw error;

  // Log change
  if (data.phone !== oldData.phone) {
    await logProfileChange(driverId, userId, companyId, 'contact', 'phone', oldData.phone, data.phone);
  }
  
  // Note: Email change is handled separately via Supabase Auth
}

export async function initiateEmailChange(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
  // Supabase sends verification email automatically
}

export async function updateAddress(
  userId: string,
  driverId: string,
  companyId: string,
  data: AddressFormData,
  oldData: AddressFormData
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      address_line1: data.address_line1,
      address_line2: data.address_line2 || null,
      city: data.city,
      state: data.state,
      zip: data.zip_code,
    })
    .eq('id', driverId);

  if (error) throw error;

  // Log changes for each field that changed
  const fields: (keyof AddressFormData)[] = ['address_line1', 'address_line2', 'city', 'state', 'zip_code'];
  for (const field of fields) {
    if (data[field] !== oldData[field]) {
      await logProfileChange(driverId, userId, companyId, 'address', field, oldData[field] || '', data[field] || '');
    }
  }
}

export async function updateLicense(
  userId: string,
  driverId: string,
  companyId: string,
  data: LicenseFormData,
  oldData: LicenseFormData
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      license_number: data.license_number,
      license_state: data.license_state,
      license_expiration: data.license_expiration,
      license_front_url: data.license_front_url,
      license_back_url: data.license_back_url,
    })
    .eq('id', driverId);

  if (error) throw error;

  // Log changes
  const fields: (keyof LicenseFormData)[] = ['license_number', 'license_state', 'license_expiration', 'license_front_url', 'license_back_url'];
  for (const field of fields) {
    if (data[field] !== oldData[field]) {
      await logProfileChange(driverId, userId, companyId, 'license', field, oldData[field] || '', data[field] || '');
    }
  }
}

export async function updateEmergencyContact(
  userId: string,
  driverId: string,
  companyId: string,
  data: EmergencyContactFormData,
  oldData: EmergencyContactFormData
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      emergency_contact_name: data.emergency_contact_name || null,
      emergency_contact_phone: data.emergency_contact_phone || null,
      emergency_contact_relation: data.emergency_contact_relation || null,
    })
    .eq('id', driverId);

  if (error) throw error;

  // Log changes
  const fields: (keyof EmergencyContactFormData)[] = ['emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation'];
  for (const field of fields) {
    if (data[field] !== oldData[field]) {
      await logProfileChange(driverId, userId, companyId, 'emergency_contact', field, oldData[field] || '', data[field] || '');
    }
  }
}

export async function removeEmergencyContact(
  userId: string,
  driverId: string,
  companyId: string
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      emergency_contact_name: null,
      emergency_contact_phone: null,
      emergency_contact_relation: null,
    })
    .eq('id', driverId);

  if (error) throw error;

  await logProfileChange(driverId, userId, companyId, 'emergency_contact', 'removed', 'true', '');
}

// ============ PASSWORD ============

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Get current user's email
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error('User not found');

  // Verify current password by reauthenticating
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (authError) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ============ NOTIFICATION PREFERENCES ============

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as NotificationPreferences | null;
}

export async function saveNotificationPreferences(
  userId: string,
  prefs: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      ...prefs,
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

// ============ PROFILE PHOTO ============

export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('profile-photos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function removeProfilePhoto(userId: string): Promise<void> {
  // List files in user's folder
  const { data: files } = await supabase.storage
    .from('profile-photos')
    .list(userId);

  if (files && files.length > 0) {
    const filesToRemove = files.map(f => `${userId}/${f.name}`);
    await supabase.storage
      .from('profile-photos')
      .remove(filesToRemove);
  }
}

// ============ AUDIT LOG ============

export async function getProfileChangeHistory(
  driverId: string,
  limit = 20
): Promise<ProfileChangeRecord[]> {
  const { data, error } = await supabase
    .from('driver_profile_changes')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as ProfileChangeRecord[];
}

async function logProfileChange(
  driverId: string,
  userId: string,
  companyId: string,
  changeType: string,
  fieldName: string,
  oldValue: string,
  newValue: string
): Promise<void> {
  await supabase.from('driver_profile_changes').insert({
    driver_id: driverId,
    user_id: userId,
    company_id: companyId,
    change_type: changeType,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
  });
}
```

### Task 3: Profile Hooks

Create `src/hooks/useProfile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as profileService from '@/services/profile';
import type {
  PersonalInfoFormData,
  ContactInfoFormData,
  AddressFormData,
  LicenseFormData,
  EmergencyContactFormData,
  NotificationPreferences,
} from '@/types/profile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useProfileCompletion(driver: any) {
  return profileService.calculateProfileCompletion(driver);
}

export function useUpdatePersonalInfo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: PersonalInfoFormData;
      oldData: PersonalInfoFormData;
    }) => profileService.updatePersonalInfo(
      params.userId,
      params.driverId,
      params.companyId,
      params.data,
      params.oldData
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Personal info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateContactInfo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: ContactInfoFormData;
      oldData: ContactInfoFormData;
    }) => profileService.updateContactInfo(
      params.userId,
      params.driverId,
      params.companyId,
      params.data,
      params.oldData
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Contact info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useInitiateEmailChange() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (newEmail: string) => profileService.initiateEmailChange(newEmail),
    onSuccess: () => {
      toast({
        title: 'Verification email sent',
        description: 'Check your new email to confirm the change.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Email change failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: AddressFormData;
      oldData: AddressFormData;
    }) => profileService.updateAddress(
      params.userId,
      params.driverId,
      params.companyId,
      params.data,
      params.oldData
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'Address updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: LicenseFormData;
      oldData: LicenseFormData;
    }) => profileService.updateLicense(
      params.userId,
      params.driverId,
      params.companyId,
      params.data,
      params.oldData
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      toast({ title: 'License info updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateEmergencyContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: {
      userId: string;
      driverId: string;
      companyId: string;
      data: EmergencyContactFormData;
      oldData: EmergencyContactFormData;
    }) => profileService.updateEmergencyContact(
      params.userId,
      params.driverId,
      params.companyId,
      params.data,
      params.oldData
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Emergency contact updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveEmergencyContact() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; driverId: string; companyId: string }) =>
      profileService.removeEmergencyContact(params.userId, params.driverId, params.companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Emergency contact removed' });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { currentPassword: string; newPassword: string }) =>
      profileService.changePassword(params.currentPassword, params.newPassword),
    onSuccess: () => {
      toast({ title: 'Password changed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Password change failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useNotificationPreferences(userId: string | undefined) {
  return useQuery({
    queryKey: ['notification-preferences', userId],
    queryFn: () => profileService.getNotificationPreferences(userId!),
    enabled: !!userId,
  });
}

export function useSaveNotificationPreferences() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; prefs: Partial<NotificationPreferences> }) =>
      profileService.saveNotificationPreferences(params.userId, params.prefs),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', userId] });
      toast({ title: 'Preferences saved' });
    },
  });
}

export function useUploadProfilePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (params: { userId: string; file: File }) =>
      profileService.uploadProfilePhoto(params.userId, params.file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Profile photo updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRemoveProfilePhoto() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => profileService.removeProfilePhoto(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-profile'] });
      toast({ title: 'Profile photo removed' });
    },
  });
}

export function useProfileChangeHistory(driverId: string | undefined) {
  return useQuery({
    queryKey: ['profile-change-history', driverId],
    queryFn: () => profileService.getProfileChangeHistory(driverId!),
    enabled: !!driverId,
  });
}
```

### Task 4: Profile Page

Replace `src/pages/driver/Profile.tsx` (create new file):

```tsx
// Main profile page for drivers
// Route: /driver/profile
// 
// Layout:
// - Profile completion progress card at top
// - Sectioned cards: Personal, Contact, Address, License, Employment, Emergency Contact
// - Each section has [Edit] button that opens modal
// - Employment section is read-only
// - Link to Account Settings at bottom

// Components to use:
// - Card, CardHeader, CardContent, CardTitle
// - Progress for completion bar
// - Badge for verified/unverified status
// - Button for edit actions
// - Avatar with fallback monogram

// Data:
// - useDriverProfile() to get current driver data
// - useProfileCompletion() for completion status

// Sections:
// 1. ProfileCompletionCard - shows percentage and missing fields
// 2. PersonalInfoSection - avatar, name, DOB with [Edit] button
// 3. ContactInfoSection - email (verified badge), phone with [Edit] button
// 4. AddressSection - full address with [Edit] button
// 5. LicenseSection - license info + photo previews with [Edit] button
// 6. EmploymentSection - read-only type and start date
// 7. EmergencyContactSection - optional, shows [Add] or contact info with [Edit]
```

### Task 5: Edit Personal Info Modal

Create `src/components/features/driver/EditPersonalInfoModal.tsx`:

```tsx
// Modal for editing personal information
// Props: open, onOpenChange, driver, user
//
// Form fields:
// - Profile photo upload/camera/remove
// - Full Name (text input, required)
// - Date of Birth (date picker, required)
//
// Features:
// - Photo preview with upload, camera capture, remove options
// - Form validation with zod
// - Save button calls useUpdatePersonalInfo
// - Cancel closes without saving
//
// Uses: Dialog, Input, Label, Button, Avatar
```

### Task 6: Edit Contact Info Modal

Create `src/components/features/driver/EditContactInfoModal.tsx`:

```tsx
// Modal for editing contact information
// Props: open, onOpenChange, user
//
// Form fields:
// - Email (text input, shows warning about verification)
// - Phone (text input with format validation)
//
// Features:
// - Phone format validation (US phone)
// - Email change shows confirmation dialog
// - If email changed, shows "verification email sent" message
//
// Uses: Dialog, Input, Label, Button, Alert
```

### Task 7: Edit Address Modal

Create `src/components/features/driver/EditAddressModal.tsx`:

```tsx
// Modal for editing address
// Props: open, onOpenChange, driver
//
// Form fields:
// - Address Line 1 (required)
// - Address Line 2 (optional)
// - City (required)
// - State (dropdown, required)
// - ZIP Code (required)
//
// Features:
// - State dropdown with US states
// - Warning when state changes (affects broker eligibility)
// - ZIP format validation
//
// Uses: Dialog, Input, Select, Label, Button, Alert
```

### Task 8: Edit License Modal

Create `src/components/features/driver/EditLicenseModal.tsx`:

```tsx
// Modal for editing driver's license info
// Props: open, onOpenChange, driver
//
// Form fields:
// - License Number (required)
// - State (dropdown, required)
// - Expiration Date (date picker, required)
// - Front Photo (upload/camera)
// - Back Photo (upload/camera)
//
// Features:
// - Photo preview with replace/view full options
// - Date picker for expiration
// - State dropdown
// - Photo upload with camera option
//
// Uses: Dialog, Input, Select, Button, file input with capture
```

### Task 9: Edit Emergency Contact Modal

Create `src/components/features/driver/EditEmergencyContactModal.tsx`:

```tsx
// Modal for adding/editing emergency contact
// Props: open, onOpenChange, driver
//
// Form fields:
// - Contact Name (optional, but required if any filled)
// - Phone Number (optional)
// - Relationship (dropdown: Spouse, Parent, Sibling, Friend, Other)
//
// Features:
// - All fields optional but validated together
// - Remove Contact button to clear all fields
// - Relationship dropdown
//
// Uses: Dialog, Input, Select, Button
```

### Task 10: Account Settings Page

Create `src/pages/driver/AccountSettings.tsx`:

```tsx
// Account settings page (separate from profile)
// Route: /driver/settings/account
//
// Sections:
// 1. Security
//    - Password (last changed date, [Change Password] button)
//    - Two-Factor Authentication (Coming Soon)
// 2. Email
//    - Current email with [Change Email] button
// 3. Notifications
//    - Checkbox list for notification preferences
//    - Auto-saves on change
// 4. Account
//    - Joined date
//    - Status badge
//
// Uses: Card, Switch/Checkbox, Button, Badge
```

### Task 11: Change Password Modal

Create `src/components/features/driver/ChangePasswordModal.tsx`:

```tsx
// Modal for changing password
// Props: open, onOpenChange
//
// Form fields:
// - Current Password (required, with show/hide toggle)
// - New Password (required, with requirements hint)
// - Confirm New Password (required, must match)
//
// Validation:
// - Current password verified server-side
// - New password min 8 chars, 1 number, 1 special char
// - Confirm must match new
//
// Uses: Dialog, Input, Button, password visibility toggle
```

### Task 12: Update App Routes

Update `src/App.tsx` to replace the placeholder:

```tsx
// Replace the ComingSoon placeholder for profile route:

import DriverProfile from '@/pages/driver/Profile';
import AccountSettings from '@/pages/driver/AccountSettings';

// In driver routes:
<Route path="profile" element={<DriverProfile />} />
<Route path="settings/account" element={<AccountSettings />} />
```

### Task 13: US States Constant

Create `src/lib/us-states.ts`:

```typescript
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  // ... all 50 states + DC
  { value: 'WY', label: 'Wyoming' },
];

export const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' },
];
```

## Output Summary

When complete, confirm:
1. ✅ Migration `016_driver_profile.sql` applied
2. ✅ `src/types/profile.ts` - Profile types
3. ✅ `src/services/profile.ts` - Profile service functions
4. ✅ `src/hooks/useProfile.ts` - React Query hooks
5. ✅ `src/pages/driver/Profile.tsx` - Profile page with sections
6. ✅ `src/components/features/driver/EditPersonalInfoModal.tsx`
7. ✅ `src/components/features/driver/EditContactInfoModal.tsx`
8. ✅ `src/components/features/driver/EditAddressModal.tsx`
9. ✅ `src/components/features/driver/EditLicenseModal.tsx`
10. ✅ `src/components/features/driver/EditEmergencyContactModal.tsx`
11. ✅ `src/pages/driver/AccountSettings.tsx`
12. ✅ `src/components/features/driver/ChangePasswordModal.tsx`
13. ✅ `src/lib/us-states.ts` - Constants
14. ✅ Routes updated in App.tsx

## Testing Notes

To test:
1. Apply migration `016_driver_profile.sql` to Supabase
2. Log in as an approved driver
3. Navigate to `/driver/profile`
4. Test editing each section
5. Verify profile completion updates
6. Test email change flow (verification required)
7. Test password change
8. Test notification preferences toggle

## UI/UX Guidelines

Follow Design System (`docs/04-FRONTEND-GUIDELINES.md`):
- Use `Card` for each profile section
- Use `Dialog` for edit modals
- Use `Badge` for verified/unverified status
- Use `Progress` for completion bar
- Use `Avatar` with fallback monogram
- Mobile-first responsive design
- Touch-friendly edit buttons

## DO NOT

- Allow changing employment type (admin-only)
- Store full passwords anywhere
- Skip email verification for email changes
- Show sensitive data (SSN) on profile page
- Implement profile photo in initial version if time-constrained (can use avatar_url from user table)
- Modify core UI components in `src/components/ui/`
