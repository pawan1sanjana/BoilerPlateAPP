-- Migration: Create Expenses table for Finance module

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor VARCHAR(255),
  category VARCHAR(100),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'Cash',
  reference VARCHAR(100),
  notes TEXT,
  expense_account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for month queries and vendor search
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON public.expenses(vendor);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_account ON public.expenses(expense_account_id);

-- Row Level Security Policies
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to expenses" ON public.expenses
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated full access to expenses" ON public.expenses
  FOR ALL USING (auth.role() = 'authenticated');
