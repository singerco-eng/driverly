// Quick Supabase connection test
// Run with: node test-connection.mjs

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate env vars exist (don't print values!)
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.log('   SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.log('   SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

console.log('🔌 Testing Supabase connection...');
console.log('   URL pattern:', supabaseUrl.replace(/https:\/\/(.{8}).*/, 'https://$1***.supabase.co'));

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  // Simple health check - query the auth schema
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Supabase connection successful!');
  console.log('   Session:', data.session ? 'Active' : 'No active session (expected)');
  
  // Test database access
  const { error: dbError } = await supabase.from('companies').select('count').limit(0);
  
  if (dbError) {
    if (dbError.message.includes('does not exist')) {
      console.log('📋 Database: Connected (tables not yet created - run migrations next)');
    } else {
      console.log('⚠️  Database query error:', dbError.message);
    }
  } else {
    console.log('✅ Database: Connected and companies table exists');
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
