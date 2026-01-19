#!/usr/bin/env node
/**
 * Audit User Script
 * 
 * Checks user profile, role, and driver status for a given email.
 * Uses the service role key to bypass RLS.
 * 
 * Usage:
 *   node scripts/audit-user.mjs <email>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Get email from args
const [,, email] = process.argv;

if (!email) {
  console.error('❌ Usage: node scripts/audit-user.mjs <email>');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log(`\n🔍 Auditing user: ${email}\n`);
console.log('─'.repeat(60));

// 1. Get auth user
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

if (authError) {
  console.error('❌ Error fetching auth users:', authError.message);
  process.exit(1);
}

const authUser = authUsers.users.find(u => u.email === email);

if (!authUser) {
  console.error(`❌ No auth user found with email: ${email}`);
  process.exit(1);
}

console.log('\n📧 AUTH USER:');
console.log(`   ID: ${authUser.id}`);
console.log(`   Email: ${authUser.email}`);
console.log(`   Created: ${authUser.created_at}`);
console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
console.log(`   App Metadata:`, JSON.stringify(authUser.app_metadata, null, 2));
console.log(`   User Metadata:`, JSON.stringify(authUser.user_metadata, null, 2));

// 2. Get user profile
const { data: profile, error: profileError } = await supabase
  .from('users')
  .select('*')
  .eq('id', authUser.id)
  .single();

if (profileError && profileError.code !== 'PGRST116') {
  console.error('❌ Error fetching profile:', profileError.message);
}

console.log('\n👤 USER PROFILE:');
if (profile) {
  console.log(`   Full Name: ${profile.full_name || 'Not set'}`);
  console.log(`   Email: ${profile.email}`);
  console.log(`   Role: ${profile.role}`);
  console.log(`   Company ID: ${profile.company_id || 'None'}`);
  console.log(`   Phone: ${profile.phone || 'Not set'}`);
  console.log(`   Created: ${profile.created_at}`);
} else {
  console.log('   ⚠️  No user profile found!');
}

// 3. Check if user is a driver
const { data: driver, error: driverError } = await supabase
  .from('drivers')
  .select('*')
  .eq('user_id', authUser.id)
  .maybeSingle();

console.log('\n🚗 DRIVER RECORD:');
if (driver) {
  console.log(`   Driver ID: ${driver.id}`);
  console.log(`   Company ID: ${driver.company_id}`);
  console.log(`   Status: ${driver.status}`);
  console.log(`   Application Status: ${driver.application_status}`);
  console.log(`   Employment Type: ${driver.employment_type}`);
  console.log(`   Created: ${driver.created_at}`);
  console.log(`   ⚠️  THIS USER HAS A DRIVER RECORD`);
} else {
  console.log('   No driver record found');
}

// 4. Check company
if (profile?.company_id) {
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', profile.company_id)
    .single();
  
  console.log('\n🏢 COMPANY:');
  if (company) {
    console.log(`   Name: ${company.name}`);
    console.log(`   Slug: ${company.slug}`);
    console.log(`   ID: ${company.id}`);
  }
}

// 5. Diagnosis
console.log('\n' + '─'.repeat(60));
console.log('📋 DIAGNOSIS:\n');

if (profile?.role === 'driver') {
  console.log('   🔴 User role is "driver" in user_profiles');
  console.log('   → User will be routed to driver dashboard');
}

if (profile?.role === 'admin' && driver) {
  console.log('   🟡 User role is "admin" but has a driver record');
  console.log('   → Check ProtectedRoute logic - might be routing based on driver existence');
}

if (authUser.app_metadata?.role !== profile?.role) {
  console.log(`   🟡 Role mismatch: app_metadata.role = "${authUser.app_metadata?.role}" but profile.role = "${profile?.role}"`);
}

console.log('\n🔧 SUGGESTED FIXES:\n');

if (profile?.role === 'driver' || driver) {
  console.log('   Option 1: Update user role to admin');
  console.log(`   UPDATE user_profiles SET role = 'admin' WHERE id = '${authUser.id}';`);
  console.log('');
  console.log('   Option 2: Delete driver record (if not needed)');
  if (driver) {
    console.log(`   DELETE FROM drivers WHERE id = '${driver.id}';`);
  }
  console.log('');
  console.log('   Option 3: Update auth app_metadata');
  console.log(`   -- Run via Supabase Dashboard or:`);
  console.log(`   await supabase.auth.admin.updateUserById('${authUser.id}', {`);
  console.log(`     app_metadata: { role: 'admin', company_id: '${profile?.company_id}' }`);
  console.log(`   });`);
}

console.log('\n');
