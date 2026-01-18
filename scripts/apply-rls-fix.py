#!/usr/bin/env python3
"""
Apply RLS Fix Script

Connects directly to Supabase PostgreSQL and applies the RLS policy fixes.
Uses the database connection string from environment variables.

Requirements:
    pip install psycopg2-binary python-dotenv

Usage:
    python scripts/apply-rls-fix.py
"""

import os
import sys
from pathlib import Path

try:
    import psycopg2
    from dotenv import load_dotenv
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install psycopg2-binary python-dotenv")
    sys.exit(1)

# Load .env.local
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# Get connection details
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
DB_PASSWORD = os.getenv('SUPABASE_DB_PASSWORD')

if not SUPABASE_URL:
    print("❌ Missing VITE_SUPABASE_URL or SUPABASE_URL in .env.local")
    sys.exit(1)

# Extract project ref from URL
import re
match = re.search(r'https://([^.]+)\.supabase\.co', SUPABASE_URL)
if not match:
    print("❌ Could not extract project ref from SUPABASE_URL")
    sys.exit(1)

project_ref = match.group(1)

# Check for DB password
if not DB_PASSWORD:
    print("⚠️  SUPABASE_DB_PASSWORD not found in .env.local")
    print(f"\n   Find your database password at:")
    print(f"   https://supabase.com/dashboard/project/{project_ref}/settings/database")
    print(f"\n   Then add to .env.local:")
    print(f"   SUPABASE_DB_PASSWORD=your-database-password")
    sys.exit(1)

# Build connection string
# Supabase database host format: db.<project-ref>.supabase.co
DB_HOST = f"db.{project_ref}.supabase.co"
DB_PORT = 5432
DB_NAME = "postgres"
DB_USER = "postgres"

print(f"\n🔧 APPLYING RLS FIX")
print("=" * 60)
print(f"Project: {project_ref}")
print(f"Host: {DB_HOST}")
print("=" * 60)

# SQL statements to execute
SQL_STATEMENTS = [
    # Drop existing incorrect policies - Companies
    'DROP POLICY IF EXISTS "Super admins can do everything on companies" ON companies;',
    'DROP POLICY IF EXISTS "Users can view their own company" ON companies;',
    
    # Drop existing incorrect policies - Users
    'DROP POLICY IF EXISTS "Super admins can do everything on users" ON users;',
    'DROP POLICY IF EXISTS "Users can view users in their company" ON users;',
    'DROP POLICY IF EXISTS "Users can update their own profile" ON users;',
    'DROP POLICY IF EXISTS "Users can read their own profile" ON users;',
    
    # Drop existing incorrect policies - Invitations
    'DROP POLICY IF EXISTS "Super admins can manage all invitations" ON invitations;',
    'DROP POLICY IF EXISTS "Admins can manage invitations for their company" ON invitations;',
    
    # Create correct policies - Companies
    '''CREATE POLICY "Super admins can manage all companies"
      ON companies FOR ALL
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');''',
    
    '''CREATE POLICY "Users can view own company"
      ON companies FOR SELECT
      TO authenticated
      USING (id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid);''',
    
    # Create correct policies - Users
    '''CREATE POLICY "Super admins can manage all users"
      ON users FOR ALL
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');''',
    
    '''CREATE POLICY "Admins can manage company users"
      ON users FOR ALL
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      );''',
    
    '''CREATE POLICY "Coordinators can view company users"
      ON users FOR SELECT
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'coordinator'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      );''',
    
    '''CREATE POLICY "Users can read own profile"
      ON users FOR SELECT
      TO authenticated
      USING (id = auth.uid());''',
    
    '''CREATE POLICY "Users can update own profile"
      ON users FOR UPDATE
      TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());''',
    
    # Create correct policies - Invitations
    '''CREATE POLICY "Super admins can manage all invitations"
      ON invitations FOR ALL
      TO authenticated
      USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');''',
    
    '''CREATE POLICY "Admins can manage company invitations"
      ON invitations FOR ALL
      TO authenticated
      USING (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
        AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      );''',
    
    # Create sync function
    '''CREATE OR REPLACE FUNCTION sync_user_claims()
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
    $$ LANGUAGE plpgsql SECURITY DEFINER;''',
    
    # Drop existing triggers
    'DROP TRIGGER IF EXISTS on_user_created ON users;',
    'DROP TRIGGER IF EXISTS on_user_updated ON users;',
    
    # Create triggers
    '''CREATE TRIGGER on_user_created
      AFTER INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_claims();''',
    
    '''CREATE TRIGGER on_user_updated
      AFTER UPDATE OF role, company_id ON users
      FOR EACH ROW
      WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.company_id IS DISTINCT FROM NEW.company_id)
      EXECUTE FUNCTION sync_user_claims();''',
]

try:
    # Connect to database
    print("\n📡 Connecting to database...")
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        sslmode='require'
    )
    conn.autocommit = True
    cursor = conn.cursor()
    print("✅ Connected!\n")
    
    # Execute each statement
    success = 0
    failed = 0
    
    for i, sql in enumerate(SQL_STATEMENTS, 1):
        # Get first line for display
        preview = sql.strip().split('\n')[0][:50] + '...'
        
        try:
            cursor.execute(sql)
            print(f"✅ [{i}/{len(SQL_STATEMENTS)}] {preview}")
            success += 1
        except Exception as e:
            print(f"❌ [{i}/{len(SQL_STATEMENTS)}] {preview}")
            print(f"   Error: {e}")
            failed += 1
    
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"✅ Succeeded: {success}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 RLS policies fixed successfully!")
        print("   You can now create companies as super admin.")
    
except psycopg2.OperationalError as e:
    print(f"\n❌ Connection failed: {e}")
    print(f"\n   Make sure SUPABASE_DB_PASSWORD is correct in .env.local")
    print(f"   Get it from: https://supabase.com/dashboard/project/{project_ref}/settings/database")
    sys.exit(1)
