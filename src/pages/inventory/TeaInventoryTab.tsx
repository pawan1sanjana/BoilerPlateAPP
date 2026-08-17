import React, { useState, useEffect } from "react";
import {
  Package,
  Warehouse,
  TrendingUp,
  AlertCircle,
  Plus,
  Trash2,
  Search,
  Tag,
  CircleDollarSign,
  Scale,
  X,
  Save,
  Loader2,
  MapPin
} from "lucide-react";
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';

export default function TeaInventoryTab() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(false);
  const [stock, setStock] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFormData, setStockFormData] = useState({
    grade: "BOPF",
    size_grams: 500,
    quantity: 0,
    unit_price: "",
    estate_id: ""
  });

  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [estates, setEstates] = useState<any[]>([]);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [addStockForm, setAddStockForm] = useState<any>({ increment: '', unit_price: '' });
  const [saving, setSaving] = useState(false);

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  useEffect(() => {
    fetchEstates();
    fetchStock();
  }, []);

  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
      if (!error && data) setEstates(data);
    } catch (err) {
      console.error('Failed to load estates:', err);
    }
  };

  const fetchStock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_tea_packets')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (!error && data) setStock(data);
    } catch (error) {
      console.error("Failed to fetch stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePacketType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...stockFormData };
      if (!isUserAdmin && profile?.estate_id) {
        payload.estate_id = profile.estate_id;
      } else if (isUserAdmin && !payload.estate_id) {
        payload.estate_id = selectedEstateFilter !== 'all' ? selectedEstateFilter : '';
      }

      const { error } = await supabase.from('inventory_tea_packets').insert([
        {
          grade: payload.grade,
          size_grams: payload.size_grams,
          current_stock: payload.quantity,
          unit_price: payload.unit_price,
          estate_id: payload.estate_id || null
        }
      ]);

      if (!error) {
        fetchStock();
        setStockFormData({ grade: "BOPF", size_grams: 500, quantity: 0, unit_price: "", estate_id: "" });
        setShowCreateModal(false);
      }
    } catch (error) {
      alert("Failed to create stock packet type");
    }
  };

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSaving(true);
      const increment = Number(addStockForm.increment);
      const newQuantity = Number(selectedItem.current_stock || 0) + increment;
      const unit_price = Number(addStockForm.unit_price) || selectedItem.unit_price;
      
      const { error } = await supabase
        .from('inventory_tea_packets')
        .update({ current_stock: newQuantity, unit_price: unit_price })
        .eq('id', selectedItem.id);

      if (!error) { 
        setShowStockModal(false);
        setAddStockForm({ increment: '', unit_price: '' });
        fetchStock();
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStock = async (id: string | number) => {
    if (!window.confirm("Are you sure you want to remove this tea packet type?")) return;
    try {
      const { error } = await supabase.from('inventory_tea_packets').delete().eq('id', id);
      if (!error) fetchStock();
    } catch (error) {
      alert("Failed to remove stock type");
    }
  };

  const filteredData = stock.filter(item => {
    const matchesSearch = (item.grade || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstate = selectedEstateFilter === 'all' || item.estate_id === selectedEstateFilter;
    return matchesSearch && matchesEstate;
  });

  const totalValue = filteredData.reduce((acc, s) => acc + (s.current_stock * parseFloat(s.unit_price || 0)), 0);
  const totalUnits = filteredData.reduce((acc, s) => acc + s.current_stock, 0);
  const lowStockCount = filteredData.filter(s => s.current_stock < 10).length;

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const columns: ColumnDef<any>[] = [
    {
      header: "Packet Grade",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm text-tea-600">
            <Package size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.grade}</p>
            <p className="text-[9px] font-black text-tea-500 mt-0.5 uppercase tracking-widest">{item.size_grams}g Standard Pack</p>
          </div>
        </div>
      )
    },
    {
      header: "Estate",
      cell: (item) => {
        const estate = estates.find(e => e.id === item.estate_id);
        return (
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase truncate">
            <MapPin size={10} className="text-slate-400" /> {estate ? estate.name : "N/A"}
          </div>
        );
      }
    },
    {
      header: "Available Stock",
      cell: (item) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${item.current_stock < 10 ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.current_stock} Units</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none">Min Stock: 10</span>
        </div>
      )
    },
    {
      header: "Asset Value",
      cell: (item) => (
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">LKR {parseFloat(item.unit_price || 0).toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Per Pack</p>
        </div>
      )
    },
    {
      header: "Actions",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (item) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSelectedItem(item); setAddStockForm({ increment: '', unit_price: item.unit_price }); setShowStockModal(true); }}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
            title="Add Stock"
          >
            <Plus size={16} />
          </Button>
          {isUserAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteStock(item.id)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40"
              title="Delete"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Tea Packet Inventory</h1>
        </div>
        <div className="flex gap-3 relative">
          {isUserAdmin && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Add Stocks
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0">
              <Warehouse size={22} className="text-blue-500 dark:text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gross Stock Volume</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{totalUnits.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0">
              <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Inventory Valuation</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white"><span className="text-[10px] text-slate-400 font-bold mr-1">LKR</span>{(totalValue / 1000).toFixed(1)}K</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0">
              <AlertCircle size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Low Stock</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0">
              <Tag size={22} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categories</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{filteredData.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                placeholder="Search inventory grade..."
                className="pl-11 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isUserAdmin ? (
                <select
                  value={selectedEstateFilter}
                  onChange={(e) => { setSelectedEstateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none appearance-none"
                >
                  <option value="all">All Estates</option>
                  {estates.map(estate => (
                    <option key={estate.id} value={estate.id}>{estate.name}</option>
                  ))}
                </select>
              ) : (
                <select
                  value={profile?.estate_id || ''}
                  disabled
                  className="px-3 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium outline-none appearance-none opacity-70 cursor-not-allowed"
                >
                  {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                    <option key={estate.id} value={estate.id}>{estate.name}</option>
                  ))}
                  {!estates.find(e => e.id === profile?.estate_id) && (
                    <option value={profile?.estate_id || ''}>Assigned Estate</option>
                  )}
                </select>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setSelectedEstateFilter('all'); }}>
                Clear
              </Button>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={currentEntries}
            loading={loading}
            emptyMessage="No tea packets inventory found"
            pagination={{
              page: currentPage,
              pageSize: entriesPerPage,
              totalCount: filteredData.length,
              onPageChange: paginate,
              onPageSizeChange: () => { },
            }}
          />
        </Card>
      </div>

      {/* Create Packet Type Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowCreateModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Add Stocks</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleCreatePacketType} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Packet Grade</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text" required list="tea-grades"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black uppercase focus:ring-2 focus:ring-tea-500/20 outline-none transition-all"
                      placeholder="E.G. BOPF, DUST..."
                      value={stockFormData.grade}
                      onChange={(e) => setStockFormData({ ...stockFormData, grade: e.target.value.toUpperCase() })}
                    />
                    <datalist id="tea-grades">
                      <option value="BOPF" /><option value="BOP" /><option value="DUST" /><option value="OP" /><option value="SILVER TIPS" />
                    </datalist>
                  </div>
                </div>

                {isUserAdmin && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assign Estate</label>
                    <select
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black outline-none appearance-none"
                      value={stockFormData.estate_id}
                      onChange={(e) => setStockFormData({ ...stockFormData, estate_id: e.target.value })}
                    >
                      <option value="">Select Estate (Optional)</option>
                      {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Size (Grams)</label>
                    <div className="relative">
                      <Scale className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="number" required
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black"
                        value={stockFormData.size_grams}
                        onChange={(e) => setStockFormData({ ...stockFormData, size_grams: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price Per Unit (LKR)</label>
                  <div className="relative">
                    <CircleDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-tea-600" size={16} />
                    <input
                      type="number" step="0.01" required
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-black text-tea-600 focus:ring-4 focus:ring-tea-500/10 outline-none"
                      placeholder="0.00"
                      value={stockFormData.unit_price}
                      onChange={(e) => setStockFormData({ ...stockFormData, unit_price: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center gap-2"
                >
                  Add Stocks
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowStockModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Stock</h3>
                  <p className="text-[10px] font-black text-tea-600 uppercase mt-1">
                    Grade: {selectedItem?.grade} • Estate: {estates.find(e => e.id === selectedItem?.estate_id)?.name || 'N/A'}
                  </p>
                </div>
                <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddStockSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Units to Add</label>
                  <input
                    type="number" required min="1" step="1"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-tea-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    value={addStockForm.increment} onChange={(e) => setAddStockForm({ ...addStockForm, increment: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Price (LKR)</label>
                  <input
                    type="number" step="0.01" min="0" placeholder={selectedItem?.unit_price}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-tea-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    value={addStockForm.unit_price} onChange={(e) => setAddStockForm({ ...addStockForm, unit_price: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={saving} className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">
                  {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
