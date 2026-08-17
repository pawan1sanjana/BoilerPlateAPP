-- Migration: Add archived_at to workforce table
ALTER TABLE public.workforce
ADD COLUMN archived_at timestamptz;
