-- Migration: Create cash_advances table for tracking worker advances
create table if not exists public.cash_advances (
    id uuid default gen_random_uuid() primary key,
    estate_id uuid references public.estates(id) on delete cascade null,
    worker_id uuid references public.workforce(id) on delete cascade null,
    worker_name varchar not null,
    worker_epf varchar,
    advance_date date not null,
    amount numeric(10,2) not null default 0,
    reason text default 'Monthly Advance',
    status varchar default 'issued', -- 'issued', 'recovered', 'canceled'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.users(id) on delete set null
);

-- Enable RLS
alter table public.cash_advances enable row level security;

-- Policies for multi-tenant estate security
create policy "Users can view cash advances for their estate"
    on public.cash_advances for select
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can insert cash advances for their estate"
    on public.cash_advances for insert
    with check (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can update cash advances for their estate"
    on public.cash_advances for update
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can delete cash advances for their estate"
    on public.cash_advances for delete
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');
