-- Create asset_audits table
CREATE TABLE IF NOT EXISTS asset_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL,
    asset_type VARCHAR(50) NOT NULL, -- 'physical' or 'biological'
    estate_id UUID REFERENCES estates(id) ON DELETE CASCADE,
    audited_by UUID REFERENCES public.users(id),
    condition_status VARCHAR(50) NOT NULL,
    notes TEXT,
    audit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS Policies
ALTER TABLE asset_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read asset_audits" 
ON asset_audits FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert asset_audits" 
ON asset_audits FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update asset_audits" 
ON asset_audits FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete asset_audits" 
ON asset_audits FOR DELETE 
TO authenticated 
USING (true);
