-- Migration: Add GPS coordinates and location name to estates

ALTER TABLE public.estates 
ADD COLUMN IF NOT EXISTS latitude numeric(10, 7),
ADD COLUMN IF NOT EXISTS longitude numeric(10, 7),
ADD COLUMN IF NOT EXISTS location_name text;
