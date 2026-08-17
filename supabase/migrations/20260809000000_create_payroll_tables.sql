-- Create payroll_batches table
create table public.payroll_batches (
    id uuid default gen_random_uuid() primary key,
    estate_id uuid references public.estates(id) on delete cascade null,
    batch_date date not null,
    task_type varchar not null,
    base_wage numeric(10,2) default 0,
    bonus_rate numeric(10,2) default 0,
    target_qty numeric(10,2) default 0,
    total_qty numeric(10,2) default 0,
    total_wage numeric(12,2) default 0,
    qualified_workers integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (batch_date, task_type, estate_id)
);

-- Enable RLS
alter table public.payroll_batches enable row level security;

-- Policies
create policy "Users can view payroll batches for their estate"
    on public.payroll_batches for select
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can insert payroll batches for their estate"
    on public.payroll_batches for insert
    with check (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can update payroll batches for their estate"
    on public.payroll_batches for update
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

-- Create payroll_entries table
create table public.payroll_entries (
    id uuid default gen_random_uuid() primary key,
    batch_id uuid references public.payroll_batches(id) on delete cascade not null,
    worker_id uuid references public.workforce(id) on delete set null null,
    worker_epf varchar,
    worker_name varchar,
    task varchar,
    performance_value numeric(10,2) default 0,
    over_target numeric(10,2) default 0,
    bonus numeric(10,2) default 0,
    pay_multiplier numeric(10,2) default 1.0,
    wage numeric(10,2) default 0,
    eligible boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (batch_id, worker_id)
);

-- Enable RLS
alter table public.payroll_entries enable row level security;

-- Policies
create policy "Users can view payroll entries for their estate batches"
    on public.payroll_entries for select
    using (batch_id in (select id from public.payroll_batches where estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin'));

create policy "Users can insert payroll entries for their estate batches"
    on public.payroll_entries for insert
    with check (batch_id in (select id from public.payroll_batches where estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin'));

create policy "Users can update payroll entries for their estate batches"
    on public.payroll_entries for update
    using (batch_id in (select id from public.payroll_batches where estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin'));

create policy "Users can delete payroll entries for their estate batches"
    on public.payroll_entries for delete
    using (batch_id in (select id from public.payroll_batches where estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin'));
