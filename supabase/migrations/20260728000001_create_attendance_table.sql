-- Migration: Create attendance table for Muster module

create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),
    worker_id text not null references public.workforce(worker_id) on delete cascade,
    estate_id uuid references public.estates(id) on delete cascade,
    date date not null default current_date,
    check_in_time time without time zone,
    check_out_time time without time zone,
    check_in_latitude double precision,
    check_in_longitude double precision,
    check_out_latitude double precision,
    check_out_longitude double precision,
    check_in_method text, -- 'manual', 'face', 'qr'
    check_out_method text, -- 'manual', 'face', 'qr'
    status text not null default 'present',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(worker_id, date)
);

-- Enable RLS
alter table public.attendance enable row level security;

-- System Admins can manage all attendance
create policy "System admins can manage all attendance"
  on public.attendance
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and (users.role = 'admin' or users.role = 'system_admin')
    )
  );

-- Estate users can manage attendance for their estate
create policy "Estate users can manage their estate attendance"
  on public.attendance
  using (
    estate_id = (
      select estate_id from public.users
      where users.id = auth.uid()
    )
  );

-- Function to auto-fill estate_id from workforce if not provided
create or replace function public.set_attendance_estate_id()
returns trigger as $$
begin
  if new.estate_id is null then
    select estate_id into new.estate_id from public.workforce where worker_id = new.worker_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ensure_attendance_estate_id
before insert on public.attendance
for each row
execute procedure public.set_attendance_estate_id();

-- Function to automatically update the updated_at timestamp
create or replace function public.handle_attendance_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to update updated_at on attendance table
drop trigger if exists set_attendance_updated_at on public.attendance;
create trigger set_attendance_updated_at
before update on public.attendance
for each row
execute procedure public.handle_attendance_updated_at();

-- Add indexes for common queries
create index if not exists attendance_worker_id_idx on public.attendance(worker_id);
create index if not exists attendance_date_idx on public.attendance(date);
create index if not exists attendance_estate_id_idx on public.attendance(estate_id);
