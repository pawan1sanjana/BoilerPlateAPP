-- ============================================================
-- ADMIN ACCOUNT INITIALIZATION SCRIPT
-- ============================================================
-- Run this in your Supabase project:
--   Dashboard → SQL Editor → New Query → Paste → Run
--
-- Credentials after running:
--   Email:    admin@boilerplate.com
--   Password: Admin@1234
--
-- Change the password immediately after first login via Settings.
-- ============================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_admin_id  UUID := gen_random_uuid();
  v_email     TEXT := 'admin@boilerplate.com';
  v_password  TEXT := 'Admin@1234';
  v_name      TEXT := 'System Admin';
BEGIN

  -- ── Step 1: Insert into auth.users ─────────────────────────────────────
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
    v_admin_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', v_name, 'role', 'admin'),
    now(),
    now(),
    '', '', '', ''
  )
  ON CONFLICT (email) DO NOTHING;

  -- Retrieve the actual ID in case the row already existed
  SELECT id INTO v_admin_id FROM auth.users WHERE email = v_email;

  -- ── Step 2: Insert into auth.identities ────────────────────────────────
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', v_email),
    'email',
    v_email,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

  -- ── Step 3: Insert / upsert into public.users ──────────────────────────
  INSERT INTO public.users (id, role, name, email, status)
  VALUES (v_admin_id, 'admin', v_name, v_email, 'active')
  ON CONFLICT (id) DO UPDATE
    SET role   = 'admin',
        name   = v_name,
        status = 'active';

  RAISE NOTICE 'Admin account ready — email: %, id: %', v_email, v_admin_id;

END $$;

-- ── Verify ─────────────────────────────────────────────────────────────────
SELECT
  u.id,
  u.email,
  u.role,
  u.name,
  u.status,
  u.created_at
FROM public.users u
WHERE u.email = 'admin@boilerplate.com';
