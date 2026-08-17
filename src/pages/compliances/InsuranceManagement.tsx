import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck, Plus, Search, Clock,
  Edit3, Trash2, X, Save,
  ChevronLeft, ChevronRight, Hash, Receipt,
  AlertOctagon, Loader2, Truck, Box,
  ChevronDown, Calendar
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { isAdmin } from '../../lib/roleUtils';
import type { AppRole } from '../../store/useModulePermissionsStore';

export default function InsuranceManagement() {
  const profile = useAuthStore(state => state.profile);
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const estateId = profile?.estate_id || '';

  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);
  const [estateFilter, setEstateFilter] = useState('all');

  const [activeTab, setActiveTab] = useState("vehicles");
  const [records, setRecords] = useState<{vehicles: any[], assets: any[]}>({ vehicles: [], assets: [] });
  const [stats, setStats] = useState<any>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inventoryAssets, setInventoryAssets] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    license_number: '',
    fleet_id: '',
    asset_name: '',
    asset_code: '',
    policy_number: '',
    insurance_company: '',
    coverage_amount: '',
    premium_amount: '',
    expiry_date: ''
  });

  const isVehicle = activeTab === "vehicles";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssetSelect = (e) => {
    const assetId = e.target.value;
    if (!assetId) return;
    const asset = inventoryAssets.find(a => a.id.toString() === assetId);
    if (asset) {
      if (isVehicle) {
        setFormData(prev => ({
          ...prev,
          license_number: asset.asset_name,
          fleet_id: asset.serial_number || `AST-${asset.id}`
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          asset_name: asset.asset_name,
          asset_code: asset.serial_number || `AST-${asset.id}`
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      license_number: '', fleet_id: '', asset_name: '', asset_code: '',
      policy_number: '', insurance_company: '', coverage_amount: '', premium_amount: '', expiry_date: ''
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const type = activeTab === 'vehicles' ? 'vehicle' : 'asset';
      const payload = { ...formData, type, estate_id: estateId };

      let response: any;
      if (selectedRecord) {
        response = await (apiClient as any).put(`/compliance/insurance/${selectedRecord.id}`, payload);
      } else {
        response = await apiClient.post('/compliance/insurance/add', payload);
      }

      if (response.success) {
        setShowAddModal(false);
        resetForm();
        setSelectedRecord(null);
        fetchData();
      }
    } catch (error) {
      console.error('Save policy failed', error);
      alert('Failed to register insurance policy. Please check the network or server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && estateId) {
      setEstateFilter(estateId);
    }
  }, [isUserAdmin, estateId]);

  useEffect(() => {
    if (isUserAdmin) {
      fetchData();
    } else if (estateId) {
      fetchData();
    }
  }, [activeTab, estateFilter, isUserAdmin, estateId]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const eid = isUserAdmin ? (estateFilter === 'all' ? '' : estateFilter) : estateId;
        const response: any = await apiClient.get(`/inventory/physical${eid ? `?estate_id=${eid}` : ''}`);
        if (response.success) setInventoryAssets(response.data);
      } catch (err) {
        console.error('Failed to fetch inventory assets', err);
      }
    };
    if (isUserAdmin || estateId) fetchInventory();
  }, [estateFilter, isUserAdmin, estateId]);

  const fetchData = async () => {
    const eid = isUserAdmin ? (estateFilter === 'all' ? '' : estateFilter) : estateId;
    setLoading(true);
    try {
      const type = activeTab === 'vehicles' ? 'vehicles' : 'assets';
      const [statsRes, listRes] = await Promise.all([
        apiClient.get(`/compliance/insurance/stats?type=${type}${eid ? `&estate_id=${eid}` : ''}`),
        apiClient.get(`/compliance/insurance/list?type=${type}${eid ? `&estate_id=${eid}` : ''}`)
      ]) as [any, any];

      if (statsRes.success) setStats(statsRes.data);
      if (listRes.success) {
        setRecords(prev => ({ ...prev, [activeTab]: listRes.data }));
      }
    } catch (error) {
      console.error('Fetch data failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;
    setIsSubmitting(true);
    try {
      const response: any = await (apiClient as any).delete(`/compliance/insurance/${recordToDelete.id}?estate_id=${estateId}`);
      if (response.success) {
        setShowDeleteModal(false);
        setRecordToDelete(null);
        fetchData();
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const handleUpdate = (record) => {
    setSelectedRecord(record);
    setFormData({
      license_number: record.license_number || '',
      fleet_id: record.fleet_id || '',
      asset_name: record.asset_name || '',
      asset_code: record.asset_code || '',
      policy_number: record.policy_number,
      insurance_company: record.insurance_company,
      coverage_amount: record.coverage_amount,
      premium_amount: record.premium_amount,
      expiry_date: record.expiry_date ? record.expiry_date.split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const filtered = useMemo(() => {
    const list = records[activeTab] || [];
    return list.filter(item => {
      const q = searchTerm.toLowerCase();
      const primary = isVehicle ? (item.license_number || '') : (item.asset_name || '');
      const secondary = isVehicle ? (item.fleet_id || '') : (item.asset_code || '');
      const matchesSearch = primary.toLowerCase().includes(q) || secondary.toLowerCase().includes(q);
      const daysUntil = (expiry) => {
        if (!expiry) return 999;
        const diff = new Date(expiry).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
      };
      const days = daysUntil(item.expiry_date);
      let status = 'valid';
      if (days < 0) status = 'expired';
      else if (days <= 30) status = 'expiring';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, records, activeTab, isVehicle]);

  const getStatusBadge = (expiry) => {
    if (!expiry) return <span className="badge-slate">No Policy</span>;
    const diff = new Date(expiry).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return <span className="px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">Expired</span>;
    if (days <= 30) return <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/20">Renew Now</span>;
    return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">Active</span>;
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Common Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Insurance Registry</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> New Policy
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-800">
        {[
          { id: 'vehicles', label: 'Fleet Registry', icon: Truck },
          { id: 'assets', label: 'Physical Assets', icon: Box }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Total Units', value: stats.total || 0, icon: Box, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
          { title: 'Fully Insured', value: stats.insured || 0, icon: ShieldCheck, bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
          { title: 'Expiring Soon', value: stats.expiring || 0, icon: Clock, bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400' },
          { title: 'Critical Risk', value: stats.expired || 0, icon: AlertOctagon, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' }
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${s.bg} shrink-0`}>
                <s.icon size={22} className={s.text} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.title}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="premium-card pt-6 pb-6 pr-6 pl-6 bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Universal Registry Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder={`Search ${isVehicle ? 'License or Fleet ID' : 'Name or Asset Code'}...`}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {isUserAdmin && (
            <div className="space-y-2 min-w-[180px]">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Estate</label>
              <div className="relative">
                <select
                  id="filter-estate"
                  value={estateFilter}
                  onChange={(e) => { setEstateFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-blue-500 appearance-none shadow-sm"
                >
                  <option value="all">All Estates</option>
                  {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          )}

          <div className="space-y-2 min-w-[200px]">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Registry Status</label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider outline-none focus:border-blue-500 appearance-none shadow-sm"
              >
                <option value="all">All Registry Matches</option>
                <option value="valid">Active Polices</option>
                <option value="expiring">Expiring (30 Days)</option>
                <option value="expired">Critical Risk</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>


      </div>

      {/* Table */}
      <div className="premium-card overflow-hidden p-0 border-none shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-[0.2em]">
                <th className="px-6 py-4 text-left font-bold">Target Identity</th>
                <th className="px-6 py-4 text-left font-bold">Policy Registry</th>
                <th className="px-6 py-4 text-left font-bold">Coverage (LKR)</th>
                <th className="px-6 py-4 text-center font-bold">Status</th>
                <th className="px-6 py-4 text-right font-bold">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-full"></div></td>
                  </tr>
                ))
              ) : filtered.length > 0 ? (
                filtered.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-blue-500/10">
                          {isVehicle ? <Truck size={14} className="text-blue-600" /> : <Box size={14} className="text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm  italic">
                            {isVehicle ? item.license_number : item.asset_name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {isVehicle ? item.fleet_id : item.asset_code || 'ID: #'+item.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-blue-500" />
                        <span className="text-xs font-bold dark:text-white uppercase tracking-tighter">{item.policy_number || 'PENDING POLICY'}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-70">
                        {item.insurance_company || 'PROVIDER NOT SET'}
                      </p>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-emerald-500" />
                          <span className="text-xs font-black dark:text-white">{parseFloat(item.coverage_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Receipt size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Prem: {parseFloat(item.premium_amount || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {getStatusBadge(item.expiry_date)}
                      <div className="flex items-center justify-center gap-1.5 mt-1.5">
                        <Calendar size={10} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleUpdate(item)}
                          className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-all border border-transparent hover:border-blue-200/50"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => confirmDelete(item)}
                          className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 transition-all border border-transparent hover:border-red-200/50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-20">
                      <ShieldCheck size={48} className="text-slate-400 mb-3" />
                      <p className="text-xs font-black uppercase tracking-widest">No matching insurance records</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-6 py-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col sm:flex-row justify-between items-center gap-4">
             <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
               Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> - <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, filtered.length)}</span> OF <span className="text-slate-900 dark:text-white">{filtered.length}</span> Registry Matches
             </p>
             <div className="flex gap-2">
               <button
                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-400 transition-all disabled:opacity-20 shadow-sm"
               >
                 <ChevronLeft size={16} />
               </button>
               {[...Array(Math.ceil(filtered.length / itemsPerPage))].map((_, i) => (
                 <button
                   key={i} onClick={() => setCurrentPage(i+1)}
                   className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all ${currentPage === i+1 ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-lg shadow-blue-600/20' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-500 dark:hover:border-blue-400 shadow-sm'}`}
                 >
                   {i+1}
                 </button>
               ))}
               <button
                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filtered.length / itemsPerPage)))} disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-400 transition-all disabled:opacity-20 shadow-sm"
               >
                 <ChevronRight size={16} />
               </button>
             </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="glass-panel w-full max-w-lg rounded-[2.5rem] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Register Policy</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Compliance Audit Layer
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-8 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest ml-1">Source from Inventory</label>
                  <div className="relative">
                    <select
                      onChange={handleAssetSelect}
                      className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none appearance-none"
                    >
                      <option value="">-- Select Existing {isVehicle ? 'Vehicle' : 'Asset'} --</option>
                      {inventoryAssets
                        .filter(a => isVehicle ? a.asset_type === 'Vehicles' : a.asset_type !== 'Vehicles')
                        .map(asset => (
                          <option key={asset.id} value={asset.id}>{asset.asset_name} ({asset.serial_number || 'No Serial'})</option>
                        ))
                      }
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{isVehicle ? 'License Plate' : 'Asset Name'}</label>
                    <input
                      type="text" name={isVehicle ? "license_number" : "asset_name"} value={isVehicle ? formData.license_number : formData.asset_name} onChange={handleInputChange} required
                      placeholder={isVehicle ? "WP CAT-1234" : "Generator A"}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{isVehicle ? 'Fleet ID' : 'Asset Code'}</label>
                    <input
                      type="text" name={isVehicle ? "fleet_id" : "asset_code"} value={isVehicle ? formData.fleet_id : formData.asset_code} onChange={handleInputChange} required
                      placeholder={isVehicle ? "FL-9902" : "GEN-01"}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Policy No</label>
                    <input
                      type="text" name="policy_number" value={formData.policy_number} onChange={handleInputChange} required
                      placeholder="POL-0001"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Provider</label>
                    <input
                      type="text" name="insurance_company" value={formData.insurance_company} onChange={handleInputChange} required
                      placeholder="Sri Lanka Insurance"
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Coverage (LKR)</label>
                    <input
                      type="number" name="coverage_amount" value={formData.coverage_amount} onChange={handleInputChange} required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Premium (LKR)</label>
                    <input
                      type="number" name="premium_amount" value={formData.premium_amount} onChange={handleInputChange} required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Policy Expiry</label>
                  <div className="relative">
                    <Clock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date" name="expiry_date" value={formData.expiry_date} onChange={handleInputChange} required
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Policy
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all "
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={28} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter">Remove Policy?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-6">
                Permanently remove policy <span className="font-bold text-slate-900 dark:text-white">"{recordToDelete?.policy_number}"</span> from the audit registry?
              </p>
              <div className="flex w-full gap-3">
                <button onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-600/20">
                  {isSubmitting ? 'Removing...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
