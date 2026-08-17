import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Eye, FileText, Smartphone, User, Shield, Download, X, Award, CreditCard, Leaf, Trash2, Edit2, Loader2, Archive, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useAppInfoStore } from '@/store/useAppInfoStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

export default function WorkerView() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'docs', 'stats'
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archiveDate, setArchiveDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Design Alignment State
  const [filterWageType, setFilterWageType] = useState('All');
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const idCardRef = useRef(null);
  const { appName, appIcon } = useAppInfoStore();

  const [estates, setEstates] = useState([]);

  const location = useLocation();

  const fetchWorkers = async () => {
    try {
      const { data, error } = await supabase.from('workforce').select('*, estates(name)').neq('status', 'archived');
      if (error) throw error;
      
      if (data) {
        setWorkers(data);
        
        // Handle Audit Deep-Linking
        if (location.state?.auditWorkerId) {
          const target = data.find(w => w.id === location.state.auditWorkerId);
          if (target) {
            setSelectedWorker(target);
            setSearchTerm(target.worker_id); // Highlight in list too
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch workers:', error);
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
    fetchWorkers();
    fetchEstates();
  }, []);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleUpdateWorker = async () => {
    setIsUpdating(true);
    try {
      const { estates, ...updateData } = editForm;
      const { error } = await supabase.from('workforce').update(updateData).eq('id', editForm.id);
      if (!error) {
        setShowEditModal(false);
        if (selectedWorker && selectedWorker.id === editForm.id) {
          setSelectedWorker({ ...selectedWorker, ...editForm });
        }
        fetchWorkers(); // Refresh global list
        alert('Worker details updated successfully!');
      } else {
        alert(error.message || 'Failed to update worker details.');
      }
    } catch (error) {
      console.error('Failed to update worker:', error);
      alert(error.message || 'An error occurred while saving worker details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmArchive = async () => {
    try {
      const { error } = await supabase.from('workforce').update({ 
        status: 'archived',
        archived_at: archiveDate ? new Date(archiveDate).toISOString() : new Date().toISOString()
      }).eq('id', selectedWorker.id);
      if (!error) {
        setShowArchiveConfirm(false);
        setSelectedWorker(null);
        fetchWorkers();
      }
    } catch (error) {
      console.error('Failed to archive worker:', error);
      setShowArchiveConfirm(false);
    }
  };

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = 
      worker.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.worker_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.nic?.toLowerCase().includes(searchTerm.toLowerCase());
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

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleDownload = (base64Data, fileName) => {
    if (!base64Data) return;
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadIdCard = async () => {
    if (!idCardRef.current) return;
    try {
      // 1. Fetch QR as Blob/Base64
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedWorker.worker_id || 'UNKNOWN')}`;
      const qrResponse = await fetch(qrUrl);
      const qrBlob = await qrResponse.blob();
      const qrBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(qrBlob);
      });

      // 2. Prep for capture
      const qrImg = idCardRef.current.querySelector('img[alt="Worker QR"]');
      const originalSrc = qrImg.src;
      qrImg.src = qrBase64;

      await new Promise(r => setTimeout(r, 100)); // Brief pause for state/DOM catchup

      const canvas = await html2canvas(idCardRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0f172a',
        scale: 3,
        logging: true, // Output logs to user browser console
      });

      qrImg.src = originalSrc; // Restore

      const imgData = canvas.toDataURL('image/png');
      
      // 3. Setup PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [85, 54] // Standard credit card size in mm
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 85, 54);
      pdf.save(`Worker_ID_${selectedWorker.worker_id}.pdf`);

    } catch (error) {
      console.error('PDF Generation Error:', error);
      alert('PDF Generation failed. Check console for details.');
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: "Workers Profile",
      cell: (worker) => (
        <div className="flex items-center gap-4">
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
        <div>
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
      header: "Contact Channel",
      cell: (worker) => (
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{worker.tel}</span>
        </div>
      )
    },
    {
      header: "Status",
      cell: (worker) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${worker.status === 'archived' ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            {worker.status || 'Active'}
          </span>
        </div>
      )
    },
    {
      header: "Actions",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (worker) => (
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedWorker(worker); setActiveTab('overview');  }} className="text-slate-500" title="View Detailed File">
            <Eye size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setEditForm({ ...worker }); setShowEditModal(true); }} className="text-blue-500" title="Quick Edit">
            <Edit2 size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => { setSelectedWorker(worker); setShowArchiveConfirm(true); }} className="text-red-500" title="Archive Profile">
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Worker Directory</h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-outfit">
            <Download size={16} /> Export Reports
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-tea-100 dark:bg-tea-900/30">
              <User size={22} className="text-tea-600 dark:text-tea-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{workers.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-emerald-100 dark:bg-emerald-900/30">
              <Shield size={22} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Permanent</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {workers.filter(w => w.wage_type === 'permanent' || !w.wage_type).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-sky-100 dark:bg-sky-900/30">
              <CreditCard size={22} className="text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Daily Cash</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {workers.filter(w => w.wage_type === 'daily_cash').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-blue-100 dark:bg-blue-900/30">
              <FileText size={22} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Contract</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {workers.filter(w => w.wage_type === 'contract').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-purple-100 dark:bg-purple-900/30">
              <Award size={22} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {workers.filter(w => w.status !== 'archived').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="p-0 overflow-hidden shadow-sm border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              type="text"
              placeholder="Search name, ID, NIC number..."
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
          emptyMessage="No matching workers profiles"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredWorkers.length,
            onPageChange: paginate,
            onPageSizeChange: (newSize) => {
              setEntriesPerPage(newSize);
              setCurrentPage(1); // Reset to first page when changing page size
            },
          }}
        />
      </Card>

      {/* Deep Workers Modal */}
      {selectedWorker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedWorker(null)}></div>
          <div className="relative w-full max-w-6xl md:h-[85vh] bg-white dark:bg-slate-950 rounded-[32px] md:rounded-[48px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in border border-white/10 my-auto">
            
            {/* Sidebar / Profile Summary */}
            <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-900/50 p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
               <div className="flex flex-row md:flex-col items-center gap-4 md:gap-0 md:text-center md:space-y-6 mb-4 md:mb-8">
                <div className="relative inline-block shrink-0">
                  <div className="w-20 h-20 md:w-40 md:h-40 rounded-full md:rounded-[48px] overflow-hidden border-2 md:border-4 border-white dark:border-slate-800 shadow-xl mx-auto bg-slate-100 dark:bg-slate-800">
                    {selectedWorker.photo ? (
                      <img 
                        src={selectedWorker.photo.startsWith('data:') ? selectedWorker.photo : `/api/uploads/${selectedWorker.photo}`} 
                        className="w-full h-full object-cover" 
                        alt=""
                      />
                    ) : (
                      <User size={32} className="m-auto text-slate-300 mt-6 md:mt-10" />
                    )}
                  </div>
                </div>
                
                <div className="min-w-0">
                  <h2 className="text-lg md:text-2xl font-black dark:text-white font-outfit leading-tight break-words">{selectedWorker.first_name} {selectedWorker.last_name}</h2>
                  <p className="text-[8px] md:text-[10px] font-black text-tea-600 dark:text-tea-400 uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1 md:mt-2">{selectedWorker.worker_id}</p>
                  <div className="mt-2 md:mt-4 flex flex-wrap gap-2 justify-center">
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                      selectedWorker.wage_type === 'permanent' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      selectedWorker.wage_type === 'daily_cash' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                      'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {selectedWorker.wage_type?.replace('_', ' ') || 'Permanent'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:block space-y-3 mt-auto">
                 <div className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mt-auto">
                    <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                       <Smartphone size={18} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Contact</p>
                       <p className="text-sm font-bold dark:text-white mt-1 truncate">{selectedWorker.tel}</p>
                    </div>
                 </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
               {/* Modal Navigation */}
               <div className="px-4 md:px-8 pt-4 md:pt-8 flex items-center justify-between shrink-0">
                  <div className="flex gap-4 md:gap-8 border-b border-slate-100 dark:border-slate-800 w-full overflow-x-auto no-scrollbar">
                     {['overview', 'docs'].map((tab) => (
                       <button 
                         key={tab}
                         onClick={() => setActiveTab(tab)}
                         className={`pb-3 md:pb-4 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all relative shrink-0 ${activeTab === tab ? 'text-tea-600' : 'text-slate-400 hover:text-slate-600'}`}
                       >
                         {tab}
                         {activeTab === tab && (
                           <div className="absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-tea-600 rounded-full animate-in slide-in-from-left-2"></div>
                         )}
                       </button>
                     ))}
                  </div>
                  <button onClick={() => setSelectedWorker(null)} className="ml-4 md:ml-6 p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full text-slate-400 transition-all">
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
               </div>

               {/* Tab Content */}
               <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar space-y-8 md:space-y-12">
                  {activeTab === 'overview' && (
                    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                          <div className="space-y-6">
                             <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                Personal Information
                             </h4>
                             <dl className="grid grid-cols-1 gap-6">
                                <div>
                                   <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name with Initials</dt>
                                   <dd className="text-base font-bold dark:text-white mt-1 uppercase">{selectedWorker.full_name_initials}</dd>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div>
                                      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</dt>
                                      <dd className="text-sm font-bold dark:text-white mt-1 uppercase">{selectedWorker.first_name}</dd>
                                   </div>
                                   <div>
                                      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</dt>
                                      <dd className="text-sm font-bold dark:text-white mt-1 uppercase">{selectedWorker.last_name}</dd>
                                   </div>
                                </div>
                                <div>
                                   <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NIC Number</dt>
                                   <dd className="text-base font-bold dark:text-white mt-1">{selectedWorker.nic}</dd>
                                </div>
                                <div>
                                   <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Residential Address</dt>
                                   <dd className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2 leading-relaxed bg-slate-50 dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                      {selectedWorker.address}
                                   </dd>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   <div>
                                      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Tel</dt>
                                      <dd className="text-sm font-bold dark:text-white mt-1">{selectedWorker.tel}</dd>
                                   </div>
                                   <div>
                                      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wage Category</dt>
                                      <dd className="text-sm font-bold dark:text-white mt-1 capitalize">{selectedWorker.wage_type?.replace('_', ' ') || 'Permanent'}</dd>
                                   </div>
                                   <div>
                                      <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Estate</dt>
                                      <dd className="text-sm font-bold dark:text-white mt-1 capitalize">{selectedWorker.estates?.name || 'Unassigned'}</dd>
                                   </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                   <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Emergency Support Details</h5>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                         <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</dt>
                                         <dd className="text-sm font-bold dark:text-white mt-1 uppercase">{selectedWorker.emergency_contact_name || '--'}</dd>
                                      </div>
                                      <div>
                                         <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Tel</dt>
                                         <dd className="text-sm font-bold dark:text-white mt-1">{selectedWorker.emergency_tel}</dd>
                                      </div>
                                   </div>
                                </div>
                             </dl>
                          </div>
                          
                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-2 md:px-4">
                                <h4 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                   Digital Guard ID Card
                                </h4>
                                <button 
                                   onClick={downloadIdCard}
                                   className="p-2 bg-tea-600 text-white rounded-lg hover:bg-tea-700 transition-all flex items-center gap-1.5 shadow-md shadow-tea-600/20 text-[9px] font-bold uppercase tracking-widest"
                                >
                                   <Download size={12} /> Save PDF
                                </button>
                             </div>

                             <div 
                               ref={idCardRef}
                               style={{
                                 display: 'flex',
                                 flexDirection: 'column',
                                 aspectRatio: '1.6 / 1',
                                 width: '100%',
                                 maxWidth: '450px',
                                 borderRadius: '0px',
                                 background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%)',
                                 padding: '12px',
                                 color: '#ffffff',
                                 position: 'relative',
                                 overflow: 'hidden',
                                 border: '1px solid rgba(255, 255, 255, 0.2)',
                                 boxSizing: 'border-box',
                                 fontFamily: 'system-ui, -apple-system, sans-serif'
                               }}
                             >
                                <div style={{
                                   position: 'absolute',
                                   bottom: 0,
                                   right: 0,
                                   width: '180px',
                                   height: '180px',
                                   backgroundColor: 'rgba(52, 211, 153, 0.05)',
                                   borderRadius: '100%',
                                   transform: 'translate(40px, 40px)',
                                   filter: 'blur(30px)'
                                }}></div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', position: 'relative', zIndex: 10 }}>
                                   <div className="flex flex-col">
                                      <div className="flex items-center gap-2 mb-1">
                                         {appIcon ? (
                                           <img src={appIcon} alt="App Icon" className="w-6 h-6 object-contain shrink-0" crossOrigin="anonymous" />
                                         ) : (
                                           <Leaf className="w-6 h-6 text-emerald-400 shrink-0" />
                                         )}
                                         <span className="text-xl font-bold text-white tracking-wide truncate">{appName || 'TeaERP PRO'}</span>
                                      </div>
                                      <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest m-0">Official Identity</p>
                                   </div>
                                   <div style={{ backgroundColor: '#ffffff', padding: '6px', borderRadius: '4px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', marginTop: '10px' }}>
                                      <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(selectedWorker.worker_id || 'UNKNOWN')}`} 
                                        alt="Worker QR" 
                                        crossOrigin="anonymous"
                                        style={{ width: '85px', height: '85px', display: 'block' }}
                                      />
                                   </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', marginTop: '-60px', position: 'relative', zIndex: 10 }}>
                                   <div style={{ width: '80px', height: '80px', borderRadius: '0', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '0px', marginBottom: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                      {selectedWorker.photo ? (
                                        <img src={selectedWorker.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
                                      ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}><User size={35} /></div>
                                      )}
                                   </div>
                                   
                                   <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>
                                      <h5 style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '900', 
                                        textTransform: 'uppercase', 
                                        margin: '0 0 4px 0', 
                                        lineHeight: 1.3,
                                        color: '#fff',
                                        width: '100%',
                                        display: 'block'
                                      }}>
                                         {selectedWorker.first_name} {selectedWorker.last_name}
                                      </h5>
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                         <span style={{ fontSize: '10px', fontWeight: '800', fontFamily: 'monospace', color: '#10b981', marginRight: '10px' }}>{selectedWorker.worker_id}</span>
                                         <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', marginRight: '10px' }}></div>
                                         <span style={{ fontSize: '7px', fontWeight: '900', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '1px' }}>Verified Profile</span>
                                      </div>
                                   </div>
                                </div>
                             </div>
                             <p className="text-[8px] md:text-[9px] text-slate-400 font-medium text-center uppercase tracking-widest opacity-70 italic">Digital authenticity cryptographically signed via ID-Link</p>
                          </div>
                       </div>
                    </div>
                  )}

                  {activeTab === 'docs' && (
                    <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-2 md:px-4">
                               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID (FRONT)</h5>
                               {selectedWorker.nic_front && (
                                 <button 
                                   onClick={() => handleDownload(selectedWorker.nic_front, `NIC_Front_${selectedWorker.worker_id}.jpg`)}
                                   className="p-1.5 md:p-2 hover:bg-tea-50 dark:hover:bg-tea-500/10 text-tea-600 rounded-xl transition-all flex items-center gap-1.5 text-[8px] md:text-[9px] font-bold"
                                 >
                                   <Download size={14} /> DOWNLOAD
                                 </button>
                               )}
                             </div>
                             <div className="aspect-[3/2] rounded-[24px] md:rounded-[32px] overflow-hidden bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 group relative">
                                {selectedWorker.nic_front ? (
                                  <>
                                    <img src={selectedWorker.nic_front} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                       <button className="px-5 py-2 md:px-6 md:py-2.5 bg-white text-slate-900 rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-xl">Full Scan</button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="m-auto text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest h-full flex items-center justify-center">No Scan Provided</div>
                                )}
                             </div>
                          </div>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center px-2 md:px-4">
                               <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">National ID (BACK)</h5>
                               {selectedWorker.nic_back && (
                                 <button 
                                   onClick={() => handleDownload(selectedWorker.nic_back, `NIC_Back_${selectedWorker.worker_id}.jpg`)}
                                   className="p-1.5 md:p-2 hover:bg-tea-50 dark:hover:bg-tea-500/10 text-tea-600 rounded-xl transition-all flex items-center gap-1.5 text-[8px] md:text-[9px] font-bold"
                                 >
                                   <Download size={14} /> DOWNLOAD
                                 </button>
                               )}
                             </div>
                             <div className="aspect-[3/2] rounded-[24px] md:rounded-[32px] overflow-hidden bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 group relative">
                                {selectedWorker.nic_back ? (
                                  <>
                                    <img src={selectedWorker.nic_back} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                                       <button className="px-5 py-2 md:px-6 md:py-2.5 bg-white text-slate-900 rounded-2xl font-bold text-[10px] md:text-xs uppercase tracking-widest shadow-xl">Full Scan</button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="m-auto text-slate-400 text-[10px] md:text-xs font-bold uppercase tracking-widest h-full flex items-center justify-center">No Scan Provided</div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>
                  )}

               </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {showEditModal && editForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Worker</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Update profile details</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateWorker(); }} className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name with Initials</label>
                <input
                  type="text"
                  name="full_name_initials"
                  value={editForm.full_name_initials || ''}
                  onChange={handleEditChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={editForm.first_name || ''}
                    onChange={handleEditChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={editForm.last_name || ''}
                    onChange={handleEditChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NIC Number</label>
                  <input
                    type="text"
                    name="nic"
                    value={editForm.nic || ''}
                    onChange={handleEditChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Primary Tel</label>
                  <input
                    type="text"
                    name="tel"
                    value={editForm.tel || ''}
                    onChange={handleEditChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Residential Address</label>
                <textarea
                  name="address"
                  value={editForm.address || ''}
                  onChange={handleEditChange}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Wage Category</label>
                  <select
                    name="wage_type"
                    value={editForm.wage_type || ''}
                    onChange={handleEditChange}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="permanent">Permanent</option>
                    <option value="daily_cash">Daily Cash</option>
                    <option value="contract">Contract</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Estate</label>
                  <select
                    name="estate_id"
                    value={editForm.estate_id || ''}
                    onChange={handleEditChange}
                    disabled={!isUserAdmin}
                    className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all appearance-none ${!isUserAdmin ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Unassigned</option>
                    {estates.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Emergency Support Details</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</label>
                    <input
                      type="text"
                      name="emergency_contact_name"
                      value={editForm.emergency_contact_name || ''}
                      onChange={handleEditChange}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Tel</label>
                    <input
                      type="text"
                      name="emergency_tel"
                      value={editForm.emergency_tel || ''}
                      onChange={handleEditChange}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm">Cancel</button>
                <button type="submit" disabled={isUpdating} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20 text-sm disabled:opacity-50">
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowArchiveConfirm(false)}></div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full relative z-10 shadow-2xl animate-scale-in border border-slate-200 dark:border-slate-800">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 flex items-center justify-center mb-6 mx-auto">
              <Archive size={32} />
            </div>
            <h3 className="text-2xl font-black text-center text-slate-900 dark:text-white mb-2">Archive Worker?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
              Are you sure you want to archive <strong>{selectedWorker?.first_name} {selectedWorker?.last_name}</strong>? This action can be reversed later from the archive settings.
            </p>
            <div className="mb-8 text-left">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Inactive Starting Date</label>
              <Input 
                type="date" 
                value={archiveDate}
                onChange={(e) => setArchiveDate(e.target.value)}
                className="w-full h-12 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowArchiveConfirm(false)}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmArchive}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
