-- Migration: Create user_ai_settings table for per-user AI configuration
-- Run this in your Supabase SQL Editor

create table if not exists public.user_ai_settings (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Row Level Security: users can only read/write their own settings
alter table public.user_ai_settings enable row level security;

create policy "Users can read own AI settings"
  on public.user_ai_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert own AI settings"
  on public.user_ai_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own AI settings"
  on public.user_ai_settings for update
  using (auth.uid() = user_id);
