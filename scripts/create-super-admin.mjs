#!/usr/bin/env node
/**
 * Create Super Admin Script
 * 
 * Creates a super admin user with proper JWT claims (app_metadata).
 * This script uses the Supabase Admin API which requires the service role key.
 * 
 * Usage:
 *   node scripts/create-super-admin.mjs <email> <password> <full_name>
 * 
 * Example:
 *   node scripts/create-super-admin.mjs admin@driverly.com SecurePass123! "Platform Admin"
 * 
 * Environment variables required:
 *   - VITE_SUPABASE_URL (or SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
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
  console.error('Required: VITE_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure .env.local has:');
  console.error('  VITE_SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

// Parse command line arguments
const [,, email, password, ...nameParts] = process.argv;
const fullName = nameParts.join(' ');

if (!email || !password || !fullName) {
  console.error('❌ Usage: node scripts/create-super-admin.mjs <email> <password> <full_name>');
  console.error('   Example: node scripts/create-super-admin.mjs admin@driverly.com SecurePass123! "Platform Admin"');
  process.exit(1);
}

// Validate password strength
if (password.length < 8) {
  console.error('❌ Password must be at least 8 characters');
  process.exit(1);
}

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  console.log(`\n🔐 Creating super admin: ${email}`);
  console.log(`   Name: ${fullName}`);
  console.log(`   URL: ${SUPABASE_URL}\n`);

  try {
    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log('⚠️  User already exists. Updating app_metadata...');
      
      // Update existing user's app_metadata
      const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          app_metadata: {
            role: 'super_admin',
            company_id: null,
          },
        }
      );

      if (updateError) throw updateError;

      // Update or insert users table record
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: existingUser.id,
          email: email,
          full_name: fullName,
          role: 'super_admin',
          company_id: null,
        }, {
          onConflict: 'id',
        });

      if (upsertError) throw upsertError;

      console.log('✅ Super admin updated successfully!');
      console.log(`   User ID: ${existingUser.id}`);
      return;
    }

    // Step 2: Create auth user with app_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      app_metadata: {
        role: 'super_admin',
        company_id: null,
      },
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) throw authError;

    console.log(`✅ Auth user created: ${authData.user.id}`);

    // Step 3: Create users table record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'super_admin',
        company_id: null,
      });

    if (userError) throw userError;

    console.log('✅ Users table record created');
    console.log('\n🎉 Super admin created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Role: super_admin`);
    console.log('\n   You can now log in at /login');

  } catch (error) {
    console.error('\n❌ Error creating super admin:');
    console.error(error.message || error);
    
    if (error.message?.includes('duplicate key')) {
      console.error('\nHint: User may already exist. Try a different email.');
    }
    
    process.exit(1);
  }
}

createSuperAdmin();
