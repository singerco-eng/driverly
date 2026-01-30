import { supabase } from '@/integrations/supabase/client';
import { ONBOARDING_ITEMS } from '@/lib/onboarding-items';
import * as featureFlagService from '@/services/featureFlags';
import type {
  OnboardingStatus,
  OnboardingItemStatus,
  DriverAvailability,
  DriverPaymentInfo,
  PaymentInfoFormData,
} from '@/types/onboarding';
import type { Driver } from '@/types/driver';

export async function getOnboardingStatus(driverId: string): Promise<OnboardingStatus> {
  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('*')
    .eq('id', driverId)
    .single();

  if (driverError) throw driverError;

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('avatar_url')
    .eq('id', driver.user_id)
    .single();

  if (userError) throw userError;

  const paymentsEnabled = await featureFlagService.isFeatureEnabled(
    driver.company_id,
    'driver_payments'
  );

  const { data: progress } = await supabase
    .from('driver_onboarding_progress')
    .select('*')
    .eq('driver_id', driverId);

  const { count: vehicleCount } = await supabase
    .from('driver_vehicle_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('driver_id', driverId)
    .is('ended_at', null);

  const { data: assignedVehicles, error: assignedVehiclesError } = await supabase
    .from('driver_vehicle_assignments')
    .select('vehicle_id, vehicle:vehicles(id, status)')
    .eq('driver_id', driverId)
    .is('ended_at', null);

  if (assignedVehiclesError) throw assignedVehiclesError;

  const { data: credentials } = await supabase
    .from('driver_credentials')
    .select('*')
    .eq('driver_id', driverId);

  const { data: requiredCredentials } = await supabase
    .from('credential_types')
    .select('id')
    .eq('company_id', driver.company_id)
    .eq('category', 'driver')
    .eq('scope', 'global')
    .eq('requirement', 'required')
    .eq('is_active', true);

  const { data: requiredVehicleCredentials, error: requiredVehicleError } = await supabase
    .from('credential_types')
    .select('id')
    .eq('company_id', driver.company_id)
    .eq('category', 'vehicle')
    .eq('scope', 'global')
    .eq('requirement', 'required')
    .eq('is_active', true);

  if (requiredVehicleError) throw requiredVehicleError;

  const approvedCredentials = credentials?.filter((credential) => credential.status === 'approved') || [];
  const requiredCount = requiredCredentials?.length || 0;
  const approvedCount = approvedCredentials.length;
  const requiredVehicleIds = requiredVehicleCredentials?.map((credential) => credential.id) || [];
  const activeAssignedVehicleIds =
    assignedVehicles
      ?.filter((assignment) => assignment.vehicle?.status === 'active')
      .map((assignment) => assignment.vehicle_id) || [];

  let hasEligibleVehicle = false;

  if (activeAssignedVehicleIds.length > 0) {
    if (requiredVehicleIds.length === 0) {
      hasEligibleVehicle = true;
    } else {
      const { data: approvedVehicleCredentials, error: approvedVehicleError } = await supabase
        .from('vehicle_credentials')
        .select('vehicle_id, credential_type_id')
        .in('vehicle_id', activeAssignedVehicleIds)
        .in('credential_type_id', requiredVehicleIds)
        .eq('status', 'approved');

      if (approvedVehicleError) throw approvedVehicleError;

      const vehicleApprovedMap = new Map<string, Set<string>>();
      (approvedVehicleCredentials || []).forEach((credential) => {
        const vehicleId = credential.vehicle_id;
        if (!vehicleApprovedMap.has(vehicleId)) {
          vehicleApprovedMap.set(vehicleId, new Set());
        }
        vehicleApprovedMap.get(vehicleId)!.add(credential.credential_type_id);
      });

      hasEligibleVehicle = activeAssignedVehicleIds.some(
        (vehicleId) => (vehicleApprovedMap.get(vehicleId)?.size || 0) >= requiredVehicleIds.length
      );
    }
  }

  const items: OnboardingItemStatus[] = ONBOARDING_ITEMS.filter((item) => {
    if (item.forEmploymentType && item.forEmploymentType !== driver.employment_type) {
      return false;
    }
    if (item.key === 'payment_info' && !paymentsEnabled) {
      return false;
    }
    return true;
  }).map((item) => {
    const saved = progress?.find((entry) => entry.item_key === item.key);
    let completed = false;
    let missingInfo: string[] = [];

    switch (item.key) {
      case 'profile_complete':
        completed = isProfileComplete(driver as Driver);
        if (!completed) missingInfo = getMissingProfileFields(driver as Driver);
        break;
      case 'vehicle_added':
        completed = (vehicleCount || 0) > 0;
        if (!completed) missingInfo = ['Add at least one vehicle'];
        break;
      case 'vehicle_complete':
        completed = (vehicleCount || 0) > 0;
        break;
      case 'global_credentials':
        completed = approvedCount >= requiredCount && requiredCount > 0;
        if (!completed) missingInfo = [`${requiredCount - approvedCount} credentials remaining`];
        break;
      case 'availability_set':
        completed = !!driver.has_availability;
        if (!completed) missingInfo = ['Set your weekly availability'];
        break;
      case 'payment_info':
        completed = !!driver.has_payment_info;
        if (!completed) missingInfo = ['Add payment information'];
        break;
      case 'profile_photo':
        completed = !!user?.avatar_url;
        if (!completed) missingInfo = ['Upload a profile photo'];
        break;
      default:
        completed = saved?.completed || false;
    }

    return {
      ...item,
      completed,
      completedAt: saved?.completed_at || null,
      skipped: saved?.skipped || false,
      missingInfo,
    };
  });

  const requiredItems = items.filter((item) => item.required);
  const completedRequired = requiredItems.filter((item) => item.completed);
  const canActivate = completedRequired.length === requiredItems.length && hasEligibleVehicle;
  const blockers = requiredItems.filter((item) => !item.completed).map((item) => item.label);
  if (!hasEligibleVehicle) {
    blockers.push('Active vehicle with required credentials');
  }
  const progress_pct =
    requiredItems.length > 0
      ? Math.round((completedRequired.length / requiredItems.length) * 100)
      : 100;

  return {
    items,
    progress: progress_pct,
    isComplete: completedRequired.length === requiredItems.length,
    canActivate,
    blockers,
  };
}

function isProfileComplete(driver: Driver): boolean {
  return !!(
    driver.date_of_birth &&
    driver.address_line1 &&
    driver.city &&
    driver.state &&
    driver.zip &&
    driver.license_number &&
    driver.license_state &&
    driver.license_expiration &&
    driver.emergency_contact_name &&
    driver.emergency_contact_phone
  );
}

function getMissingProfileFields(driver: Driver): string[] {
  const missing: string[] = [];
  if (!driver.date_of_birth) missing.push('Date of birth');
  if (!driver.address_line1) missing.push('Address');
  if (!driver.license_number) missing.push('License number');
  if (!driver.emergency_contact_name) missing.push('Emergency contact');
  return missing;
}

export async function toggleDriverActive(
  driverId: string,
  active: boolean,
  reason?: string
): Promise<void> {
  if (active) {
    const status = await getOnboardingStatus(driverId);
    if (!status.canActivate) {
      throw new Error(`Cannot activate: ${status.blockers.join(', ')}`);
    }
  }

  const { error } = await supabase
    .from('drivers')
    .update({
      status: active ? 'active' : 'inactive',
      status_reason: active ? null : reason,
      status_changed_at: new Date().toISOString(),
      onboarding_completed_at: active ? new Date().toISOString() : undefined,
    })
    .eq('id', driverId);

  if (error) throw error;
}

export async function getDriverAvailability(driverId: string): Promise<DriverAvailability[]> {
  const { data, error } = await supabase
    .from('driver_availability')
    .select('*')
    .eq('driver_id', driverId)
    .order('day_of_week');

  if (error) throw error;
  return data as DriverAvailability[];
}

export async function saveDriverAvailability(
  driverId: string,
  companyId: string,
  availability: Omit<
    DriverAvailability,
    'id' | 'driver_id' | 'company_id' | 'created_at' | 'updated_at'
  >[]
): Promise<void> {
  await supabase.from('driver_availability').delete().eq('driver_id', driverId);

  if (availability.length > 0) {
    const rows = availability.map((entry) => ({
      ...entry,
      driver_id: driverId,
      company_id: companyId,
    }));

    const { error } = await supabase.from('driver_availability').insert(rows);
    if (error) throw error;
  }
}

export async function getDriverPaymentInfo(driverId: string): Promise<DriverPaymentInfo | null> {
  const { data, error } = await supabase
    .from('driver_payment_info')
    .select('*')
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) throw error;
  return data as DriverPaymentInfo | null;
}

export async function saveDriverPaymentInfo(
  driverId: string,
  companyId: string,
  formData: PaymentInfoFormData
): Promise<DriverPaymentInfo> {
  const payload = {
    driver_id: driverId,
    company_id: companyId,
    payment_method: formData.payment_method,
    bank_name: formData.bank_name || null,
    account_type: formData.account_type || null,
    routing_number_last4: formData.routing_number?.slice(-4) || null,
    account_number_last4: formData.account_number?.slice(-4) || null,
    check_address_line1: formData.check_address_line1 || null,
    check_address_line2: formData.check_address_line2 || null,
    check_city: formData.check_city || null,
    check_state: formData.check_state || null,
    check_zip: formData.check_zip || null,
  };

  const { data, error } = await supabase
    .from('driver_payment_info')
    .upsert(payload, { onConflict: 'driver_id' })
    .select()
    .single();

  if (error) throw error;
  return data as DriverPaymentInfo;
}
