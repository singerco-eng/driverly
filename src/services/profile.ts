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
    const value =
      field.source === 'user'
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
  const { error: userError } = await supabase.from('users').update({
    full_name: data.full_name,
    avatar_url: data.avatar_url,
  }).eq('id', userId);

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
