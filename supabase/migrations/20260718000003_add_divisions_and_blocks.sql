-- Migration: Add Divisions and Field Blocks

create table if not exists public.divisions (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references public.estates(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique(estate_id, name)
);

create table if not exists public.field_blocks (
  id uuid primary key default gen_random_uuid(),
  estate_id uuid not null references public.estates(id) on delete cascade,
  division_id uuid references public.divisions(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  polygon_coordinates jsonb,
  created_at timestamptz not null default now(),
  unique(estate_id, division_id, name)
);

-- Enable RLS
alter table public.divisions enable row level security;
alter table public.field_blocks enable row level security;

-- Policies for divisions
create policy "System admins can manage all divisions"
  on public.divisions
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "Estate users can view own divisions"
  on public.divisions for select
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
    )
  );

create policy "Estate managers can manage own divisions"
  on public.divisions for all
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
      and users.role = 'estate_manager'
    )
  );

-- Policies for field_blocks
create policy "System admins can manage all field blocks"
  on public.field_blocks
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'admin'
    )
  );

create policy "Estate users can view own field blocks"
  on public.field_blocks for select
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
    )
  );

create policy "Estate managers can manage own field blocks"
  on public.field_blocks for all
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
      and users.role = 'estate_manager'
    )
  );
