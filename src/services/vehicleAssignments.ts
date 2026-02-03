import { supabase } from '@/integrations/supabase/client';
import { getCompanyScope } from '@/services/authScope';
import type {
  VehicleAssignment,
  AssignmentHistory,
  AssignVehicleFormData,
  TransferVehicleFormData,
  UnassignVehicleFormData,
  ExtendAssignmentFormData,
} from '@/types/vehicleAssignment';

// ============ Get Assignments ============

export async function getDriverAssignments(driverId: string): Promise<VehicleAssignment[]> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(
      `
      *,
      vehicle:vehicles(id, make, model, year, license_plate, vehicle_type, status)
    `,
    )
    .eq('driver_id', driverId)
    .is('ended_at', null)
    .order('is_primary', { ascending: false });

  if (error) throw error;
  return data as VehicleAssignment[];
}

export async function getVehicleAssignment(
  vehicleId: string,
): Promise<VehicleAssignment | null> {
  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .select(
      `
      *,
      driver:drivers(
        id,
        employment_type,
        status,
        user:users(full_name, email)
      )
    `,
    )
    .eq('vehicle_id', vehicleId)
    .is('ended_at', null)
    .maybeSingle();

  if (error) throw error;
  return data as VehicleAssignment | null;
}

export async function getAvailableVehicles(companyId?: string | null): Promise<any[]> {
  const { companyId: scopedCompanyId, isSuperAdmin } = await getCompanyScope();
  const resolvedCompanyId = companyId ?? (isSuperAdmin ? null : scopedCompanyId);

  let query = supabase
    .from('vehicles')
    .select(
      `
      *,
      current_assignment:driver_vehicle_assignments(
        id,
        driver_id,
        assignment_type,
        ended_at,
        driver:drivers(
          id,
          user:users(full_name)
        )
      )
    `,
    )
    .eq('status', 'active')
    .order('make');

  if (resolvedCompanyId) {
    query = query.eq('company_id', resolvedCompanyId);
  }

  const { data: vehicles, error } = await query;

  if (error) throw error;

  return (
    vehicles?.map((vehicle) => ({
      ...vehicle,
      current_assignment:
        vehicle.current_assignment?.find((assignment: any) => !assignment.ended_at) || null,
    })) || []
  );
}

export async function getAvailableDrivers(companyId?: string | null): Promise<any[]> {
  const { companyId: scopedCompanyId, isSuperAdmin } = await getCompanyScope();
  const resolvedCompanyId = companyId ?? (isSuperAdmin ? null : scopedCompanyId);

  let query = supabase
    .from('drivers')
    .select(
      `
      *,
      user:users(full_name, email),
      assignments:driver_vehicle_assignments(
        id,
        vehicle_id,
        is_primary,
        assignment_type,
        ended_at
      )
    `,
    )
    .in('status', ['active', 'inactive'])
    .order('created_at');

  if (resolvedCompanyId) {
    query = query.eq('company_id', resolvedCompanyId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (
    data?.map((driver) => ({
      ...driver,
      active_assignments: driver.assignments?.filter((assignment: any) => !assignment.ended_at) || [],
    })) || []
  );
}

// ============ Assign Vehicle ============

export async function assignVehicle(
  formData: AssignVehicleFormData,
  companyId: string,
  userId: string,
): Promise<VehicleAssignment> {
  const existingAssignment = await getVehicleAssignment(formData.vehicle_id);

  if (existingAssignment && existingAssignment.driver_id !== formData.driver_id) {
    await endAssignment(existingAssignment.id, userId, `Transferred to another driver`);

    await logAssignmentHistory({
      vehicle_id: formData.vehicle_id,
      driver_id: existingAssignment.driver_id,
      company_id: companyId,
      assignment_type: existingAssignment.assignment_type,
      is_primary: existingAssignment.is_primary,
      action: 'transferred',
      started_at: existingAssignment.starts_at,
      ended_at: new Date().toISOString(),
      performed_by: userId,
      reason: 'Transferred to another driver',
      transferred_to_driver_id: formData.driver_id,
    });
  }

  if (formData.is_primary) {
    await supabase
      .from('driver_vehicle_assignments')
      .update({ is_primary: false })
      .eq('driver_id', formData.driver_id)
      .is('ended_at', null);
  }

  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .insert({
      driver_id: formData.driver_id,
      vehicle_id: formData.vehicle_id,
      company_id: companyId,
      assignment_type: formData.assignment_type,
      is_primary: formData.is_primary,
      starts_at: formData.starts_at || new Date().toISOString(),
      ends_at: formData.ends_at || null,
      assigned_by: userId,
    })
    .select()
    .single();

  if (error) throw error;

  await logAssignmentHistory({
    vehicle_id: formData.vehicle_id,
    driver_id: formData.driver_id,
    company_id: companyId,
    assignment_type: formData.assignment_type,
    is_primary: formData.is_primary,
    action: 'assigned',
    started_at: formData.starts_at || new Date().toISOString(),
    performed_by: userId,
    assignment_id: data.id,
  });

  return data as VehicleAssignment;
}

// ============ Transfer Vehicle ============

export async function transferVehicle(
  assignmentId: string,
  formData: TransferVehicleFormData,
  companyId: string,
  userId: string,
): Promise<VehicleAssignment> {
  const { data: current, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  await endAssignment(assignmentId, userId, formData.reason);

  await logAssignmentHistory({
    vehicle_id: current.vehicle_id,
    driver_id: current.driver_id,
    company_id: companyId,
    assignment_type: current.assignment_type,
    is_primary: current.is_primary,
    action: 'transferred',
    started_at: current.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason: formData.reason,
    notes: formData.notes,
    transferred_to_driver_id: formData.to_driver_id,
  });

  return assignVehicle(
    {
      vehicle_id: current.vehicle_id,
      driver_id: formData.to_driver_id,
      assignment_type: 'assigned',
      is_primary: formData.is_primary,
    },
    companyId,
    userId,
  );
}

// ============ Unassign Vehicle ============

export async function unassignVehicle(
  assignmentId: string,
  formData: UnassignVehicleFormData,
  userId: string,
): Promise<void> {
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  await endAssignment(assignmentId, userId, formData.reason);

  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'unassigned',
    started_at: assignment.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason: formData.reason,
    notes: formData.notes,
    assignment_id: assignmentId,
  });

  if (assignment.is_primary) {
    const { data: other } = await supabase
      .from('driver_vehicle_assignments')
      .select('id')
      .eq('driver_id', assignment.driver_id)
      .is('ended_at', null)
      .neq('id', assignmentId)
      .limit(1)
      .single();

    if (other) {
      await supabase.from('driver_vehicle_assignments').update({ is_primary: true }).eq('id', other.id);
    }
  }
}

// ============ Borrowed Assignment Actions ============

export async function extendAssignment(
  assignmentId: string,
  formData: ExtendAssignmentFormData,
  userId: string,
): Promise<VehicleAssignment> {
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .update({ ends_at: formData.new_ends_at })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'extended',
    started_at: assignment.starts_at,
    ended_at: formData.new_ends_at,
    performed_by: userId,
    reason: formData.reason,
    assignment_id: assignmentId,
  });

  return data as VehicleAssignment;
}

export async function endAssignmentEarly(
  assignmentId: string,
  reason: string,
  userId: string,
): Promise<void> {
  const { data: assignment, error: fetchError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .eq('id', assignmentId)
    .single();

  if (fetchError) throw fetchError;

  await endAssignment(assignmentId, userId, reason);

  await logAssignmentHistory({
    vehicle_id: assignment.vehicle_id,
    driver_id: assignment.driver_id,
    company_id: assignment.company_id,
    assignment_type: assignment.assignment_type,
    is_primary: assignment.is_primary,
    action: 'ended_early',
    started_at: assignment.starts_at,
    ended_at: new Date().toISOString(),
    performed_by: userId,
    reason,
    assignment_id: assignmentId,
  });
}

// ============ Set Primary ============

export async function setPrimaryVehicle(
  assignmentId: string,
  driverId: string,
  userId: string,
): Promise<void> {
  await supabase
    .from('driver_vehicle_assignments')
    .update({ is_primary: false })
    .eq('driver_id', driverId)
    .is('ended_at', null);

  const { data, error } = await supabase
    .from('driver_vehicle_assignments')
    .update({ is_primary: true })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;

  await logAssignmentHistory({
    vehicle_id: data.vehicle_id,
    driver_id: driverId,
    company_id: data.company_id,
    assignment_type: data.assignment_type,
    is_primary: true,
    action: 'primary_changed',
    performed_by: userId,
    assignment_id: assignmentId,
  });
}

// ============ History ============

export async function getVehicleAssignmentHistory(
  vehicleId: string,
): Promise<AssignmentHistory[]> {
  const { data, error } = await supabase
    .from('vehicle_assignment_history')
    .select(
      `
      *,
      driver:drivers(id, user:users(full_name)),
      performed_by_user:users!vehicle_assignment_history_performed_by_fkey(full_name),
      transferred_to_driver:drivers!vehicle_assignment_history_transferred_to_driver_id_fkey(id, user:users(full_name))
    `,
    )
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AssignmentHistory[];
}

export async function getDriverAssignmentHistory(
  driverId: string,
): Promise<AssignmentHistory[]> {
  const { data, error } = await supabase
    .from('vehicle_assignment_history')
    .select(
      `
      *,
      vehicle:vehicles(id, make, model, year, license_plate),
      performed_by_user:users!vehicle_assignment_history_performed_by_fkey(full_name)
    `,
    )
    .eq('driver_id', driverId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as AssignmentHistory[];
}

// ============ Helpers ============

async function endAssignment(assignmentId: string, userId: string, reason: string) {
  const { error } = await supabase
    .from('driver_vehicle_assignments')
    .update({
      ended_at: new Date().toISOString(),
      ended_by: userId,
      end_reason: reason,
    })
    .eq('id', assignmentId);

  if (error) throw error;
}

async function logAssignmentHistory(data: Partial<AssignmentHistory>) {
  const { error } = await supabase.from('vehicle_assignment_history').insert(data);
  if (error) console.error('Failed to log assignment history:', error);
}
