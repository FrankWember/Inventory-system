-- ═══════════════════════════════════════════════════════════════════════════
-- Create User: Frank Wember
-- Phone: 679122878 (formatted as +237679122878)
-- Password: 679122878
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: This script creates a user using Supabase Auth
-- Run this in your Supabase SQL Editor AFTER running supabase-complete-migration.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- METHOD 1: Create user directly in auth.users (Recommended)
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  user_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Generate user ID
  user_id := gen_random_uuid();

  -- Hash the password using Supabase's method
  -- Password: 679122878
  encrypted_password := crypt('679122878', gen_salt('bf'));

  -- Insert into auth.users
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
    user_id,
    'authenticated',
    'authenticated',
    '+237679122878@phone.bartrack.app', -- Phone-based email format
    encrypted_password,
    NOW(), -- Email confirmed immediately
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object(
      'display_name', 'Frank Wember',
      'phone', '+237679122878',
      'actual_email', NULL
    ),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Also insert into auth.identities
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    jsonb_build_object(
      'sub', user_id::text,
      'email', '+237679122878@phone.bartrack.app',
      'display_name', 'Frank Wember'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ User Frank Wember created successfully!';
  RAISE NOTICE '  Phone: +237679122878';
  RAISE NOTICE '  Email: +237679122878@phone.bartrack.app';
  RAISE NOTICE '  Password: 679122878';
  RAISE NOTICE '  User ID: %', user_id;
  RAISE NOTICE '';
  RAISE NOTICE 'You can now sign in using:';
  RAISE NOTICE '  - Phone: 679122878';
  RAISE NOTICE '  - Password: 679122878';

EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE '! User already exists with this phone number';
    RAISE NOTICE 'To reset, delete the existing user first:';
    RAISE NOTICE 'DELETE FROM auth.users WHERE email = ''+237679122878@phone.bartrack.app'';';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating user: %', SQLERRM;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- ALTERNATIVE METHOD 2: Using email instead of phone
-- Uncomment this section if you prefer email-based authentication
-- ─────────────────────────────────────────────────────────────────────────────

/*
DO $$
DECLARE
  user_id UUID;
  encrypted_password TEXT;
BEGIN
  user_id := gen_random_uuid();
  encrypted_password := crypt('679122878', gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
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
    user_id,
    'authenticated',
    'authenticated',
    'frank.wember@bartrack.app', -- Use actual email
    encrypted_password,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('display_name', 'Frank Wember'),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    user_id,
    jsonb_build_object(
      'sub', user_id::text,
      'email', 'frank.wember@bartrack.app'
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '✓ User Frank Wember created with email authentication!';
  RAISE NOTICE '  Email: frank.wember@bartrack.app';
  RAISE NOTICE '  Password: 679122878';
END $$;
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION QUERY
-- ─────────────────────────────────────────────────────────────────────────────

-- Run this to verify the user was created
SELECT
  id,
  email,
  raw_user_meta_data->>'display_name' as name,
  raw_user_meta_data->>'phone' as phone,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = '+237679122878@phone.bartrack.app';
