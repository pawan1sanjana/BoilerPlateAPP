export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventorySupplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category_id?: string;
  supplier_id?: string;
  quantity: number;
  min_quantity: number;
  unit_price?: number;
  location?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  
  // Relations
  category?: InventoryCategory;
  supplier?: InventorySupplier;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  vehicle_id?: string;
  factory?: string;
  notes?: string;
  performed_by?: string;
  created_at: string;
  
  // Relations
  item?: InventoryItem;
}
