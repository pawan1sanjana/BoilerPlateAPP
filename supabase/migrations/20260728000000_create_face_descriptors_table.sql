-- Migration: Create face_descriptors table for Face ID Attendance module
-- Workers' face embeddings (128-float vectors) captured during enrollment
-- are stored here so FaceAttendance can rebuild the FaceMatcher on load.

create table if not exists public.face_descriptors (
    id          bigserial primary key,
    worker_id   text        not null unique,   -- matches workforce.worker_id
    descriptors jsonb       not null,          -- array of 128-float arrays
    updated_at  timestamptz not null default now()
);

-- Index for fast single-worker lookups
create index if not exists face_descriptors_worker_id_idx
    on public.face_descriptors (worker_id);

-- Auto-update updated_at on row change
create or replace function public.handle_face_descriptors_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_face_descriptors_updated_at on public.face_descriptors;
create trigger set_face_descriptors_updated_at
  before update on public.face_descriptors
  for each row
  execute procedure public.handle_face_descriptors_updated_at();

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.face_descriptors enable row level security;

-- System admins and estate admins can read all descriptors
-- (FaceAttendance needs to read them to build the matcher)
create policy "Authenticated users can read face descriptors"
  on public.face_descriptors
  for select
  using (auth.role() = 'authenticated');

-- Only admins / estate managers can insert or update descriptors
create policy "Admins can manage face descriptors"
  on public.face_descriptors
  for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role in ('admin', 'system_admin', 'estate_manager', 'estate')
    )
  );
