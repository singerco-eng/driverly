import { supabase } from '@/integrations/supabase/client';
import type {
  Driver,
  DriverWithUser,
  DriverWithDetails,
  DriverFilters,
  DriverStatus,
  DriverNote,
} from '@/types/driver';

export async function getDrivers(filters?: DriverFilters): Promise<DriverWithUser[]> {
  let query = supabase
    .from('drivers')
    .select(
      `
      *,
      user:users!user_id(id, email, full_name, phone, avatar_url)
    `
    )
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  } else {
    query = query.neq('status', 'archived');
  }

  if (filters?.employmentType && filters.employmentType !== 'all') {
    query = query.eq('employment_type', filters.employmentType);
  }

  if (filters?.applicationStatus && filters.applicationStatus !== 'all') {
    query = query.eq('application_status', filters.applicationStatus);
  }

  if (filters?.search) {
    query = query.or(
      `user.full_name.ilike.%${filters.search}%,user.email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DriverWithUser[];
}

export async function getDriver(id: string): Promise<DriverWithDetails> {
  const { data, error } = await supabase
    .from('drivers')
    .select(
      `
      *,
      user:users!user_id(*),
      vehicles:driver_vehicle_assignments(
        *,
        vehicle:vehicles(*)
      ),
      notes:driver_notes(
        *,
        author:users!created_by(full_name)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as DriverWithDetails;
}

export async function updateDriverStatus(
  driverId: string,
  status: DriverStatus,
  reason?: string
): Promise<Driver> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not authenticated');

  const updates: Partial<Driver> = {
    status,
    status_changed_at: new Date().toISOString(),
    status_changed_by: user.id,
  };

  if (status === 'suspended' && reason) {
    updates.suspension_reason = reason;
  }

  if (status === 'archived') {
    updates.archived_at = new Date().toISOString();
    updates.archived_by = user.id;
  }

  const { data, error } = await supabase
    .from('drivers')
    .update(updates)
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;
  return data as Driver;
}

export async function updateDriver(
  driverId: string,
  driverData: Partial<Driver>,
  userData?: { full_name?: string; email?: string; phone?: string }
): Promise<Driver> {
  const { data, error } = await supabase
    .from('drivers')
    .update(driverData)
    .eq('id', driverId)
    .select()
    .single();

  if (error) throw error;

  if (userData && Object.keys(userData).length > 0) {
    const driver = data as Driver;
    const { error: userError } = await supabase
      .from('users')
      .update(userData)
      .eq('id', driver.user_id);
    if (userError) throw userError;
  }

  return data as Driver;
}

export async function addDriverNote(
  driverId: string,
  companyId: string,
  content: string
): Promise<DriverNote> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('driver_notes')
    .insert({
      driver_id: driverId,
      company_id: companyId,
      content,
      created_by: user.id,
    })
    .select(
      `
      *,
      author:users!created_by(full_name)
    `
    )
    .single();

  if (error) throw error;
  return data as DriverNote;
}

export async function getDriverNotes(driverId: string): Promise<DriverNote[]> {
  const { data, error } = await supabase
    .from('driver_notes')
    .select(
      `
      *,
      author:users!created_by(full_name)
    `
    )
    .eq('driver_id', driverId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DriverNote[];
}

export async function deleteDriverNote(noteId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('driver_notes')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
    })
    .eq('id', noteId);

  if (error) throw error;
}

export async function getDriverByUserId(userId: string): Promise<DriverWithDetails | null> {
  const { data, error } = await supabase
    .from('drivers')
    .select(
      `
      *,
      user:users!user_id(*),
      vehicles:driver_vehicle_assignments(
        *,
        vehicle:vehicles(*)
      ),
      notes:driver_notes(
        *,
        author:users!created_by(full_name)
      )
    `
    )
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as DriverWithDetails;
}