#!/usr/bin/env node
/**
 * Fix Super Admin Script
 * 
 * Updates existing super admin users to have proper app_metadata.
 * Also syncs users table records with auth.users.
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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('\n🔧 FIXING SUPER ADMIN APP_METADATA');
console.log('═'.repeat(50));

// Get all users from users table with super_admin role
const { data: superAdmins, error: saErr } = await supabase
  .from('users')
  .select('*')
  .eq('role', 'super_admin');

if (saErr) {
  console.error('❌ Error fetching super admins:', saErr.message);
  process.exit(1);
}

if (!superAdmins?.length) {
  console.log('No super admins found in users table.');
  process.exit(0);
}

console.log(`Found ${superAdmins.length} super admin(s) in users table\n`);

for (const admin of superAdmins) {
  console.log(`📧 ${admin.email}`);
  console.log(`   User ID: ${admin.id}`);
  
  // Update auth.users app_metadata
  const { data: updated, error: updateErr } = await supabase.auth.admin.updateUserById(
    admin.id,
    {
      app_metadata: {
        role: 'super_admin',
        company_id: null,
      },
    }
  );

  if (updateErr) {
    console.log(`   ❌ Error: ${updateErr.message}`);
  } else {
    console.log(`   ✅ app_metadata updated: { role: 'super_admin', company_id: null }`);
  }
}

console.log('\n═'.repeat(50));
console.log('✅ Done! Super admin(s) can now use RLS-protected operations.');
console.log('\n⚠️  IMPORTANT: You still need to apply the RLS policy fix.');
console.log('   Run the SQL in: supabase/migrations/004_fix_rls_jwt_claims.sql');
console.log('   Dashboard: https://supabase.com/dashboard/project/jgpdehfrqkigivtbuznn/sql/new\n');
