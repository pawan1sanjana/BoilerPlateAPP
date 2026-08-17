-- Weeding Module Database Setup (Logs & Settings)

-- 1. Create Weeding Logs Table
CREATE TABLE IF NOT EXISTS public.weeding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  block_id UUID REFERENCES public.field_blocks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workforce(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'manual',
  area_covered NUMERIC(10,2) DEFAULT 0,
  chem_type TEXT,
  chem_qty NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, block_id, worker_id)
);

ALTER TABLE public.weeding_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weeding_logs' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.weeding_logs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- 2. Create Weeding Settings Table
CREATE TABLE IF NOT EXISTS public.weeding_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT weeding_settings_estate_id_unique UNIQUE (estate_id)
);

ALTER TABLE public.weeding_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'weeding_settings' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.weeding_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
