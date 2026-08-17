import { useState, useEffect, useCallback } from 'react';
import {
  FileText, FileSpreadsheet, Download, Package, Wrench,
  RefreshCcw, Coffee, Search,
  TrendingUp, AlertCircle, Layers, Box, BarChart3, Loader2,
  Calendar, Building2, Filter, X, ChevronDown, FileIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
type ReportKey = 'goods' | 'physical' | 'issues' | 'tea';

interface ReportTab {
  key: ReportKey;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

const REPORT_TABS: ReportTab[] = [
  { key: 'goods',    label: 'Goods Inventory',  icon: Package,    color: 'text-blue-600',    bgColor: 'bg-blue-50 dark:bg-blue-900/20',    borderColor: 'border-blue-200 dark:border-blue-800',    dotColor: 'bg-blue-500' },
  { key: 'physical', label: 'Physical Assets',  icon: Wrench,     color: 'text-violet-600',  bgColor: 'bg-violet-50 dark:bg-violet-900/20', borderColor: 'border-violet-200 dark:border-violet-800', dotColor: 'bg-violet-500' },
  { key: 'issues',   label: 'Issue History',    icon: RefreshCcw, color: 'text-amber-600',   bgColor: 'bg-amber-50 dark:bg-amber-900/20',   borderColor: 'border-amber-200 dark:border-amber-800',   dotColor: 'bg-amber-500' },
  { key: 'tea',      label: 'Tea Packets',      icon: Coffee,     color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-200 dark:border-emerald-800', dotColor: 'bg-emerald-500' },
];

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '').replace(/"/g, '""');
        return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val;
      }).join(',')
    )
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportExcelFile(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
}

function exportPDFFile(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const isLandscape = headers.length > 6;
  const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 16);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${new Date().toLocaleString()}  |  Records: ${rows.length}`, 14, 23);
  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [4, 120, 87], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { cellPadding: 3 },
  });
  doc.save(filename);
}

function dateStamp() { return new Date().toISOString().split('T')[0]; }

// ──────────────────────────────────────────────────────────────
// Skeleton row
// ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function InventoryReportsPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [activeTab, setActiveTab] = useState<ReportKey>('goods');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estateFilter, setEstateFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  // ── Fetch estates ─────────────────────────────────────────
  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data: d }) => {
      if (d) setEstates(d);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  // ── Fetch report data ─────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setData([]);
    try {
      if (activeTab === 'goods') {
        const { data: rows } = await supabase
          .from('inventory_goods')
          .select('*, suppliers(supplier_name)')
          .order('created_at', { ascending: false });
        setData(rows ?? []);
      } else if (activeTab === 'physical') {
        const { data: rows } = await supabase
          .from('physical_assets')
          .select('*')
          .order('created_at', { ascending: false });
        setData(rows ?? []);
      } else if (activeTab === 'issues') {
        const { data: rows } = await supabase
          .from('issued_goods')
          .select('*, inventory_goods(item_name, sku, unit)')
          .order('created_at', { ascending: false });
        const flattened = (rows ?? []).map((d: any) => ({
          ...d,
          item_name: d.inventory_goods?.item_name ?? 'Unknown',
          sku: d.inventory_goods?.sku ?? '—',
          unit: d.inventory_goods?.unit ?? '',
          issued_at: d.created_at,
        }));
        setData(flattened);
      } else if (activeTab === 'tea') {
        const { data: rows } = await supabase
          .from('tea_packets_inventory')
          .select('*')
          .order('created_at', { ascending: false });
        setData(rows ?? []);
      }
    } catch (err) {
      console.error('Report fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
    setSearchTerm('');
    setCategoryFilter('all');
    setDateFrom('');
    setDateTo('');
  }, [fetchData]);

  // ── Filtering ─────────────────────────────────────────────
  const filtered = data.filter(row => {
    const matchEstate = estateFilter === 'all' || row.estate_id === estateFilter;
    const searchLow = searchTerm.toLowerCase();
    let matchSearch = true;
    if (searchTerm) {
      if (activeTab === 'goods') matchSearch = row.item_name?.toLowerCase().includes(searchLow) || row.sku?.toLowerCase().includes(searchLow);
      else if (activeTab === 'physical') matchSearch = row.asset_name?.toLowerCase().includes(searchLow) || row.serial_number?.toLowerCase().includes(searchLow);
      else if (activeTab === 'issues') matchSearch = row.item_name?.toLowerCase().includes(searchLow) || row.issued_to?.toLowerCase().includes(searchLow);
      else if (activeTab === 'tea') matchSearch = row.grade?.toLowerCase().includes(searchLow);
    }
    let matchCategory = true;
    if (categoryFilter !== 'all') {
      if (activeTab === 'goods') matchCategory = row.category === categoryFilter;
      if (activeTab === 'physical') matchCategory = row.asset_type === categoryFilter;
      if (activeTab === 'tea') matchCategory = row.grade === categoryFilter;
    }
    let matchDate = true;
    const rowDate = new Date(activeTab === 'issues' ? row.issued_at : row.created_at);
    if (dateFrom) matchDate = matchDate && rowDate >= new Date(dateFrom);
    if (dateTo) matchDate = matchDate && rowDate <= new Date(dateTo + 'T23:59:59');
    return matchEstate && matchSearch && matchCategory && matchDate;
  });

  // ── Category options per tab ──────────────────────────────
  const categoryOptions: string[] = (() => {
    if (activeTab === 'goods') return [...new Set(data.map(r => r.category))].filter(Boolean) as string[];
    if (activeTab === 'physical') return [...new Set(data.map(r => r.asset_type))].filter(Boolean) as string[];
    if (activeTab === 'tea') return [...new Set(data.map(r => r.grade))].filter(Boolean) as string[];
    return [];
  })();

  // ── Stats ─────────────────────────────────────────────────
  const stats = (() => {
    if (activeTab === 'goods') {
      const totalValue = filtered.reduce((s: number, r: any) => s + Number(r.quantity) * Number(r.unit_price), 0);
      const lowStock = filtered.filter((r: any) => Number(r.quantity) <= Number(r.min_stock_level)).length;
      return [
        { label: 'Total Items', value: filtered.length, icon: Box, color: 'text-blue-500' },
        { label: 'Total Value', value: `LKR ${(totalValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Low Stock', value: lowStock, icon: AlertCircle, color: 'text-amber-500' },
        { label: 'Categories', value: new Set(filtered.map((r: any) => r.category)).size, icon: Layers, color: 'text-sky-500' },
      ];
    }
    if (activeTab === 'physical') {
      const totalValue = filtered.reduce((s: number, r: any) => s + Number(r.value ?? 0), 0);
      const operational = filtered.filter((r: any) => r.maintenance_status === 'operational').length;
      return [
        { label: 'Total Assets', value: filtered.length, icon: Box, color: 'text-violet-500' },
        { label: 'Total Value', value: `LKR ${(totalValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-emerald-500' },
        { label: 'Operational', value: operational, icon: AlertCircle, color: 'text-sky-500' },
        { label: 'Asset Types', value: new Set(filtered.map((r: any) => r.asset_type)).size, icon: Layers, color: 'text-amber-500' },
      ];
    }
    if (activeTab === 'issues') {
      const uniqueItems = new Set(filtered.map((r: any) => r.item_name)).size;
      const recentCount = filtered.filter((r: any) => new Date(r.issued_at) > new Date(Date.now() - 7 * 86400000)).length;
      return [
        { label: 'Total Issues', value: filtered.length, icon: RefreshCcw, color: 'text-amber-500' },
        { label: 'Unique Items', value: uniqueItems, icon: Box, color: 'text-blue-500' },
        { label: 'Last 7 Days', value: recentCount, icon: Calendar, color: 'text-emerald-500' },
        { label: 'Recipients', value: new Set(filtered.map((r: any) => r.issued_to)).size, icon: Building2, color: 'text-violet-500' },
      ];
    }
    // tea
    const totalQty = filtered.reduce((s: number, r: any) => s + Number(r.quantity ?? 0), 0);
    const totalValue = filtered.reduce((s: number, r: any) => s + Number(r.quantity ?? 0) * Number(r.unit_price ?? 0), 0);
    return [
      { label: 'SKUs', value: filtered.length, icon: Coffee, color: 'text-emerald-500' },
      { label: 'Total Packets', value: totalQty.toLocaleString(), icon: Box, color: 'text-sky-500' },
      { label: 'Total Value', value: `LKR ${(totalValue / 1000).toFixed(1)}K`, icon: TrendingUp, color: 'text-blue-500' },
      { label: 'Grades', value: new Set(filtered.map((r: any) => r.grade)).size, icon: Layers, color: 'text-amber-500' },
    ];
  })();

  // ── Export row mappers ────────────────────────────────────
  const toExportRows = (): Record<string, unknown>[] => {
    if (activeTab === 'goods') return filtered.map((r: any) => ({
      'Item Name': r.item_name, 'SKU': r.sku, 'Category': r.category,
      'Location': r.location, 'Quantity': `${r.quantity} ${r.unit}`,
      'Unit Price (LKR)': r.unit_price,
      'Stock Value (LKR)': (Number(r.quantity) * Number(r.unit_price)).toFixed(2),
      'Min Stock': r.min_stock_level,
      'Supplier': (r.suppliers as any)?.supplier_name ?? '—',
    }));
    if (activeTab === 'physical') return filtered.map((r: any) => ({
      'Asset Name': r.asset_name, 'Type': r.asset_type, 'Serial No.': r.serial_number ?? '—',
      'Location': r.location, 'Condition': r.asset_condition,
      'Status': r.maintenance_status, 'Value (LKR)': r.value,
      'Purchase Date': r.purchase_date_fmt ?? '—',
    }));
    if (activeTab === 'issues') return filtered.map((r: any) => ({
      'Date': new Date(r.issued_at).toLocaleString(), 'Item Name': r.item_name, 'SKU': r.sku,
      'Quantity': `${r.quantity} ${r.unit}`, 'Issued To': r.issued_to,
      'Sector': r.department ?? '—', 'Notes': r.notes ?? '—',
    }));
    return filtered.map((r: any) => ({
      'Grade': r.grade, 'Size (g)': r.size_grams, 'Quantity': r.quantity,
      'Unit Price (LKR)': r.unit_price,
      'Total Value (LKR)': (Number(r.quantity) * Number(r.unit_price)).toFixed(2),
    }));
  };

  const reportTitle = activeTab === 'goods' ? 'Goods Inventory Report'
    : activeTab === 'physical' ? 'Physical Assets Report'
    : activeTab === 'issues' ? 'Issue History Report'
    : 'Tea Packets Inventory Report';

  const baseFilename = reportTitle.replace(/\s+/g, '_') + '_' + dateStamp();

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    setExporting(type);
    await new Promise(r => setTimeout(r, 50));
    try {
      const rows = toExportRows();
      if (!rows.length) return;
      if (type === 'csv') exportCSV(rows, `${baseFilename}.csv`);
      else if (type === 'excel') exportExcelFile(rows, `${baseFilename}.xlsx`);
      else if (type === 'pdf') {
        const headers = Object.keys(rows[0]);
        const pdfRows = rows.map(r => headers.map(h => String(r[h] ?? '')));
        exportPDFFile(reportTitle, headers, pdfRows, `${baseFilename}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  };

  // ── Table column definitions ──────────────────────────────
  const tableConfig = (() => {
    if (activeTab === 'goods') return {
      headers: ['Item / SKU', 'Category', 'Location', 'Stock', 'Unit Price', 'Stock Value'],
      row: (r: any) => [
        <div key="name"><p className="text-xs font-black text-slate-900 dark:text-white uppercase truncate max-w-[140px]">{r.item_name}</p><p className="text-[9px] font-black text-blue-500 mt-0.5 uppercase tracking-widest">{r.sku}</p></div>,
        <span key="cat" className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">{r.category}</span>,
        <span key="loc" className="text-xs text-slate-500 font-bold">{r.location}</span>,
        <div key="stock" className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${Number(r.quantity) <= Number(r.min_stock_level) ? 'bg-amber-500' : 'bg-emerald-500'}`} /><span className="text-xs font-black text-slate-900 dark:text-white uppercase">{r.quantity} {r.unit}</span></div>,
        <span key="price" className="text-xs font-black text-slate-900 dark:text-white">LKR {Number(r.unit_price).toLocaleString()}</span>,
        <span key="val" className="text-xs font-black text-emerald-600">LKR {(Number(r.quantity) * Number(r.unit_price)).toLocaleString()}</span>,
      ],
    };
    if (activeTab === 'physical') return {
      headers: ['Asset Name', 'Type', 'Serial No.', 'Location', 'Condition', 'Status', 'Value'],
      row: (r: any) => [
        <span key="name" className="text-xs font-black text-slate-900 dark:text-white">{r.asset_name}</span>,
        <span key="type" className="text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md">{r.asset_type}</span>,
        <span key="sn" className="font-mono text-[10px] text-slate-500 font-bold">{r.serial_number ?? '—'}</span>,
        <span key="loc" className="text-xs text-slate-500 font-bold">{r.location}</span>,
        <span key="cond" className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${r.asset_condition === 'good' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700' : r.asset_condition === 'poor' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700'}`}>{r.asset_condition}</span>,
        <span key="status" className="text-[10px] font-bold text-slate-500 uppercase">{r.maintenance_status?.replace('_', ' ')}</span>,
        <span key="val" className="text-xs font-black text-violet-600">LKR {Number(r.value ?? 0).toLocaleString()}</span>,
      ],
    };
    if (activeTab === 'issues') return {
      headers: ['Date', 'Item', 'SKU', 'Qty', 'Issued To', 'Sector', 'Notes'],
      row: (r: any) => [
        <div key="date"><p className="text-xs font-black text-slate-900 dark:text-white">{new Date(r.issued_at).toLocaleDateString()}</p><p className="text-[9px] text-slate-400 font-bold">{new Date(r.issued_at).toLocaleTimeString()}</p></div>,
        <span key="name" className="text-xs font-black text-slate-900 dark:text-white">{r.item_name}</span>,
        <span key="sku" className="text-[10px] font-black text-blue-500 uppercase">{r.sku}</span>,
        <span key="qty" className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.quantity} {r.unit}</span>,
        <span key="to" className="inline-flex px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black">{r.issued_to}</span>,
        <span key="dept" className="inline-flex px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-black">{r.department ?? '—'}</span>,
        <span key="notes" className="text-[11px] text-slate-400 italic truncate max-w-[100px] block">{r.notes ?? '—'}</span>,
      ],
    };
    return {
      headers: ['Grade', 'Size (g)', 'Quantity', 'Unit Price', 'Total Value'],
      row: (r: any) => [
        <span key="grade" className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">{r.grade}</span>,
        <span key="size" className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.size_grams}g</span>,
        <span key="qty" className="text-xs font-black text-slate-900 dark:text-white">{Number(r.quantity ?? 0).toLocaleString()}</span>,
        <span key="price" className="text-xs font-black text-slate-900 dark:text-white">LKR {Number(r.unit_price ?? 0).toLocaleString()}</span>,
        <span key="val" className="text-xs font-black text-emerald-600">LKR {(Number(r.quantity) * Number(r.unit_price)).toLocaleString()}</span>,
      ],
    };
  })();

  const activeTabDef = REPORT_TABS.find(t => t.key === activeTab)!;
  const hasActiveFilter = searchTerm || (isUserAdmin && estateFilter !== 'all') || categoryFilter !== 'all' || dateFrom || dateTo;

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">
            Inventory Reports
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Export PDF · Excel · CSV
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              id="export-options-btn"
              disabled={!!exporting || loading || filtered.length === 0}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-9 px-4"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Options
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                id="export-csv-item"
                onClick={() => handleExport('csv')}
                className="text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <FileText size={14} /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                id="export-pdf-item"
                onClick={() => handleExport('pdf')}
                className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700"
              >
                <FileIcon size={14} /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                id="export-excel-item"
                onClick={() => handleExport('excel')}
                className="text-xs font-bold flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-700"
              >
                <FileSpreadsheet size={14} /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Report Type Dropdown ──────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Report Type</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="report-type-dropdown"
            className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-9 px-4 min-w-[210px]"
          >
            <span className="flex items-center gap-2">
              {(() => { const t = REPORT_TABS.find(t => t.key === activeTab)!; const Icon = t.icon; return <><Icon size={14} className={t.color} /><span>{t.label}</span></>; })()}
            </span>
            <span className="flex items-center gap-2 ml-2">
              {!loading && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filtered.length} records</span>}
              {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
              <ChevronDown size={14} className="text-slate-400" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {REPORT_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <DropdownMenuItem
                  key={tab.key}
                  id={`report-tab-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={`text-xs font-bold flex items-center gap-2 cursor-pointer ${isActive ? `${tab.color} font-black` : ''}`}
                >
                  <Icon size={14} className={isActive ? tab.color : 'text-slate-400'} />
                  {tab.label}
                  {isActive && <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest ${tab.color}`}>{loading ? '…' : filtered.length}</span>}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Stats Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl shrink-0">
                <Icon size={18} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{s.label}</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
                  {loading ? <span className="block w-12 h-5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" /> : s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters + Table ──────────────────────────────── */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
            <Filter size={12} /> Filters
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              id="report-search"
              placeholder="Search records…"
              className="pl-8 h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Estate filter (admin only) */}
          {isUserAdmin && (
            <select
              id="report-estate-filter"
              value={estateFilter}
              onChange={e => setEstateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none min-w-[150px]"
            >
              <option value="all">All Estates</option>
              {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          )}

          {/* Category / Grade filter */}
          {categoryOptions.length > 0 && (
            <select
              id="report-category-filter"
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none min-w-[140px]"
            >
              <option value="all">All {activeTab === 'tea' ? 'Grades' : 'Categories'}</option>
              {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
              <Calendar size={12} />
            </div>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            />
            <span className="text-slate-400 text-xs font-bold">–</span>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            />
          </div>

          {/* Clear */}
          {hasActiveFilter && (
            <Button
              id="report-clear-filters"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 gap-1 text-[10px] font-black uppercase tracking-widest shrink-0"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setDateFrom('');
                setDateTo('');
                if (isUserAdmin) setEstateFilter('all');
              }}
            >
              <X size={12} /> Clear
            </Button>
          )}
        </div>

        {/* Preview Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
                {tableConfig.headers.map(h => (
                  <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonRow key={i} cols={tableConfig.headers.length} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={tableConfig.headers.length} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                        <BarChart3 size={28} className="text-slate-400" />
                      </div>
                      <p className="text-sm font-black text-slate-400 uppercase tracking-wide">No records found</p>
                      <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((row: any, idx: number) => (
                  <tr
                    key={row.id ?? idx}
                    className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {tableConfig.row(row).map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50/40 dark:bg-slate-900/30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Preview: {Math.min(50, filtered.length)} of {filtered.length} shown &nbsp;·&nbsp; All {filtered.length} records exported
            </p>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTabDef.bgColor} ${activeTabDef.color} border ${activeTabDef.borderColor}`}>
              <activeTabDef.icon size={11} />
              {activeTabDef.label}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
