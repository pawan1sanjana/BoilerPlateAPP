-- Create the tea packets inventory table
CREATE TABLE IF NOT EXISTS public.inventory_tea_packets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    grade VARCHAR(255) NOT NULL,
    size_grams INTEGER NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.inventory_tea_packets ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Enable read access for all users" 
ON public.inventory_tea_packets FOR SELECT 
USING (true);

CREATE POLICY "Enable insert for authenticated users only" 
ON public.inventory_tea_packets FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" 
ON public.inventory_tea_packets FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" 
ON public.inventory_tea_packets FOR DELETE 
USING (auth.role() = 'authenticated');
