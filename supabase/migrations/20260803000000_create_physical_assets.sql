-- Create physical_assets table
CREATE TABLE IF NOT EXISTS physical_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estate_id UUID REFERENCES estates(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL,
    serial_number VARCHAR(100),
    location VARCHAR(255),
    asset_condition VARCHAR(50) NOT NULL DEFAULT 'good',
    maintenance_status VARCHAR(50) NOT NULL DEFAULT 'operational',
    value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    purchase_date DATE,
    last_maintenance_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS Policies
ALTER TABLE physical_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read physical_assets" 
ON physical_assets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert physical_assets" 
ON physical_assets FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update physical_assets" 
ON physical_assets FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to delete physical_assets" 
ON physical_assets FOR DELETE 
TO authenticated 
USING (true);
