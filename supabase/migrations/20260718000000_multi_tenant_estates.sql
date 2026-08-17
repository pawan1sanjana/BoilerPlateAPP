-- Migration: Add multi-tenant estates

-- Create estates table
create table if not exists public.estates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  estate_code text unique,
  provisioned_modules jsonb not null default '[]',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- Add estate_id to users
alter table public.users
add column if not exists estate_id uuid references public.estates(id) on delete set null;

-- Enable RLS on estates
alter table public.estates enable row level security;

-- System Admins can manage all estates
create policy "System admins can manage all estates"
  on public.estates
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

-- Estate users can read their own estate
create policy "Users can read own estate"
  on public.estates for select
  using (
    id = (
      select estate_id from public.users
      where users.id = auth.uid()
    )
  );

-- Since users table already exists, we should adjust its policies to restrict
-- non-system admins to their own estate. The exact policy depends on existing ones,
-- but a common approach for Estate Admins is:
-- create policy "Estate admins can see users in same estate"
--   on public.users for select
--   using (
--     estate_id = (select estate_id from public.users where id = auth.uid())
--     and (select role from public.users where id = auth.uid()) = 'estate_admin'
--   );
