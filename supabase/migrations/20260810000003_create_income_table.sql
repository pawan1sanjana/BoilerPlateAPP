-- Migration: Create Income table for Finance module

CREATE TABLE IF NOT EXISTS public.income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer VARCHAR(255),
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  reference VARCHAR(100),
  notes TEXT,
  income_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for month queries and customer search
CREATE INDEX IF NOT EXISTS idx_income_date ON public.income(income_date);
CREATE INDEX IF NOT EXISTS idx_income_customer ON public.income(customer);
CREATE INDEX IF NOT EXISTS idx_income_category ON public.income(category);
CREATE INDEX IF NOT EXISTS idx_income_account ON public.income(income_account_id);

-- Row Level Security Policies
ALTER TABLE public.income ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to income" ON public.income
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access to income" ON public.income
  FOR ALL USING (auth.role() = 'authenticated');
