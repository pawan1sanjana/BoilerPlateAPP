-- Pruning Module Database Setup (Logs & Settings)

-- 1. Create Pruning Logs Table
CREATE TABLE IF NOT EXISTS public.pruning_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  block_id UUID REFERENCES public.field_blocks(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.workforce(id) ON DELETE CASCADE,
  bushes_pruned INTEGER DEFAULT 0,
  area_covered NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, block_id, worker_id)
);

ALTER TABLE public.pruning_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pruning_logs' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.pruning_logs FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;


-- 2. Create Pruning Settings Table
CREATE TABLE IF NOT EXISTS public.pruning_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT pruning_settings_estate_id_unique UNIQUE (estate_id)
);

ALTER TABLE public.pruning_settings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pruning_settings' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON public.pruning_settings FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
