import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, Search, 
  Download, Edit2, Trash2, 
  X, Save,
  Loader2, ChevronDown, Layers, Activity, MapPin, Leaf, FileText, FileSpreadsheet, DollarSign, Wallet, QrCode, Copy, CheckCheck
} from 'lucide-react';

// ── Minimal QR renderer via QRServer API ──
function QRImage({ text, size = 152 }: { text: string; size?: number }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=0f172a&bgcolor=f8fafc`;
  return <img src={url} alt="QR Code" width={size} height={size} className="rounded-xl mx-auto" />;
}
import { apiClient } from '@/api/client';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EstateSearchSelect = ({ 
  value, 
  onChange, 
  estates,
  allowAll = false,
  className = "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold flex justify-between items-center cursor-pointer outline-none focus:border-blue-500 hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
}: { 
  value: string; 
  onChange: (value: string) => void; 
  estates: any[];
  allowAll?: boolean;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const displayEstates = allowAll ? [{ id: 'All', name: 'All Estates' }, ...estates] : estates;
  const filtered = displayEstates.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  const selectedName = displayEstates.find(e => e.id?.toString() === value?.toString())?.name || (allowAll ? 'All Estates' : 'Select Estate...');

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={className}
      >
        <span className="truncate">{selectedName}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search estates..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-blue-500 font-medium"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-xs font-medium text-slate-500">No estates found</div>
            ) : (
              filtered.map(e => (
                <div 
                  key={e.id}
                  onClick={() => { onChange(e.id); setIsOpen(false); setSearch(''); }}
                  className={`px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors flex items-center justify-between ${value?.toString() === e.id?.toString() ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'}`}
                >
                  {e.name}
                  {value?.toString() === e.id?.toString() && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function BiologicalAssetsInventoryPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  const [filterSpecies, setFilterSpecies] = useState('All');
  const [filterHeight, setFilterHeight] = useState('All');
  const [filterEstate, setFilterEstate] = useState('All');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(8);
  
  // Action Modals State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<any[]>([]);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addData, setAddData] = useState({
    estate_id: '',
    block_id: '',
    tree_species: 'Teak (Tectona grandis)',
    height_ft: '',
    girth_in: '',
    census_date: new Date().toISOString().split('T')[0],
  });
  const [estates, setEstates] = useState<any[]>([]);

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

  useEffect(() => {
    fetchInventory();
    fetchBlocks();
    fetchEstates();
    fetchIncomeAccounts();
  }, []);

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('*');
      if (!error && data) {
        setEstates(data);
        if (data.length > 0) {
          setAddData(prev => ({ ...prev, estate_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch estates:', error);
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
      const { data, error } = await supabase.from('biological_assets').select('*, estates(name)').order('created_at', { ascending: false });
      if (!error && data) {
        const flattened = data.map(d => ({
          ...d,
          estate_name: (d.estates as any)?.name || 'Unknown Estate',
          date: d.census_date
        }));
        setInventory(flattened);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    try {
      const { data, error } = await supabase.from('field_blocks').select('*');
      if (!error && data) {
        setBlocks(data);
        if (data.length > 0) {
          setAddData(prev => ({ ...prev, block_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('biological_assets').delete().eq('id', selectedAsset.id);
      if (!error) {
        setInventory(prev => prev.filter(item => item.id !== selectedAsset.id));
        setShowDeleteModal(false);
      }
    } catch (error) {
      alert('Failed to delete asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const { estates, block_name, estate_name, date, created_at, updated_at, ...payload } = selectedAsset;
    try {
      const { error } = await supabase.from('biological_assets').update(payload).eq('id', selectedAsset.id);
      if (!error) {
        await fetchInventory();
        setShowEditModal(false);
      }
    } catch (error) {
      alert('Failed to update asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSelectedAsset((prev: any) => {
       const newData = { ...prev, [name]: value };
       if (name === 'estate_id') {
          const estateBlocks = blocks.filter(b => b.estate_id?.toString() === value.toString());
          if (estateBlocks.length > 0 && !estateBlocks.find(b => b.id.toString() === newData.block_id)) {
             newData.block_id = estateBlocks[0].id;
             const block = blocks.find(b => b.id.toString() === newData.block_id.toString());
             newData.block_name = block ? block.name : '';
          } else if (estateBlocks.length === 0) {
             newData.block_id = '';
             newData.block_name = '';
          }
       } else if (name === 'block_id') {
          const block = blocks.find(b => b.id.toString() === value.toString());
          newData.block_name = block ? block.name : '';
       }
       return newData;
    });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      let heightCategory = 'Sapling';
      if (Number(addData.height_ft) > 30) heightCategory = 'Mature';
      else if (Number(addData.height_ft) > 15) heightCategory = 'Tall';

      let girthCategory = 'Small';
      if (Number(addData.girth_in) > 30) girthCategory = 'Large';
      else if (Number(addData.girth_in) > 15) girthCategory = 'Medium';

      const payload = {
        estate_id: addData.estate_id || null,
        block_id: addData.block_id || null,
        tree_species: addData.tree_species,
        height_ft: Number(addData.height_ft),
        girth_in: Number(addData.girth_in),
        census_date: addData.census_date,
        height_category: heightCategory,
        girth_category: girthCategory
      };

      const { error } = await supabase.from('biological_assets').insert(payload);
      if (error) throw error;
      
      await fetchInventory();
      setShowAddModal(false);
      
      setAddData(prev => ({
        ...prev,
        height_ft: '',
        girth_in: '',
        tree_species: 'Teak (Tectona grandis)',
        census_date: new Date().toISOString().split('T')[0]
      }));
    } catch (error: any) {
      alert(error.message || 'Failed to add asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setAddData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'estate_id') {
         const estateBlocks = blocks.filter(b => !b.estate_id || b.estate_id?.toString() === value.toString());
         if (estateBlocks.length > 0 && !estateBlocks.find(b => b.id.toString() === newData.block_id)) {
            newData.block_id = estateBlocks[0].id;
         } else if (estateBlocks.length === 0) {
            newData.block_id = '';
         }
      }
      return newData;
    });
  };

  const addAvailableBlocks = blocks.filter(b => !b.estate_id || b.estate_id?.toString() === addData.estate_id?.toString());
  const editAvailableBlocks = blocks.filter(b => !b.estate_id || b.estate_id?.toString() === selectedAsset?.estate_id?.toString());

  const handleSell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    setIsProcessing(true);
    try {
      const salePayload = {
        asset_id: selectedAsset.id,
        sale_date: sellData.saleDate,
        buyer: sellData.buyer,
        amount: Number(sellData.amount),
        income_account_id: sellData.incomeAccountId || null,
        notes: sellData.notes
      };
      
      const { error: sellError } = await supabase.from('biological_asset_sales').insert(salePayload);
      if (sellError) throw sellError;

      const { error: deleteError } = await supabase.from('biological_assets').delete().eq('id', selectedAsset.id);
      if (deleteError) throw deleteError;
      
      setInventory(prev => prev.filter(item => item.id !== selectedAsset.id));
      setShowSellModal(false);
      fetchInventory();
    } catch (error: any) {
      alert(error.message || 'Failed to sell asset');
    } finally {
      setIsProcessing(false);
    }
  };

  const getQrText = (item: any) => 
    JSON.stringify({ type: 'biological', id: item.id, species: item.tree_species, estate: item.estate_name });

  const downloadQR = () => {
    if (!qrItem) return;
    const qrText = getQrText(qrItem);
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrText)}`;
    
    fetch(url).then(r => r.blob()).then(blob => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QR_Biological_${qrItem.tree_species || "asset"}.png`;
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
    const blockName = blocks.find(b => b.id.toString() === qrItem.block_id?.toString())?.name || qrItem.block_id || '—';
    w.document.write(`<html><head><title>QR Label - ${qrItem.tree_species}</title>
      <style>body{font-family:sans-serif;text-align:center;margin:40px;}</style></head><body>
    <img src="${imgUrl}" style="margin-bottom:15px;"/>
    <h2>${qrItem.tree_species}</h2>
    <p>ESTATE: <strong>${qrItem.estate_name || "N/A"}</strong></p>
    <p>SECTOR: <strong>${blockName}</strong></p>
    <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
    </body></html>`);
    w.document.close();
  };

  // EXPORT FUNCTIONS
  const exportToExcel = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : inventory;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport.map(item => ({
      'ID': item.id,
      'Estate': item.estate_name,
      'Sector/Block': blocks.find(b => b.id.toString() === item.block_id?.toString())?.name || item.block_id || '—',
      'Tree Species': item.tree_species,
      'Height (ft)': item.height_ft,
      'Girth (in)': item.girth_in,
      'Height Grade': item.height_category,
      'Girth Grade': item.girth_category,
      'Last Census': item.date
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Forestry_Inventory");
    XLSX.writeFile(workbook, `Filtered_Biological_Assets_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportOptions(false);
  };

  const exportToPDF = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : inventory;
    const doc = new jsPDF('landscape');
    doc.text("TeaERP Pro - Biological Assets Inventory (Filtered)", 14, 15);
    doc.setFontSize(10);
    doc.text(`Created on: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Applied Filters: ${searchTerm || 'None'} | ${filterSpecies} | ${filterHeight}`, 14, 27);
    
    const tableData = dataToExport.map(item => [
      item.id,
      item.estate_name,
      blocks.find(b => b.id.toString() === item.block_id?.toString())?.name || item.block_id || '—',
      item.tree_species,
      `${item.height_ft} (${item.height_category})`,
      `${item.girth_in} (${item.girth_category})`,
      item.date
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['ID', 'Estate', 'Sector', 'Species', 'Height', 'Girth', 'Last Census']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 64, 175] }
    });

    doc.save(`Filtered_Biological_Assets_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportOptions(false);
  };

  // Smart Filtering Logic
  const filteredData = inventory.filter(item => {
    const searchLow = searchTerm.toLowerCase();
    const blockName = blocks.find(b => b.id.toString() === item.block_id?.toString())?.name || '';
    const matchesSearch = 
      (item.tree_species?.toLowerCase().includes(searchLow) || '') ||
      (blockName.toLowerCase().includes(searchLow) || '') ||
      (item.estate_name?.toLowerCase().includes(searchLow) || '') ||
      (item.division_name?.toLowerCase().includes(searchLow) || '');
    const matchesSpecies = filterSpecies === 'All' || item.tree_species.includes(filterSpecies);
    const matchesHeight = filterHeight === 'All' || item.height_category === filterHeight;
    const matchesEstate = filterEstate === 'All' || item.estate_id?.toString() === filterEstate.toString() || item.estate_name === filterEstate;
    
    return matchesSearch && matchesSpecies && matchesHeight && matchesEstate;
  });

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);


  const columns: ColumnDef<any>[] = [
    {
      header: "Asset ID",
      cell: (item) => <span className="font-mono text-xs font-black text-slate-500">#{String(item.id).substring(0,8)}</span>
    },
    {
      header: "Estate",
      cell: (item) => (
        <span className="text-xs font-black text-slate-900 dark:text-white">{item.estate_name}</span>
      )
    },
    {
      header: "Sector (Block)",
      cell: (item) => {
        const blockName = blocks.find(b => b.id.toString() === item.block_id?.toString())?.name || item.block_id || '—';
        return (
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
            {blockName}
          </span>
        );
      }
    },
    {
      header: "Species",
      cell: (item) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item.tree_species}</span>
      )
    },
    {
      header: "Height (ft)",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900 dark:text-white">{item.height_ft}</span>
          <span className="text-[10px] font-bold text-slate-500">{item.height_category}</span>
        </div>
      )
    },
    {
      header: "Girth (in)",
      cell: (item) => (
        <div className="flex flex-col">
          <span className="text-xs font-black text-slate-900 dark:text-white">{item.girth_in}</span>
          <span className="text-[10px] font-bold text-slate-500">{item.girth_category}</span>
        </div>
      )
    },
    {
      header: "Census Date",
      cell: (item) => <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}</span>
    },
    ...(isUserAdmin ? [{
      header: "Actions",
      cell: (item: any) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setQrItem(item); setShowQRModal(true); }} className="text-slate-500" title="View QR Code">
            <QrCode size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(item); setShowEditModal(true); }} className="text-blue-500">
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setSelectedAsset(item); setShowDeleteModal(true); }} className="text-red-500">
            <Trash2 size={16} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setSelectedAsset(item); setShowSellModal(true); }} className="text-emerald-600 border-emerald-200">
            Sell
          </Button>
        </div>
      )
    }] : [])
  ];

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Biological Assets</h1>
        </div>
        <div className="flex gap-3 relative">
          {isUserAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2"
            >
              <PlusCircle size={16} /> Add Asset
            </button>
          )}
          
          <div className="relative">
            <button 
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-outfit"
            >
              <Download size={16} /> Export
            </button>
            
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-2 animate-in slide-in-from-top-2">
                <button onClick={exportToExcel} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors">
                  <FileSpreadsheet size={16} /> Excel Spreadsheet
                </button>
                <button onClick={exportToPDF} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                  <FileText size={16} /> PDF Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
            <Layers size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Trees</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{inventory.length}</p>
          </div>
        </div>
      </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
            <Activity size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Height</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {inventory.length > 0 ? (inventory.reduce((a,c)=>a+Number(c.height_ft),0)/inventory.length).toFixed(1) : '0.0'}
              <span className="text-[10px] text-slate-400 font-bold ml-1">ft</span>
            </p>
          </div>
        </div>
      </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-sky-100 dark:bg-sky-900/30 shrink-0">
            <MapPin size={22} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Avg Girth</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {inventory.length > 0 ? (inventory.reduce((a,c)=>a+Number(c.girth_in),0)/inventory.length).toFixed(1) : '0.0'}
              <span className="text-[10px] text-slate-400 font-bold ml-1">in</span>
            </p>
          </div>
        </div>
      </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 shrink-0">
            <Leaf size={22} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Latest Data</p>
            <h3 className="text-lg font-black text-slate-900 dark:text-white truncate">
                {inventory[0]?.date ? new Date(inventory[0].date).toLocaleDateString(undefined, {month:'short', year:'numeric'}) : 'N/A'}
            </h3>
          </div>
        </div>
      </div>
      </div>

      {/* Smart Filter Panel */}
      <div className="premium-card p-4 bg-slate-50/50 dark:bg-slate-900/50 border-dashed mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search species, estate, sector..." 
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                className="w-full pl-10 pr-4 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-2 min-w-[140px]">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Species</label>
            <div className="flex gap-2 min-w-[280px]">
              <div className="flex-1 relative">
                <select 
                  value={filterSpecies} onChange={(e) => {setFilterSpecies(e.target.value); setCurrentPage(1);}}
                  className="w-full pl-3 pr-8 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500 appearance-none shadow-sm"
                >
                  <option value="All">All Species</option>
                  {[...new Set(inventory.map(i => i.tree_species))].filter(Boolean).map(species => (
                    <option key={species as string} value={species as string}>{species as string}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>

              <div className="flex-1 relative">
                <select 
                  value={filterHeight} onChange={(e) => {setFilterHeight(e.target.value); setCurrentPage(1);}}
                  className="w-full pl-3 pr-8 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500 appearance-none shadow-sm"
                >
                  <option value="All">All Heights</option>
                  <option value="Mature">Mature</option>
                  <option value="Tall">Tall</option>
                  <option value="Sapling">Sapling</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>

              {isUserAdmin && (
                <div className="flex-1 relative min-w-[140px]">
                  <EstateSearchSelect 
                    value={filterEstate}
                    onChange={(val) => { setFilterEstate(val); setCurrentPage(1); }}
                    estates={estates}
                    allowAll={true}
                    className="w-full pl-3 pr-8 h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-blue-500 shadow-sm flex justify-between items-center cursor-pointer transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="premium-card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={currentEntries}
          loading={loading}
          emptyMessage="No matching assets found"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredData.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: () => {},
          }}
        />
      </div>

      {/* Confirmation Modals */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Asset?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                Permanently remove <span className="font-bold">"{selectedAsset?.tree_species}"</span>?
              </p>
              <div className="flex w-full gap-3">
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all">
                  {isProcessing ? 'Removing...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Add New Asset</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleAdd} className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Estate</label>
                     <EstateSearchSelect 
                        value={addData.estate_id} 
                        onChange={(val) => handleAddChange({ target: { name: 'estate_id', value: val } } as any)} 
                        estates={estates} 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Assigned Sector</label>
                     <div className="relative">
                       <select name="block_id" value={addData.block_id} onChange={handleAddChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500 appearance-none pr-10">
                          {addAvailableBlocks.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900">{b.name}</option>)}
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                   </div>
                   <div className="space-y-2 col-span-2 md:col-span-1">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Tree Species</label>
                     <div className="relative">
                       <select name="tree_species" value={addData.tree_species} onChange={handleAddChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500 appearance-none pr-10">
                         <option className="bg-white dark:bg-slate-900">Teak (Tectona grandis)</option>
                         <option className="bg-white dark:bg-slate-900">Mahogany</option>
                         <option className="bg-white dark:bg-slate-900">Eucalyptus</option>
                         <option className="bg-white dark:bg-slate-900">Rosewood</option>
                         <option className="bg-white dark:bg-slate-900">Sandalwood</option>
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                   </div>
                   <div className="space-y-2 col-span-2 md:col-span-1">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Census Date</label>
                     <div className="relative">
                        <input type="date" name="census_date" value={addData.census_date} onChange={handleAddChange} required className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-2">
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Height (ft)</label>
                       <input type="number" step="0.1" name="height_ft" value={addData.height_ft} onChange={handleAddChange} required className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Girth (in)</label>
                       <input type="number" step="0.1" name="girth_in" value={addData.girth_in} onChange={handleAddChange} required className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                     </div>
                   </div>
                </div>
                <div className="flex gap-3 pt-4">
                   <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">
                     {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                     Save Asset
                   </button>
                   <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-widest rounded-xl">Cancel</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
             <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Edit Asset</h2>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleEdit} className="p-8 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Estate</label>
                     <EstateSearchSelect 
                        value={selectedAsset.estate_id || ''} 
                        onChange={(val) => handleEditChange({ target: { name: 'estate_id', value: val } } as any)} 
                        estates={estates} 
                     />
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Assigned Sector</label>
                     <div className="relative">
                       <select name="block_id" value={selectedAsset.block_id} onChange={handleEditChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500 appearance-none pr-10">
                          {editAvailableBlocks.map(b => <option key={b.id} value={b.id} className="bg-white dark:bg-slate-900">{b.name}</option>)}
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                   </div>
                   <div className="space-y-2">
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Tree Species</label>
                     <div className="relative">
                       <select name="tree_species" value={selectedAsset.tree_species} onChange={handleEditChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500 appearance-none pr-10">
                         <option className="bg-white dark:bg-slate-900">Teak (Tectona grandis)</option>
                         <option className="bg-white dark:bg-slate-900">Mahogany</option>
                         <option className="bg-white dark:bg-slate-900">Eucalyptus</option>
                         <option className="bg-white dark:bg-slate-900">Rosewood</option>
                         <option className="bg-white dark:bg-slate-900">Sandalwood</option>
                       </select>
                       <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                     </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-2">
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Height (ft)</label>
                       <input type="number" step="0.1" name="height_ft" value={selectedAsset.height_ft} onChange={handleEditChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Girth (in)</label>
                       <input type="number" step="0.1" name="girth_in" value={selectedAsset.girth_in} onChange={handleEditChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Census Date</label>
                       <div className="relative">
                          <input type="date" name="date" value={selectedAsset.date || ''} onChange={handleEditChange} className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-blue-500" />
                       </div>
                     </div>
                   </div>
                </div>
                <div className="flex gap-3 pt-4">
                   <button type="submit" disabled={isProcessing} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">
                     {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                     Update Asset
                   </button>
                   <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-widest rounded-xl">Cancel</button>
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
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Sell Biological Asset</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Record sale & Transfer to Income</p>
                  </div>
                </div>
                <button onClick={() => setShowSellModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
             </div>
             <form onSubmit={handleSell} className="p-8 space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 mb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selected Asset</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{selectedAsset?.tree_species}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</p>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">#{selectedAsset?.id}</h4>
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
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Buyer Name</label>
                     <input 
                       type="text" 
                       required
                       placeholder="Enter buyer details..."
                       value={sellData.buyer}
                       onChange={(e) => setSellData({...sellData, buyer: e.target.value})}
                       className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500" 
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
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Income Account</label>
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
                     <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Internal Notes</label>
                     <textarea 
                       rows={2}
                       placeholder="Transaction details, reference numbers..."
                       value={sellData.notes}
                       onChange={(e) => setSellData({...sellData, notes: e.target.value})}
                       className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-emerald-500 resize-none"
                     ></textarea>
                   </div>
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                     type="submit" 
                     disabled={isProcessing} 
                     className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2 w-full disabled:opacity-50"
                   >
                     {isProcessing ? <Loader2 size={18} className="animate-spin"/> : <DollarSign size={18}/>}
                     Complete Sale
                   </button>
                   <button 
                     type="button" 
                     onClick={() => setShowSellModal(false)} 
                     className="flex-1 py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                   >
                     Cancel
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
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{qrItem.tree_species}</h3>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{qrItem.estate_name || 'N/A'}</p>
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
    </div>
  );
}
