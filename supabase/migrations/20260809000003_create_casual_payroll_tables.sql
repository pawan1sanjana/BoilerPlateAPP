-- Create casual_payrolls table for non-permanent estate workers
create table if not exists public.casual_payrolls (
    id uuid default gen_random_uuid() primary key,
    estate_id uuid references public.estates(id) on delete cascade null,
    worker_name varchar not null,
    nic_or_id varchar,
    wage_type varchar not null default 'daily', -- 'daily', 'weekly', 'contract'
    start_date date not null,
    end_date date not null,
    days_worked integer default 1,
    plucking_pay numeric(10,2) default 0,
    pruning_pay numeric(10,2) default 0,
    weeding_pay numeric(10,2) default 0,
    manure_pay numeric(10,2) default 0,
    lopping_pay numeric(10,2) default 0,
    foliar_pay numeric(10,2) default 0,
    other_pay numeric(10,2) default 0,
    gross_pay numeric(12,2) default 0,
    tea_deduction numeric(10,2) default 0,
    advance_deduction numeric(10,2) default 0,
    net_pay numeric(12,2) default 0,
    status varchar default 'draft', -- 'draft', 'approved', 'paid'
    contract_ref varchar,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_by uuid references public.users(id) on delete set null
);

-- Enable RLS
alter table public.casual_payrolls enable row level security;

-- Policies for multi-tenant estate security
create policy "Users can view casual payrolls for their estate"
    on public.casual_payrolls for select
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can insert casual payrolls for their estate"
    on public.casual_payrolls for insert
    with check (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can update casual payrolls for their estate"
    on public.casual_payrolls for update
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');

create policy "Users can delete casual payrolls for their estate"
    on public.casual_payrolls for delete
    using (estate_id is null or estate_id in (select estate_id from public.users where id = auth.uid()) or (select role from public.users where id = auth.uid()) = 'admin');
