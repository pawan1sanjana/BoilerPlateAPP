import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Search, Download, Filter, FileText,
  CheckCircle2, XCircle, Clock, User, Loader2, BarChart3,
  FileSpreadsheet, FileIcon, ChevronDown, X, TrendingUp,
  Users, AlertCircle, Fingerprint, QrCode, Pen, RefreshCcw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import {
  addPdfHeader,
  addPdfFootersToAllPages,
  buildCsvWithHeader,
  downloadCsv,
  downloadExcel,
  dateSuffix,
  autoTable,
} from '@/lib/exportUtils';
import jsPDF from 'jspdf';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth } from 'date-fns';

// ─────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────
type ReportKey = 'daily' | 'monthly' | 'worker';

interface ReportTab {
  key: ReportKey;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface AttendanceRecord {
  id: string;
  worker_id: string;
  first_name: string;
  last_name: string;
  photo?: string;
  status: 'present' | 'absent';
  check_in: string | null;
  check_out: string | null;
  auth_method: string | null;
  date: string;
  estate_id?: string;
}

interface MonthlyRecord {
  worker_id: string;
  first_name: string;
  last_name: string;
  photo?: string;
  present_days: number;
  absent_days: number;
  total_days: number;
  attendance_pct: number;
  estate_id?: string;
}

const REPORT_TABS: ReportTab[] = [
  {
    key: 'daily',
    label: 'Daily Attendance',
    icon: Calendar,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  {
    key: 'monthly',
    label: 'Monthly Summary',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  {
    key: 'worker',
    label: 'Worker History',
    icon: User,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
  },
];

// ─────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────
function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m, 10));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function methodIcon(method: string | null) {
  if (method === 'face') return <Fingerprint size={12} className="text-blue-500" />;
  if (method === 'qr') return <QrCode size={12} className="text-violet-500" />;
  if (method === 'manual') return <Pen size={12} className="text-amber-500" />;
  return null;
}

function StatusBadge({ status }: { status: 'present' | 'absent' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
        status === 'present'
          ? 'bg-emerald-500/10 text-emerald-600'
          : 'bg-rose-500/10 text-rose-600'
      }`}
    >
      {status === 'present' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      {status}
    </span>
  );
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full" style={{ width: `${55 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

function EmptyState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <BarChart3 size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-black text-slate-400 uppercase tracking-wide">No records found</p>
          <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Try adjusting your filters</p>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────
// Sub-table components
// ─────────────────────────────────────────────────
function DailyTable({ data, loading }: { data: AttendanceRecord[]; loading: boolean }) {
  const COLS = 6;
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
          {['Worker', 'Date', 'Status', 'Check-In', 'Check-Out', 'Method'].map(h => (
            <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={COLS} />)
        ) : data.length === 0 ? (
          <EmptyState colSpan={COLS} />
        ) : (
          data.slice(0, 100).map(r => (
            <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                    {r.photo ? <img src={r.photo} className="w-full h-full object-cover" alt="" /> : <User size={14} className="text-slate-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900 dark:text-white">{r.first_name} {r.last_name}</p>
                    <p className="text-[9px] font-mono text-slate-400">{r.worker_id}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-xs font-bold text-slate-500 whitespace-nowrap">{r.date}</td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                {r.check_in
                  ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock size={12} className="text-slate-400" />{r.check_in}</span>
                  : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
              <td className="px-4 py-3">
                {r.check_out
                  ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock size={12} className="text-slate-400" />{r.check_out}</span>
                  : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
              <td className="px-4 py-3">
                {r.auth_method ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    {methodIcon(r.auth_method)}{r.auth_method}
                  </span>
                ) : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function MonthlyTable({ data, loading }: { data: MonthlyRecord[]; loading: boolean }) {
  const COLS = 6;
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
          {['Worker', 'Present Days', 'Absent Days', 'Total Days', 'Attendance', 'Progress'].map(h => (
            <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={COLS} />)
        ) : data.length === 0 ? (
          <EmptyState colSpan={COLS} />
        ) : (
          data.slice(0, 100).map(r => {
            const pct = r.attendance_pct;
            const barColor = pct >= 90 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-500';
            return (
              <tr key={r.worker_id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                      {r.photo ? <img src={r.photo} className="w-full h-full object-cover" alt="" /> : <User size={14} className="text-slate-400" />}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 dark:text-white">{r.first_name} {r.last_name}</p>
                      <p className="text-[9px] font-mono text-slate-400">{r.worker_id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><span className="text-sm font-black text-emerald-600">{r.present_days}</span></td>
                <td className="px-4 py-3"><span className="text-sm font-black text-rose-500">{r.absent_days}</span></td>
                <td className="px-4 py-3"><span className="text-sm font-bold text-slate-500">{r.total_days}</span></td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-black ${pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-500' : 'text-rose-500'}`}>
                    {pct}%
                  </span>
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                    <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function WorkerHistoryTable({ data, loading, noWorkerSelected }: { data: AttendanceRecord[]; loading: boolean; noWorkerSelected: boolean }) {
  const COLS = 5;
  if (noWorkerSelected && !loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl">
          <User size={28} className="text-slate-400" />
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-wide">Select a Worker</p>
        <p className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Choose a worker and date range above, then click Load</p>
      </div>
    );
  }
  return (
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50">
          {['Date', 'Status', 'Check-In', 'Check-Out', 'Method'].map(h => (
            <th key={h} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} cols={COLS} />)
        ) : data.length === 0 ? (
          <EmptyState colSpan={COLS} />
        ) : (
          data.slice(0, 100).map(r => (
            <tr key={r.date} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
              <td className="px-4 py-3"><span className="text-xs font-black text-slate-900 dark:text-white">{r.date}</span></td>
              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              <td className="px-4 py-3">
                {r.check_in
                  ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock size={12} className="text-slate-400" />{r.check_in}</span>
                  : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
              <td className="px-4 py-3">
                {r.check_out
                  ? <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300"><Clock size={12} className="text-slate-400" />{r.check_out}</span>
                  : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
              <td className="px-4 py-3">
                {r.auth_method ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                    {methodIcon(r.auth_method)}{r.auth_method}
                  </span>
                ) : <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────
export default function AttendanceReportPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentMonth = format(new Date(), 'yyyy-MM');

  const [activeTab, setActiveTab] = useState<ReportKey>('daily');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  // Shared filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [estateFilter, setEstateFilter] = useState('all');

  // Daily tab
  const [selectedDate, setSelectedDate] = useState(today);
  // Monthly tab
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  // Worker history tab
  const [selectedWorker, setSelectedWorker] = useState('');
  const [workerHistoryFrom, setWorkerHistoryFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [workerHistoryTo, setWorkerHistoryTo] = useState(today);

  // Data states
  const [dailyData, setDailyData] = useState<AttendanceRecord[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([]);
  const [workerData, setWorkerData] = useState<AttendanceRecord[]>([]);
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);
  const [allWorkers, setAllWorkers] = useState<{ worker_id: string; first_name: string; last_name: string }[]>([]);

  // Fetch estates & workers list on mount
  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data: d }) => {
      if (d) setEstates(d);
    });
    supabase.from('workforce').select('worker_id, first_name, last_name').neq('status', 'archived').then(({ data: d }) => {
      if (d) setAllWorkers(d);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  // ── DAILY fetch
  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      let workerQuery = supabase.from('workforce').select('*').neq('status', 'archived');
      if (!isUserAdmin && profile?.estate_id) workerQuery = workerQuery.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') workerQuery = workerQuery.eq('estate_id', estateFilter);

      const { data: workers } = await workerQuery;
      const { data: attendance } = await supabase.from('attendance').select('*').eq('date', selectedDate);

      const report: AttendanceRecord[] = (workers ?? []).map((w: any) => {
        const rec = (attendance ?? []).find((a: any) => a.worker_id === w.worker_id);
        return {
          id: w.id,
          worker_id: w.worker_id,
          first_name: w.first_name,
          last_name: w.last_name,
          photo: w.photo,
          status: rec ? 'present' : 'absent',
          check_in: formatTime(rec?.check_in_time ?? null),
          check_out: formatTime(rec?.check_out_time ?? null),
          auth_method: rec?.check_in_method ?? rec?.check_out_method ?? null,
          date: selectedDate,
          estate_id: w.estate_id,
        };
      });
      setDailyData(report);
    } catch (err) {
      console.error('Daily fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, estateFilter, isUserAdmin, profile]);

  // ── MONTHLY fetch
  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      const from = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const to = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd');
      const totalDays = getDaysInMonth(new Date(year, month - 1));

      let workerQuery = supabase.from('workforce').select('*').neq('status', 'archived');
      if (!isUserAdmin && profile?.estate_id) workerQuery = workerQuery.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') workerQuery = workerQuery.eq('estate_id', estateFilter);

      const { data: workers } = await workerQuery;
      const { data: attendance } = await supabase
        .from('attendance')
        .select('worker_id, date')
        .gte('date', from)
        .lte('date', to);

      const report: MonthlyRecord[] = (workers ?? []).map((w: any) => {
        const present = (attendance ?? []).filter((a: any) => a.worker_id === w.worker_id).length;
        return {
          worker_id: w.worker_id,
          first_name: w.first_name,
          last_name: w.last_name,
          photo: w.photo,
          present_days: present,
          absent_days: totalDays - present,
          total_days: totalDays,
          attendance_pct: Math.round((present / totalDays) * 100),
          estate_id: w.estate_id,
        };
      });
      setMonthlyData(report);
    } catch (err) {
      console.error('Monthly fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, estateFilter, isUserAdmin, profile]);

  // ── WORKER HISTORY fetch
  const fetchWorkerHistory = useCallback(async () => {
    if (!selectedWorker) { setWorkerData([]); return; }
    setLoading(true);
    try {
      const { data: worker } = await supabase
        .from('workforce')
        .select('*')
        .eq('worker_id', selectedWorker)
        .maybeSingle();

      const days = eachDayOfInterval({ start: new Date(workerHistoryFrom), end: new Date(workerHistoryTo) });
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('worker_id', selectedWorker)
        .gte('date', workerHistoryFrom)
        .lte('date', workerHistoryTo);

      const records: AttendanceRecord[] = days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const rec = (attendance ?? []).find((a: any) => a.date === dateStr);
        return {
          id: dateStr,
          worker_id: selectedWorker,
          first_name: worker?.first_name ?? '',
          last_name: worker?.last_name ?? '',
          photo: worker?.photo,
          status: rec ? 'present' : 'absent',
          check_in: formatTime(rec?.check_in_time ?? null),
          check_out: formatTime(rec?.check_out_time ?? null),
          auth_method: rec?.check_in_method ?? rec?.check_out_method ?? null,
          date: dateStr,
        };
      });
      setWorkerData(records);
    } catch (err) {
      console.error('Worker history fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWorker, workerHistoryFrom, workerHistoryTo]);

  // Trigger fetch when tab changes
  useEffect(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setMethodFilter('all');
    if (activeTab === 'daily') fetchDaily();
    else if (activeTab === 'monthly') fetchMonthly();
    // Worker tab: wait for user to press Load
  }, [activeTab]);

  // Re-fetch daily/monthly when date/month or estate changes
  useEffect(() => { if (activeTab === 'daily') fetchDaily(); }, [selectedDate, estateFilter]);
  useEffect(() => { if (activeTab === 'monthly') fetchMonthly(); }, [selectedMonth, estateFilter]);

  // Active raw data
  const rawData: any[] = activeTab === 'daily' ? dailyData : activeTab === 'monthly' ? monthlyData : workerData;

  // Filtering
  const filtered = rawData.filter(row => {
    const searchLow = searchTerm.toLowerCase();
    const matchSearch = !searchTerm || `${row.first_name} ${row.last_name} ${row.worker_id}`.toLowerCase().includes(searchLow);
    const matchStatus = statusFilter === 'all' || row.status === statusFilter;
    const matchMethod = methodFilter === 'all' || row.auth_method === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  // Stats
  const stats = (() => {
    if (activeTab === 'daily') {
      const present = filtered.filter((r: any) => r.status === 'present').length;
      const absent = filtered.length - present;
      const pct = filtered.length > 0 ? Math.round((present / filtered.length) * 100) : 0;
      return [
        { label: 'Total Workers', value: filtered.length, icon: Users, color: 'text-slate-500' },
        { label: 'Present', value: present, icon: CheckCircle2, color: 'text-emerald-500' },
        { label: 'Absent', value: absent, icon: XCircle, color: 'text-rose-500' },
        { label: 'Attendance Rate', value: `${pct}%`, icon: TrendingUp, color: 'text-blue-500' },
      ];
    }
    if (activeTab === 'monthly') {
      const avgPct = filtered.length > 0
        ? Math.round(filtered.reduce((s: number, r: any) => s + r.attendance_pct, 0) / filtered.length)
        : 0;
      const perfect = filtered.filter((r: any) => r.attendance_pct === 100).length;
      const low = filtered.filter((r: any) => r.attendance_pct < 75).length;
      return [
        { label: 'Workers', value: filtered.length, icon: Users, color: 'text-slate-500' },
        { label: 'Avg Attendance', value: `${avgPct}%`, icon: TrendingUp, color: 'text-blue-500' },
        { label: 'Perfect Record', value: perfect, icon: CheckCircle2, color: 'text-emerald-500' },
        { label: 'Low < 75%', value: low, icon: AlertCircle, color: 'text-rose-500' },
      ];
    }
    const present = filtered.filter((r: any) => r.status === 'present').length;
    const absent = filtered.length - present;
    const pct = filtered.length > 0 ? Math.round((present / filtered.length) * 100) : 0;
    return [
      { label: 'Total Days', value: filtered.length, icon: Calendar, color: 'text-slate-500' },
      { label: 'Present', value: present, icon: CheckCircle2, color: 'text-emerald-500' },
      { label: 'Absent', value: absent, icon: XCircle, color: 'text-rose-500' },
      { label: 'Attendance Rate', value: `${pct}%`, icon: TrendingUp, color: 'text-blue-500' },
    ];
  })();

  // Report title & export
  const selectedWorkerName = allWorkers.find(w => w.worker_id === selectedWorker);
  const workerLabel = selectedWorkerName ? `${selectedWorkerName.first_name} ${selectedWorkerName.last_name}` : selectedWorker;
  const reportTitle =
    activeTab === 'daily' ? `Daily Attendance — ${format(new Date(selectedDate + 'T00:00:00'), 'MMMM d, yyyy')}`
    : activeTab === 'monthly' ? `Monthly Attendance Summary — ${format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}`
    : `Worker History — ${workerLabel}`;

  const exportHeaders = (): string[] => {
    if (activeTab === 'daily') return ['Worker ID', 'Name', 'Date', 'Status', 'Check-In', 'Check-Out', 'Method'];
    if (activeTab === 'monthly') return ['Worker ID', 'Name', 'Present Days', 'Absent Days', 'Total Days', 'Attendance %'];
    return ['Date', 'Status', 'Check-In', 'Check-Out', 'Method'];
  };

  const toExportRows = (): (string | number)[][] => {
    if (activeTab === 'daily') {
      return filtered.map((r: any) => [r.worker_id, `${r.first_name} ${r.last_name}`, r.date, r.status, r.check_in ?? '—', r.check_out ?? '—', r.auth_method ?? '—']);
    }
    if (activeTab === 'monthly') {
      return filtered.map((r: any) => [r.worker_id, `${r.first_name} ${r.last_name}`, r.present_days, r.absent_days, r.total_days, `${r.attendance_pct}%`]);
    }
    return filtered.map((r: any) => [r.date, r.status, r.check_in ?? '—', r.check_out ?? '—', r.auth_method ?? '—']);
  };

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    setExporting(type);
    await new Promise(r => setTimeout(r, 50));
    const headers = exportHeaders();
    const rows = toExportRows();
    const filename = `Attendance_Report_${activeTab}_${dateSuffix()}`;
    const csvOpts = { title: reportTitle, recordCount: filtered.length };
    try {
      if (type === 'csv') {
        downloadCsv(buildCsvWithHeader(headers, rows, csvOpts), `${filename}.csv`);
      } else if (type === 'excel') {
        downloadExcel(headers, rows, csvOpts, `${filename}.xlsx`);
      } else {
        const isLandscape = headers.length > 6;
        const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait' });
        const startY = addPdfHeader(doc, { title: reportTitle, recordCount: `${filtered.length} records`, showFactory: true });
        autoTable(doc, {
          startY,
          head: [headers],
          body: rows as string[][],
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          styles: { cellPadding: 3 },
        });
        addPdfFootersToAllPages(doc);
        doc.save(`${filename}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  };

  const activeTabDef = REPORT_TABS.find(t => t.key === activeTab)!;
  const hasFilter = searchTerm || statusFilter !== 'all' || methodFilter !== 'all';

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">
            Attendance Reports
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            Daily · Monthly Summary · Worker History · Export PDF · Excel · CSV
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            id="attendance-refresh-btn"
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5"
            onClick={() => {
              if (activeTab === 'daily') fetchDaily();
              else if (activeTab === 'monthly') fetchMonthly();
              else fetchWorkerHistory();
            }}
            disabled={loading}
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              id="attendance-export-btn"
              disabled={!!exporting || loading || filtered.length === 0}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-bold ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
              <ChevronDown size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem id="export-attendance-csv" onClick={() => handleExport('csv')} className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                <FileText size={14} /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem id="export-attendance-pdf" onClick={() => handleExport('pdf')} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700">
                <FileIcon size={14} /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem id="export-attendance-excel" onClick={() => handleExport('excel')} className="text-xs font-bold flex items-center gap-2 cursor-pointer text-green-600 focus:text-green-700">
                <FileSpreadsheet size={14} /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Report Type Selector + date controls ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">Report Type</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="attendance-report-type-dropdown"
            className="inline-flex items-center justify-between gap-2 whitespace-nowrap rounded-lg text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:text-slate-50 h-9 px-4 min-w-[220px]"
          >
            <span className="flex items-center gap-2">
              {(() => { const t = activeTabDef; const Icon = t.icon; return <><Icon size={14} className={t.color} /><span>{t.label}</span></>; })()}
            </span>
            <span className="flex items-center gap-2 ml-2">
              {!loading && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{filtered.length} records</span>}
              {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
              <ChevronDown size={14} className="text-slate-400" />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            {REPORT_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = tab.key === activeTab;
              return (
                <DropdownMenuItem
                  key={tab.key}
                  id={`attendance-tab-${tab.key}`}
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

        {/* Date pickers per tab */}
        {activeTab === 'daily' && (
          <input
            id="attendance-daily-date"
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500"
          />
        )}
        {activeTab === 'monthly' && (
          <input
            id="attendance-monthly-picker"
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
          />
        )}
        {activeTab === 'worker' && (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              id="attendance-worker-select"
              value={selectedWorker}
              onChange={e => setSelectedWorker(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none min-w-[180px]"
            >
              <option value="">Select Worker…</option>
              {allWorkers.map(w => (
                <option key={w.worker_id} value={w.worker_id}>{w.first_name} {w.last_name}</option>
              ))}
            </select>
            <input
              id="attendance-worker-from"
              type="date"
              value={workerHistoryFrom}
              onChange={e => setWorkerHistoryFrom(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            />
            <span className="text-slate-400 text-xs font-bold">–</span>
            <input
              id="attendance-worker-to"
              type="date"
              value={workerHistoryTo}
              onChange={e => setWorkerHistoryTo(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            />
            <Button
              id="attendance-worker-load-btn"
              size="sm"
              className="h-9 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white"
              onClick={fetchWorkerHistory}
              disabled={!selectedWorker || loading}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Load'}
            </Button>
          </div>
        )}

        {/* Estate filter — admin only */}
        {isUserAdmin && (
          <select
            id="attendance-estate-filter"
            value={estateFilter}
            onChange={e => setEstateFilter(e.target.value)}
            className="h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none min-w-[150px]"
          >
            <option value="all">All Estates</option>
            {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Stats Cards ── */}
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
                  {loading
                    ? <span className="block w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
                    : s.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Filters + Table ── */}
      <Card className="p-0 overflow-hidden shadow-sm">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0">
            <Filter size={12} /> Filters
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <Input
              id="attendance-search"
              placeholder="Search by name or ID…"
              className="pl-8 h-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-xs"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {activeTab !== 'monthly' && (
            <select
              id="attendance-status-filter"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          )}

          {activeTab !== 'monthly' && (
            <select
              id="attendance-method-filter"
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Methods</option>
              <option value="face">Face Scan</option>
              <option value="qr">QR Code</option>
              <option value="manual">Manual</option>
            </select>
          )}

          {hasFilter && (
            <Button
              id="attendance-clear-filters"
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 gap-1 text-[10px] font-black uppercase tracking-widest shrink-0"
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setMethodFilter('all'); }}
            >
              <X size={12} /> Clear
            </Button>
          )}
        </div>

        {/* Table area */}
        <div className="overflow-x-auto">
          {activeTab === 'daily' && <DailyTable data={filtered as AttendanceRecord[]} loading={loading} />}
          {activeTab === 'monthly' && <MonthlyTable data={filtered as MonthlyRecord[]} loading={loading} />}
          {activeTab === 'worker' && <WorkerHistoryTable data={filtered as AttendanceRecord[]} loading={loading} noWorkerSelected={!selectedWorker} />}
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-50/40 dark:bg-slate-900/30">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {Math.min(100, filtered.length)} of {filtered.length} &nbsp;·&nbsp; All records exported
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
