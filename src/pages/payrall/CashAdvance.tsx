import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  User,
  History,
  X,
  Check,
  ChevronDown,
  TrendingUp,
  Wallet,
  Lock
} from "lucide-react";
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { isAdmin } from '../../lib/roleUtils';
import type { AppRole } from '../../store/useModulePermissionsStore';
import { usePayrollLock } from '../../lib/payrollLockUtils';
import { supabase } from '../../lib/supabase';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '../../components/ui/data-table';

export default function CashAdvance() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(false);
  const [advances, setAdvances] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [modalEstateFilter, setModalEstateFilter] = useState('all');
  const [estates, setEstates] = useState<any[]>([]);

  // Searchable Worker State
  const [workerSearch, setWorkerSearch] = useState("");
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const workerDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const dateStr = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-01`;
  const { isLocked: isPayrollLocked } = usePayrollLock(
    dateStr,
    selectedEstateFilter !== 'all' ? selectedEstateFilter : profile?.estate_id
  );
  const isLockedForUser = isPayrollLocked && !isUserAdmin;

  const [formData, setFormData] = useState({
    worker_id: "",
    worker_name: "",
    estate_id: "",
    advance_date: new Date().toISOString().split('T')[0],
    amount: "",
    reason: "Monthly Advance"
  });

  const [workerEarnings, setWorkerEarnings] = useState(0);

  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
      setModalEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  useEffect(() => {
    const fetchEstates = async () => {
      try {
        const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
        if (!error && data) setEstates(data);
      } catch (e) {
        console.error('Failed to fetch estates:', e);
      }
    };
    fetchEstates();
  }, []);

  useEffect(() => {
    fetchAdvances();
    fetchWorkers();
  }, [selectedDate, selectedEstateFilter]);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (workerDropdownRef.current && !workerDropdownRef.current.contains(event.target)) {
        setShowWorkerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch earnings when worker is selected
  useEffect(() => {
    if (formData.worker_id) {
      fetchWorkerEarnings(formData.worker_id);
    } else {
      setWorkerEarnings(0);
    }
  }, [formData.worker_id, selectedDate]);

  const fetchAdvances = async () => {
    setLoading(true);
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const startOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-01`;
      const lastDayNum = new Date(selectedDate.year, selectedDate.month, 0).getDate();
      const endOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-${pad(lastDayNum)}`;

      let query = supabase
        .from('cash_advances')
        .select('*, workforce(first_name, last_name, worker_id, estate_id)')
        .gte('advance_date', startOfMonth)
        .lte('advance_date', endOfMonth);

      if (selectedEstateFilter !== 'all') {
        query = query.eq('estate_id', selectedEstateFilter);
      } else if (!isUserAdmin && profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }

      const { data, error } = await query.order('advance_date', { ascending: false });

      if (!error && data) {
        setAdvances(data.map((a: any) => ({
          ...a,
          worker_name: a.worker_name || (a.workforce ? `${a.workforce.first_name} ${a.workforce.last_name}` : 'Worker'),
          worker_epf: a.worker_epf || a.workforce?.worker_id || 'N/A'
        })));
      } else {
        const res = await apiClient.get(`/payrall/advances?year=${selectedDate.year}&month=${selectedDate.month}`);
        if (res.success && res.data) setAdvances(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch advances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkers = async () => {
    try {
      const { data: permWorkers } = await supabase
        .from('workforce')
        .select('id, worker_id, first_name, last_name, photo, estate_id, status')
        .neq('status', 'archived');

      const { data: casualWorkers } = await supabase
        .from('casual_payrolls')
        .select('id, worker_name, nic_or_id, estate_id, wage_type');

      const list: any[] = [];
      if (permWorkers && permWorkers.length > 0) {
        permWorkers.forEach((w: any) => {
          list.push({ ...w, worker_type: 'Permanent' });
        });
      }
      if (casualWorkers && casualWorkers.length > 0) {
        const uniqueCasuals = new Map<string, any>();
        casualWorkers.forEach((c: any) => {
          const key = (c.nic_or_id || c.worker_name || '').toLowerCase().trim();
          if (key && !uniqueCasuals.has(key)) {
            uniqueCasuals.set(key, {
              id: c.id,
              worker_id: c.nic_or_id || 'CASUAL',
              first_name: c.worker_name,
              last_name: `(${c.wage_type || 'Casual'})`,
              photo: null,
              estate_id: c.estate_id,
              worker_type: 'Casual'
            });
          }
        });
        list.push(...Array.from(uniqueCasuals.values()));
      }

      if (list.length > 0) {
        setWorkers(list);
      } else {
        const res = await apiClient.get('/workforce/workers');
        if (res.success && res.data) setWorkers(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch workers:", error);
    }
  };

  const fetchWorkerEarnings = async (id: any) => {
    if (!id) {
      setWorkerEarnings(0);
      return;
    }
    try {
      const selectedW = workers.find((w: any) => w.id === id || w.worker_id === id);
      const uuid = selectedW?.id || id;
      const epf = selectedW?.worker_id || id;
      const searchName = (selectedW?.first_name || '').toLowerCase().trim();

      const pad = (n: number) => String(n).padStart(2, '0');
      const startOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-01`;
      const lastDayNum = new Date(selectedDate.year, selectedDate.month, 0).getDate();
      const endOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-${pad(lastDayNum)}`;

      let totalEarnings = 0;
      let foundEntries = false;

      // 1. Query Supabase for permanent monthly payroll_batches + payroll_entries in this month
      const { data: batches, error } = await supabase
        .from('payroll_batches')
        .select('id, batch_date, task_type, estate_id, payroll_entries(*)')
        .gte('batch_date', startOfMonth)
        .lte('batch_date', endOfMonth);

      if (!error && batches && batches.length > 0) {
        batches.forEach((b: any) => {
          (b.payroll_entries || []).forEach((e: any) => {
            if (e.worker_id === uuid || e.worker_id === epf || e.worker_epf === epf || e.worker_epf === uuid) {
              totalEarnings += parseFloat(e.wage) || 0;
              foundEntries = true;
            }
          });
        });
      }

      // 2. Query Supabase for casual_payrolls in this month
      const { data: casuals } = await supabase
        .from('casual_payrolls')
        .select('gross_pay, worker_name, nic_or_id')
        .gte('start_date', startOfMonth)
        .lte('end_date', endOfMonth);

      if (casuals && casuals.length > 0) {
        casuals.forEach((c: any) => {
          const cName = (c.worker_name || '').toLowerCase().trim();
          const cId = c.nic_or_id;
          if ((cId && (cId === epf || cId === uuid)) || (cName && searchName && cName.includes(searchName))) {
            totalEarnings += parseFloat(c.gross_pay) || 0;
            foundEntries = true;
          }
        });
      }

      if (foundEntries) {
        setWorkerEarnings(totalEarnings);
        return;
      }

      // Fallback to API mock response if no Supabase entries exist
      const res = await apiClient.get(`/payrall/worker-earnings/${id}?year=${selectedDate.year}&month=${selectedDate.month}`);
      if (res.success) setWorkerEarnings((res as any).earnings || (res.data as any)?.earnings || 0);
      else setWorkerEarnings(0);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
      setWorkerEarnings(0);
    }
  };

  const handleOpenModal = () => {
    const defaultEst = !isUserAdmin && profile?.estate_id ? profile.estate_id : (selectedEstateFilter !== 'all' ? selectedEstateFilter : 'all');
    setModalEstateFilter(defaultEst);
    setShowAddModal(true);
  };

  const handleAddAdvance = async (e: any) => {
    e.preventDefault();
    if (isLockedForUser) {
      alert(`Payroll for ${monthNames[selectedDate.month - 1]} ${selectedDate.year} is Confirmed & Locked. Cash advances cannot be modified except by Super Admin.`);
      return;
    }
    if (parseFloat(formData.amount) > workerEarnings) {
      if (!window.confirm(`Warning: Advance amount (Rs ${formData.amount}) exceeds current earnings (Rs ${workerEarnings}). Proceed anyway?`)) return;
    }

    try {
      const selectedW = workers.find((w: any) => w.id === formData.worker_id || w.worker_id === formData.worker_id);
      const payload = {
        worker_id: selectedW?.id || null,
        worker_name: formData.worker_name,
        worker_epf: selectedW?.worker_id || null,
        estate_id: formData.estate_id || selectedW?.estate_id || (selectedEstateFilter !== 'all' ? selectedEstateFilter : profile?.estate_id),
        advance_date: formData.advance_date,
        amount: parseFloat(formData.amount) || 0,
        reason: formData.reason || 'Monthly Advance',
        created_by: profile?.id
      };

      const { error } = await supabase.from('cash_advances').insert([payload]);
      if (error) {
        console.warn('Supabase insert failed, using fallback:', error);
        await apiClient.post('/payrall/advances', formData);
      }

      setShowAddModal(false);
      fetchAdvances();
      setFormData({ worker_id: "", worker_name: "", estate_id: "", advance_date: new Date().toISOString().split('T')[0], amount: "", reason: "Monthly Advance" });
      setWorkerSearch("");
    } catch (error) {
      console.error("Failed to log advance:", error);
      alert("Failed to log advance");
    }
  };

  const handleDelete = async (id: any) => {
    if (isLockedForUser) {
      alert(`Payroll for ${monthNames[selectedDate.month - 1]} ${selectedDate.year} is Confirmed & Locked. Cash advances cannot be modified except by Super Admin.`);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this advance record?")) return;
    try {
      const { error } = await supabase.from('cash_advances').delete().eq('id', id);
      if (error) {
        await apiClient.delete(`/payrall/advances/${id}`);
      }
      fetchAdvances();
    } catch (error) {
      alert("Failed to delete record");
    }
  };

  const changeMonth = (delta: number) => {
    setSelectedDate(prev => {
      let newMonth = prev.month + delta;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      else if (newMonth < 1) { newMonth = 12; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedEstateFilter, selectedDate]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const estateMap = useMemo(() => {
    const m: Record<string, string> = {};
    estates.forEach(e => { m[e.id] = e.name; });
    return m;
  }, [estates]);

  const modalFilteredWorkers = workers.filter((w: any) => {
    const matchesEstate = modalEstateFilter === 'all' || w.estate_id === modalEstateFilter || !w.estate_id;
    const fullName = `${w.first_name || ''} ${w.last_name || ''}`.toLowerCase();
    const workerId = (w.worker_id || w.id || '').toString().toLowerCase();
    const query = workerSearch.toLowerCase().trim();
    const matchesSearch = !query || fullName.includes(query) || workerId.includes(query);
    return matchesEstate && matchesSearch;
  });

  const filteredAdvances = useMemo(() => {
    return advances.filter((i: any) => {
      const matchesEstate = selectedEstateFilter === 'all' || i.estate_id === selectedEstateFilter || !i.estate_id;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        (i.worker_name || '').toLowerCase().includes(q) || 
        (i.worker_epf || i.worker_id || '').toString().toLowerCase().includes(q) ||
        (i.reason || '').toLowerCase().includes(q);
      return matchesEstate && matchesSearch;
    });
  }, [advances, selectedEstateFilter, searchTerm]);

  const paginatedAdvances = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdvances.slice(start, start + itemsPerPage);
  }, [filteredAdvances, currentPage, itemsPerPage]);

  const columns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (advance) => (
        <span className="font-medium text-slate-600 dark:text-slate-300">
          {new Date(advance.advance_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Beneficiary",
      cell: (advance) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{advance.worker_name}</div>
          <div className="text-[10px] text-slate-400 font-mono">ID: {advance.worker_epf || advance.worker_id}</div>
        </div>
      )
    },
    ...(selectedEstateFilter === 'all' ? [{
      header: "Estate",
      cell: (advance: any) => (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-md">
          {estateMap[advance.estate_id] || 'General'}
        </span>
      )
    }] : []),
    {
      header: "Reason / Context",
      cell: (advance) => (
        <span className="text-slate-500 dark:text-slate-400 italic">
          {advance.reason}
        </span>
      )
    },
    {
      header: "Advance Amount",
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (advance) => (
        <span className="font-bold text-tea-700 dark:text-tea-400">
          Rs {parseFloat(advance.amount || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: "Actions",
      headerClassName: "text-center",
      cellClassName: "text-center",
      cell: (advance) => (
        isLockedForUser ? (
          <span title="Payroll Locked"><Lock size={14} className="text-slate-400 inline" /></span>
        ) : (
          <button 
            onClick={() => handleDelete(advance.id)} 
            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 rounded-lg transition-all" 
            title="Delete record"
          >
            <Trash2 size={14} />
          </button>
        )
      )
    }
  ];

  return (
    <div className="pb-16 space-y-5 animate-in fade-in duration-300">
      {isLockedForUser && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <Lock size={16} className="shrink-0 text-amber-600" />
          <span>Payroll for {monthNames[selectedDate.month - 1]} {selectedDate.year} is Confirmed & Locked. Cash advances cannot be modified except by Super Admin.</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Cash Advance Portal</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isUserAdmin && (
            <select
              value={selectedEstateFilter}
              onChange={e => setSelectedEstateFilter(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 min-w-[140px]"
            >
              <option value="all">All Estates</option>
              {estates.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 rounded-xl px-2 py-1 shadow-sm border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">{monthNames[selectedDate.month - 1]} {selectedDate.year}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><ChevronRight size={16} /></button>
          </div>

          {isLockedForUser ? (
            <button 
              disabled
              title="Payroll is confirmed & locked"
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-semibold rounded-full cursor-not-allowed border border-slate-200 dark:border-slate-700"
            >
              <Lock size={14} /> Locked
            </button>
          ) : (
            <button 
              onClick={handleOpenModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-tea-600 text-white text-xs font-semibold rounded-full hover:bg-tea-700 transition-all shadow-sm"
            >
              <Plus size={15} /> New Advance
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-tea-50 dark:bg-tea-900/30 text-tea-600 dark:text-tea-400"><Wallet size={20} /></div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Issued ({monthNames[selectedDate.month-1]})</p>
            <h3 className="text-2xl font-bold text-tea-700 dark:text-tea-400">Rs {filteredAdvances.reduce((acc, i: any) => acc + parseFloat(i.amount || 0), 0).toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"><User size={20} /></div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Beneficiaries</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{[...new Set(filteredAdvances.map((i: any) => i.worker_id))].length} <span className="text-xs text-slate-400 font-medium">Workers</span></h3>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"><TrendingUp size={20} /></div>
          <div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Avg. Advance / Worker</p>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
               Rs {(filteredAdvances.length > 0 ? (filteredAdvances.reduce((acc, i: any) => acc + parseFloat(i.amount || 0), 0) / [...new Set(filteredAdvances.map((i: any) => i.worker_id))].length) : 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
            </h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-1">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <History size={16} className="text-tea-600 dark:text-tea-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Advance Disbursement History</h2>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search worker or reason..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-tea-500 transition-all"
            />
          </div>
        </div>
        
        <DataTable
          columns={columns}
          data={paginatedAdvances}
          loading={loading}
          emptyMessage="No advances issued for this period"
          pagination={{
            page: currentPage,
            pageSize: itemsPerPage,
            totalCount: filteredAdvances.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: (newSize) => { setItemsPerPage(newSize); setCurrentPage(1); },
          }}
        />
      </div>

      {/* New Advance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Disburse Cash Advance</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddAdvance} className="p-5 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Estate</label>
                <select
                  value={modalEstateFilter}
                  disabled={!isUserAdmin}
                  onChange={e => {
                    const newEst = e.target.value;
                    setModalEstateFilter(newEst);
                    if (formData.worker_id) {
                      const currW = workers.find((w: any) => (w.id === formData.worker_id || w.worker_id === formData.worker_id));
                      if (currW && newEst !== 'all' && currW.estate_id !== newEst) {
                        setFormData(prev => ({ ...prev, worker_id: "", worker_name: "" }));
                      }
                    }
                  }}
                  className={`w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500 ${
                    !isUserAdmin ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isUserAdmin && <option value="all">All Estates</option>}
                  {estates.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 relative" ref={workerDropdownRef}>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Identify Beneficiary (Worker Directory)</label>
                <div 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between cursor-pointer group hover:border-tea-500/50 transition-all"
                  onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className={`text-xs font-semibold truncate ${formData.worker_id ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {formData.worker_name || "Search and select worker..."}
                    </span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform shrink-0 ${showWorkerDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showWorkerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Search worker by name or ID..."
                          value={workerSearch}
                          onChange={(e) => setWorkerSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border-none rounded-lg text-xs focus:ring-0 outline-none text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
                      {modalFilteredWorkers.length > 0 ? modalFilteredWorkers.map((w: any) => {
                        const isSelected = formData.worker_id === w.id || formData.worker_id === w.worker_id;
                        return (
                          <div 
                            key={w.id || w.worker_id}
                            className={`px-4 py-2.5 hover:bg-tea-50 dark:hover:bg-tea-900/20 cursor-pointer flex items-center justify-between group transition-colors ${
                              isSelected ? 'bg-tea-50/70 dark:bg-tea-900/30' : ''
                            }`}
                            onClick={() => {
                              setFormData({
                                ...formData, 
                                worker_id: w.id || w.worker_id, 
                                worker_name: `${w.first_name || ''} ${w.last_name || ''}`.trim(),
                                estate_id: w.estate_id || modalEstateFilter
                              });
                              setShowWorkerDropdown(false);
                              setWorkerSearch("");
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {w.photo ? (
                                <img src={w.photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                  <User size={14} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 dark:text-white group-hover:text-tea-700 dark:group-hover:text-tea-400 transition-colors truncate">
                                  {w.first_name} {w.last_name}
                                </p>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-mono">ID: {w.worker_id || w.id}</span>
                                  {w.estate_id && estateMap[w.estate_id] && (
                                    <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] rounded font-medium">
                                      {estateMap[w.estate_id]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isSelected && <Check size={14} className="text-tea-600 shrink-0" />}
                          </div>
                        );
                      }) : (
                        <div className="p-4 text-center text-slate-400 text-xs font-medium">No workers found in Directory</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {formData.worker_id && (
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between group overflow-hidden relative shadow-inner">
                   <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                      <TrendingUp size={80} className="text-white" />
                   </div>
                   <div className="z-10">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Month Earnings</p>
                      <p className="text-2xl font-bold text-white leading-none">Rs {workerEarnings.toLocaleString()}</p>
                   </div>
                   <div className="text-right z-10">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Max Recommended</p>
                      <p className="text-xs font-bold text-emerald-400">Rs {(workerEarnings * 0.75).toLocaleString()}</p>
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Issue Date</label>
                  <input 
                    type="date" required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                    value={formData.advance_date}
                    onChange={(e) => setFormData({...formData, advance_date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Amount (Rs)</label>
                  <input 
                    type="number" required min="1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-base font-bold text-tea-700 dark:text-tea-400 outline-none focus:border-tea-500"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason / Memo</label>
                <input 
                  type="text" 
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                  placeholder="E.g. Medical emergency, School fees..."
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={!formData.worker_id || !formData.amount}
                className="w-full py-2.5 bg-tea-600 hover:bg-tea-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                Confirm Disbursement
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
