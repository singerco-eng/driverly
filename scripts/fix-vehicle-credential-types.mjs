#!/usr/bin/env node
/**
 * Quick fix for vehicle credential types with empty array vehicle_types
 * Updates them to NULL so the RPC function works correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n🔧 Fixing vehicle credential types with empty vehicle_types arrays...\n');

  // Find credential types with empty arrays
  const { data: types, error: fetchError } = await supabase
    .from('credential_types')
    .select('id, name, vehicle_types, category')
    .eq('category', 'vehicle');

  if (fetchError) {
    console.error('Error fetching:', fetchError.message);
    return;
  }

  console.log(`Found ${types?.length || 0} vehicle credential types:`);
  
  for (const ct of types || []) {
    const isEmpty = Array.isArray(ct.vehicle_types) && ct.vehicle_types.length === 0;
    console.log(`  - ${ct.name}: vehicle_types = ${JSON.stringify(ct.vehicle_types)} ${isEmpty ? '⚠️ EMPTY ARRAY' : '✅'}`);
    
    if (isEmpty) {
      // Update to NULL
      const { error: updateError } = await supabase
        .from('credential_types')
        .update({ vehicle_types: null })
        .eq('id', ct.id);
      
      if (updateError) {
        console.error(`    ❌ Failed to update: ${updateError.message}`);
      } else {
        console.log(`    ✅ Updated to NULL`);
      }
    }
  }

  console.log('\n📋 Testing RPC after fix...');
  
  const VEHICLE_ID = 'ff22be16-58b4-4656-8bd8-b1f678de5331';
  const { data: required, error: rpcError } = await supabase
    .rpc('get_vehicle_required_credentials', { p_vehicle_id: VEHICLE_ID });

  if (rpcError) {
    console.error('RPC error:', rpcError.message);
    console.log('\n⚠️ RPC still needs to be updated. Run this SQL in Supabase Dashboard:\n');
    console.log(`
-- Fix the RPC to handle empty arrays
CREATE OR REPLACE FUNCTION get_vehicle_required_credentials(p_vehicle_id UUID)
RETURNS TABLE (
  credential_type_id UUID,
  credential_type_name TEXT,
  scope TEXT,
  broker_id UUID,
  broker_name TEXT,
  submission_type TEXT,
  requirement TEXT,
  existing_credential_id UUID,
  current_status TEXT
) AS $$
DECLARE
  v_company_id UUID;
  v_vehicle_type TEXT;
  v_driver_id UUID;
BEGIN
  SELECT v.company_id, v.vehicle_type, v.owner_driver_id
  INTO v_company_id, v_vehicle_type, v_driver_id
  FROM vehicles v WHERE v.id = p_vehicle_id;

  RETURN QUERY
  SELECT 
    ct.id AS credential_type_id,
    ct.name AS credential_type_name,
    ct.scope,
    ct.broker_id,
    b.name::TEXT AS broker_name,
    ct.submission_type,
    ct.requirement,
    vc.id AS existing_credential_id,
    vc.status AS current_status
  FROM credential_types ct
  LEFT JOIN brokers b ON ct.broker_id = b.id
  LEFT JOIN vehicle_credentials vc ON vc.credential_type_id = ct.id AND vc.vehicle_id = p_vehicle_id
  WHERE ct.company_id = v_company_id
    AND ct.category = 'vehicle'
    AND ct.is_active = true
    AND (ct.vehicle_types IS NULL OR cardinality(ct.vehicle_types) = 0 OR v_vehicle_type = ANY(ct.vehicle_types))
    AND (ct.scope = 'global' OR (ct.scope = 'broker' AND v_driver_id IS NOT NULL AND ct.broker_id IN (
      SELECT dba.broker_id FROM driver_broker_assignments dba
      WHERE dba.driver_id = v_driver_id AND dba.status IN ('assigned', 'requested')
    )))
  ORDER BY ct.scope DESC, ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`);
  } else {
    console.log(`\n✅ RPC now returns ${required?.length || 0} required credentials:`);
    required?.forEach(rc => {
      console.log(`  - ${rc.credential_type_name} (scope: ${rc.scope})`);
    });
  }

  console.log('\n');
}

main().catch(console.error);
