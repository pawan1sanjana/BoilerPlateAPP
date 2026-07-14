-- ==========================================
-- BOILERPLATE APP FULL DATABASE SETUP SCRIPT
-- ==========================================
-- Run this script in the Supabase SQL Editor to initialize the database
-- with all tables, triggers, policies, and the initial admin user.
-- ==========================================

-- ----------------------------------------------------------------------------
-- 1. CORE SCHEMA (00000_core_schema.sql)
-- ----------------------------------------------------------------------------
-- Create users table extending Supabase auth
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'user',
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Create a helper function to check if the current user is an admin.
-- We use SECURITY DEFINER to bypass RLS and avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view system settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage system settings" ON public.system_settings FOR ALL USING (
    public.is_admin()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device TEXT NOT NULL DEFAULT 'Unknown Device',
    browser TEXT NOT NULL DEFAULT 'Unknown Browser',
    os TEXT NOT NULL DEFAULT 'Unknown OS',
    ip_address TEXT,
    icon TEXT NOT NULL DEFAULT 'Monitor',
    last_active TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own sessions" ON public.user_sessions FOR ALL USING (user_id = auth.uid());

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  title TEXT DEFAULT 'Notification',
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);


-- Function to handle new user registration and create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    COALESCE((NEW.raw_user_meta_data->>'name')::text, NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 2. PUSH NOTIFICATIONS (00001_push_notifications.sql)
-- ----------------------------------------------------------------------------
-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    auth_key TEXT NOT NULL,
    p256dh_key TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- Create the trigger function that calls the Edge Function
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url TEXT;
  auth_header TEXT;
BEGIN
  -- IMPORTANT: Replace 'YOUR_PROJECT_REF' with your actual Supabase project reference
  edge_function_url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-push';
  auth_header := current_setting('request.headers')::json->>'authorization';

  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', auth_header
    ),
    body := json_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', NEW.message,
      'url', NEW.link,
      'data', json_build_object('type', NEW.type)
    )::jsonb
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_notification_insert_trigger_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();


-- ----------------------------------------------------------------------------
-- 3. SEED ADMIN (00002_seed_admin.sql)
-- ----------------------------------------------------------------------------
-- Seed Initial Admin User
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insert into auth.users
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
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@boilerplate.com',
  crypt('admin123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"System Admin", "role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert into auth.identities
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
  '00000000-0000-0000-0000-000000000000',
  format('{"sub":"%s","email":"%s"}', '00000000-0000-0000-0000-000000000000', 'admin@boilerplate.com')::jsonb,
  'email',
  'admin@boilerplate.com',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. BIOMETRIC AUTH (00003_biometric_auth.sql)
-- ----------------------------------------------------------------------------
-- Create the passkey credentials table
create table public.passkey_credentials (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  device_name text,
  last_used_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.passkey_credentials enable row level security;

-- Users can select their own credentials
create policy "Users can view own credentials"
  on public.passkey_credentials for select
  using (auth.uid() = user_id);

-- Users can insert their own credentials
create policy "Users can insert own credentials"
  on public.passkey_credentials for insert
  with check (auth.uid() = user_id);

-- Users can delete their own credentials
create policy "Users can delete own credentials"
  on public.passkey_credentials for delete
  using (auth.uid() = user_id);

-- Users can update the last_used_at timestamp on their own credentials
create policy "Users can update own credentials"
  on public.passkey_credentials for update
  using (auth.uid() = user_id);

-- Create an index on user_id for faster lookups
create index passkey_credentials_user_id_idx on public.passkey_credentials(user_id);


-- ----------------------------------------------------------------------------
-- 5. AUDIT LOG (00004_audit_log.sql)
-- ----------------------------------------------------------------------------
-- Create the audit_log table
CREATE TABLE audit_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  user_name text,
  action text not null,
  resource text,
  old_value text,
  new_value text,
  ip_address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to insert logs (so users can log their own actions)
CREATE POLICY "Authenticated users can insert audit logs" 
ON audit_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow admins to read all logs
CREATE POLICY "Admins can view audit logs" 
ON audit_log 
FOR SELECT 
USING (true);


-- ----------------------------------------------------------------------------
-- 6. FIX USER TRIGGER (00005_fix_user_trigger.sql)
-- ----------------------------------------------------------------------------
-- Function to handle new user registration and create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, role, name, email, status)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::text, 'user'),
    COALESCE((NEW.raw_user_meta_data->>'name')::text, NEW.email),
    NEW.email,
    'pending' -- Set default status to pending instead of the table default ('active')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 7. FIX RLS POLICIES (00006_fix_rls_policies.sql)
-- ----------------------------------------------------------------------------
-- Drop first to avoid "already exists" errors, then recreate cleanly
DROP POLICY IF EXISTS "Users can read own profile"    ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile"  ON public.users;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.users;
DROP POLICY IF EXISTS "Admins can read all profiles"  ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete profiles"    ON public.users;

-- Create a helper function to check if the current user is an admin.
-- We use SECURITY DEFINER to bypass RLS and avoid infinite recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Allow a logged-in user to read their OWN profile row
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Allow a logged-in user to INSERT their own profile row (needed on signup)
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow a logged-in user to UPDATE their own profile row (needed in Settings)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to read ALL user rows (needed for AccountsList page)
CREATE POLICY "Admins can read all profiles"
  ON public.users
  FOR SELECT
  USING (public.is_admin());

-- Allow admins to update any user row (approve / archive / edit)
CREATE POLICY "Admins can update all profiles"
  ON public.users
  FOR UPDATE
  USING (public.is_admin());

-- Allow admins to delete any user row
CREATE POLICY "Admins can delete profiles"
  ON public.users
  FOR DELETE
  USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- PUBLIC.USER_SESSIONS
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage own sessions"  ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can read all sessions"   ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can delete any session"  ON public.user_sessions;

-- Allow a logged-in user to manage their own session rows
CREATE POLICY "Users can manage own sessions"
  ON public.user_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow admins to read all sessions (for session management UI)
CREATE POLICY "Admins can read all sessions"
  ON public.user_sessions
  FOR SELECT
  USING (public.is_admin());

-- Allow admins to delete any session (force logout)
CREATE POLICY "Admins can delete any session"
  ON public.user_sessions
  FOR DELETE
  USING (public.is_admin());


-- ─────────────────────────────────────────────────────────────
-- PUBLIC.SYSTEM_SETTINGS
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Everyone can view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;

CREATE POLICY "Everyone can view system settings" 
  ON public.system_settings 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage system settings" 
  ON public.system_settings 
  FOR ALL 
  USING (public.is_admin());


-- ----------------------------------------------------------------------------
-- 8. FORCE LOGOUT (20260713000007_force_logout.sql)
-- ----------------------------------------------------------------------------
-- Add session_version to public.users to track force logouts
ALTER TABLE public.users ADD COLUMN session_version INT DEFAULT 0;

-- Ensure public.users is included in realtime publication so clients can listen to it
-- First check if it's already there to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END $$;

-- Create an RPC to securely delete all sessions for a given user
CREATE OR REPLACE FUNCTION public.force_logout_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can force logout users.';
  END IF;

  -- Delete from Supabase Auth sessions table
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  -- Delete from our custom user_sessions table
  DELETE FROM public.user_sessions WHERE user_id = target_user_id;

  -- Increment the session_version in public.users to trigger a realtime update
  UPDATE public.users 
  SET session_version = COALESCE(session_version, 0) + 1
  WHERE id = target_user_id;
END;
$$;
