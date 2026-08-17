create table if not exists public.block_environmental_data (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.field_blocks(id) on delete cascade,
  temperature numeric,
  humidity numeric,
  soil_moisture numeric,
  precipitation numeric,
  recorded_at timestamptz not null default now()
);

alter table public.block_environmental_data enable row level security;

create policy "Users can view environmental data for their estate"
  on public.block_environmental_data for select
  using (
    exists (
      select 1 from public.field_blocks
      where field_blocks.id = block_environmental_data.block_id
      and field_blocks.estate_id = (select estate_id from public.users where users.id = auth.uid())
    )
  );

create policy "Users can insert environmental data for their estate"
  on public.block_environmental_data for insert
  with check (
    exists (
      select 1 from public.field_blocks
      where field_blocks.id = block_id
      and field_blocks.estate_id = (select estate_id from public.users where users.id = auth.uid())
    )
  );
