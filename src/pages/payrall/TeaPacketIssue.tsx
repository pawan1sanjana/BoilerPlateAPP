import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Package, 
  Plus, 
  Search, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  Tag,
  History,
  X,
  Check,
  ChevronDown,
  User,
  ArrowRight,
  Lock
} from "lucide-react";
import { Link } from "react-router-dom";
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { isAdmin } from '../../lib/roleUtils';
import type { AppRole } from '../../store/useModulePermissionsStore';
import { usePayrollLock } from '../../lib/payrollLockUtils';
import { supabase } from '../../lib/supabase';
import { DataTable } from '../../components/ui/data-table';
import type { ColumnDef } from '../../components/ui/data-table';

export default function TeaPacketIssue() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [loading, setLoading] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [stock, setStock] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
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
    issue_date: new Date().toISOString().split('T')[0],
    grade: "BOPF",
    size_grams: 500,
    quantity: 1,
    unit_price: 0
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Auto-set estate for non-admin users
  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
      setModalEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile?.estate_id]);

  useEffect(() => {
    fetchEstates();
  }, []);

  useEffect(() => {
    fetchIssues();
    fetchStock();
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

  const modalAvailableStock = useMemo(() => {
    return stock.filter((s: any) => {
      if (modalEstateFilter === 'all') return true;
      return !s.estate_id || s.estate_id === modalEstateFilter;
    });
  }, [stock, modalEstateFilter]);

  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    modalAvailableStock.forEach((s: any) => {
      if (s.grade) set.add(s.grade);
    });
    return Array.from(set);
  }, [modalAvailableStock]);

  const availableSizes = useMemo(() => {
    return modalAvailableStock.filter((s: any) => s.grade === formData.grade);
  }, [modalAvailableStock, formData.grade]);

  const selectedPacket = useMemo(() => {
    return modalAvailableStock.find((s: any) => 
      s.grade === formData.grade && parseInt(s.size_grams) === parseInt(formData.size_grams as any)
    );
  }, [modalAvailableStock, formData.grade, formData.size_grams]);

  useEffect(() => {
    if (availableGrades.length > 0 && !availableGrades.includes(formData.grade)) {
      setFormData(prev => ({ ...prev, grade: availableGrades[0] }));
    }
  }, [availableGrades, formData.grade]);

  useEffect(() => {
    if (selectedPacket) {
      setFormData(prev => ({ ...prev, unit_price: parseFloat(selectedPacket.unit_price) || 0 }));
    } else if (availableSizes.length > 0) {
      const first = availableSizes[0];
      setFormData(prev => ({
        ...prev,
        size_grams: first.size_grams,
        unit_price: parseFloat(first.unit_price) || 0
      }));
    } else {
      setFormData(prev => ({ ...prev, unit_price: 0 }));
    }
  }, [selectedPacket, availableSizes]);

  const fetchEstates = async () => {
    try {
      const { data } = await supabase.from('estates').select('id, name');
      if (data) setEstates(data);
    } catch (e) {
      console.error('Failed to fetch estates:', e);
    }
  };

  const estateMap = useMemo(() => {
    const map: Record<string, string> = {};
    estates.forEach(e => { map[e.id] = e.name; });
    return map;
  }, [estates]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const pad = (n: number) => String(n).padStart(2, '0');
      const startOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-01`;
      const lastDayNum = new Date(selectedDate.year, selectedDate.month, 0).getDate();
      const endOfMonth = `${selectedDate.year}-${pad(selectedDate.month)}-${pad(lastDayNum)}`;

      let query = supabase
        .from('tea_packet_issues')
        .select('*')
        .gte('issue_date', startOfMonth)
        .lte('issue_date', endOfMonth);

      if (selectedEstateFilter !== 'all') {
        query = query.eq('estate_id', selectedEstateFilter);
      } else if (!isUserAdmin && profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }

      const { data, error } = await query.order('issue_date', { ascending: false });

      if (!error && data) {
        setIssues(data);
      } else {
        const res = await apiClient.get(`/tea-packets/issues?year=${selectedDate.year}&month=${selectedDate.month}`);
        if (res.success) setIssues(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_tea_packets')
        .select('*');

      if (!error && data) {
        setStock(data);
      } else {
        const res = await apiClient.get('/tea-packets/stock');
        if (res.success && Array.isArray(res.data)) setStock(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
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

  const handleAddIssue = async (e: any) => {
    e.preventDefault();
    if (isLockedForUser) {
      alert("Payroll for this month is locked for editing.");
      return;
    }

    const matchStock = selectedPacket;
    const currentStock = matchStock?.current_stock || 0;
    
    if (!matchStock || formData.quantity > currentStock) {
      alert(`Insufficient stock! Available: ${currentStock}`);
      return;
    }

    const unitPrice = parseFloat(matchStock.unit_price) || formData.unit_price || 0;
    const totalPrice = (formData.quantity * unitPrice);
    const selectedEstId = formData.estate_id || (modalEstateFilter !== 'all' ? modalEstateFilter : (profile?.estate_id || null));

    try {
      const selectedW = workers.find((w: any) => w.id === formData.worker_id || w.worker_id === formData.worker_id);
      const payload = {
        estate_id: selectedEstId,
        worker_id: selectedW?.id || null,
        worker_name: formData.worker_name,
        worker_epf: selectedW?.worker_id || formData.worker_id,
        grade: formData.grade,
        size_grams: parseInt(formData.size_grams as any),
        quantity: parseInt(formData.quantity as any),
        unit_price: unitPrice,
        total_price: totalPrice,
        issue_date: formData.issue_date
      };

      const { error } = await supabase.from('tea_packet_issues').insert([payload]);
      if (error) {
        await apiClient.post('/tea-packets/issues', payload);
      }

      // Update current stock in inventory_tea_packets
      if (matchStock?.id) {
        await supabase
          .from('inventory_tea_packets')
          .update({ current_stock: Math.max(0, matchStock.current_stock - formData.quantity) })
          .eq('id', matchStock.id);
      }

      setShowAddModal(false);
      fetchIssues();
      fetchStock();
      setFormData(prev => ({ ...prev, worker_id: "", worker_name: "", quantity: 1 }));
      setWorkerSearch("");
    } catch (error: any) {
      alert("Failed to log issue: " + error.message);
    }
  };

  const handleDelete = async (id: any) => {
    if (isLockedForUser) {
      alert("Payroll for this month is locked for editing.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this issue record?")) return;
    try {
      const { error } = await supabase.from('tea_packet_issues').delete().eq('id', id);
      if (error) {
        await apiClient.delete(`/tea-packets/issues/${id}`);
      }
      fetchIssues();
    } catch (error) {
      alert("Failed to delete issue");
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

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const modalFilteredWorkers = useMemo(() => {
    return workers.filter((w: any) => {
      const matchesEstate = modalEstateFilter === 'all' || w.estate_id === modalEstateFilter || !w.estate_id;
      const q = workerSearch.toLowerCase().trim();
      const fullName = `${w.first_name || ''} ${w.last_name || ''}`.toLowerCase();
      const matchesSearch = !q || fullName.includes(q) || (w.worker_id || '').toString().toLowerCase().includes(q);
      return matchesEstate && matchesSearch;
    });
  }, [workers, modalEstateFilter, workerSearch]);

  const filteredIssues = useMemo(() => {
    return issues.filter((i: any) => {
      const matchesEstate = selectedEstateFilter === 'all' || i.estate_id === selectedEstateFilter || !i.estate_id;
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        (i.worker_name || '').toLowerCase().includes(q) || 
        (i.worker_epf || i.worker_id || '').toString().toLowerCase().includes(q) ||
        (i.grade || '').toLowerCase().includes(q);
      return matchesEstate && matchesSearch;
    });
  }, [issues, selectedEstateFilter, searchTerm]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIssues.slice(start, start + itemsPerPage);
  }, [filteredIssues, currentPage, itemsPerPage]);

  const columns: ColumnDef<any>[] = [
    {
      header: "Issue Date",
      cell: (item) => (
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          {new Date(item.issue_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Worker",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <User size={14} />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white">{item.worker_name}</div>
            <div className="text-[10px] text-slate-400 font-mono">ID: {item.worker_epf || item.worker_id || 'N/A'}</div>
          </div>
        </div>
      )
    },
    {
      header: "Estate",
      cell: (item) => {
        const estId = item.estate_id;
        const estName = estId ? (estateMap[estId] || estId) : "N/A";
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {estName}
          </span>
        );
      }
    },
    {
      header: "Packet Details",
      cell: (item) => (
        <div className="flex items-center gap-2">
          <span className="bg-tea-50 dark:bg-tea-900/30 text-tea-700 dark:text-tea-300 px-2 py-0.5 rounded-full font-bold text-xs uppercase">{item.grade}</span>
          <span className="text-slate-500 font-medium">{item.size_grams}g</span>
        </div>
      )
    },
    {
      header: "Qty",
      cell: (item) => (
        <span className="font-extrabold text-slate-900 dark:text-white">{item.quantity}</span>
      )
    },
    {
      header: "Total Value",
      cell: (item) => {
        const val = parseFloat(item.total_price || (item.quantity * item.unit_price) || 0);
        return (
          <span className="font-black text-rose-600 dark:text-rose-400">
            Rs {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      }
    },
    {
      header: "Actions",
      headerClassName: "text-center",
      cellClassName: "text-center",
      cell: (item) => (
        <button 
          onClick={() => handleDelete(item.id)} 
          disabled={isLockedForUser}
          className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title={isLockedForUser ? "Payroll is locked" : "Delete issue record"}
        >
          <Trash2 size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Tea Packet Distribution</h1>
            {isLockedForUser && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                <Lock size={12} /> Locked
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link 
            to="/inventory/tea-packets"
            className="hidden md:flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
          >
            Manage Stock <ArrowRight size={14} />
          </Link>

          {/* Estate Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedEstateFilter}
              disabled={!isUserAdmin}
              onChange={e => {
                const val = e.target.value;
                setSelectedEstateFilter(val);
                setModalEstateFilter(val);
                setCurrentPage(1);
              }}
              className={`p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-tea-500 ${
                !isUserAdmin ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isUserAdmin && <option value="all">All Estates</option>}
              {estates.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-2">{monthNames[selectedDate.month - 1]} {selectedDate.year}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"><ChevronRight size={16} /></button>
          </div>

          <button 
            onClick={() => {
              if (isLockedForUser) {
                alert("Payroll for this month is locked for editing.");
                return;
              }
              setShowAddModal(true);
            }}
            disabled={isLockedForUser}
            className="flex items-center gap-1.5 px-4 py-2 bg-tea-600 text-white text-xs font-bold rounded-xl hover:bg-tea-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Log Issue
          </button>
        </div>
      </div>

      {/* Lock Notice Banner */}
      {isLockedForUser && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs">
          <div className="flex items-center gap-2.5 font-medium">
            <Lock size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Payroll records for <strong>{monthNames[selectedDate.month - 1]} {selectedDate.year}</strong> have been confirmed and locked. Issue modifications are restricted.</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-tea-100 dark:bg-tea-900/30 text-tea-600"><Package size={20} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 font-outfit">Packets Issued</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{filteredIssues.reduce((acc, i: any) => acc + (parseInt(i.quantity) || 0), 0)} <span className="text-xs text-slate-400 font-normal">Units</span></h3>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/30 text-rose-600"><Tag size={20} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 font-outfit">Financial Impact</p>
            <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400">Rs {filteredIssues.reduce((acc, i: any) => acc + (parseFloat(i.total_price || (i.quantity * i.unit_price)) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600"><User size={20} /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 font-outfit">Beneficiaries</p>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{[...new Set(filteredIssues.map((i: any) => i.worker_name))].length} <span className="text-xs text-slate-400 font-normal">Workers</span></h3>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-tea-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-outfit">Distribution Registry</h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search worker or grade..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:border-tea-500 transition-all"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginatedIssues}
          loading={loading}
          pagination={{
            page: currentPage,
            pageSize: itemsPerPage,
            totalCount: filteredIssues.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: (newSize) => { setItemsPerPage(newSize); setCurrentPage(1); },
          }}
        />
      </div>

      {/* New Issue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-outfit">Issue Packet to Worker</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all"><X size={16} /></button>
            </div>
            <form onSubmit={handleAddIssue} className="p-5 space-y-4">
              
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
                                  {w.worker_type && (
                                    <span className={`px-1.5 py-0.2 text-[9px] rounded font-medium ${w.worker_type === 'Permanent' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                      {w.worker_type}
                                    </span>
                                  )}
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

              {availableGrades.length === 0 && (
                <div className="p-3 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-xs font-semibold">
                  <AlertCircle size={16} className="shrink-0 text-amber-600" />
                  <span>No tea packet stock registered for this estate. Please add stock in Manage Stock first.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Issue Date</label>
                  <input 
                    type="date" required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                    value={formData.issue_date}
                    onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tea Grade</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                  >
                    {availableGrades.map((g: any) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Size (Grams)</label>
                  <select 
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                    value={formData.size_grams}
                    onChange={(e) => setFormData({...formData, size_grams: parseInt(e.target.value)})}
                  >
                    {availableSizes.map((s: any) => (
                      <option key={s.id || s.size_grams} value={s.size_grams}>{s.size_grams}g</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Quantity</label>
                  <input 
                    type="number" min="1" required
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-tea-500"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              {selectedPacket && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border flex flex-col justify-center ${selectedPacket.current_stock < formData.quantity ? 'bg-rose-50 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50' : 'bg-tea-50 border-tea-100 dark:bg-tea-950/30 dark:border-tea-900/50'}`}>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">In Stock</p>
                    <div className="flex items-end gap-1">
                      <span className={`text-xl font-bold leading-none ${selectedPacket.current_stock < formData.quantity ? 'text-rose-600 dark:text-rose-400' : 'text-tea-600 dark:text-tea-400'}`}>
                        {selectedPacket.current_stock}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 pb-0.5">Units</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Deduction (Total)</p>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-bold leading-none text-slate-900 dark:text-white">
                        {((formData.quantity || 1) * (formData.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 pb-0.5">Rs</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedPacket && selectedPacket.current_stock < formData.quantity && (
                <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="text-xs font-semibold">Warning: Insufficient stock available</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={!formData.worker_id || (selectedPacket && selectedPacket.current_stock < formData.quantity)}
                className="w-full py-2.5 bg-tea-600 text-white text-xs font-bold rounded-xl hover:bg-tea-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Distribution
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
