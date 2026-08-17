-- Migration: Create workforce table for Muster module

create table if not exists public.workforce (
    id uuid primary key default gen_random_uuid(),
    estate_id uuid not null references public.estates(id) on delete cascade,
    worker_id text not null unique,
    full_name_initials text not null,
    first_name text not null,
    last_name text not null,
    nic text not null,
    address text,
    tel text,
    emergency_tel text,
    emergency_contact_name text,
    wage_type text not null default 'permanent',
    photo text,
    nic_front text,
    nic_back text,
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.workforce enable row level security;

-- System Admins can manage all workforce
create policy "System admins can manage all workforce"
  on public.workforce
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and (users.role = 'admin' or users.role = 'system_admin')
    )
  );

-- Estate users can manage their own estate's workforce
create policy "Estate users can manage their own workforce"
  on public.workforce
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
    )
  );

-- Function to automatically update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on workforce table
drop trigger if exists set_workforce_updated_at on public.workforce;
create trigger set_workforce_updated_at
before update on public.workforce
for each row
execute procedure public.handle_updated_at();
