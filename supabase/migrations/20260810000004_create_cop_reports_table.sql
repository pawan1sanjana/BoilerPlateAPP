-- Migration: Create COP reports table for Finance module

CREATE TABLE IF NOT EXISTS public.cop_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  crop_kg NUMERIC(15, 2) DEFAULT 0,
  leaf_income NUMERIC(15, 2) DEFAULT 0,
  sundry_income NUMERIC(15, 2) DEFAULT 0,
  total_field_expenses NUMERIC(15, 2) DEFAULT 0,
  total_sundry_expenses NUMERIC(15, 2) DEFAULT 0,
  total_capital_expenses NUMERIC(15, 2) DEFAULT 0,
  net_profit NUMERIC(15, 2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for date ranges and estate lookups
CREATE INDEX IF NOT EXISTS idx_cop_reports_estate ON public.cop_reports(estate_id);
CREATE INDEX IF NOT EXISTS idx_cop_reports_range ON public.cop_reports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_cop_reports_type ON public.cop_reports(report_type);

-- Row Level Security Policies
ALTER TABLE public.cop_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to cop_reports" ON public.cop_reports
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access to cop_reports" ON public.cop_reports
  FOR ALL USING (auth.role() = 'authenticated');
