#!/usr/bin/env node
/**
 * Debug script to investigate vehicle details page issues:
 * 1. Why vehicle credentials don't show
 * 2. Why W2 drivers don't load in assignment modal
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
// Try service role key first (bypasses RLS), fallback to anon key
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Check .env.local');
  process.exit(1);
}

console.log('Using key type:', serviceRoleKey ? 'SERVICE_ROLE (bypasses RLS)' : 'ANON (subject to RLS)');
console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const VEHICLE_ID = 'ff22be16-58b4-4656-8bd8-b1f678de5331';
let COMPANY_ID = '687805c7-57a7-41f7-85e3-c2eb4ff4e59d';

async function main() {
  console.log('\n========================================');
  console.log('🔍 VEHICLE DETAILS PAGE DEBUG SCRIPT');
  console.log('========================================\n');

  // First, let's find where data actually exists
  console.log('📋 0. FINDING DATA ACROSS ALL COMPANIES');
  console.log('----------------------------------------');
  
  const { data: allCompanies } = await supabase.from('companies').select('id, name');
  console.log('Companies:', allCompanies);

  const { data: allDriversGlobal } = await supabase
    .from('drivers')
    .select('id, company_id, employment_type, status');
  console.log('All drivers in system:', allDriversGlobal);

  const { data: allVehiclesGlobal } = await supabase
    .from('vehicles')
    .select('id, company_id, make, model, year');
  console.log('All vehicles in system:', allVehiclesGlobal);

  const { data: allCredTypes } = await supabase
    .from('credential_types')
    .select('id, company_id, name, category, scope');
  console.log('All credential types:', allCredTypes);

  // Update company ID if we found data elsewhere
  if (allDriversGlobal?.length && allDriversGlobal[0].company_id !== COMPANY_ID) {
    COMPANY_ID = allDriversGlobal[0].company_id;
    console.log(`\n⚠️ Using company_id from drivers: ${COMPANY_ID}`);
  }
  
  console.log('\n');

  // 1. Check the vehicle exists and get its details
  console.log('📋 1. VEHICLE INFO');
  console.log('------------------');
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', VEHICLE_ID)
    .maybeSingle();
  
  if (vehicleError) {
    console.error('Vehicle fetch error:', vehicleError.message);
  } else if (!vehicle) {
    console.log('❌ Vehicle not found with ID:', VEHICLE_ID);
    console.log('   Fetching all vehicles in company...');
    const { data: allVehicles } = await supabase
      .from('vehicles')
      .select('id, make, model, year, status')
      .eq('company_id', COMPANY_ID);
    console.log('   All vehicles:', allVehicles);
  } else {
    console.log(`Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    console.log(`Company ID: ${vehicle.company_id}`);
    console.log(`Type: ${vehicle.vehicle_type}`);
    console.log(`Status: ${vehicle.status}`);
    console.log(`Owner Driver ID: ${vehicle.owner_driver_id || 'None (company owned)'}`);
  }

  // 2. Check global vehicle credential types
  console.log('\n📋 2. GLOBAL VEHICLE CREDENTIAL TYPES');
  console.log('--------------------------------------');
  const { data: credTypes, error: credTypesError } = await supabase
    .from('credential_types')
    .select('id, name, scope, category, requirement, is_active')
    .eq('company_id', COMPANY_ID)
    .eq('category', 'vehicle')
    .eq('is_active', true);
  
  if (credTypesError) {
    console.error('Credential types fetch error:', credTypesError.message);
  } else if (!credTypes?.length) {
    console.log('❌ No vehicle credential types found for this company');
  } else {
    console.log(`Found ${credTypes.length} vehicle credential type(s):`);
    credTypes.forEach(ct => {
      console.log(`  - ${ct.name} (scope: ${ct.scope}, requirement: ${ct.requirement})`);
    });
  }

  // 3. Check existing vehicle_credentials for this vehicle
  console.log('\n📋 3. EXISTING VEHICLE CREDENTIALS');
  console.log('-----------------------------------');
  const { data: vehicleCreds, error: vehicleCredsError } = await supabase
    .from('vehicle_credentials')
    .select('*, credential_type:credential_types(name)')
    .eq('vehicle_id', VEHICLE_ID);
  
  if (vehicleCredsError) {
    console.error('Vehicle credentials fetch error:', vehicleCredsError.message);
  } else if (!vehicleCreds?.length) {
    console.log('❌ No vehicle_credentials records exist for this vehicle');
    console.log('   This is why credentials tab shows nothing!');
  } else {
    console.log(`Found ${vehicleCreds.length} credential record(s):`);
    vehicleCreds.forEach(vc => {
      console.log(`  - ${vc.credential_type?.name}: ${vc.status}`);
    });
  }

  // 4. Test the RPC function
  console.log('\n📋 4. RPC: get_vehicle_required_credentials');
  console.log('--------------------------------------------');
  const { data: requiredCreds, error: rpcError } = await supabase
    .rpc('get_vehicle_required_credentials', { p_vehicle_id: VEHICLE_ID });
  
  if (rpcError) {
    console.error('RPC error:', rpcError.message);
  } else if (!requiredCreds?.length) {
    console.log('❌ RPC returned no required credentials');
    console.log('\n   Debugging why RPC returns nothing...');
    
    // Check the credential type details
    const { data: globalVehicleCred } = await supabase
      .from('credential_types')
      .select('*')
      .eq('company_id', COMPANY_ID)
      .eq('category', 'vehicle')
      .eq('scope', 'global');
    
    console.log('\n   Global vehicle credential types in DB:');
    globalVehicleCred?.forEach(ct => {
      console.log(`     Name: ${ct.name}`);
      console.log(`     ID: ${ct.id}`);
      console.log(`     is_active: ${ct.is_active}`);
      console.log(`     vehicle_types: ${JSON.stringify(ct.vehicle_types)}`);
      console.log(`     requirement: ${ct.requirement}`);
      console.log(`     ---`);
    });

    // Check if vehicle type matches
    console.log(`\n   Vehicle type: ${vehicle?.vehicle_type}`);
    console.log(`   If vehicle_types array is set on credential, vehicle type must match.`);
    console.log(`   If vehicle_types is NULL, credential applies to all vehicle types.`);
  } else {
    console.log(`RPC returned ${requiredCreds.length} required credential(s):`);
    requiredCreds.forEach(rc => {
      console.log(`  - ${rc.credential_type_name} (scope: ${rc.scope})`);
      console.log(`    Existing record: ${rc.existing_credential_id || 'NONE'}`);
      console.log(`    Current status: ${rc.current_status || 'not_submitted'}`);
    });
  }

  // 5. Check all drivers in the company
  console.log('\n📋 5. ALL DRIVERS IN COMPANY');
  console.log('-----------------------------');
  const { data: allDrivers, error: driversError } = await supabase
    .from('drivers')
    .select('id, employment_type, status, user:users!user_id(full_name, email)')
    .eq('company_id', COMPANY_ID);
  
  if (driversError) {
    console.error('Drivers fetch error:', driversError.message);
  } else if (!allDrivers?.length) {
    console.log('❌ No drivers found for this company');
  } else {
    console.log(`Found ${allDrivers.length} driver(s):`);
    allDrivers.forEach(d => {
      console.log(`  - ${d.user?.full_name || 'Unknown'}`);
      console.log(`    Type: ${d.employment_type}, Status: ${d.status}`);
    });
  }

  // 6. Simulate the getAvailableDrivers query
  console.log('\n📋 6. SIMULATING getAvailableDrivers QUERY');
  console.log('-------------------------------------------');
  const { data: availableDrivers, error: availableError } = await supabase
    .from('drivers')
    .select(`
      *,
      user:users!user_id(full_name, email),
      assignments:driver_vehicle_assignments(
        id,
        vehicle_id,
        is_primary,
        assignment_type,
        ended_at
      )
    `)
    .eq('company_id', COMPANY_ID)
    .in('status', ['active', 'inactive'])
    .order('created_at');
  
  if (availableError) {
    console.error('Available drivers query error:', availableError.message);
  } else {
    console.log(`Query returned ${availableDrivers?.length || 0} driver(s)`);
    
    const w2Drivers = availableDrivers?.filter(d => d.employment_type === 'w2') || [];
    const contractors = availableDrivers?.filter(d => d.employment_type === '1099') || [];
    
    console.log(`  W2 Drivers: ${w2Drivers.length}`);
    w2Drivers.forEach(d => {
      console.log(`    - ${d.user?.full_name} (${d.status})`);
    });
    
    console.log(`  1099 Drivers: ${contractors.length}`);
    contractors.forEach(d => {
      console.log(`    - ${d.user?.full_name} (${d.status})`);
    });
  }

  // 7. Check what the admin credentials review query returns
  console.log('\n📋 7. SIMULATING VehicleCredentialsTab QUERY');
  console.log('---------------------------------------------');
  const { data: reviewCreds, error: reviewError } = await supabase
    .from('vehicle_credentials')
    .select(`
      *,
      credential_type:credential_types(*, broker:brokers(id, name))
    `)
    .eq('company_id', COMPANY_ID)
    .eq('vehicle_id', VEHICLE_ID);
  
  if (reviewError) {
    console.error('Review query error:', reviewError.message);
  } else if (!reviewCreds?.length) {
    console.log('❌ Query returns EMPTY - this is why no credentials show!');
    console.log('   The query only fetches EXISTING records from vehicle_credentials');
    console.log('   But no records exist because they were never created.');
  } else {
    console.log(`Query returned ${reviewCreds.length} credential(s)`);
  }

  // 8. Check admin users and their JWT claims
  console.log('\n📋 8. ADMIN USERS & JWT CLAIMS');
  console.log('--------------------------------');
  const { data: adminUsers, error: adminError } = await supabase
    .from('users')
    .select('id, email, full_name, role, company_id')
    .in('role', ['admin', 'coordinator', 'super_admin']);
  
  if (adminError) {
    console.error('Admin users query error:', adminError.message);
  } else {
    console.log(`Found ${adminUsers?.length || 0} admin user(s):`);
    adminUsers?.forEach(u => {
      console.log(`  - ${u.full_name} (${u.email})`);
      console.log(`    Role: ${u.role}, Company: ${u.company_id}`);
      console.log(`    RLS would match: role=${u.role}, company_id=${u.company_id === COMPANY_ID ? 'MATCHES' : 'NO MATCH'}`);
    });
  }

  // Check auth.users for raw_app_meta_data
  console.log('\n📋 9. AUTH.USERS app_metadata');
  console.log('--------------------------------');
  const { data: authUsers, error: authError } = await supabase
    .rpc('get_auth_users_metadata');
  
  if (authError) {
    console.log('Note: Cannot query auth.users directly. Check Supabase dashboard.');
    console.log('Expected JWT format: { app_metadata: { role: "admin", company_id: "UUID" } }');
  } else {
    console.log('Auth users metadata:', authUsers);
  }

  console.log('\n========================================');
  console.log('📊 DIAGNOSIS');
  console.log('========================================');
  
  // Diagnose credentials issue
  if (credTypes?.length && !vehicleCreds?.length) {
    console.log('\n🔴 CREDENTIALS BUG CONFIRMED:');
    console.log('   - Vehicle credential TYPES exist: YES');
    console.log('   - Vehicle credential RECORDS exist: NO');
    console.log('   - Root cause: Admin view queries vehicle_credentials table directly');
    console.log('     but never creates records for required credential types.');
    console.log('   - Fix: Create vehicle_credentials records when viewing or use RPC merge.');
  }
  
  // Diagnose W2 drivers issue
  const w2Count = allDrivers?.filter(d => d.employment_type === 'w2').length || 0;
  const w2ActiveInactive = allDrivers?.filter(d => 
    d.employment_type === 'w2' && ['active', 'inactive'].includes(d.status)
  ).length || 0;
  
  if (w2Count > 0 && w2ActiveInactive > 0) {
    const availableW2 = availableDrivers?.filter(d => d.employment_type === 'w2').length || 0;
    if (availableW2 === 0) {
      console.log('\n🔴 W2 DRIVERS BUG - POSSIBLE RLS ISSUE:');
      console.log('   - W2 drivers exist: YES');
      console.log('   - W2 drivers with active/inactive status: YES');
      console.log('   - Query returns them: NO');
      console.log('   - This suggests an RLS policy is blocking the query');
      console.log('   - Check if admin JWT has correct company_id in app_metadata');
    } else {
      console.log('\n🟢 W2 DRIVERS: Query working correctly');
      console.log(`   - Found ${availableW2} W2 driver(s) in query result`);
    }
  } else if (w2Count > 0 && w2ActiveInactive === 0) {
    console.log('\n🟡 W2 DRIVERS - STATUS FILTER ISSUE:');
    console.log('   - W2 drivers exist: YES');
    console.log('   - W2 drivers with active/inactive status: NO');
    console.log('   - Current W2 driver statuses:', 
      allDrivers?.filter(d => d.employment_type === 'w2').map(d => d.status).join(', '));
  }

  console.log('\n========================================\n');
}

main().catch(console.error);
