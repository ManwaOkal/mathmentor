-- Migration 008: Add INSERT policy for users table
-- This allows users to create their own profile during signup

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

