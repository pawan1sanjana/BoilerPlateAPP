import { useState, useEffect } from 'react';
import { 
  FileText, Search, Calendar, Filter, Download, ChevronDown, FileSpreadsheet, FileIcon, Leaf, Box, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportTab = 'physical' | 'biological';

export default function AssetAuditReportsPage() {
  const { profile } = useAuthStore();
  const isUserAdmin = profile?.role === 'admin' || profile?.role === 'estate_manager';

  const [activeTab, setActiveTab] = useState<ReportTab>('physical');
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estates, setEstates] = useState<any[]>([]);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedEstate, setSelectedEstate] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEstates();
  }, []);

  // Re-fetch when major filters or activeTab change
  useEffect(() => {
    fetchAudits();
    setPage(1);
  }, [dateFrom, dateTo, selectedEstate, conditionFilter, activeTab]);

  const fetchEstates = async () => {
    try {
      const { data } = await supabase.from('estates').select('id, name').eq('status', 'active');
      if (data) setEstates(data);
    } catch (err) {
      console.error('Failed to load estates:', err);
    }
  };

  const fetchAudits = async () => {
    try {
      setLoading(true);
      let query = supabase.from('asset_audits')
        .select('*')
        .eq('asset_type', activeTab)
        .order('audit_date', { ascending: false });

      if (dateFrom) query = query.gte('audit_date', `${dateFrom}T00:00:00`);
      if (dateTo) query = query.lte('audit_date', `${dateTo}T23:59:59`);
      if (selectedEstate !== 'all') query = query.eq('estate_id', selectedEstate);
      if (conditionFilter !== 'all') query = query.eq('condition_status', conditionFilter);

      const { data, error } = await query;
      
      if (error) throw error;

      if (data && data.length > 0) {
        const assetIds = [...new Set(data.map((a: any) => a.asset_id).filter(Boolean))];
        let assetsMap: Record<string, any> = {};
        
        if (assetIds.length > 0) {
          if (activeTab === 'physical') {
            const { data: assetsData } = await supabase.from('physical_assets').select('id, asset_name, serial_number, category').in('id', assetIds);
            if (assetsData) assetsData.forEach((a: any) => assetsMap[a.id] = a);
          } else {
            const { data: assetsData } = await supabase
              .from('biological_assets')
              .select('id, tree_species, height_ft, girth_in, height_category, girth_category, census_date, estates(name)')
              .in('id', assetIds);
            if (assetsData) assetsData.forEach((a: any) => { assetsMap[a.id] = a; });
          }
        }

        // Fetch users
        const userIds = [...new Set(data.map((a: any) => a.audited_by).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('id, name').in('id', userIds);
          if (usersData) usersData.forEach((u: any) => usersMap[u.id] = u);
        }

        // Map data
        const mappedData = data.map((audit: any) => {
          let estateName = estates.find((e: any) => e.id === audit.estate_id)?.name || 'Unknown';
          if (activeTab === 'biological' && !estateName) {
            estateName = (assetsMap[audit.asset_id]?.estates as any)?.name || 'Unknown';
          }
          return {
            ...audit,
            asset: assetsMap[audit.asset_id] || {},
            auditor_name: usersMap[audit.audited_by]?.name || 'System',
            estate_name: estateName
          };
        });
        
        setAudits(mappedData);
      } else {
        setAudits([]);
      }
    } catch (err: any) {
      console.error('Failed to load audit report:', err);
      toast.error('Failed to load audit report');
    } finally {
      setLoading(false);
    }
  };

  const filteredAudits = audits.filter((a: any) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    if (activeTab === 'physical') {
      return (
        (a.asset?.asset_name?.toLowerCase().includes(s)) ||
        (a.asset?.serial_number?.toLowerCase().includes(s)) ||
        (a.auditor_name?.toLowerCase().includes(s)) ||
        (a.notes?.toLowerCase().includes(s))
      );
    } else {
      return (
        (a.asset?.tree_species?.toLowerCase().includes(s)) ||
        (a.auditor_name?.toLowerCase().includes(s)) ||
        (a.estate_name?.toLowerCase().includes(s)) ||
        (a.notes?.toLowerCase().includes(s))
      );
    }
  });

  const getExportRows = () => {
    if (activeTab === 'physical') {
      return filteredAudits.map((a: any) => [
        new Date(a.audit_date).toLocaleDateString(),
        a.asset?.asset_name || '',
        a.asset?.serial_number || '',
        a.asset?.category || '',
        a.condition_status,
        a.auditor_name,
        a.estate_name,
        a.notes || ''
      ]);
    } else {
      return filteredAudits.map((a: any) => [
        new Date(a.audit_date).toLocaleDateString(),
        a.asset?.tree_species || '',
        a.asset?.height_ft || '',
        a.asset?.girth_in || '',
        a.asset?.height_category || '',
        a.asset?.girth_category || '',
        a.condition_status?.replace(/_/g, ' '),
        a.auditor_name,
        a.estate_name,
        a.notes || ''
      ]);
    }
  };

  const getExportHeaders = () => {
    if (activeTab === 'physical') {
      return ['Audit Date', 'Asset Name', 'Serial Number', 'Category', 'Condition', 'Auditor', 'Estate', 'Notes'];
    } else {
      return ['Audit Date', 'Species', 'Height (ft)', 'Girth (in)', 'Height Grade', 'Girth Grade', 'Health Status', 'Auditor', 'Estate', 'Notes'];
    }
  };

  const handleExportCSV = () => {
    if (filteredAudits.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = getExportHeaders();
    const rows = getExportRows().map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`));
    
    const csvContent = [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_asset_audit_report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredAudits.length === 0) {
      toast.error('No data to export');
      return;
    }
    
    const doc = new jsPDF(activeTab === 'biological' ? 'landscape' : 'portrait');
    doc.text(`${activeTab === 'physical' ? 'Physical' : 'Biological'} Asset Audit Report`, 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const headers = getExportHeaders();
    let rows = getExportRows();
    
    if (activeTab === 'biological') {
      rows = filteredAudits.map((a: any) => [
        new Date(a.audit_date).toLocaleDateString(),
        a.asset?.tree_species || '',
        a.asset?.height_ft ? `${a.asset.height_ft} ft (${a.asset.height_category})` : '',
        a.asset?.girth_in ? `${a.asset.girth_in} in (${a.asset.girth_category})` : '',
        a.condition_status?.replace(/_/g, ' '),
        a.auditor_name,
        a.estate_name,
        a.notes || '',
      ]);
      const bioHeaders = ['Date', 'Species', 'Height', 'Girth', 'Health Status', 'Auditor', 'Estate', 'Notes'];
      autoTable(doc, {
        head: [bioHeaders],
        body: rows,
        startY: 28,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [16, 185, 129] }
      });
    } else {
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }

    doc.save(`${activeTab}_asset_audit_report_${new Date().getTime()}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredAudits.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = getExportHeaders();
    const rows = getExportRows();

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit Report');
    XLSX.writeFile(workbook, `${activeTab}_asset_audit_report_${new Date().getTime()}.xlsx`);
  };

  const physicalColumns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (log: any) => (
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
          {new Date(log.audit_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Asset",
      cell: (log: any) => (
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{log.asset?.asset_name || 'Unknown Asset'}</p>
          <p className="text-[10px] text-slate-500 font-medium">SN: {log.asset?.serial_number || 'N/A'}</p>
        </div>
      )
    },
    {
      header: "Condition",
      cell: (log: any) => {
        let color = "text-slate-500";
        if (log.condition_status === 'excellent' || log.condition_status === 'good') color = "text-emerald-600 dark:text-emerald-400";
        if (log.condition_status === 'poor' || log.condition_status === 'missing') color = "text-red-600 dark:text-red-400";
        
        return (
          <span className={`text-[10px] font-black uppercase tracking-wider ${color}`}>
            {log.condition_status}
          </span>
        );
      }
    },
    {
      header: "Auditor",
      cell: (log: any) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.auditor_name}</span>
    },
    {
      header: "Estate",
      cell: (log: any) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.estate_name}</span>
    },
    {
      header: "Notes",
      cell: (log: any) => <p className="text-[11px] text-slate-500 line-clamp-2 max-w-[200px]" title={log.notes}>{log.notes || '—'}</p>
    }
  ];

  const biologicalColumns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (log: any) => (
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
          {new Date(log.audit_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Species",
      cell: (log: any) => (
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">{log.asset?.tree_species || 'Unknown'}</p>
          <p className="text-[10px] text-slate-500 font-medium">{log.estate_name}</p>
        </div>
      )
    },
    {
      header: "Measurements",
      cell: (log: any) => (
        <div className="space-y-0.5">
          {log.asset?.height_ft && (
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              H: {log.asset.height_ft} ft <span className="text-slate-400 font-medium">({log.asset.height_category})</span>
            </p>
          )}
          {log.asset?.girth_in && (
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              G: {log.asset.girth_in} in <span className="text-slate-400 font-medium">({log.asset.girth_category})</span>
            </p>
          )}
          {!log.asset?.height_ft && !log.asset?.girth_in && (
            <span className="text-slate-400 text-[11px]">—</span>
          )}
        </div>
      )
    },
    {
      header: "Health Status",
      cell: (log: any) => {
        let color = "text-slate-500 bg-slate-100 dark:bg-slate-800";
        if (log.condition_status === 'healthy') color = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
        if (log.condition_status === 'recovering') color = "text-sky-600 bg-sky-50 dark:bg-sky-900/20";
        if (['diseased', 'pest_infested', 'damaged', 'dead'].includes(log.condition_status)) color = "text-red-600 bg-red-50 dark:bg-red-900/20";
        return (
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${color}`}>
            {log.condition_status?.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      header: "Auditor",
      cell: (log: any) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.auditor_name}</span>
    },
    {
      header: "Notes",
      cell: (log: any) => <p className="text-[11px] text-slate-500 line-clamp-2 max-w-[200px]" title={log.notes}>{log.notes || '—'}</p>
    }
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">
            Assets Audit Reports
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Export PDF · Excel · CSV
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-9 px-4">
              <Download size={14} /> Export Options <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportCSV} className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <FileText size={14} /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700">
                <FileIcon size={14} /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-700">
                <FileSpreadsheet size={14} /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Report Type Dropdown ── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Report Type</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-9 px-4 min-w-[210px]"
          >
            <span className="flex items-center gap-2">
              {activeTab === 'physical' ? <Box size={14} className="text-blue-500" /> : <Leaf size={14} className="text-emerald-500" />}
              <span>{activeTab === 'physical' ? 'Physical Asset Audits' : 'Biological Asset Audits'}</span>
            </span>
            <span className="flex items-center gap-2 ml-2">
              {!loading && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filteredAudits.length} records</span>}
              {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
              <ChevronDown size={14} className="text-slate-400" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem
              onClick={() => setActiveTab('physical')}
              className={`text-xs font-bold flex items-center gap-2 cursor-pointer ${activeTab === 'physical' ? 'text-blue-600 font-black' : ''}`}
            >
              <Box size={14} className={activeTab === 'physical' ? 'text-blue-600' : 'text-slate-400'} />
              Physical Asset Audits
              {activeTab === 'physical' && <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-blue-600">{loading ? '…' : filteredAudits.length}</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setActiveTab('biological')}
              className={`text-xs font-bold flex items-center gap-2 cursor-pointer ${activeTab === 'biological' ? 'text-emerald-600 font-black' : ''}`}
            >
              <Leaf size={14} className={activeTab === 'biological' ? 'text-emerald-600' : 'text-slate-400'} />
              Biological Asset Audits
              {activeTab === 'biological' && <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-emerald-600">{loading ? '…' : filteredAudits.length}</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Smart Filters Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-4 items-center">
          
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input 
              placeholder={activeTab === 'physical' ? "Search by asset, SN, or auditor..." : "Search by species, estate, or auditor..."}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-9 h-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-xl text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 h-10">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date" 
              value={dateFrom}
              onChange={(e: any) => setDateFrom(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-medium text-slate-700 dark:text-slate-300 w-[110px]"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input 
              type="date" 
              value={dateTo}
              onChange={(e: any) => setDateTo(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-medium text-slate-700 dark:text-slate-300 w-[110px]"
            />
          </div>

          {isUserAdmin && (
            <select 
              value={selectedEstate}
              onChange={(e) => setSelectedEstate(e.target.value)}
              className={`h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-${activeTab === 'physical' ? 'blue' : 'emerald'}-500 outline-none min-w-[140px]`}
            >
              <option value="all">All Estates</option>
              {estates.map((e: any) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          )}

          <select 
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className={`h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:border-${activeTab === 'physical' ? 'blue' : 'emerald'}-500 outline-none min-w-[140px]`}
          >
            <option value="all">{activeTab === 'physical' ? 'All Conditions' : 'All Health Status'}</option>
            {activeTab === 'physical' ? (
              <>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="missing">Missing</option>
              </>
            ) : (
              <>
                <option value="healthy">Healthy</option>
                <option value="recovering">Recovering</option>
                <option value="diseased">Diseased</option>
                <option value="pest_infested">Pest Infested</option>
                <option value="damaged">Damaged</option>
                <option value="dead">Dead / Felled</option>
              </>
            )}
          </select>
          
          <Button onClick={fetchAudits} className={`h-10 px-4 ${activeTab === 'physical' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl text-xs font-bold flex items-center gap-2`}>
            <Filter size={14} /> Apply
          </Button>

        </div>
        
        <div className="p-0">
          <DataTable
            columns={activeTab === 'physical' ? physicalColumns : biologicalColumns}
            data={filteredAudits}
            loading={loading}
            emptyMessage={`No ${activeTab} asset audit records found matching your filters.`}
            pagination={{
              page,
              pageSize,
              totalCount: filteredAudits.length,
              onPageChange: setPage,
              onPageSizeChange: setPageSize
            }}
          />
        </div>
      </Card>
    </div>
  );
}
