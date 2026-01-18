import { supabase } from '@/integrations/supabase/client';
import type {
  Vehicle,
  VehicleWithAssignments,
  VehicleFilters,
  VehicleStatus,
  CreateVehicleData,
} from '@/types/vehicle';

export async function getVehicles(
  filters?: VehicleFilters
): Promise<VehicleWithAssignments[]> {
  let query = supabase
    .from('vehicles')
    .select(
      `
      *,
      owner:drivers!owner_driver_id(
        id,
        user:users!user_id(full_name)
      ),
      assignments:driver_vehicle_assignments(
        id,
        is_primary,
        assignment_type,
        driver:drivers!driver_id(
          id,
          user:users!user_id(full_name)
        )
      )
    `
    )
    .order('ownership')
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else {
    query = query.neq('status', 'retired');
  }

  if (filters?.vehicleType && filters.vehicleType !== 'all') {
    query = query.eq('vehicle_type', filters.vehicleType);
  }

  if (filters?.ownership && filters.ownership !== 'all') {
    query = query.eq('ownership', filters.ownership);
  }

  if (filters?.search) {
    query = query.or(
      `make.ilike.%${filters.search}%,model.ilike.%${filters.search}%,license_plate.ilike.%${filters.search}%,fleet_number.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as VehicleWithAssignments[];
}

export async function getVehicle(id: string): Promise<VehicleWithAssignments> {
  const { data, error } = await supabase
    .from('vehicles')
    .select(
      `
      *,
      owner:drivers!owner_driver_id(
        id,
        user:users!user_id(full_name, email, phone)
      ),
      assignments:driver_vehicle_assignments(
        *,
        driver:drivers!driver_id(
          id,
          user:users!user_id(full_name)
        )
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as VehicleWithAssignments;
}

export async function createVehicle(
  vehicleData: CreateVehicleData
): Promise<Vehicle> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not authenticated');

  const companyId = user.app_metadata?.company_id;
  if (!companyId) throw new Error('No company associated with user');

  const isComplete = !!(
    vehicleData.make &&
    vehicleData.model &&
    vehicleData.year &&
    vehicleData.color &&
    vehicleData.license_plate &&
    vehicleData.license_state &&
    vehicleData.vin &&
    vehicleData.exterior_photo_url
  );

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      company_id: companyId,
      ...vehicleData,
      is_complete: isComplete,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  if (vehicleData.ownership === 'driver' && vehicleData.owner_driver_id) {
    const { error: assignmentError } = await supabase
      .from('driver_vehicle_assignments')
      .insert({
        driver_id: vehicleData.owner_driver_id,
        vehicle_id: data.id,
        company_id: companyId,
        is_primary: true,
        assignment_type: 'owned',
        assigned_by: user.id,
      });
    if (assignmentError) throw assignmentError;
  }

  return data as Vehicle;
}

export async function updateVehicle(
  vehicleId: string,
  vehicleData: Partial<CreateVehicleData>
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update(vehicleData)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicleStatus(
  vehicleId: string,
  status: VehicleStatus,
  reason?: string
): Promise<Vehicle> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not authenticated');

  const updates: Partial<Vehicle> = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: user.id,
  };

  if (reason) {
    updates.status_reason = reason;
  }

  if (status === 'retired') {
    const { error: assignmentError } = await supabase
      .from('driver_vehicle_assignments')
      .update({ ends_at: new Date().toISOString() })
      .eq('vehicle_id', vehicleId)
      .is('ends_at', null);
    if (assignmentError) throw assignmentError;
  }

  const { data, error } = await supabase
    .from('vehicles')
    .update(updates)
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}

export async function updateVehicleMileage(
  vehicleId: string,
  mileage: number
): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({
      mileage,
      mileage_updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)
    .select()
    .single();

  if (error) throw error;
  return data as Vehicle;
}
