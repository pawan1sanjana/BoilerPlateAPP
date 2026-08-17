import { useState, useEffect } from 'react';
import { Search, RotateCcw, AlertTriangle, UserCheck, X, MapPin, Phone, Shield, FileText, User, Leaf } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppInfoStore } from '@/store/useAppInfoStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function WorkerArchive() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [searchTerm, setSearchTerm] = useState('');
  const [archivedWorkers, setArchivedWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  const [filterWageType, setFilterWageType] = useState('All');
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [estates, setEstates] = useState<any[]>([]);

  const { appName, appIcon } = useAppInfoStore();
  
  const fetchArchive = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('workforce').select('*, estates(name)').eq('status', 'archived');
      if (error) throw error;
      setArchivedWorkers(data || []);
    } catch (error) {
      console.error('Failed to fetch archive:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('*').order('name');
      if (!error && data) {
        setEstates(data);
      }
    } catch (error) {
      console.error('Failed to fetch estates:', error);
    }
  };

  useEffect(() => {
    fetchArchive();
    fetchEstates();
  }, []);

  const handleRestore = async (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to restore ${name} to active duty?`)) return;
    try {
      const { error } = await supabase.from('workforce').update({ status: 'active', archived_at: null }).eq('id', id);
      if (!error) {
        setSelectedWorker(null);
        fetchArchive(); // Refresh list after restore
      }
    } catch (error) {
      console.error('Failed to restore worker:', error);
    }
  };

  const filteredWorkers = archivedWorkers.filter(worker => {
    const matchesSearch = 
      (worker.first_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.last_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.worker_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (worker.nic || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWage = filterWageType === 'All' || worker.wage_type === filterWageType;
    const matchesEstate = isUserAdmin 
      ? (selectedEstateFilter === 'all' || worker.estate_id === selectedEstateFilter)
      : (worker.estate_id === profile?.estate_id);

    return matchesSearch && matchesWage && matchesEstate;
  });

  // Pagination Logic
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredWorkers.slice(indexOfFirstEntry, indexOfLastEntry);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const columns: ColumnDef<any>[] = [
    {
      header: "Workers Profile",
      cell: (worker) => (
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedWorker(worker)}>
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
            {worker.photo ? (
              <img src={worker.photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={18} className="text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{worker.first_name} {worker.last_name}</p>
          </div>
        </div>
      )
    },
    {
      header: "Worker ID / NIC",
      cell: (worker) => (
        <div className="cursor-pointer" onClick={() => setSelectedWorker(worker)}>
          <p className="text-xs font-black text-tea-600 dark:text-tea-400 uppercase tracking-widest">{worker.worker_id}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{worker.nic}</p>
        </div>
      )
    },
    {
      header: "Wage Category",
      cell: (worker) => (
        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
          worker.wage_type === 'permanent' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          worker.wage_type === 'daily_cash' ? 'bg-amber-50 text-amber-600 border-amber-100' :
          'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {worker.wage_type?.replace('_', ' ') || 'Permanent'}
        </span>
      )
    },
    {
      header: "Assigned Estate",
      cell: (worker) => (
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {worker.estates?.name || 'Unassigned'}
          </p>
        </div>
      )
    },
    {
      header: "Inactive Since",
      cell: (worker) => (
        <span className="text-xs font-bold text-slate-500">
          {worker.archived_at ? new Date(worker.archived_at).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      header: "Actions",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (worker) => (
        <div className="flex items-center justify-end">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleRestore(worker.id, worker.first_name); }}
            className="text-tea-600 hover:text-tea-700 hover:bg-tea-50 dark:hover:bg-tea-900/40 text-[10px] font-bold uppercase tracking-widest"
          >
             <UserCheck size={14} className="mr-1" /> Restore
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-outfit">Worker Archive</h1>
        </div>
      </div>

      <Card className="p-0 overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Search archive by ID, Name or NIC..."
              className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterWageType}
              onChange={(e) => {setFilterWageType(e.target.value); setCurrentPage(1);}}
              className="px-3 h-9 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-sm font-medium outline-none appearance-none"
            >
              <option value="All">All Categories</option>
              <option value="permanent">Permanent</option>
              <option value="daily_cash">Daily Cash</option>
              <option value="contract">Contract</option>
            </select>
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
            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterWageType('All'); setSelectedEstateFilter('all'); setCurrentPage(1); }}>
              Clear
            </Button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={currentEntries}
          loading={loading}
          emptyMessage="No matching archived records found"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredWorkers.length,
            onPageChange: paginate,
            onPageSizeChange: (newSize) => {
              setEntriesPerPage(newSize);
              setCurrentPage(1);
            },
          }}
        />
      </Card>

      <div className="flex items-center gap-4 p-5 rounded-3xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30">
        <div className="p-3 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Compliance Warning</h4>
          <p className="text-xs text-amber-700 dark:text-amber-500">Archived records must be retained for at least 7 years according to estate labor regulations for audit compliance.</p>
        </div>
      </div>

      {selectedWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedWorker(null)}></div>
          <div className="relative w-full max-w-5xl md:h-[85vh] bg-white dark:bg-slate-950 rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in border border-white/10 my-auto">
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
               <div className="relative mx-auto md:mx-0 w-32 h-32 md:w-48 md:h-48 group">
                  <div className="absolute inset-0 bg-tea-500/20 rounded-full blur-2xl animate-pulse group-hover:bg-tea-500/30 transition-all"></div>
                  <div className="relative w-full h-full rounded-full border-4 border-white dark:border-slate-800 overflow-hidden shadow-xl">
                    {selectedWorker.photo ? (
                      <img 
                        src={selectedWorker.photo.startsWith('data:') ? selectedWorker.photo : `/api/uploads/${selectedWorker.photo}`} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <User size={64} className="text-slate-400" />
                      </div>
                    )}
                  </div>
               </div>
               <div className="mt-6 text-center md:text-left">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-outfit uppercase tracking-tight">
                    {selectedWorker.first_name} {selectedWorker.last_name}
                  </h2>
                  <p className="text-tea-600 dark:text-tea-400 font-mono font-black text-sm tracking-widest mt-1 bg-tea-500/10 px-3 py-1 rounded-full inline-block">
                    {selectedWorker.worker_id}
                  </p>
                  <div className="mt-4 flex justify-center md:justify-start">
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      selectedWorker.wage_type === 'permanent' || !selectedWorker.wage_type ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      selectedWorker.wage_type === 'daily_cash' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                      'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    }`}>
                      {selectedWorker.wage_type?.replace('_', ' ') || 'Permanent'}
                    </span>
                  </div>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <Shield size={18} className="text-slate-300" />
                      <span className="text-sm font-bold tracking-tight">{selectedWorker.nic}</span>
                    </div>
                    <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
                      <MapPin size={18} className="text-slate-300 shrink-0 mt-0.5" />
                      <span className="text-sm font-medium leading-relaxed">{selectedWorker.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                      <Phone size={18} className="text-slate-300" />
                      <span className="text-sm font-bold">{selectedWorker.tel}</span>
                    </div>
                  </div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
               <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-xl font-bold dark:text-white">Archived Workers Record</h3>
                    <p className="text-slate-500 text-sm">Full historical breakdown and verified documents</p>
                  </div>
                  <button onClick={() => setSelectedWorker(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"><X size={24} /></button>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Identity Preview (Historical)</h4>
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-900 p-8">
                         <div style={{ aspectRatio: '1.6/1', width: '100%', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)', padding: '16px', color: 'white', borderRadius: '0px' }}>
                            <div className="flex justify-between items-start">
                               <div className="flex flex-col">
                                  <div className="flex items-center gap-2 mb-1">
                                     {appIcon ? (
                                       <img src={appIcon} alt="App Icon" className="w-3.5 h-3.5 object-contain" />
                                     ) : (
                                       <Leaf size={14} className="text-tea-400" />
                                     )}
                                     <span className="text-[8px] font-black tracking-[3px]">{appName || 'TeaERP PRO'}</span>
                                  </div>
                                  <span className="text-[6px] font-bold opacity-50 uppercase tracking-widest">Official Identity</span>
                               </div>
                               <div className="bg-white p-1 rounded-sm">
                                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${selectedWorker.worker_id}`} className="w-8 h-8" />
                               </div>
                            </div>
                            <div className="mt-2 text-center flex flex-col items-center">
                               <div className="w-16 h-16 border border-white/20 overflow-hidden mb-2">
                                  {selectedWorker.photo ? (
                                    <img 
                                      src={selectedWorker.photo.startsWith('data:') ? selectedWorker.photo : `/api/uploads/${selectedWorker.photo}`} 
                                      className="w-full h-full object-cover" 
                                      alt=""
                                    />
                                  ) : (
                                    <User size={24} className="opacity-30 mt-4 mx-auto" />
                                  )}
                               </div>
                               <h5 className="text-[10px] font-black uppercase text-center">{selectedWorker.first_name} {selectedWorker.last_name}</h5>
                               <p className="text-[7px] font-mono text-tea-400 mt-1">{selectedWorker.worker_id}</p>
                            </div>
                         </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Compliance Documents</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">NIC Front</p>
                          <div className="aspect-[1.6/1] bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                             {selectedWorker.nic_front ? <img src={selectedWorker.nic_front} className="w-full h-full object-cover" /> : <FileText className="text-slate-300" />}
                          </div>
                       </div>
                       <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase">NIC Back</p>
                          <div className="aspect-[1.6/1] bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                             {selectedWorker.nic_back ? <img src={selectedWorker.nic_back} className="w-full h-full object-cover" /> : <FileText className="text-slate-300" />}
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
               <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                 <button 
                   onClick={() => setSelectedWorker(null)}
                   className="px-8 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"
                 >
                   Back to Archive
                 </button>
                 <button 
                   onClick={() => handleRestore(selectedWorker.id, selectedWorker.first_name)}
                   className="px-10 py-3 text-xs font-black uppercase tracking-widest bg-tea-600 hover:bg-tea-700 text-white rounded-full shadow-lg shadow-tea-500/20 transition-all flex items-center gap-2"
                 >
                   <RotateCcw size={16} /> Restore to Active Duty
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
