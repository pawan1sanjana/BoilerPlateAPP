-- Create Payroll Wage Settings Table for Per-Estate Task Wage Parameters
CREATE TABLE IF NOT EXISTS public.payroll_wage_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE NULL,
  task_type VARCHAR NOT NULL,
  base_wage NUMERIC(10,2) NOT NULL DEFAULT 1400.00,
  target_qty NUMERIC(10,2) NOT NULL DEFAULT 18.00,
  bonus_rate NUMERIC(10,2) NOT NULL DEFAULT 65.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint for estate + task_type (handling NULL estate_id as default)
CREATE UNIQUE INDEX IF NOT EXISTS payroll_wage_settings_estate_task_idx 
  ON public.payroll_wage_settings (COALESCE(estate_id, '00000000-0000-0000-0000-000000000000'::uuid), task_type);

-- Enable RLS and add access policy
ALTER TABLE public.payroll_wage_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" 
  ON public.payroll_wage_settings FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" 
  ON public.payroll_wage_settings FOR ALL 
  USING (auth.role() = 'authenticated');
