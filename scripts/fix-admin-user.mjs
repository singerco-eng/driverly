#!/usr/bin/env node
/**
 * Fix Admin User Script
 * 
 * Restores an admin user that was accidentally converted to a driver.
 * 
 * Usage:
 *   node scripts/fix-admin-user.mjs <email>
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
  process.exit(1);
}

const [,, email] = process.argv;

if (!email) {
  console.error('❌ Usage: node scripts/fix-admin-user.mjs <email>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log(`\n🔧 Fixing admin user: ${email}\n`);

// 1. Get auth user
const { data: authUsers } = await supabase.auth.admin.listUsers();
const authUser = authUsers.users.find(u => u.email === email);

if (!authUser) {
  console.error(`❌ User not found: ${email}`);
  process.exit(1);
}

const userId = authUser.id;
const companyId = authUser.app_metadata?.company_id;

console.log(`   User ID: ${userId}`);
console.log(`   Company ID: ${companyId}\n`);

// 2. Delete driver record
console.log('🗑️  Deleting driver record...');
const { error: driverDeleteError } = await supabase
  .from('drivers')
  .delete()
  .eq('user_id', userId);

if (driverDeleteError) {
  console.log(`   ⚠️  Could not delete driver: ${driverDeleteError.message}`);
} else {
  console.log('   ✅ Driver record deleted');
}

// 3. Update users table
console.log('\n📝 Updating users table...');
const { error: usersError } = await supabase
  .from('users')
  .update({
    role: 'admin',
    full_name: 'Test Admin',  // Restore original name
  })
  .eq('id', userId);

if (usersError) {
  console.error(`   ❌ Error updating users: ${usersError.message}`);
} else {
  console.log('   ✅ Role set to admin');
  console.log('   ✅ Full name restored');
}

// 4. Update auth app_metadata
console.log('\n🔐 Updating auth metadata...');
const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
  app_metadata: {
    role: 'admin',
    company_id: companyId,
    // Remove driver_id by not including it
    provider: 'email',
    providers: ['email'],
  }
});

if (authError) {
  console.error(`   ❌ Error updating auth: ${authError.message}`);
} else {
  console.log('   ✅ Auth metadata updated to admin');
}

// 5. Verify
console.log('\n🔍 Verifying fix...');
const { data: profile } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

const { data: { user: updatedAuth } } = await supabase.auth.admin.getUserById(userId);

console.log(`\n   Profile Role: ${profile?.role}`);
console.log(`   Auth Role: ${updatedAuth?.app_metadata?.role}`);
console.log(`   Driver ID in Auth: ${updatedAuth?.app_metadata?.driver_id || 'None'}`);

if (profile?.role === 'admin' && updatedAuth?.app_metadata?.role === 'admin') {
  console.log('\n✅ SUCCESS! User restored to admin.');
  console.log('   Please log out and log back in to see the change.\n');
} else {
  console.log('\n⚠️  Fix may be incomplete. Please check manually.\n');
}
