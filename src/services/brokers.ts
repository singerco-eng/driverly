import { supabase } from '@/integrations/supabase/client';
import type {
  Broker,
  BrokerFormData,
  BrokerWithStats,
  DriverBrokerAssignment,
  BrokerRate,
  UpdateRatesFormData,
} from '@/types/broker';

export async function getBrokers(companyId: string): Promise<Broker[]> {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('company_id', companyId)
    .order('name');

  if (error) throw error;
  return data as Broker[];
}

export async function getBrokersWithStats(companyId: string): Promise<BrokerWithStats[]> {
  const brokers = await getBrokers(companyId);

  // Get assignment counts per broker
  const { data: assignments } = await supabase
    .from('driver_broker_assignments')
    .select('broker_id, status')
    .eq('company_id', companyId);

  // Get credential counts per broker
  const { data: credentials } = await supabase
    .from('credential_types')
    .select('broker_id')
    .eq('company_id', companyId)
    .eq('scope', 'broker');

  return brokers.map((broker) => {
    const brokerAssignments = assignments?.filter((a) => a.broker_id === broker.id) || [];
    const brokerCredentials = credentials?.filter((c) => c.broker_id === broker.id) || [];

    return {
      ...broker,
      assigned_count: brokerAssignments.filter((a) => a.status === 'assigned').length,
      pending_count: brokerAssignments.filter((a) => a.status === 'pending').length,
      eligible_count: 0, // Calculate separately if needed
      credential_count: brokerCredentials.length,
    };
  });
}

export async function getBroker(id: string): Promise<Broker> {
  const { data, error } = await supabase.from('brokers').select('*').eq('id', id).single();

  if (error) throw error;
  return data as Broker;
}

export async function createBroker(
  companyId: string,
  formData: BrokerFormData,
  userId: string,
): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .insert({
      company_id: companyId,
      name: formData.name,
      code: formData.code || null,
      source_type: formData.source_type,
      logo_url: formData.logo_url,
      contact_name: formData.contact_name || null,
      contact_email: formData.contact_email || null,
      contact_phone: formData.contact_phone || null,
      address_line1: formData.address_line1 || null,
      address_line2: formData.address_line2 || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zip_code || null,
      website: formData.website || null,
      contract_number: formData.contract_number || null,
      notes: formData.notes || null,
      service_states: formData.service_states,
      accepted_vehicle_types: formData.accepted_vehicle_types,
      accepted_employment_types: formData.accepted_employment_types,
      allow_driver_requests: formData.allow_driver_requests,
      allow_driver_auto_signup: formData.allow_driver_auto_signup,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

export async function updateBroker(
  id: string,
  formData: Partial<BrokerFormData>,
): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .update({
      ...formData,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

export async function updateBrokerStatus(id: string, status: 'active' | 'inactive'): Promise<Broker> {
  const { data, error } = await supabase
    .from('brokers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Broker;
}

// ============ Driver Assignments ============

export async function getBrokerAssignments(brokerId: string): Promise<DriverBrokerAssignment[]> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .select(
      `
      *,
      driver:drivers(
        id,
        employment_type,
        status,
        state,
        user:users!drivers_user_id_fkey(full_name, email)
      )
    `,
    )
    .eq('broker_id', brokerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as DriverBrokerAssignment[];
}

export async function assignDriverToBroker(
  driverId: string,
  brokerId: string,
  companyId: string,
  requestedBy: 'admin' | 'driver',
  userId: string,
): Promise<DriverBrokerAssignment> {
  const status = requestedBy === 'admin' ? 'assigned' : 'pending';

  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .insert({
      driver_id: driverId,
      broker_id: brokerId,
      company_id: companyId,
      status,
      requested_by: requestedBy,
      approved_by: requestedBy === 'admin' ? userId : null,
      approved_at: requestedBy === 'admin' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function approveAssignment(
  assignmentId: string,
  userId: string,
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'assigned',
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function denyAssignment(
  assignmentId: string,
  userId: string,
  reason?: string,
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'removed',
      removed_by: userId,
      removed_at: new Date().toISOString(),
      removal_reason: reason || 'Request denied',
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

export async function removeDriverFromBroker(
  assignmentId: string,
  userId: string,
  reason?: string,
): Promise<DriverBrokerAssignment> {
  const { data, error } = await supabase
    .from('driver_broker_assignments')
    .update({
      status: 'removed',
      removed_by: userId,
      removed_at: new Date().toISOString(),
      removal_reason: reason || 'Removed by admin',
    })
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  return data as DriverBrokerAssignment;
}

// ============ Broker Rates ============

export async function getBrokerRates(brokerId: string): Promise<BrokerRate[]> {
  const { data, error } = await supabase
    .from('broker_rates')
    .select('*')
    .eq('broker_id', brokerId)
    .order('effective_from', { ascending: false });

  if (error) throw error;
  return data as BrokerRate[];
}

export async function getCurrentBrokerRates(brokerId: string): Promise<BrokerRate[]> {
  const { data, error } = await supabase
    .from('broker_rates')
    .select('*')
    .eq('broker_id', brokerId)
    .is('effective_to', null)
    .order('vehicle_type');

  if (error) throw error;
  return data as BrokerRate[];
}

export async function updateBrokerRates(
  brokerId: string,
  companyId: string,
  formData: UpdateRatesFormData,
  userId: string,
): Promise<void> {
  const effectiveFrom = new Date(formData.effective_from);
  const dayBefore = new Date(effectiveFrom.getTime() - 86400000);

  // Close out current rates
  await supabase
    .from('broker_rates')
    .update({ effective_to: dayBefore.toISOString().split('T')[0] })
    .eq('broker_id', brokerId)
    .is('effective_to', null);

  // Insert new rates
  const newRates = formData.rates.map((rate) => ({
    broker_id: brokerId,
    company_id: companyId,
    vehicle_type: rate.vehicle_type,
    base_rate: rate.base_rate,
    per_mile_rate: rate.per_mile_rate,
    effective_from: formData.effective_from,
    created_by: userId,
  }));

  const { error } = await supabase.from('broker_rates').insert(newRates);
  if (error) throw error;
}
