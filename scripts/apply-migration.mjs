#!/usr/bin/env node
/**
 * Apply Migration Script
 * 
 * Applies a SQL migration file to Supabase using the service role key.
 * 
 * Usage:
 *   node scripts/apply-migration.mjs <migration-file>
 * 
 * Example:
 *   node scripts/apply-migration.mjs supabase/migrations/004_fix_rls_jwt_claims.sql
 * 
 * Note: For complex migrations, you may need to run SQL directly in Supabase Dashboard.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  console.error('Required: VITE_SUPABASE_URL (or SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Get migration file from args
const [,, migrationFile] = process.argv;

if (!migrationFile) {
  console.error('❌ Usage: node scripts/apply-migration.mjs <migration-file>');
  console.error('   Example: node scripts/apply-migration.mjs supabase/migrations/004_fix_rls_jwt_claims.sql');
  process.exit(1);
}

if (!existsSync(migrationFile)) {
  console.error(`❌ File not found: ${migrationFile}`);
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Read migration file
const migrationSQL = readFileSync(migrationFile, 'utf-8');

console.log(`\n📦 Applying migration: ${migrationFile}`);
console.log(`   URL: ${SUPABASE_URL}\n`);

// Split SQL into individual statements
// Handle multi-line statements properly
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inFunction = false;
  
  const lines = sql.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('--')) {
      continue;
    }
    
    current += line + '\n';
    
    // Track if we're inside a function/trigger definition
    if (trimmed.includes('$$')) {
      inFunction = !inFunction;
    }
    
    // End of statement (semicolon at end, not inside function)
    if (trimmed.endsWith(';') && !inFunction) {
      statements.push(current.trim());
      current = '';
    }
  }
  
  // Add any remaining content
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  return statements;
}

const statements = splitSqlStatements(migrationSQL);

console.log(`Found ${statements.length} SQL statements\n`);

let success = 0;
let failed = 0;
const errors = [];

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';
  
  try {
    // Use RPC to execute SQL (requires a function in Supabase)
    // If this fails, we'll fall back to direct execution suggestion
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ [${i + 1}/${statements.length}] ${preview}`);
    success++;
  } catch (err) {
    console.log(`❌ [${i + 1}/${statements.length}] ${preview}`);
    errors.push({ statement: preview, error: err.message });
    failed++;
  }
}

console.log(`\n${'─'.repeat(60)}`);
console.log(`✅ Succeeded: ${success}`);
console.log(`❌ Failed: ${failed}`);

if (failed > 0) {
  console.log(`\n⚠️  Some statements failed. This is often because:`);
  console.log(`   1. The exec_sql RPC function doesn't exist`);
  console.log(`   2. The statement requires elevated permissions`);
  console.log(`\n📋 Copy the SQL below and run it in Supabase Dashboard → SQL Editor:\n`);
  console.log(`${'─'.repeat(60)}`);
  console.log(migrationSQL);
  console.log(`${'─'.repeat(60)}`);
}

if (success === statements.length) {
  console.log(`\n🎉 Migration applied successfully!`);
}
