-- Shade Tree / Lopping Module Database Setup (Logs & Settings)

-- 1. Create Lopping Logs Table
CREATE TABLE IF NOT EXISTS public.lopping_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  block_id UUID REFERENCES public.field_blocks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workforce(id) ON DELETE CASCADE,
  trees_lopped INTEGER DEFAULT 0,
  area_covered NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, block_id, worker_id)
);

ALTER TABLE public.lopping_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lopping_logs' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.lopping_logs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- 2. Create Lopping Settings Table
CREATE TABLE IF NOT EXISTS public.lopping_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT lopping_settings_estate_id_unique UNIQUE (estate_id)
);

ALTER TABLE public.lopping_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lopping_settings' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.lopping_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
