#!/usr/bin/env node
/**
 * Create User Script
 * 
 * Creates a user of any type (super_admin, admin, coordinator, driver) without email.
 * Uses the Supabase Admin API which requires the service role key.
 * 
 * Usage:
 *   node scripts/create-user.mjs <email> <password> <role> <full_name> [company_slug]
 * 
 * Examples:
 *   # Create super admin (no company needed)
 *   node scripts/create-user.mjs boss@example.com Pass123! super_admin "Big Boss"
 * 
 *   # Create admin for a company
 *   node scripts/create-user.mjs admin@acme.com Pass123! admin "Jane Admin" acme
 * 
 *   # Create driver for a company  
 *   node scripts/create-user.mjs driver@acme.com Pass123! driver "John Driver" acme
 * 
 *   # List all companies (to find the slug)
 *   node scripts/create-user.mjs --list-companies
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

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const VALID_ROLES = ['super_admin', 'admin', 'coordinator', 'driver'];

// Check for --list-companies flag
if (process.argv[2] === '--list-companies') {
  listCompanies();
} else {
  createUser();
}

async function listCompanies() {
  console.log('\n📋 Fetching companies...\n');
  
  const { data: companies, error } = await supabaseAdmin
    .from('companies')
    .select('id, name, slug, status')
    .order('name');
  
  if (error) {
    console.error('❌ Error fetching companies:', error.message);
    process.exit(1);
  }
  
  if (!companies || companies.length === 0) {
    console.log('No companies found. Create one first in the Super Admin dashboard.');
    console.log('\nTo create a super admin who can create companies:');
    console.log('  node scripts/create-user.mjs admin@example.com Pass123! super_admin "Admin Name"');
    process.exit(0);
  }
  
  console.log('Companies available:\n');
  console.log('  Slug                 | Name                           | Status');
  console.log('  ---------------------|--------------------------------|--------');
  companies.forEach(c => {
    const slug = c.slug.padEnd(20);
    const name = (c.name || '').substring(0, 30).padEnd(30);
    console.log(`  ${slug} | ${name} | ${c.status}`);
  });
  console.log('\nUse the slug when creating an admin or driver.');
}

async function createUser() {
  // Parse command line arguments
  const [,, email, password, role, ...rest] = process.argv;
  
  // Find where company slug might be (last arg if role needs company)
  let fullName, companySlug;
  
  if (role === 'super_admin') {
    // Super admin doesn't need company, rest is all name
    fullName = rest.join(' ');
    companySlug = null;
  } else {
    // Last arg might be company slug
    companySlug = rest.pop();
    fullName = rest.join(' ');
  }
  
  // Validation
  if (!email || !password || !role || !fullName) {
    console.error('❌ Usage: node scripts/create-user.mjs <email> <password> <role> <full_name> [company_slug]');
    console.error('\nRoles: super_admin, admin, coordinator, driver');
    console.error('\nExamples:');
    console.error('  node scripts/create-user.mjs boss@example.com Pass123! super_admin "Big Boss"');
    console.error('  node scripts/create-user.mjs admin@acme.com Pass123! admin "Jane Admin" acme');
    console.error('  node scripts/create-user.mjs driver@acme.com Pass123! driver "John Driver" acme');
    console.error('\nTo list companies:');
    console.error('  node scripts/create-user.mjs --list-companies');
    process.exit(1);
  }
  
  if (!VALID_ROLES.includes(role)) {
    console.error(`❌ Invalid role: ${role}`);
    console.error(`Valid roles: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }
  
  if (password.length < 6) {
    console.error('❌ Password must be at least 6 characters');
    process.exit(1);
  }
  
  // For non-super_admin roles, we need a company
  let companyId = null;
  if (role !== 'super_admin') {
    if (!companySlug) {
      console.error(`❌ Role "${role}" requires a company slug.`);
      console.error('\nRun this to see available companies:');
      console.error('  node scripts/create-user.mjs --list-companies');
      process.exit(1);
    }
    
    // Look up company by slug
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('slug', companySlug)
      .single();
    
    if (companyError || !company) {
      console.error(`❌ Company not found with slug: ${companySlug}`);
      console.error('\nRun this to see available companies:');
      console.error('  node scripts/create-user.mjs --list-companies');
      process.exit(1);
    }
    
    companyId = company.id;
    console.log(`\n📋 Found company: ${company.name} (${companySlug})`);
  }
  
  console.log(`\n🔐 Creating user: ${email}`);
  console.log(`   Name: ${fullName}`);
  console.log(`   Role: ${role}`);
  if (companyId) console.log(`   Company: ${companySlug}`);
  console.log('');
  
  try {
    // Step 1: Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      console.log('⚠️  User already exists. Updating...');
      
      // Update existing user's app_metadata
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        {
          app_metadata: {
            role: role,
            company_id: companyId,
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
          role: role,
          company_id: companyId,
        }, {
          onConflict: 'id',
        });
      
      if (upsertError) throw upsertError;
      
      console.log('✅ User updated successfully!');
      console.log(`   User ID: ${existingUser.id}`);
      return;
    }
    
    // Step 2: Create auth user with app_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      app_metadata: {
        role: role,
        company_id: companyId,
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
        role: role,
        company_id: companyId,
      });
    
    if (userError) throw userError;
    
    console.log('✅ Users table record created');
    console.log('\n🎉 User created successfully!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Role: ${role}`);
    if (companySlug) console.log(`   Company: ${companySlug}`);
    console.log('\n   They can now log in at /login');
    
  } catch (error) {
    console.error('\n❌ Error creating user:');
    console.error(error.message || error);
    
    if (error.message?.includes('duplicate key')) {
      console.error('\nHint: User may already exist. Try a different email.');
    }
    
    process.exit(1);
  }
}
