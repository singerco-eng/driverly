#!/usr/bin/env node
/**
 * Debug script to investigate vehicle creation issues for drivers
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('\n========================================');
  console.log('🔍 VEHICLE CREATION DEBUG SCRIPT');
  console.log('========================================\n');

  // Find the test driver
  console.log('📋 1. FINDING TEST DRIVER');
  console.log('----------------------------------------');
  
  const { data: drivers, error: driversError } = await supabase
    .from('drivers')
    .select('*, user:users!drivers_user_id_fkey(id, email, full_name)')
    .or('employment_type.eq.1099');

  if (driversError) {
    console.error('Error fetching drivers:', driversError.message);
    return;
  }

  console.log('1099 Drivers found:');
  drivers?.forEach(d => {
    console.log(`  - ${d.id}: ${d.user?.full_name} (${d.user?.email}) - ${d.employment_type} - ${d.status}`);
    console.log(`    company_id: ${d.company_id}`);
  });

  // Check existing vehicles
  console.log('\n📋 2. EXISTING VEHICLES');
  console.log('----------------------------------------');
  
  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select('id, make, model, license_plate, company_id, owner_driver_id, status')
    .order('created_at', { ascending: false })
    .limit(10);

  if (vehiclesError) {
    console.error('Error fetching vehicles:', vehiclesError.message);
  } else {
    console.log('Recent vehicles:');
    vehicles?.forEach(v => {
      console.log(`  - ${v.id}: ${v.make} ${v.model} (${v.license_plate}) - owner: ${v.owner_driver_id}`);
    });
  }

  // Check existing assignments
  console.log('\n📋 3. EXISTING ASSIGNMENTS');
  console.log('----------------------------------------');
  
  const { data: assignments, error: assignmentsError } = await supabase
    .from('driver_vehicle_assignments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError.message);
  } else {
    console.log('Recent assignments:');
    assignments?.forEach(a => {
      console.log(`  - ${a.id}: driver=${a.driver_id} vehicle=${a.vehicle_id} type=${a.assignment_type}`);
      console.log(`    starts_at: ${a.starts_at}, ended_at: ${a.ended_at}`);
    });
  }

  // Check assignment table schema
  console.log('\n📋 4. CHECKING ASSIGNMENT TABLE SCHEMA');
  console.log('----------------------------------------');
  
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns', { table_name: 'driver_vehicle_assignments' })
    .select('*');

  if (columnsError) {
    console.log('Could not get columns via RPC, checking directly...');
    
    // Try a simple insert to see what columns are expected
    const testInsert = await supabase
      .from('driver_vehicle_assignments')
      .insert({
        driver_id: '00000000-0000-0000-0000-000000000000',
        vehicle_id: '00000000-0000-0000-0000-000000000000',
        company_id: '00000000-0000-0000-0000-000000000000',
        assignment_type: 'owned',
        starts_at: new Date().toISOString(),
      });
    
    console.log('Test insert error (expected):', testInsert.error?.message);
    console.log('Error details:', testInsert.error?.details);
    console.log('Error code:', testInsert.error?.code);
  }

  // Check if license plate already exists
  console.log('\n📋 5. CHECK FOR DUPLICATE LICENSE PLATES');
  console.log('----------------------------------------');
  
  const testPlates = ['TEST123', 'ABC1234', 'XYZ999'];
  for (const plate of testPlates) {
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id, license_plate, company_id')
      .ilike('license_plate', plate);
    
    if (existing && existing.length > 0) {
      console.log(`Plate "${plate}" already exists:`, existing);
    }
  }

  // Try to simulate creating an assignment for the existing vehicle
  console.log('\n📋 6. SIMULATE ASSIGNMENT CREATION');
  console.log('----------------------------------------');
  
  const driverId = '200681f8-4d97-412b-98b0-c30bc26c3b3b';
  const existingVehicleId = '329f9239-f6f9-44ea-a8b0-9487f0532170';
  const companyId = '687805c7-57a7-41f7-85e3-c2eb4ff4e59d';
  
  console.log(`Attempting to create assignment for driver ${driverId} and vehicle ${existingVehicleId}`);
  
  const { data: newAssignment, error: assignError } = await supabase
    .from('driver_vehicle_assignments')
    .insert({
      driver_id: driverId,
      vehicle_id: existingVehicleId,
      company_id: companyId,
      assignment_type: 'owned',
      starts_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (assignError) {
    console.error('Assignment creation failed:', assignError.message);
    console.error('Error code:', assignError.code);
    console.error('Error details:', assignError.details);
    console.error('Error hint:', assignError.hint);
  } else {
    console.log('Assignment created successfully:', newAssignment);
  }

  console.log('\n========================================');
  console.log('✅ DEBUG COMPLETE');
  console.log('========================================\n');
}

main().catch(console.error);
