-- Migration: Create Inventory Module Tables

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active',
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage their estate suppliers" ON public.suppliers
  FOR ALL USING (
    estate_id = (SELECT estate_id FROM public.users WHERE id = auth.uid())
  );

-- 2. Inventory Goods Table
CREATE TABLE IF NOT EXISTS public.inventory_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT,
    location TEXT,
    description TEXT,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'pcs',
    unit_price NUMERIC DEFAULT 0,
    min_stock_level NUMERIC DEFAULT 5,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.inventory_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all inventory" ON public.inventory_goods
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage their estate inventory" ON public.inventory_goods
  FOR ALL USING (
    estate_id = (SELECT estate_id FROM public.users WHERE id = auth.uid())
  );

-- 3. Issued Goods Table
CREATE TABLE IF NOT EXISTS public.issued_goods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.inventory_goods(id) ON DELETE CASCADE,
    quantity NUMERIC NOT NULL,
    issued_to TEXT NOT NULL,
    department TEXT,
    notes TEXT,
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.issued_goods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all issued goods" ON public.issued_goods
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage their estate issued goods" ON public.issued_goods
  FOR ALL USING (
    estate_id = (SELECT estate_id FROM public.users WHERE id = auth.uid())
  );

-- 4. Biological Assets Table
CREATE TABLE IF NOT EXISTS public.biological_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    block_id UUID, -- References crop_blocks but keeping UUID simple for now
    tree_species TEXT NOT NULL,
    height_ft NUMERIC,
    girth_in NUMERIC,
    height_category TEXT,
    girth_category TEXT,
    census_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.biological_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all biological assets" ON public.biological_assets
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage their estate biological assets" ON public.biological_assets
  FOR ALL USING (
    estate_id = (SELECT estate_id FROM public.users WHERE id = auth.uid())
  );

-- 5. Biological Asset Sales Table
CREATE TABLE IF NOT EXISTS public.biological_asset_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID REFERENCES public.biological_assets(id) ON DELETE CASCADE,
    sale_date DATE NOT NULL,
    buyer TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    income_account_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.biological_asset_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all biological asset sales" ON public.biological_asset_sales
  FOR ALL USING (public.is_admin());

CREATE POLICY "Users can manage their estate biological asset sales" ON public.biological_asset_sales
  FOR ALL USING (
    asset_id IN (
        SELECT id FROM public.biological_assets 
        WHERE estate_id = (SELECT estate_id FROM public.users WHERE id = auth.uid())
    )
  );
