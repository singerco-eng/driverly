#!/usr/bin/env node
/**
 * Apply RLS Fix Script
 * 
 * Connects to Supabase PostgreSQL and applies RLS policy fixes.
 * Tries multiple connection methods.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';

const { Client } = pg;

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL');
  process.exit(1);
}

// Extract project ref
const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error('❌ Could not parse SUPABASE_URL');
  process.exit(1);
}
const projectRef = match[1];

console.log('\n🔧 APPLYING RLS FIX');
console.log('═'.repeat(60));
console.log(`Project: ${projectRef}`);

// SQL statements to execute
const SQL_STATEMENTS = [
  // Drop existing policies - Companies
  `DROP POLICY IF EXISTS "Super admins can do everything on companies" ON companies;`,
  `DROP POLICY IF EXISTS "Users can view their own company" ON companies;`,
  
  // Drop existing policies - Users  
  `DROP POLICY IF EXISTS "Super admins can do everything on users" ON users;`,
  `DROP POLICY IF EXISTS "Users can view users in their company" ON users;`,
  `DROP POLICY IF EXISTS "Users can update their own profile" ON users;`,
  `DROP POLICY IF EXISTS "Users can read their own profile" ON users;`,
  
  // Drop existing policies - Invitations
  `DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;`,
  `DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON invitations;`,
  
  // Create correct policies - Companies
  `CREATE POLICY "Super admins can manage all companies"
    ON companies FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');`,
  
  `CREATE POLICY "Users can view own company"
    ON companies FOR SELECT TO authenticated
    USING (id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);`,
  
  // Create correct policies - Users
  `CREATE POLICY "Super admins can manage all users"
    ON users FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');`,
  
  `CREATE POLICY "Admins can manage company users"
    ON users FOR ALL TO authenticated
    USING (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    );`,
  
  `CREATE POLICY "Coordinators can view company users"
    ON users FOR SELECT TO authenticated
    USING (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
      AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    );`,
  
  `CREATE POLICY "Users can read own profile"
    ON users FOR SELECT TO authenticated
    USING (id = auth.uid());`,
  
  `CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());`,
  
  // Create correct policies - Invitations
  `CREATE POLICY "Super admins can manage all invitations"
    ON invitations FOR ALL TO authenticated
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');`,
  
  `CREATE POLICY "Admins can manage company invitations"
    ON invitations FOR ALL TO authenticated
    USING (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    );`,
  
  // Create sync function
  `CREATE OR REPLACE FUNCTION sync_user_claims()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
      'role', NEW.role,
      'company_id', NEW.company_id
    )
    WHERE id = NEW.id;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;`,
  
  // Drop and create triggers
  `DROP TRIGGER IF EXISTS on_user_created ON users;`,
  `DROP TRIGGER IF EXISTS on_user_updated ON users;`,
  
  `CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION sync_user_claims();`,
  
  `CREATE TRIGGER on_user_updated
    AFTER UPDATE OF role, company_id ON users
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.company_id IS DISTINCT FROM NEW.company_id)
    EXECUTE FUNCTION sync_user_claims();`,
];

async function tryConnect() {
  // Try different connection methods
  const connectionOptions = [];
  
  // Method 1: Direct connection with DB password
  if (DB_PASSWORD) {
    connectionOptions.push({
      name: 'Direct connection',
      config: {
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      }
    });
  }
  
  // Method 2: Pooler with DB password
  if (DB_PASSWORD) {
    connectionOptions.push({
      name: 'Pooler connection',
      config: {
        host: `aws-0-us-east-1.pooler.supabase.com`,
        port: 6543,
        database: 'postgres',
        user: `postgres.${projectRef}`,
        password: DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
      }
    });
  }
  
  // Method 3: Try with service role key as password (some projects allow this)
  if (SERVICE_ROLE_KEY) {
    connectionOptions.push({
      name: 'Service role key auth',
      config: {
        host: `db.${projectRef}.supabase.co`,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: SERVICE_ROLE_KEY,
        ssl: { rejectUnauthorized: false },
      }
    });
  }
  
  if (connectionOptions.length === 0) {
    console.error('\n❌ No connection method available.');
    console.error('   Add SUPABASE_DB_PASSWORD to .env.local');
    console.error(`   Get it from: https://supabase.com/dashboard/project/${projectRef}/settings/database`);
    process.exit(1);
  }
  
  for (const option of connectionOptions) {
    console.log(`\n📡 Trying: ${option.name}...`);
    const client = new Client(option.config);
    
    try {
      await client.connect();
      console.log('✅ Connected!\n');
      return client;
    } catch (err) {
      console.log(`   ❌ Failed: ${err.message.split('\n')[0]}`);
    }
  }
  
  console.error('\n❌ All connection methods failed.');
  console.error('   Add SUPABASE_DB_PASSWORD to .env.local');
  console.error(`   Get it from: https://supabase.com/dashboard/project/${projectRef}/settings/database`);
  process.exit(1);
}

async function main() {
  const client = await tryConnect();
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    const sql = SQL_STATEMENTS[i];
    const preview = sql.trim().split('\n')[0].substring(0, 55) + '...';
    
    try {
      await client.query(sql);
      console.log(`✅ [${i + 1}/${SQL_STATEMENTS.length}] ${preview}`);
      success++;
    } catch (err) {
      console.log(`❌ [${i + 1}/${SQL_STATEMENTS.length}] ${preview}`);
      console.log(`   Error: ${err.message.split('\n')[0]}`);
      failed++;
    }
  }
  
  await client.end();
  
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Succeeded: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 RLS policies fixed successfully!');
    console.log('   You can now log in and create companies.');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
