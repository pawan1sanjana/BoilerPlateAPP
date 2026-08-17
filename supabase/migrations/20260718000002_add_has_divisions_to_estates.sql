-- Migration: Add has_divisions to estates table

alter table public.estates 
add column if not exists has_divisions boolean not null default true;
