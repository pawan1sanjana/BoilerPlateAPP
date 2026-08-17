-- Create Plucking Settings Table for Per-Estate Interval Configuration
CREATE TABLE IF NOT EXISTS public.plucking_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT plucking_settings_estate_id_unique UNIQUE (estate_id)
);

-- Enable RLS and add access policy
ALTER TABLE public.plucking_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for authenticated users" ON public.plucking_settings FOR ALL USING (auth.role() = 'authenticated');
