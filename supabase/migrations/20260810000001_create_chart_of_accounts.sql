-- Migration: Create Chart of Accounts table for Finance module

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for code search and type filtering
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON public.chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON public.chart_of_accounts(type);

-- Row level security
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to chart_of_accounts" ON public.chart_of_accounts
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access to chart_of_accounts" ON public.chart_of_accounts
  FOR ALL USING (auth.role() = 'authenticated');

-- Initial Seed Data
INSERT INTO public.chart_of_accounts (code, name, type, is_active)
VALUES
  ('1010', 'Cash on Hand', 'asset', true),
  ('1020', 'Main Bank Account', 'asset', true),
  ('1100', 'Accounts Receivable', 'asset', true),
  ('1400', 'Tea Stock Inventory', 'asset', true),
  ('2010', 'Accounts Payable', 'liability', true),
  ('2020', 'EPF/ETF Payable', 'liability', true),
  ('3010', 'Capital Equity', 'equity', true),
  ('3020', 'Retained Earnings', 'equity', true),
  ('4010', 'Made Tea Sales Income', 'income', true),
  ('4020', 'Green Leaf Sales Income', 'income', true),
  ('5010', 'Labor & Wage Expense', 'expense', true),
  ('5020', 'Fertilizer & Chemical Expense', 'expense', true),
  ('5100', 'Electricity Expense', 'expense', true)
ON CONFLICT (code) DO NOTHING;
