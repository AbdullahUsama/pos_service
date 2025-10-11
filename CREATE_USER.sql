-- STEP 1: First, let's check and fix the profiles table structure
-- Run these queries one by one in your Supabase SQL Editor

-- 1. Check current profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- 2. If username column exists and is NOT NULL, make it nullable
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

-- 3. Update the trigger function to handle username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, username)
  VALUES (NEW.id, 'cashier', COALESCE(NEW.email, 'user_' || substring(NEW.id::text, 1, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Now create a user (replace with actual values)
DO $$
DECLARE
    user_email TEXT := 'admin@example.com'; -- Change this
    user_password TEXT := 'admin123'; -- Change this
    user_role TEXT := 'admin'; -- Change to 'cashier' if needed
    new_user_id UUID;
BEGIN
    -- Insert user into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        user_email,
        crypt(user_password, gen_salt('bf')),
        NOW(),
        NULL,
        NULL,
        '{"provider": "email", "providers": ["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    ) RETURNING id INTO new_user_id;

    -- Insert/Update profile with username
    INSERT INTO profiles (id, role, username) 
    VALUES (new_user_id, user_role, user_email)
    ON CONFLICT (id) 
    DO UPDATE SET 
        role = EXCLUDED.role,
        username = EXCLUDED.username;

    RAISE NOTICE 'User created successfully with ID: %, Email: %, Role: %', new_user_id, user_email, user_role;
END $$;