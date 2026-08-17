import { useState, useEffect } from 'react';
import {
  Search, Edit2, Trash2, Plus,
  X, Save, Box,
  Loader2, Layers, MapPin,
  TrendingUp, AlertCircle, History, QrCode, Copy, CheckCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';


const CATEGORIES = [
  "All", "Fertilizers & Chemicals", "Harvesting Tools", "Machinery Spares",
  "Fuel & Lubricants", "Packaging Materials", "Safety Gear", "Nursery Supplies", "Factory Consumables"
];

// ── Minimal QR renderer via QRServer API ──
function QRImage({ text, size = 152 }: { text: string; size?: number }) {
  if (!text) return null;
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=0f172a&bgcolor=f8fafc`;
  return <img src={url} alt="QR Code" width={size} height={size} className="rounded-xl mx-auto" />;
}

export default function GoodsInventoryPage() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);
  // Modals States
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrItem, setQrItem] = useState<any>(null);
  
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [estates, setEstates] = useState<any[]>([]);
  
  const [stockForm, setStockForm] = useState<any>({ increment: '', unit_price: '' });
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchEstates();
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

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('inventory_goods').select('*, suppliers(supplier_name)').order('created_at', { ascending: false });
      if (!error && data) setInventory(data);
    } catch (error) {
      console.error('Failed to fetch goods inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setSaving(true);
      const increment = Number(stockForm.increment);
      const newQuantity = Number(selectedItem.quantity || 0) + increment;
      const unit_price = Number(stockForm.unit_price) || selectedItem.unit_price;
      
      const { error } = await supabase
        .from('inventory_goods')
        .update({ quantity: newQuantity, unit_price })
        .eq('id', selectedItem.id);
        
      if (!error) {
        setShowStockModal(false);
        setStockForm({ increment: '', unit_price: '' });
        fetchInventory();
      } else {
        console.error("Failed to update stock:", error);
      }
    } catch (error) {
      console.error("Failed to update stock:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { id, created_at, updated_at, suppliers, ...payload } = editForm;
      const { error } = await supabase.from('inventory_goods').update(payload).eq('id', id);
      if (!error) {
        setShowEditModal(false);
        fetchInventory();
      } else {
        console.error("Update failed:", error);
      }
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('inventory_goods').delete().eq('id', selectedItem.id);
      if (!error) {
        setShowDeleteModal(false);
        fetchInventory();
      } else {
        console.error("Delete failed:", error);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setSaving(false);
    }
  };


  const getQrText = (item: any) =>
    `ITEM:${item.id}|NAME:${item.item_name}|SKU:${item.sku}|QTY:${item.quantity} ${item.unit}|LOC:${item.location}`;

  const downloadQR = () => {
    if (!qrItem) return;
    const qrText = getQrText(qrItem);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${qrItem.sku || "item"}.png`;
    a.click();
  };

  const copyQRData = async () => {
    if (!qrItem) return;
    try {
      await navigator.clipboard.writeText(getQrText(qrItem));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  };

  const printQR = () => {
    if (!qrItem) return;
    const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrText(qrItem))}`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>QR Label - ${qrItem.item_name}</title>
    <style>body{font-family:'Outfit',sans-serif;text-align:center;padding:24px;background:#fff;} h2{font-size:16px;margin:12px 0 4px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;} p{font-size:12px;color:#64748b;margin:3px;font-weight:600;} .box{border:2px solid #e2e8f0;border-radius:24px;padding:32px;display:inline-block;min-width:240px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);} img{border-radius:16px;margin-bottom:8px;}</style>
    </head><body><div class="box">
    <img src="${imgUrl}" width="180">
    <h2>${qrItem.item_name}</h2>
    <p>SKU: <strong>${qrItem.sku}</strong></p>
    <p>STOCK: <strong>${qrItem.quantity} ${qrItem.unit}</strong></p>
    <p>LOCATION: <strong>${qrItem.location || "N/A"}</strong></p>
    <p style="margin-top:16px;font-size:10px;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;font-weight:900;">TeaERP Tactical Edge</p>
    </div><script>window.onload=()=>{window.print()}<\/script></body></html>`);
    w.document.close();
  };

  const filteredData = inventory.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    const isLowStock = Number(item.quantity) <= Number(item.min_stock_level);
    const matchesStatus = filterStatus === 'All' || (filterStatus === 'Low' ? isLowStock : !isLowStock);
    const matchesEstate = selectedEstateFilter === 'all' || item.estate_id === selectedEstateFilter;

    return matchesSearch && matchesCategory && matchesStatus && matchesEstate;
  });

  const stats = {
    totalItems: inventory.length,
    totalValue: inventory.reduce((acc, curr) => acc + (Number(curr.quantity) * Number(curr.unit_price)), 0),
    lowStock: inventory.filter(i => Number(i.quantity) <= Number(i.min_stock_level)).length,
    categoriesCount: new Set(inventory.map(i => i.category)).size
  };

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const columns: ColumnDef<any>[] = [
    {
      header: "Item Name",
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm text-blue-500">
            <Box size={18} />
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{item.item_name}</p>
            <p className="text-[9px] font-black text-blue-500 mt-0.5 uppercase tracking-widest">{item.sku}</p>
          </div>
        </div>
      )
    },
    {
      header: "Category & Location",
      cell: (item) => (
        <div>
          <span className="w-fit text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-700 block mb-1">
            {item.category}
          </span>
          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold uppercase truncate">
            <MapPin size={10} className="text-slate-400" /> {item.location}
          </div>
        </div>
      )
    },
    {
      header: "Stock",
      cell: (item) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-1.5 h-1.5 rounded-full ${Number(item.quantity) <= Number(item.min_stock_level) ? 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase">{item.quantity} {item.unit}</span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight leading-none">Minimum Stock: {item.min_stock_level}</span>
        </div>
      )
    },
    {
      header: "Price",
      cell: (item) => (
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">LKR {Number(item.unit_price).toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">Per {item.unit}</p>
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
            onClick={() => { setQrItem(item); setShowQRModal(true); }}
            className="text-slate-600 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
            title="View QR Code"
          >
            <QrCode size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setSelectedItem(item); setStockForm({ increment: '', unit_price: item.unit_price }); setShowStockModal(true); }}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/40"
            title="Add Stock"
          >
            <Plus size={16} />
          </Button>
          {isUserAdmin ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setEditForm(item); setShowEditModal(true); }}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40"
                title="Edit"
              >
                <Edit2 size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setSelectedItem(item); setShowDeleteModal(true); }}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40"
                title="Delete"
              >
                <Trash2 size={16} />
              </Button>
            </>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 font-black tracking-widest text-[10px] uppercase flex items-center ml-2">Restricted</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Goods Inventory</h1>

        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-2xl" onClick={() => navigate('/inventory/goods/history')}>
            <History size={16} className="mr-2" /> History
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <Box size={22} className="text-blue-500 dark:text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Items</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalItems}</p>
          </div>
        </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Value</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white"><span className="text-[10px] text-slate-400 font-bold mr-1">LKR</span>{(stats.totalValue / 1000).toFixed(1)}K</p>
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
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.lowStock}</p>
          </div>
        </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <Layers size={22} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Categories</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.categoriesCount}</p>
          </div>
        </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Search items, SKU..."
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none"
            >
              <option value="All">All Categories</option>
              {[...new Set(inventory.map(i => i.category))].filter(Boolean).map(cat => (
                <option key={cat as string} value={cat as string}>{cat as string}</option>
              ))}
            </select>
            <Button variant={filterStatus === 'Low' ? 'destructive' : 'outline'} size="sm" onClick={() => setFilterStatus('Low')}>
              Low Stock Alerts
            </Button>
            {isUserAdmin ? (
              <select
                value={selectedEstateFilter}
                onChange={(e) => { setSelectedEstateFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none"
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
                className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none opacity-70 cursor-not-allowed"
              >
                {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                  <option key={estate.id} value={estate.id}>{estate.name}</option>
                ))}
                {!estates.find(e => e.id === profile?.estate_id) && (
                  <option value={profile?.estate_id || ''}>Assigned Estate</option>
                )}
              </select>
            )}
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterCategory('All'); setFilterStatus('All'); setSelectedEstateFilter('all'); }}>
              Clear
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentEntries}
          loading={loading}
          emptyMessage="No items found"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredData.length,
            onPageChange: paginate,
            onPageSizeChange: () => {},
          }}
        />
      </Card>

      {/* Modern Add Stock Modal */}
      {showStockModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowStockModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Stock</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase mt-1">Item: {selectedItem?.item_name}</p>
                </div>
                <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleAddStock} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity to Add</label>
                  <input
                    type="number" required min="1" step="0.01"
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    value={stockForm.increment} onChange={(e) => setStockForm({ ...stockForm, increment: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Update Price (LKR)</label>
                  <input
                    type="number" step="0.01" min="0" placeholder={selectedItem?.unit_price}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all"
                    value={stockForm.unit_price} onChange={(e) => setStockForm({ ...stockForm, unit_price: e.target.value })}
                  />
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modern Full Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowEditModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Item</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase mt-1 tracking-widest">SKU: {editForm.sku}</p>
                </div>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
              <form onSubmit={handleUpdateItem} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Item Name</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editForm.item_name} onChange={(e) => setEditForm({ ...editForm, item_name: e.target.value })} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Category</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all appearance-none" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}>
                      {CATEGORIES.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                    </select></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Location</label>
                    <input type="text" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} /></div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 italic">Unit Price (LKR)</label>
                    <input type="number" step="0.01" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editForm.unit_price} onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })} /></div>
                </div>
                <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button type="button" onClick={() => setShowEditModal(false)} className="py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[10px] rounded-2xl hover:bg-slate-50 transition-all">Cancel</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowDeleteModal(false)} />
          <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 animate-in zoom-in-95 duration-200 relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-200/50">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Delete Item?</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-3 mb-8 uppercase tracking-wider leading-relaxed">
                Are you sure you want to permanently remove <span className="text-red-500">"{selectedItem?.item_name}"</span>? This action cannot be undone.
              </p>
              <div className="flex w-full gap-4">
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2 w-full">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrItem && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => { setShowQRModal(false); setCopySuccess(false); }} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">

              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">QR Code</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase mt-1">Item Label</p>
                </div>
                <button onClick={() => { setShowQRModal(false); setCopySuccess(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* QR Image */}
              <div className="w-full aspect-square bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-5">
                <QRImage text={getQrText(qrItem)} size={180} />
              </div>

              {/* Item Details Summary */}
              <div className="mb-5 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                {[
                  { label: 'Item Name', value: qrItem.item_name },
                  { label: 'SKU', value: qrItem.sku, mono: true, accent: true },
                  { label: 'Location', value: qrItem.location || 'N/A' },
                  { label: 'Stock', value: `${qrItem.quantity} ${qrItem.unit}`, ok: Number(qrItem.quantity) > Number(qrItem.min_stock_level) },
                ].map(({ label, value, mono, accent, ok }, idx, arr) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between px-4 py-2.5 ${
                      idx < arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
                    <span className={`text-xs font-black uppercase truncate max-w-[140px] text-right ${
                      accent ? 'text-blue-500' :
                      ok !== undefined ? (ok ? 'text-emerald-600' : 'text-amber-500') :
                      'text-slate-900 dark:text-white'
                    } ${mono ? 'font-mono' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <Button onClick={downloadQR} className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest bg-blue-600 hover:bg-blue-700">
                  Download Digital QR
                </Button>
                <Button variant="outline" onClick={printQR} className="w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest">
                  Print Label
                </Button>
                <Button
                  variant="ghost"
                  onClick={copyQRData}
                  className={`w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2 transition-colors ${
                    copySuccess ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-500'
                  }`}
                >
                  {copySuccess ? (
                    <><CheckCheck size={14} /> Copied!</>
                  ) : (
                    <><Copy size={14} /> Copy QR Data
                  </> )}
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
