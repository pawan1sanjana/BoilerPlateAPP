import { useState, useEffect } from 'react';
import { 
  PlusCircle,
  Search, 
  Edit2, Trash2, 
  X, Save,
  Loader2, ChevronDown,
  Wrench, Package, Zap, DollarSign, Wallet, QrCode, Copy, CheckCheck, History, ClipboardCheck,
  FileText, Download
} from 'lucide-react';

// ── Minimal QR renderer via QRServer API ──
function QRImage({ text, size = 152 }: { text: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=0f172a&bgcolor=f8fafc`;
  return <img src={url} alt="QR Code" width={size} height={size} className="rounded-xl mx-auto" />;
}
import { apiClient } from '../../api/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function PhysicalAssetsInventoryPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const initialEstateId = (!isUserAdmin && profile?.estate_id) ? profile.estate_id : '';

  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [estates, setEstates] = useState<any[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(8);
  
  // Action Modals State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newAssetData, setNewAssetData] = useState({
    estate_id: initialEstateId,
    asset_name: '',
    asset_type: 'Equipment',
    serial_number: '',
    location: '',
    asset_condition: 'good',
    maintenance_status: 'operational',
    value: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [incomeAccounts, setIncomeAccounts] = useState<any[]>([]);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellData, setSellData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    buyer: '',
    amount: '',
    incomeAccountId: '',
    notes: ''
  });

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrItem, setQrItem] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditAsset, setAuditAsset] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchIncomeAccounts();
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

  const fetchIncomeAccounts = async () => {
    try {
      const response = await apiClient.get('/finance/accounts');
      if (response.success) {
        // Filter for income type accounts
        const incomeAccs = response.data.filter((acc: any) => acc.type === 'income');
        setIncomeAccounts(incomeAccs);
        if (incomeAccs.length > 0) {
          setSellData(prev => ({ ...prev, incomeAccountId: incomeAccs[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch income accounts:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('physical_assets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (data) {
        setInventory(data);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const payload: any = { ...newAssetData };
      if (!payload.estate_id) {
        delete payload.estate_id;
      }
      if (!payload.value) {
        payload.value = 0;
      }

      const { error } = await supabase.from('physical_assets').insert(payload);
      if (error) throw error;
      await fetchInventory();
      setShowRegisterModal(false);
      setNewAssetData({
        estate_id: initialEstateId,
        asset_name: '',
        asset_type: 'Equipment',
        serial_number: '',
        location: '',
        asset_condition: 'good',
        maintenance_status: 'operational',
        value: '',
        purchase_date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      alert(error.message || 'Failed to register asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('physical_assets').delete().eq('id', selectedAsset.id);
      if (error) throw error;
      setInventory(prev => prev.filter(item => item.id !== selectedAsset.id));
      setShowDeleteModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to delete asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const { id, created_at, updated_at, ...updateData } = selectedAsset;
      const { error } = await supabase.from('physical_assets').update(updateData).eq('id', id);
      if (error) throw error;
      await fetchInventory();
      setShowEditModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to update asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsProcessing(true);
    try {
      // In a real system, insert into finance ledgers, but for physical assets just mark as retired
      const { error } = await supabase.from('physical_assets').update({ maintenance_status: 'retired' }).eq('id', selectedAsset.id);
      if (error) throw error;
      await fetchInventory();
      setShowSellModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to sell asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const viewAuditHistory = async (asset: any) => {
    setAuditAsset(asset);
    setShowAuditModal(true);
    setLoadingAudits(true);
    try {
      const { data, error } = await supabase
        .from('asset_audits')
        .select('*')
        .eq('asset_id', asset.id)
        .order('audit_date', { ascending: false });
        
      if (!error && data) {
        // Manually fetch user details to avoid PostgREST foreign key errors
        const userIds = [...new Set(data.map((a: any) => a.audited_by).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
            
          if (usersData) {
            usersData.forEach((u: any) => {
              usersMap[u.id] = u;
            });
          }
        }
        
        const mappedData = data.map((audit: any) => ({
          ...audit,
          users: audit.audited_by ? { full_name: usersMap[audit.audited_by]?.name } : null
        }));
        
        setAuditLogs(mappedData);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Failed to load audits', err);
    } finally {
      setLoadingAudits(false);
    }
  };

  const getQrText = (item: any) => 
    JSON.stringify({ type: 'physical', id: item.id, name: item.asset_name, location: item.location });

  const downloadQR = () => {
    if (!qrItem) return;
    const qrText = getQrText(qrItem);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
    
    fetch(url).then(r => r.blob()).then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QR_Physical_${qrItem.asset_name || "asset"}.png`;
      a.click();
    });
  };

  const copyQRData = async () => {
    if (!qrItem) return;
    try {
      await navigator.clipboard.writeText(getQrText(qrItem));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const printQR = () => {
    if (!qrItem) return;
    const imgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrText(qrItem))}`;
    
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>QR Label - ${qrItem.asset_name}</title>
      <style>body{font-family:sans-serif;text-align:center;margin:40px;}</style></head><body>
    <img src="${imgUrl}" style="margin-bottom:15px;"/>
    <h2>${qrItem.asset_name}</h2>
    <p>SN: <strong>${qrItem.serial_number || "N/A"}</strong></p>
    <p>LOCATION: <strong>${qrItem.location || "N/A"}</strong></p>
    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
    </body></html>`);
    w.document.close();
  };


  // Smart Filtering Logic
  const filteredData = inventory.filter(item => {
    const searchLow = searchTerm.toLowerCase();
    const matchesSearch = 
      (item.asset_name?.toLowerCase().includes(searchLow) || '') ||
      (item.serial_number?.toLowerCase().includes(searchLow) || '') ||
      (item.location?.toLowerCase().includes(searchLow) || '');
    
    const matchesType = filterType === 'All' || item.asset_type === filterType;
    const matchesStatus = filterStatus === 'All' || item.maintenance_status === filterStatus;
    const matchesEstate = selectedEstateFilter === 'all' || item.estate_id === selectedEstateFilter;
    
    return matchesSearch && matchesType && matchesStatus && matchesEstate;
  });

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);

  const stats = {
    totalValue: inventory.reduce((a,c) => a + Number(c.value), 0),
    operationalCount: inventory.filter(i => i.maintenance_status === 'operational').length,
    criticalCount: inventory.filter(i => i.asset_condition === 'poor' || i.maintenance_status === 'under_repair').length
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Asset Name",
      cell: (item) => <span className="text-xs font-black text-slate-900 dark:text-white">{item.asset_name}</span>
    },
    {
      header: "Serial Number",
      cell: (item) => <span className="font-mono text-xs font-black text-slate-500">{item.serial_number || '—'}</span>
    },
    {
      header: "Type",
      cell: (item) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{item.asset_type}</span>
    },
    {
      header: "Location",
      cell: (item) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.location}</span>
    },
    {
      header: "Condition",
      cell: (item) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{item.asset_condition}</span>
    },
    {
      header: "Status",
      cell: (item) => <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">{item.maintenance_status.replace('_', ' ')}</span>
    },
    {
      header: "Value (LKR)",
      cell: (item) => <span className="text-xs font-black text-slate-900 dark:text-white">Rs. {Number(item.value).toLocaleString()}</span>
    },
    ...(isUserAdmin ? [{
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (item: any) => (
         <div className="flex items-center gap-2 justify-end">
           <Button variant="ghost" size="icon" onClick={() => viewAuditHistory(item)} className="text-indigo-500 hover:bg-indigo-50" title="Audit History">
             <History size={16} />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => { setQrItem(item); setShowQRModal(true); }} className="text-slate-500 hover:bg-slate-50" title="View QR Code">
             <QrCode size={16} />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(item); setShowEditModal(true); }} className="text-blue-500 hover:bg-blue-50">
             <Edit2 size={16} />
           </Button>
           <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(item); setShowDeleteModal(true); }} className="text-red-500 hover:bg-red-50">
             <Trash2 size={16} />
           </Button>
           <Button variant="outline" size="sm" onClick={() => { setSelectedAsset(item); setShowSellModal(true); }} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
             Sell
           </Button>
         </div>
      )
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit">Physical Inventory</h1>
        </div>
        <div className="flex gap-3 relative">
          <Button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center gap-2"
          >
            <PlusCircle size={18} /> Register Asset
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <Package size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">Total Assets</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{inventory.length}</h3>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">Stock Value</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                <span className="text-xs mr-1 font-bold">LKR</span>{(stats.totalValue / 1000000).toFixed(1)}<span className="text-xs ml-1 font-bold">M</span>
              </h3>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30">
              <Zap size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">Operational</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.operationalCount}</h3>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
              <Wrench size={22} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider leading-none mb-1">Attention Req</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.criticalCount}</h3>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                type="text" 
                placeholder="Search by name, serial, or location..."
                className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all min-w-[150px]"
            >
              <option value="All">All Categories</option>
              <option value="Equipment">Equipment</option>
              <option value="Vehicles">Vehicles</option>
              <option value="Buildings">Buildings</option>
              <option value="Tools">Tools</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all min-w-[150px]"
            >
              <option value="All">All Statuses</option>
              <option value="operational">Operational</option>
              <option value="maintenance_due">Service Due</option>
              <option value="under_repair">Repairing</option>
              <option value="retired">Retired</option>
            </select>
            
            {isUserAdmin ? (
              <select
                value={selectedEstateFilter}
                onChange={(e) => { setSelectedEstateFilter(e.target.value); setCurrentPage(1); }}
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all min-w-[150px]"
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
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none transition-all min-w-[150px] opacity-70 cursor-not-allowed"
              >
                {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                  <option key={estate.id} value={estate.id}>{estate.name}</option>
                ))}
                {!estates.find(e => e.id === profile?.estate_id) && (
                  <option value={profile?.estate_id || ''}>Assigned Estate</option>
                )}
              </select>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentEntries}
          loading={loading}
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredData.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: setEntriesPerPage
          }}
        />
      </Card>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Register New Asset</h2>
                 <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleRegister} className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asset Nomenclature</label>
                         <input required type="text" placeholder="e.g. Dell XPS 15" value={newAssetData.asset_name} onChange={(e)=>setNewAssetData({...newAssetData, asset_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Serial Number</label>
                         <input required type="text" placeholder="e.g. SN-12345" value={newAssetData.serial_number} onChange={(e)=>setNewAssetData({...newAssetData, serial_number: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Type</label>
                           <select value={newAssetData.asset_type} onChange={(e)=>setNewAssetData({...newAssetData, asset_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="Equipment">Equipment</option>
                              <option value="Vehicles">Vehicles</option>
                              <option value="Buildings">Buildings</option>
                              <option value="Tools">Tools</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asset Value</label>
                           <input required type="number" placeholder="0.00" value={newAssetData.value} onChange={(e)=>setNewAssetData({...newAssetData, value: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                         </div>
                       </div>
                       {isUserAdmin && (
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estate</label>
                           <select required value={newAssetData.estate_id} onChange={(e)=>setNewAssetData({...newAssetData, estate_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="" disabled>Select Estate</option>
                              {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
                           </select>
                         </div>
                       )}
                    </div>

                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Condition</label>
                           <select value={newAssetData.asset_condition} onChange={(e)=>setNewAssetData({...newAssetData, asset_condition: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="fair">Fair</option>
                              <option value="poor">Poor</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Status</label>
                           <select value={newAssetData.maintenance_status} onChange={(e)=>setNewAssetData({...newAssetData, maintenance_status: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="operational">Operational</option>
                              <option value="maintenance_due">Service Due</option>
                              <option value="under_repair">Under Repair</option>
                              <option value="retired">Retired</option>
                           </select>
                         </div>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Station/Location</label>
                         <input required type="text" placeholder="e.g. Main Office" value={newAssetData.location} onChange={(e)=>setNewAssetData({...newAssetData, location: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Purchase Date</label>
                         <input required type="date" value={newAssetData.purchase_date} onChange={(e)=>setNewAssetData({...newAssetData, purchase_date: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-slate-100 dark:border-slate-800">
                    <button type="button" onClick={() => setShowRegisterModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-lg transition-all">Cancel</button>
                    <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
                       {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <PlusCircle size={18}/>}
                       Register Asset
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Asset?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                Permanently remove <span className="font-bold">"{selectedAsset?.asset_name}"</span>?
              </p>
              <div className="flex justify-center w-full gap-3 mt-6">
                <button onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-50 transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isProcessing}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
                  {isProcessing ? <Loader2 size={18} className="animate-spin"/> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
           <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                 <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Edit Physical Data</h2>
                 <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
              </div>
              
              <form onSubmit={handleEdit} className="p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asset Nomenclature</label>
                         <input type="text" value={selectedAsset?.asset_name || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, asset_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Type</label>
                           <select value={selectedAsset?.asset_type || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, asset_type: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option>Equipment</option>
                              <option>Vehicles</option>
                              <option>Buildings</option>
                              <option>Tools</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Asset Value</label>
                           <input type="number" value={selectedAsset?.value || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, value: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                         </div>
                       </div>
                       {isUserAdmin && (
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Estate</label>
                           <select value={selectedAsset?.estate_id || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, estate_id: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="" disabled>Select Estate</option>
                              {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
                           </select>
                         </div>
                       )}
                    </div>

                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Condition</label>
                           <select value={selectedAsset?.asset_condition || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, asset_condition: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="excellent">Excellent</option>
                              <option value="good">Good</option>
                              <option value="fair">Fair</option>
                              <option value="poor">Poor</option>
                           </select>
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Status</label>
                           <select value={selectedAsset?.maintenance_status || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, maintenance_status: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none">
                              <option value="operational">Operational</option>
                              <option value="maintenance_due">Service Due</option>
                              <option value="under_repair">Under Repair</option>
                              <option value="retired">Retired</option>
                           </select>
                         </div>
                       </div>
                       <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Station/Location</label>
                         <input type="text" value={selectedAsset?.location || ''} onChange={(e)=>setSelectedAsset({...selectedAsset, location: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-lg transition-all">Cancel</button>
                    <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
                       {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>}
                       Update Asset Data
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
      {/* Sell Asset Modal */}
      {showSellModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-xl rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50/30 dark:bg-emerald-900/10">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl text-emerald-600">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Sell Physical Asset</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Record sale & Transfer to Income</p>
                  </div>
                </div>
                <button onClick={() => setShowSellModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleSell} className="p-8 space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical Asset</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedAsset?.asset_name}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Serial #</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedAsset?.serial_number}</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Sale Date</label>
                     <input 
                       type="date" 
                       required
                       value={sellData.saleDate}
                       onChange={(e) => setSellData({...sellData, saleDate: e.target.value})}
                       className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500" 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Purchasing Party</label>
                     <input 
                       type="text" 
                       required
                       placeholder="Enter buyer name..."
                       value={sellData.buyer}
                       onChange={(e) => setSellData({...sellData, buyer: e.target.value})}
                       className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all"
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Sale Amount (LKR)</label>
                     <div className="relative">
                       <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                       <input 
                         type="number" 
                         required
                         placeholder="0.00"
                         value={sellData.amount}
                         onChange={(e) => setSellData({...sellData, amount: e.target.value})}
                         className="w-full pl-12 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500" 
                       />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Income Ledger</label>
                     <div className="relative">
                       <select 
                         required
                         value={sellData.incomeAccountId}
                         onChange={(e) => setSellData({...sellData, incomeAccountId: e.target.value})}
                         className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500 appearance-none pr-10"
                       >
                          {incomeAccounts.map(acc => (
                            <option key={acc.id} value={acc.id} className="bg-white dark:bg-slate-900">{acc.code} - {acc.name}</option>
                          ))}
                          {incomeAccounts.length === 0 && <option value="">No income accounts found</option>}
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                   </div>
                   <div className="col-span-2 space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Transaction Notes</label>
                     <textarea 
                       rows={2}
                       placeholder="Disposal reason, transfer of ownership details..."
                       value={sellData.notes}
                       onChange={(e) => setSellData({...sellData, notes: e.target.value})}
                       className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500 resize-none"
                     ></textarea>
                   </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                   <button 
                     type="button" 
                     onClick={() => setShowSellModal(false)} 
                     className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium rounded-lg transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit" 
                     disabled={isProcessing} 
                     className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                     {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <DollarSign size={18}/>}
                     Confirm Disposal & Sale
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{qrItem.asset_name}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{qrItem.serial_number || 'N/A'}</p>
              </div>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500"/>
              </button>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 mb-6 flex justify-center">
              <QRImage text={getQrText(qrItem)} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <Button onClick={copyQRData} variant="outline" className="h-12 rounded-xl flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700">
                {copied ? <CheckCheck size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-500" />}
                <span className={copied ? "text-emerald-600" : ""}>{copied ? 'Copied!' : 'Copy Data'}</span>
              </Button>
              <Button onClick={printQR} className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 flex items-center justify-center gap-2">
                <FileText size={16} /> Print Label
              </Button>
            </div>
            <Button onClick={downloadQR} variant="outline" className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <Download size={16} /> Download PNG
            </Button>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {showAuditModal && auditAsset && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-start mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl">
                  <ClipboardCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Audit History</h3>
                  <p className="text-sm font-bold text-slate-500 mt-0.5">{auditAsset.asset_name} ({auditAsset.serial_number || 'N/A'})</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} className="text-slate-500"/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {loadingAudits ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
                  <p className="text-sm font-medium">Loading audit history...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <History size={32} className="mx-auto text-slate-400 mb-3" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No audit records found</p>
                  <p className="text-xs text-slate-500 mt-1">This asset has not been audited yet.</p>
                </div>
              ) : (
                <div className="relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
                  {auditLogs.map((log) => {
                    let badgeColor = "bg-slate-100 text-slate-600 border-slate-200";
                    if (log.condition_status === 'excellent' || log.condition_status === 'good') badgeColor = "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800";
                    if (log.condition_status === 'poor' || log.condition_status === 'missing') badgeColor = "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
                    
                    return (
                      <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-slate-900 bg-blue-100 dark:bg-blue-900/50 text-blue-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <CheckCheck size={16} />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{new Date(log.audit_date).toLocaleDateString()}</span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${badgeColor}`}>
                              {log.condition_status}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{log.users?.full_name || 'System'}</p>
                          {log.notes && (
                            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mt-2">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Button onClick={() => setShowAuditModal(false)} className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
