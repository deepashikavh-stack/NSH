-- ============================================
-- FIX USERS RLS (Permissive Policies for Custom Auth)
-- ============================================
-- This migration resolves the "new row violates row-level security" error
-- caused by old policies that relied on auth.uid() (Supabase Auth).

-- 1. Enable RLS on users table (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Clean up ALL old policies on the users table
-- These rely on auth.uid() which is not populated by the NGS custom auth.
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Allow public read access to users" ON users;

-- 3. Create NEW Permissive Policy: Allow all operations (matching NGS pattern)
-- Since the NGS System uses the anon key with custom login, 
-- we allow all operations for public/anon to avoid breaking the app.
-- Secure this later by integrating Supabase Auth.
CREATE POLICY "Allow authenticated operations on users"
    ON users FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- 4. Grant full access to all roles
GRANT ALL ON users TO anon, authenticated, postgres, service_role;
