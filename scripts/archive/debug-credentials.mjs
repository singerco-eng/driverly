#!/usr/bin/env node
/**
 * Debug Credentials Script
 * 
 * Investigates why a driver isn't seeing credentials.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  console.error('   Required: VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('\n🔍 CREDENTIALS DEBUG');
console.log('═'.repeat(60));
console.log(`Project: ${projectRef}`);
console.log('═'.repeat(60));

// 1. List all credential_types
console.log('\n📋 CREDENTIAL TYPES');
console.log('─'.repeat(40));

const { data: credTypes, error: ctErr } = await supabase
  .from('credential_types')
  .select('id, name, category, scope, broker_id, is_active, company_id, employment_type');

if (ctErr) {
  console.log(`❌ Error fetching credential_types: ${ctErr.message}`);
} else if (!credTypes || credTypes.length === 0) {
  console.log('⚠️  No credential types found!');
} else {
  console.log(`Found ${credTypes.length} credential type(s):`);
  for (const ct of credTypes) {
    console.log(`\n  • ${ct.name}`);
    console.log(`    - ID: ${ct.id}`);
    console.log(`    - Category: ${ct.category}, Scope: ${ct.scope}`);
    console.log(`    - Employment Type: ${ct.employment_type}`);
    console.log(`    - Active: ${ct.is_active}, Company: ${ct.company_id?.substring(0,8) || 'NULL'}...`);
    if (ct.broker_id) {
      console.log(`    - Broker: ${ct.broker_id.substring(0,8)}...`);
    }
  }
}

// 2. List all drivers
console.log('\n\n👤 DRIVERS');
console.log('─'.repeat(40));

const { data: drivers, error: dErr } = await supabase
  .from('drivers')
  .select('id, user_id, company_id, employment_type, status');

if (dErr) {
  console.log(`❌ Error fetching drivers: ${dErr.message}`);
} else if (!drivers || drivers.length === 0) {
  console.log('⚠️  No drivers found!');
} else {
  console.log(`Found ${drivers.length} driver(s):`);
  
  // Get user info for each driver
  for (const d of drivers) {
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', d.user_id)
      .single();
    
    console.log(`\n  • ${user?.full_name || 'Unknown'} (${user?.email || 'no email'})`);
    console.log(`    - Driver ID: ${d.id}`);
    console.log(`    - Company ID: ${d.company_id?.substring(0,8) || 'NULL'}...`);
    console.log(`    - Employment Type: ${d.employment_type}`);
    console.log(`    - Status: ${d.status}`);
  }
}

// 3. List companies and check if they match
console.log('\n\n🏢 COMPANIES');
console.log('─'.repeat(40));

const { data: companies, error: cErr } = await supabase
  .from('companies')
  .select('id, name');

if (cErr) {
  console.log(`❌ Error fetching companies: ${cErr.message}`);
} else if (!companies || companies.length === 0) {
  console.log('⚠️  No companies found!');
} else {
  console.log(`Found ${companies.length} company/companies:`);
  for (const c of companies) {
    console.log(`  • ${c.name} - ${c.id}`);
  }
}

// 4. Check company_id mismatch
console.log('\n\n🔍 COMPANY MATCHING ANALYSIS');
console.log('─'.repeat(40));

if (drivers && drivers.length > 0 && credTypes && credTypes.length > 0) {
  const driverCompanyIds = new Set(drivers.map(d => d.company_id).filter(Boolean));
  const ctCompanyIds = new Set(credTypes.map(ct => ct.company_id).filter(Boolean));
  
  console.log(`Driver company IDs: ${[...driverCompanyIds].map(id => id.substring(0,8)).join(', ')}`);
  console.log(`Credential Type company IDs: ${[...ctCompanyIds].map(id => id.substring(0,8)).join(', ')}`);
  
  // Check for overlap
  const overlap = [...driverCompanyIds].filter(id => ctCompanyIds.has(id));
  if (overlap.length === 0) {
    console.log('\n⚠️  MISMATCH DETECTED!');
    console.log('   Driver company IDs do not match credential_types company IDs.');
    console.log('   This is why credentials are not showing!');
  } else {
    console.log(`\n✅ Matching companies: ${overlap.map(id => id.substring(0,8)).join(', ')}`);
  }
}

// 5. Check employment_type matching
console.log('\n\n📊 EMPLOYMENT TYPE ANALYSIS');
console.log('─'.repeat(40));

if (drivers && drivers.length > 0 && credTypes && credTypes.length > 0) {
  for (const d of drivers) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', d.user_id)
      .single();
    
    const driverName = user?.full_name || 'Unknown';
    console.log(`\nDriver: ${driverName} (employment_type: ${d.employment_type})`);
    
    // Find credential types for this driver's company
    const matchingCT = credTypes.filter(ct => ct.company_id === d.company_id);
    if (matchingCT.length === 0) {
      console.log(`  ⚠️  No credential types found for this driver's company`);
    } else {
      console.log(`  Credential types in same company: ${matchingCT.length}`);
      
      // Check employment type filter
      for (const ct of matchingCT) {
        const empFilter = ct.employment_type;
        const driverEmp = d.employment_type;
        
        // Logic from the SQL function:
        // (ct.employment_type = 'both' OR ct.employment_type = v_employment_type || '_only')
        const matchesBoth = empFilter === 'both';
        const matchesSpecific = empFilter === `${driverEmp}_only`;
        
        const matches = matchesBoth || matchesSpecific;
        
        console.log(`  • ${ct.name}: emp_type=${empFilter} → ${matches ? '✅ matches' : '❌ FILTERED OUT'}`);
        
        if (!matches) {
          console.log(`    (Driver is ${driverEmp}, but credential requires ${empFilter})`);
        }
      }
    }
  }
}

// 6. Test RPC function directly
console.log('\n\n🧪 TESTING RPC FUNCTION');
console.log('─'.repeat(40));

if (drivers && drivers.length > 0) {
  for (const d of drivers) {
    const { data: user } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', d.user_id)
      .single();
    
    console.log(`\nTesting get_driver_required_credentials for ${user?.full_name || 'Unknown'}...`);
    
    const { data: rpcResult, error: rpcErr } = await supabase
      .rpc('get_driver_required_credentials', { p_driver_id: d.id });
    
    if (rpcErr) {
      console.log(`  ❌ RPC Error: ${rpcErr.message}`);
      console.log(`  📋 Full error:`, JSON.stringify(rpcErr, null, 2));
    } else if (!rpcResult || rpcResult.length === 0) {
      console.log(`  ⚠️  RPC returned 0 credentials`);
    } else {
      console.log(`  ✅ RPC returned ${rpcResult.length} credential(s):`);
      for (const c of rpcResult) {
        console.log(`    • ${c.credential_type_name} (${c.scope})`);
      }
    }
  }
}

// 7. Check existing driver_credentials
console.log('\n\n📦 EXISTING DRIVER_CREDENTIALS TABLE');
console.log('─'.repeat(40));

const { data: existingCreds, error: ecErr } = await supabase
  .from('driver_credentials')
  .select('id, driver_id, credential_type_id, status');

if (ecErr) {
  console.log(`❌ Error: ${ecErr.message}`);
} else if (!existingCreds || existingCreds.length === 0) {
  console.log('⚠️  No existing driver_credentials records');
} else {
  console.log(`Found ${existingCreds.length} existing credential(s):`);
  for (const c of existingCreds) {
    console.log(`  • ${c.id.substring(0,8)}... - Status: ${c.status}`);
  }
}

// 8. Check if driver_broker_assignments table exists (needed for broker-scoped)
console.log('\n\n📋 DRIVER_BROKER_ASSIGNMENTS CHECK');
console.log('─'.repeat(40));

const { data: dbaData, error: dbaErr } = await supabase
  .from('driver_broker_assignments')
  .select('*')
  .limit(5);

if (dbaErr) {
  if (dbaErr.message.includes('does not exist')) {
    console.log('⚠️  Table driver_broker_assignments does not exist!');
    console.log('   This could cause the RPC function to fail.');
  } else {
    console.log(`❌ Error: ${dbaErr.message}`);
  }
} else {
  console.log(`Found ${dbaData?.length || 0} driver-broker assignment(s)`);
}

console.log('\n\n═'.repeat(60));
console.log('DEBUG COMPLETE');
console.log('═'.repeat(60) + '\n');
