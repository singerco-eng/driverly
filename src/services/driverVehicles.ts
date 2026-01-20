import { supabase } from '@/integrations/supabase/client';
import type {
  DriverVehicle,
  AddVehicleWizardData,
  SetInactiveData,
  RetireVehicleData,
} from '@/types/driverVehicle';

// ============ FETCH FUNCTIONS ============

/**
 * Get all vehicles for a 1099 driver (owned)
 */
export async function getOwnedVehicles(driverId: string): Promise<DriverVehicle[]> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `
      *,
      assignment:driver_vehicle_assignments!vehicle_id(
        id, is_primary, assignment_type, starts_at, ends_at, ended_at
      )
    `,
    )
    .eq('owner_driver_id', driverId)
    .neq('status', 'retired')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((vehicle: any) => {
    const activeAssignment = vehicle.assignment?.find((a: any) => !a.ended_at) || null;
    return {
      ...vehicle,
      assignment: activeAssignment
        ? {
            id: activeAssignment.id,
            is_primary: activeAssignment.is_primary,
            assignment_type: activeAssignment.assignment_type,
            starts_at: activeAssignment.starts_at,
            ends_at: activeAssignment.ends_at,
          }
        : null,
    };
  });
}

/**
 * Get all assigned vehicles for a W2 driver
 */
export async function getAssignedVehicles(driverId: string): Promise<DriverVehicle[]> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(
      `
      id, is_primary, assignment_type, starts_at, ends_at, ended_at,
      vehicle:vehicles(*)
    `,
    )
    .eq('driver_id', driverId)
    .is('ended_at', null)
    .order('is_primary', { ascending: false });

  if (error) throw error;

  return data.map((assignment: any) => ({
    ...assignment.vehicle,
    assignment: {
      id: assignment.id,
      is_primary: assignment.is_primary,
      assignment_type: assignment.assignment_type,
      starts_at: assignment.starts_at,
      ends_at: assignment.ends_at,
    },
  }));
}

/**
 * Get single vehicle by ID (for detail page)
 */
export async function getDriverVehicle(vehicleId: string): Promise<DriverVehicle | null> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `
      *,
      assignment:driver_vehicle_assignments!vehicle_id(
        id, is_primary, assignment_type, starts_at, ends_at, ended_at, driver_id
      )
    `,
    )
    .eq('id', vehicleId)
    .single();

  if (error) throw error;

  const activeAssignment = data.assignment?.find((a: any) => !a.ended_at) || null;
  return {
    ...data,
    assignment: activeAssignment
      ? {
          id: activeAssignment.id,
          is_primary: activeAssignment.is_primary,
          assignment_type: activeAssignment.assignment_type,
          starts_at: activeAssignment.starts_at,
          ends_at: activeAssignment.ends_at,
        }
      : null,
  };
}

// ============ CREATE (1099 ONLY) ============

export async function createVehicle(
  driverId: string,
  companyId: string,
  data: AddVehicleWizardData,
): Promise<DriverVehicle> {
  // Create vehicle
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .insert({
      company_id: companyId,
      owner_driver_id: driverId,
      ownership: 'driver',
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vehicle_type: data.vehicle_type,
      license_plate: data.license_plate,
      license_state: data.license_state,
      vin: data.vin,
      seat_capacity: data.seat_capacity,
      wheelchair_capacity: data.wheelchair_capacity || 0,
      stretcher_capacity: data.stretcher_capacity || 0,
      exterior_photo_url: data.exterior_photo_url,
      interior_photo_url: data.interior_photo_url,
      wheelchair_lift_photo_url: data.wheelchair_lift_photo_url,
      status: 'active',
    })
    .select()
    .single();

  if (vehicleError) throw vehicleError;

  // Create self-assignment (1099 driver owns the vehicle)
  const { error: assignError } = await supabase.from('driver_vehicle_assignments').insert({
    driver_id: driverId,
    vehicle_id: vehicle.id,
    company_id: companyId,
    assignment_type: 'owned',
    starts_at: new Date().toISOString(),
  });

  if (assignError) throw assignError;

  return vehicle;
}

// ============ UPDATE ============

export async function updateVehicle(
  vehicleId: string,
  data: Partial<AddVehicleWizardData>,
): Promise<DriverVehicle> {
  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .update({
      make: data.make,
      model: data.model,
      year: data.year,
      color: data.color,
      vehicle_type: data.vehicle_type,
      license_plate: data.license_plate,
      license_state: data.license_state,
      vin: data.vin,
      seat_capacity: data.seat_capacity,
      wheelchair_capacity: data.wheelchair_capacity,
      stretcher_capacity: data.stretcher_capacity,
      exterior_photo_url: data.exterior_photo_url,
      interior_photo_url: data.interior_photo_url,
      wheelchair_lift_photo_url: data.wheelchair_lift_photo_url,
    })
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;
  return vehicle;
}

/**
 * W2 drivers can only update photos
 */
export async function updateVehiclePhotos(
  vehicleId: string,
  photos: {
    exterior_photo_url?: string | null;
    interior_photo_url?: string | null;
    wheelchair_lift_photo_url?: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('vehicles').update(photos).eq('id', vehicleId);

  if (error) throw error;
}

// ============ STATUS MANAGEMENT ============

export async function setVehicleActive(vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from('vehicles')
    .update({
      status: 'active',
      status_reason: null,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}

export async function setVehicleInactive(
  vehicleId: string,
  data: SetInactiveData,
): Promise<void> {
  const reasonText =
    data.reason === 'other' ? data.details : `${data.reason}${data.details ? `: ${data.details}` : ''}`;

  const { error } = await supabase
    .from('vehicles')
    .update({
      status: 'inactive',
      status_reason: reasonText,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (error) throw error;
}

export async function retireVehicle(
  vehicleId: string,
  driverId: string,
  data: RetireVehicleData,
): Promise<void> {
  // Update vehicle status
  const { error: vehicleError } = await supabase
    .from('vehicles')
    .update({
      status: 'retired',
      status_reason: data.reason,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', vehicleId);

  if (vehicleError) throw vehicleError;

  // End the assignment
  const { error: assignError } = await supabase
    .from('driver_vehicle_assignments')
    .update({
      ended_at: new Date().toISOString(),
      end_reason: `Vehicle retired: ${data.reason}`,
    })
    .eq('vehicle_id', vehicleId)
    .eq('driver_id', driverId)
    .is('ended_at', null);

  if (assignError) throw assignError;
}

// ============ PRIMARY VEHICLE ============

export async function setPrimaryVehicle(driverId: string, vehicleId: string): Promise<void> {
  const { error } = await supabase.rpc('set_primary_vehicle', {
    p_driver_id: driverId,
    p_vehicle_id: vehicleId,
  });

  if (error) throw error;
}

// ============ PHOTO UPLOAD ============

export async function uploadVehiclePhoto(
  vehicleId: string,
  file: File,
  photoType: 'exterior' | 'interior' | 'lift',
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${vehicleId}/${photoType}.${ext}`;

  const { error } = await supabase.storage
    .from('vehicle-photos')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(path);

  return data.publicUrl;
}
