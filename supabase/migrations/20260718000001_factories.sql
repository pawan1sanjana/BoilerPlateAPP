-- Migration: Add factories and link to estates

-- Create factories table
create table if not exists public.factories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- Add factory_id to estates
alter table public.estates
add column if not exists factory_id uuid references public.factories(id) on delete set null;

-- Enable RLS on factories
alter table public.factories enable row level security;

-- System Admins can manage all factories
create policy "System admins can manage all factories"
  on public.factories
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- All authenticated users can view factories
create policy "Users can read factories"
  on public.factories for select
  using (auth.role() = 'authenticated');
