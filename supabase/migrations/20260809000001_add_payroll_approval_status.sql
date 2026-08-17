-- Add status and approval tracking columns to payroll_batches table
alter table public.payroll_batches
  add column if not exists status varchar not null default 'draft',
  add column if not exists approved_at timestamp with time zone,
  add column if not exists approved_by uuid references public.users(id),
  add column if not exists confirmed_at timestamp with time zone,
  add column if not exists confirmed_by uuid references public.users(id);
