import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, MapPin, Clock, QrCode, 
  ClipboardList, Loader2, 
  User, ChevronLeft, ChevronRight, 
  UserCheck, ShieldCheck, Download, FileSpreadsheet, FileText,
  Layers, Edit2, Trash2, X, Save, ChevronDown, FileIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  addPdfHeader,
  addPdfFootersToAllPages,
  buildCsvWithHeader,
  downloadCsv,
  downloadExcel,
  autoTable,
} from '@/lib/exportUtils';
import jsPDF from 'jspdf';

// Helper to format time correctly if stored as HH:mm:ss
function formatTime(timeStr: string | null): string | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':');
  if (!h || !m) return timeStr;
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m, 10));
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TodaysAttendance() {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);
  
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Stats
  const stats = {
    totalPresent: attendance.length,
    biometricCount: attendance.filter((a: any) => a.auth_method === 'face').length,
    qrCount: attendance.filter((a: any) => a.auth_method === 'qr').length,
    manualCount: attendance.filter((a: any) => a.auth_method === 'manual').length,
    checkedOut: attendance.filter((a: any) => a.check_out_time).length,
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, estateFilter, isUserAdmin, profile]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let workerQuery = supabase.from('workforce').select('*').neq('status', 'archived');
      if (!isUserAdmin && profile?.estate_id) workerQuery = workerQuery.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') workerQuery = workerQuery.eq('estate_id', estateFilter);

      const { data: workers, error: wError } = await workerQuery;
      if (wError) throw wError;
      
      const { data: attendanceData, error: aError } = await supabase.from('attendance').select('*').eq('date', selectedDate);
      if (aError) throw aError;
      
      const report = (workers ?? []).map((w: any) => {
        const rec = (attendanceData ?? []).find((a: any) => a.worker_id === w.worker_id);
        return {
          id: rec?.id, // attendance record id
          worker_id: w.worker_id,
          first_name: w.first_name,
          last_name: w.last_name,
          photo: w.photo,
          check_in_time: rec?.check_in_time ? formatTime(rec.check_in_time) : null,
          check_out_time: rec?.check_out_time ? formatTime(rec.check_out_time) : null,
          raw_check_in: rec?.check_in_time,
          raw_check_out: rec?.check_out_time,
          auth_method: rec?.check_in_method ?? rec?.check_out_method ?? null,
          latitude: rec?.check_in_latitude ?? null,
          longitude: rec?.check_in_longitude ?? null,
          total_hours: null, // we can calculate this if needed
          is_present: !!rec
        };
      }).filter((r: any) => r.is_present);
      
      setAttendance(report as any);
    } catch (err) {
      console.error("Failed to fetch logs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedLog || !(selectedLog as any).id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('attendance').delete().eq('id', (selectedLog as any).id);
      if (error) throw error;
      setAttendance(attendance.filter((a: any) => a.id !== (selectedLog as any).id));
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Failed to delete', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLog || !(selectedLog as any).id) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('attendance').update({
        check_in_time: (selectedLog as any).raw_check_in || null,
        check_out_time: (selectedLog as any).raw_check_out || null
      }).eq('id', (selectedLog as any).id);
      
      if (error) throw error;
      fetchAttendance();
      setShowEditModal(false);
    } catch (err) {
      console.error('Failed to edit', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedLog({ ...selectedLog, [e.target.name]: e.target.value } as any);
  };

  const filteredData = attendance.filter((a: any) => 
    `${a.first_name} ${a.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.worker_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = async (type: 'pdf' | 'excel' | 'csv') => {
    setExporting(type);
    await new Promise(r => setTimeout(r, 50)); // let UI update
    
    const headers = ['Worker ID', 'Name', 'Check-In', 'Check-Out', 'Method', 'Location'];
    const rows = filteredData.map((a: any) => [
      a.worker_id,
      `${a.first_name} ${a.last_name}`,
      a.check_in_time || '—',
      a.check_out_time || '—',
      a.auth_method?.toUpperCase() || '—',
      a.latitude ? `${a.latitude}, ${a.longitude}` : 'N/A'
    ]);
    
    const filename = `Todays_Attendance_${selectedDate}`;
    const csvOpts = { title: `Todays Attendance Logs - ${selectedDate}`, recordCount: filteredData.length };
    
    try {
      if (type === 'csv') {
        downloadCsv(buildCsvWithHeader(headers, rows, csvOpts), `${filename}.csv`);
      } else if (type === 'excel') {
        downloadExcel(headers, rows, csvOpts, `${filename}.xlsx`);
      } else {
        const doc = new jsPDF();
        const startY = addPdfHeader(doc, { title: `Todays Attendance Logs - ${selectedDate}`, recordCount: `${filteredData.length} records`, showFactory: true });
        autoTable(doc, {
          startY,
          head: [headers],
          body: rows,
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Todays Attendance Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Daily records of worker check-ins and check-outs.</p>
        </div>
        
        <div className="flex gap-3 relative">
           <DropdownMenu>
            <DropdownMenuTrigger
              id="attendance-export-btn"
              disabled={!!exporting || loading || filteredData.length === 0}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-50 h-10 px-4 text-slate-600 dark:text-slate-300"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
              <ChevronDown size={16} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-2">
              <DropdownMenuItem onClick={() => handleExport('csv')} className="text-sm font-medium flex items-center gap-3 cursor-pointer py-2.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <FileText size={16} className="text-slate-500" /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="text-sm font-medium flex items-center gap-3 cursor-pointer text-rose-600 focus:text-rose-700 py-2.5 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                <FileIcon size={16} /> Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="text-sm font-medium flex items-center gap-3 cursor-pointer text-emerald-600 focus:text-emerald-700 py-2.5 px-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                <FileSpreadsheet size={16} /> Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Present", value: stats.totalPresent, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Checked Out", value: stats.checkedOut, icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "QR Tactical", value: stats.qrCount, icon: QrCode, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Manual Override", value: stats.manualCount, icon: ClipboardList, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
             <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={22} />
             </div>
             <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
             </div>
          </div>
        ))}
      </div>

      {/* Control Panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
         <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                 type="text" 
                 placeholder="Search name or ID..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-blue-500 transition-all text-sm text-slate-900 dark:text-white"
               />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
               <Calendar size={16} className="text-blue-500" />
               <input 
                 type="date" 
                 value={selectedDate}
                 onChange={(e) => setSelectedDate(e.target.value)}
                 className="bg-transparent text-sm font-semibold text-slate-900 dark:text-white outline-none"
               />
            </div>
            {isUserAdmin && (
               <select
                 value={estateFilter}
                 onChange={e => setEstateFilter(e.target.value)}
                 className="h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 min-w-[150px]"
               >
                 <option value="all">All Estates</option>
                 {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
               </select>
            )}
         </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
               <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-left">
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Workers Record</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Check-In</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Check-Out Event</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Shift Hours</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Auth Method</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs">Tactical Position</th>
                     <th className="px-4 py-3 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                           <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                           <p className="text-sm font-medium text-slate-500">Loading records...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                        <Search size={32} className="mx-auto mb-3 text-slate-400 opacity-50" />
                        <p className="text-sm font-medium">No attendance records found</p>
                      </td>
                    </tr>
                  ) : filteredData.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                             <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                                {log.photo ? <img src={log.photo} className="w-full h-full object-cover" /> : <User size={18} className="text-slate-400" />}
                             </div>
                             <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{log.first_name} {log.last_name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                   <Layers size={12} /> {log.worker_id}
                                </p>
                             </div>
                          </div>
                       </td>
                       <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                             <Clock size={14} className="text-slate-400" />
                             {log.check_in_time || '—'}
                          </div>
                       </td>
                       <td className="px-4 py-3">
                          {log.check_out_time ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-200">
                               <Clock size={14} className="text-slate-400" />
                               {log.check_out_time}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md">Active Shift</span>
                          )}
                       </td>
                       <td className="px-4 py-3">
                          {log.total_hours != null ? (
                            <span className="font-medium text-slate-900 dark:text-slate-200">
                               {log.total_hours}h
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                       </td>
                       <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            log.auth_method === 'face' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                            log.auth_method === 'qr' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' :
                            'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                          }`}>
                            {log.auth_method === 'face' ? <ShieldCheck size={14} /> : log.auth_method === 'qr' ? <QrCode size={14} /> : <ClipboardList size={14} />}
                            {log.auth_method?.toUpperCase() || 'MANUAL'}
                          </span>
                       </td>
                       <td className="px-4 py-3">
                          {log.latitude ? (
                             <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                                <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> Lat: {parseFloat(log.latitude).toFixed(4)}</span>
                                <span className="ml-4">Lon: {parseFloat(log.longitude).toFixed(4)}</span>
                             </div>
                          ) : (
                             <span className="text-xs text-slate-400 italic">No GPS</span>
                          )}
                       </td>
                       <td className="px-4 py-3 text-right">
                          <div className="flex items-center gap-1 justify-end">
                             <button onClick={() => { setSelectedLog(log); setShowEditModal(true); }} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                <Edit2 size={16} />
                             </button>
                             <button onClick={() => { setSelectedLog(log); setShowDeleteModal(true); }} className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         {/* Footer */}
         <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-sm font-medium text-slate-500">
               Showing {filteredData.length} records
            </span>
            <div className="flex gap-2">
               <button disabled className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-50">
                  <ChevronLeft size={18} />
               </button>
               <button disabled className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 disabled:opacity-50">
                  <ChevronRight size={18} />
               </button>
            </div>
         </div>
      </div>

      {/* Confirmation Modals */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/20 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete Record?</h2>
              <p className="text-sm text-slate-500 mt-2 mb-6">
                Are you sure you want to remove attendance for <span className="font-semibold text-slate-700 dark:text-slate-300">{(selectedLog as any)?.first_name} {(selectedLog as any)?.last_name}</span>?
              </p>
              <div className="flex w-full gap-3">
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDeleteSubmit} disabled={isProcessing}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors flex items-center justify-center">
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Check-in/out</h2>
                <button type="button" onClick={() => setShowEditModal(false)} className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><X size={18}/></button>
             </div>
             <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Check-In Time</label>
                     <input type="time" step="1" name="raw_check_in" value={(selectedLog as any)?.raw_check_in || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors" required />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Check-Out Event</label>
                     <input type="time" step="1" name="raw_check_out" value={(selectedLog as any)?.raw_check_out || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                   </div>
                </div>
                <div className="flex gap-3 pt-4">
                   <button type="submit" disabled={isProcessing} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
                     {isProcessing ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                     Save Changes
                   </button>
                   <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-lg transition-colors">Cancel</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
