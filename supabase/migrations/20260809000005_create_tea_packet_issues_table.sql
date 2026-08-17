-- Migration: Create tea_packet_issues table for tracking tea packet distribution to workers
create table if not exists public.tea_packet_issues (
    id uuid default gen_random_uuid() primary key,
    estate_id uuid references public.estates(id) on delete cascade null,
    worker_id uuid references public.workforce(id) on delete cascade null,
    worker_name varchar not null,
    worker_epf varchar,
    grade varchar(255) not null,
    size_grams integer not null,
    quantity integer not null default 1,
    unit_price numeric(10,2) not null default 0.00,
    total_price numeric(12,2) not null default 0.00,
    issue_date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.users(id) on delete set null
);

-- Enable RLS
alter table public.tea_packet_issues enable row level security;

-- Policies for multi-tenant estate security
create policy "Users can view tea packet issues for their estate"
    on public.tea_packet_issues for select
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can insert tea packet issues for their estate"
    on public.tea_packet_issues for insert
    with check (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can update tea packet issues for their estate"
    on public.tea_packet_issues for update
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can delete tea packet issues for their estate"
    on public.tea_packet_issues for delete
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');
