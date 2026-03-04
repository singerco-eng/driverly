import { supabase } from '@/integrations/supabase/client';
import type { Broker } from '@/types/broker';
import type { DriverWithUser } from '@/types/driver';
import type { Vehicle } from '@/types/vehicle';
import type {
  CreateLocationData,
  Location,
  LocationBrokerAssignment,
  LocationCredential,
  LocationCredentialStatus,
  LocationWithStats,
  UpdateLocationData,
} from '@/types/location';

const LOCATION_COLUMNS = `
  id,
  company_id,
  name,
  code,
  address_line1,
  address_line2,
  city,
  state,
  zip,
  phone,
  email,
  status,
  created_at,
  updated_at
`;

const LOCATION_DRIVER_COLUMNS = `
  id,
  user_id,
  company_id,
  employment_type,
  status,
  state,
  application_status,
  location_id,
  created_at,
  updated_at,
  user:users!user_id(
    id,
    email,
    full_name,
    phone,
    avatar_url
  )
`;

const LOCATION_VEHICLE_COLUMNS = `
  id,
  company_id,
  location_id,
  make,
  model,
  year,
  color,
  license_plate,
  license_state,
  vin,
  vehicle_type,
  ownership,
  seat_capacity,
  wheelchair_capacity,
  stretcher_capacity,
  fleet_number,
  mileage,
  mileage_updated_at,
  exterior_photo_url,
  interior_photo_url,
  wheelchair_lift_photo_url,
  status,
  status_reason,
  status_changed_at,
  status_changed_by,
  owner_driver_id,
  is_complete,
  created_at,
  updated_at,
  created_by
`;

const LOCATION_BROKER_ASSIGNMENT_COLUMNS = `
  id,
  location_id,
  broker_id,
  company_id,
  is_active,
  assigned_at,
  created_at,
  updated_at,
  broker:brokers(
    id,
    name,
    code,
    source_type,
    status
  )
`;

// Compute credential compliance status for a location
// Priority: expired > expiring > missing > grace_period > pending > valid
export function computeLocationCredentialStatus(
  credentials: LocationCredential[],
): LocationCredentialStatus {
  const required = credentials.filter((c) => {
    const credentialType =
      (c as LocationCredential & { credentialType?: LocationCredential['credential_type'] })
        .credentialType ?? c.credential_type;
    return (
      credentialType &&
      credentialType.requirement === 'required' &&
      credentialType.scope === 'global'
    );
  });

  if (required.length === 0) {
    return { status: 'valid', missing: 0, total: 0 };
  }

  const expired = required.filter((c) => c.status === 'expired');
  const expiring = required.filter((c) => {
    const credentialType =
      (c as LocationCredential & { credentialType?: LocationCredential['credential_type'] })
        .credentialType ?? c.credential_type;
    if (!c.expires_at || !credentialType?.expiration_warning_days) return false;
    const daysUntil = Math.ceil(
      (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    return c.status === 'approved' && daysUntil <= credentialType.expiration_warning_days;
  });
  const missing = required.filter((c) => ['not_submitted', 'rejected'].includes(c.status));
  const gracePeriod = required.filter(
    (c) =>
      c.grace_period_ends &&
      new Date(c.grace_period_ends) > new Date() &&
      c.status === 'not_submitted',
  );
  const pending = required.filter((c) => c.status === 'pending_review');

  if (expired.length > 0) {
    return { status: 'expired', missing: expired.length, total: required.length };
  }
  if (expiring.length > 0) {
    return { status: 'expiring', missing: 0, total: required.length };
  }
  if (missing.length > 0) {
    return { status: 'missing', missing: missing.length, total: required.length };
  }
  if (gracePeriod.length > 0) {
    return { status: 'grace_period', missing: gracePeriod.length, total: required.length };
  }
  if (pending.length > 0) {
    return { status: 'pending', missing: 0, total: required.length };
  }
  return { status: 'valid', missing: 0, total: required.length };
}

// Core CRUD
export async function getLocations(companyId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('company_locations')
    .select(LOCATION_COLUMNS)
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return (data || []) as Location[];
}

export async function getLocationById(id: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from('company_locations')
    .select(LOCATION_COLUMNS)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as Location;
}

export async function createLocation(
  companyId: string,
  data: CreateLocationData,
): Promise<Location> {
  const { data: location, error } = await supabase
    .from('company_locations')
    .insert({
      company_id: companyId,
      name: data.name,
      code: data.code || null,
      address_line1: data.address_line1 || null,
      address_line2: data.address_line2 || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      phone: data.phone || null,
      email: data.email || null,
    })
    .select(LOCATION_COLUMNS)
    .single();

  if (error) throw error;
  return location as Location;
}

export async function updateLocation(
  id: string,
  data: UpdateLocationData,
): Promise<Location> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof data.name !== 'undefined') updateData.name = data.name;
  if (typeof data.code !== 'undefined') updateData.code = data.code || null;
  if (typeof data.address_line1 !== 'undefined')
    updateData.address_line1 = data.address_line1 || null;
  if (typeof data.address_line2 !== 'undefined')
    updateData.address_line2 = data.address_line2 || null;
  if (typeof data.city !== 'undefined') updateData.city = data.city || null;
  if (typeof data.state !== 'undefined') updateData.state = data.state || null;
  if (typeof data.zip !== 'undefined') updateData.zip = data.zip || null;
  if (typeof data.phone !== 'undefined') updateData.phone = data.phone || null;
  if (typeof data.email !== 'undefined') updateData.email = data.email || null;
  if (typeof data.status !== 'undefined') updateData.status = data.status;

  const { data: location, error } = await supabase
    .from('company_locations')
    .update(updateData)
    .eq('id', id)
    .select(LOCATION_COLUMNS)
    .single();

  if (error) throw error;
  return location as Location;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('company_locations').delete().eq('id', id);
  if (error) throw error;
}

// With stats (for list view)
export async function getLocationsWithStats(companyId: string): Promise<LocationWithStats[]> {
  const locations = await getLocations(companyId);
  if (locations.length === 0) return [];

  const locationIds = locations.map((location) => location.id);

  const { data: drivers, error: driverError } = await supabase
    .from('drivers')
    .select('id, location_id')
    .eq('company_id', companyId)
    .in('location_id', locationIds);

  if (driverError) throw driverError;

  const { data: vehicles, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, location_id')
    .eq('company_id', companyId)
    .in('location_id', locationIds);

  if (vehicleError) throw vehicleError;

  const driverCounts = new Map<string, number>();
  (drivers || []).forEach((driver) => {
    if (!driver.location_id) return;
    driverCounts.set(driver.location_id, (driverCounts.get(driver.location_id) ?? 0) + 1);
  });

  const vehicleCounts = new Map<string, number>();
  (vehicles || []).forEach((vehicle) => {
    if (!vehicle.location_id) return;
    vehicleCounts.set(vehicle.location_id, (vehicleCounts.get(vehicle.location_id) ?? 0) + 1);
  });

  return locations.map((location) => ({
    ...location,
    driver_count: driverCounts.get(location.id) ?? 0,
    vehicle_count: vehicleCounts.get(location.id) ?? 0,
  }));
}

// Related entities
export async function getLocationDrivers(locationId: string): Promise<DriverWithUser[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select(LOCATION_DRIVER_COLUMNS)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as DriverWithUser[];
}

export async function getLocationVehicles(locationId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(LOCATION_VEHICLE_COLUMNS)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Vehicle[];
}

// Broker associations
export async function getLocationBrokers(locationId: string): Promise<LocationBrokerAssignment[]> {
  const { data, error } = await supabase
    .from('location_broker_assignments')
    .select(LOCATION_BROKER_ASSIGNMENT_COLUMNS)
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as LocationBrokerAssignment[];
}

export async function assignBrokerToLocation(
  locationId: string,
  brokerId: string,
  companyId: string,
): Promise<void> {
  const { error } = await supabase
    .from('location_broker_assignments')
    .insert({
      location_id: locationId,
      broker_id: brokerId,
      company_id: companyId,
      is_active: true,
      assigned_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
}

export async function removeBrokerFromLocation(
  locationId: string,
  brokerId: string,
): Promise<void> {
  const { error } = await supabase
    .from('location_broker_assignments')
    .delete()
    .eq('location_id', locationId)
    .eq('broker_id', brokerId);

  if (error) throw error;
}

// Assignment helpers
export async function assignDriverToLocation(
  driverId: string,
  locationId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      location_id: locationId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);

  if (error) throw error;
}

export async function assignVehicleToLocation(
  vehicleId: string,
  locationId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({
      location_id: locationId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}
