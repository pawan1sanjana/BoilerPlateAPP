import { useState, useEffect } from 'react';
import { 
  Search,
  RefreshCcw, Building2, TrendingUp
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';

export default function IssueHistoryPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  useEffect(() => {
    fetchHistory();
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

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('issued_goods').select('*, inventory_goods(item_name, sku, unit)').order('created_at', { ascending: false });
      if (!error && data) {
        const flattened = data.map(d => ({
          ...d,
          issued_at: d.created_at,
          item_name: (d.inventory_goods as any)?.item_name || 'Unknown',
          sku: (d.inventory_goods as any)?.sku || 'Unknown',
          unit: (d.inventory_goods as any)?.unit || ''
        }));
        setHistory(flattened);
      }
    } catch (error) {
      console.error('Failed to fetch issue history:', error);
    } finally {
      setLoading(false);
    }
  };


  const filteredHistory = history.filter(h => {
    const matchesSearch = h.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.issued_to?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstate = selectedEstateFilter === 'all' || h.estate_id === selectedEstateFilter;

    return matchesSearch && matchesEstate;
  });

  const stats = {
    totalIssuance: history.length,
    recentIssuance: history.filter(h => new Date(h.issued_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length,
    majorRecipients: new Set(history.map(h => h.issued_to)).size
  };

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredHistory.slice(indexOfFirstEntry, indexOfLastEntry);

  const columns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (log) => (
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">{new Date(log.issued_at).toLocaleDateString()}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(log.issued_at).toLocaleTimeString()}</p>
        </div>
      )
    },
    {
      header: "Item Name",
      cell: (log) => (
        <div>
          <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{log.item_name}</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{log.sku}</p>
        </div>
      )
    },
    {
      header: "Issued To",
      cell: (log) => (
        <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800/30 font-black text-[10px] uppercase tracking-tight">
          {log.issued_to}
        </span>
      )
    },
    {
      header: "Assigned Sector",
      cell: (log) => (
        <span className="inline-flex items-center px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/30 font-black text-[10px] uppercase tracking-tight">
          {log.department || '—'}
        </span>
      )
    },
    {
      header: "Quantity",
      headerClassName: "text-center",
      cellClassName: "text-center",
      cell: (log) => (
        <div className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-900 dark:text-white uppercase">
          {log.quantity} <span className="text-[10px] text-slate-400 font-bold opacity-70 italic lowercase">/{log.unit}</span>
        </div>
      )
    },
    {
      header: "Notes",
      cell: (log) => (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic font-medium max-w-sm">{log.notes || '—'}</p>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit">History</h1>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <RefreshCcw size={22} className="text-blue-500 dark:text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Issues</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.totalIssuance}</p>
          </div>
        </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <TrendingUp size={22} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Recent Issues</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.recentIssuance}</p>
          </div>
        </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0">
            <Building2 size={22} className="text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unique Recipients</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.majorRecipients}</p>
          </div>
        </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                type="text" 
                placeholder="Search SKU, item, or sector..."
                className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                value={searchTerm}
                onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
              />
            </div>
            
            {isUserAdmin ? (
              <select
                value={selectedEstateFilter}
                onChange={(e) => { setSelectedEstateFilter(e.target.value); setCurrentPage(1); }}
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all min-w-[200px]"
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
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none transition-all min-w-[200px] opacity-70 cursor-not-allowed"
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
          emptyMessage="No records found"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredHistory.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: (size) => {
              setEntriesPerPage(size);
              setCurrentPage(1);
            },
          }}
        />
      </Card>
    </div>
  );
}
