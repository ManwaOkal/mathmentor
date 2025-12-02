-- Migration 004: Fix teacher user creation for development
-- This allows creating classrooms with UUIDs that may not exist in auth.users yet
-- For development only - in production, use proper Supabase Auth

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Option 1: Create a function that creates the user if it doesn't exist
-- This function requires SECURITY DEFINER to insert into auth.users
CREATE OR REPLACE FUNCTION ensure_user_exists(
    p_user_id UUID, 
    p_email TEXT DEFAULT NULL,
    p_role TEXT DEFAULT 'student'  -- Default to 'student', can be 'teacher' or 'student'
)
RETURNS BOOLEAN AS $$
DECLARE
    user_exists BOOLEAN;
    instance_uuid UUID;
    user_role TEXT;
BEGIN
    -- Validate role
    user_role := LOWER(COALESCE(p_role, 'student'));
    IF user_role NOT IN ('teacher', 'student', 'admin') THEN
        user_role := 'student';  -- Default to student if invalid
    END IF;
    
    -- Get the instance ID (usually from auth.instances)
    SELECT id INTO instance_uuid FROM auth.instances LIMIT 1;
    IF instance_uuid IS NULL THEN
        -- Fallback: use a default UUID if no instance exists
        instance_uuid := '00000000-0000-0000-0000-000000000000'::UUID;
    END IF;
    
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        -- Insert into auth.users (requires SECURITY DEFINER)
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role,
            aud,
            confirmation_token,
            recovery_token
        ) VALUES (
            p_user_id,
            instance_uuid,
            COALESCE(p_email, 'user_' || substring(p_user_id::TEXT, 1, 8) || '@temp.local'),
            crypt('temp_password_' || p_user_id::TEXT, gen_salt('bf')), -- Temporary password
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}'::JSONB,
            jsonb_build_object('role', user_role),  -- Use provided role
            FALSE,
            'authenticated',
            'authenticated',
            '',
            ''
        ) ON CONFLICT (id) DO NOTHING;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_exists(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_exists(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_exists(UUID) TO authenticated;

-- Option 2: Modify the create_classroom function to ensure user exists first
CREATE OR REPLACE FUNCTION create_classroom(
    p_teacher_id UUID,
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL
)
RETURNS TABLE (
    classroom_id UUID,
    join_code VARCHAR(10)
) AS $$
DECLARE
    v_classroom_id UUID;
    v_join_code VARCHAR(10);
BEGIN
    -- Ensure user exists (creates if doesn't exist) - set role to 'teacher'
    PERFORM ensure_user_exists(p_teacher_id, NULL, 'teacher');
    
    v_join_code := generate_join_code();
    
    INSERT INTO public.classrooms (teacher_id, name, description, join_code)
    VALUES (p_teacher_id, p_name, p_description, v_join_code)
    RETURNING classrooms.classroom_id, classrooms.join_code INTO v_classroom_id, v_join_code;
    
    RETURN QUERY SELECT v_classroom_id, v_join_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_classroom(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_classroom(UUID, VARCHAR) TO authenticated;

-- Usage example:
-- SELECT * FROM create_classroom('teacher-uuid-here', 'Math 101', 'Introduction to Algebra');

