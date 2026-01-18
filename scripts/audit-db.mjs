#!/usr/bin/env node
/**
 * Audit Database Script
 * 
 * Checks the current state of tables, policies, and users.
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

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

console.log('\n🔍 DRIVERLY DATABASE AUDIT');
console.log('═'.repeat(60));
console.log(`Project: ${projectRef}`);
console.log(`URL: ${SUPABASE_URL}`);
console.log('═'.repeat(60));

// 1. Check tables exist
console.log('\n📋 TABLES');
console.log('─'.repeat(40));

const tables = ['companies', 'users', 'invitations'];
for (const table of tables) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  } catch (err) {
    console.log(`❌ ${table}: ${err.message}`);
  }
}

// 2. Check companies data
console.log('\n🏢 COMPANIES');
console.log('─'.repeat(40));

const { data: companies, error: compErr } = await supabase
  .from('companies')
  .select('id, name, slug, status, created_at')
  .limit(10);

if (compErr) {
  console.log(`Error: ${compErr.message}`);
} else if (companies.length === 0) {
  console.log('No companies found');
} else {
  for (const c of companies) {
    console.log(`• ${c.name} (${c.slug}) - ${c.status}`);
  }
}

// 3. Check users and their roles
console.log('\n👤 USERS');
console.log('─'.repeat(40));

const { data: users, error: userErr } = await supabase
  .from('users')
  .select('id, email, full_name, role, company_id')
  .limit(10);

if (userErr) {
  console.log(`Error: ${userErr.message}`);
} else if (users.length === 0) {
  console.log('No users found in users table');
} else {
  for (const u of users) {
    console.log(`• ${u.email} - ${u.role}${u.company_id ? ` (company: ${u.company_id.substring(0,8)}...)` : ''}`);
  }
}

// 4. Check auth users and their app_metadata
console.log('\n🔐 AUTH USERS (app_metadata)');
console.log('─'.repeat(40));

const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();

if (authErr) {
  console.log(`Error: ${authErr.message}`);
} else if (!authData?.users?.length) {
  console.log('No auth users found');
} else {
  for (const u of authData.users) {
    const meta = u.app_metadata || {};
    const role = meta.role || 'NOT SET';
    const companyId = meta.company_id ? meta.company_id.substring(0,8) + '...' : 'null';
    console.log(`• ${u.email}`);
    console.log(`  └─ role: ${role}, company_id: ${companyId}`);
  }
}

// 5. Summary and recommendations
console.log('\n═'.repeat(60));
console.log('📊 SUMMARY & RECOMMENDATIONS');
console.log('═'.repeat(60));

const authUsers = authData?.users || [];
const superAdmins = authUsers.filter(u => u.app_metadata?.role === 'super_admin');

if (superAdmins.length === 0) {
  console.log('\n⚠️  NO SUPER ADMIN FOUND!');
  console.log('   Run: node scripts/create-super-admin.mjs <email> <password> "<name>"');
} else {
  console.log(`\n✅ Super admin(s): ${superAdmins.map(u => u.email).join(', ')}`);
}

// Check for users without proper app_metadata
const usersWithoutRole = authUsers.filter(u => !u.app_metadata?.role);
if (usersWithoutRole.length > 0) {
  console.log(`\n⚠️  ${usersWithoutRole.length} user(s) missing app_metadata.role:`);
  for (const u of usersWithoutRole) {
    console.log(`   • ${u.email}`);
  }
}

console.log('\n🔗 Supabase Dashboard:');
console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
console.log('\n');
