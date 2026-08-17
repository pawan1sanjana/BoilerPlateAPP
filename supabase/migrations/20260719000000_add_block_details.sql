-- Add blockwise details to field_blocks table
ALTER TABLE public.field_blocks
ADD COLUMN IF NOT EXISTS clone text,
ADD COLUMN IF NOT EXISTS year_of_planting integer,
ADD COLUMN IF NOT EXISTS soil_type text;
