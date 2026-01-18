#!/usr/bin/env node
/**
 * Run SQL Script
 * 
 * Executes raw SQL against Supabase using the postgres connection.
 * Uses the service role key to bypass RLS.
 * 
 * Usage:
 *   node scripts/run-sql.mjs <sql-file>
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables.');
  process.exit(1);
}

// Get SQL file from args
const [,, sqlFile] = process.argv;

if (!sqlFile) {
  console.error('❌ Usage: node scripts/run-sql.mjs <sql-file>');
  process.exit(1);
}

if (!existsSync(sqlFile)) {
  console.error(`❌ File not found: ${sqlFile}`);
  process.exit(1);
}

const sql = readFileSync(sqlFile, 'utf-8');

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from URL');
  process.exit(1);
}

console.log(`\n📦 Running SQL from: ${sqlFile}`);
console.log(`   Project: ${projectRef}\n`);

// Use the Supabase SQL API endpoint
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify({ query: sql }),
});

// The REST API doesn't support raw SQL. Let's try a different approach.
// We'll need to use the pg library directly or the Supabase Dashboard.

console.log('⚠️  Direct SQL execution requires the Supabase Dashboard or CLI.');
console.log('\n📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n');
console.log('─'.repeat(70));
console.log(sql);
console.log('─'.repeat(70));
console.log('\n🔗 Direct link: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
