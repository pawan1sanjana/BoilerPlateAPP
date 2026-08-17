import { useState, useEffect, useMemo } from "react";
import {
  Receipt, Plus, Search, Clock,
  Edit3, Trash2, X, Save,
  Hash, AlertOctagon, Loader2, Truck,
  ChevronDown, Calendar, FileText,
  BadgeCheck, AlertTriangle, Car
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { DataTable } from '../../components/ui/data-table';
import { supabase } from '../../lib/supabase';
import { isAdmin } from '../../lib/roleUtils';
import type { AppRole } from '../../store/useModulePermissionsStore';

export default function RevenueLicenseManagement() {
  const profile = useAuthStore(state => state.profile);
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const estateId = profile?.estate_id || '';

  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);
  const [estateFilter, setEstateFilter] = useState('all');

  const [records, setRecords] = useState<any[]>([]);
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
    policy_number: '',
    insurance_company: '',
    premium_amount: '',
    expiry_date: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssetSelect = (e) => {
    const assetId = e.target.value;
    if (!assetId) return;
    const asset = inventoryAssets.find(a => a.id.toString() === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        license_number: asset.asset_name,
        fleet_id: asset.serial_number || `AST-${asset.id}`
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      license_number: '', fleet_id: '', policy_number: '',
      insurance_company: '', premium_amount: '', expiry_date: ''
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...formData, type: 'revenue_license', estate_id: estateId };
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
      console.error('Save license failed', error);
      alert('Failed to register revenue license. Please check the network or server logs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchData = async (targetEstateId?: string) => {
    const eid = targetEstateId ?? (isUserAdmin ? (estateFilter === 'all' ? '' : estateFilter) : estateId);
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        apiClient.get(`/compliance/insurance/stats?type=revenue${eid ? `&estate_id=${eid}` : ''}`),
        apiClient.get(`/compliance/insurance/list?type=revenue${eid ? `&estate_id=${eid}` : ''}`)
      ]) as [any, any];
      if (statsRes.success) setStats(statsRes.data);
      if (listRes.success) {
        setRecords(listRes.data);
      }
    } catch (error) {
      console.error('Fetch data failed', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load estates (admin sees all, others locked to own estate)
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
      fetchData(estateId);
    }
  }, [estateFilter, isUserAdmin, estateId]);

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
      policy_number: record.policy_number,
      insurance_company: record.insurance_company,
      premium_amount: record.premium_amount,
      expiry_date: record.expiry_date ? record.expiry_date.split('T')[0] : ''
    });
    setShowAddModal(true);
  };

  const filtered = useMemo(() => {
    return records.filter(item => {
      const q = searchTerm.toLowerCase();
      const primary = item.license_number || '';
      const secondary = item.fleet_id || '';
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
  }, [searchTerm, statusFilter, records]);

  const getDaysUntil = (expiry) => {
    if (!expiry) return null;
    const diff = new Date(expiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusInfo = (expiry) => {
    if (!expiry) return { label: 'No License', color: 'slate', days: null };
    const days = getDaysUntil(expiry);
    if (days < 0) return { label: 'Expired', color: 'rose', days };
    if (days <= 30) return { label: 'Renew Now', color: 'amber', days };
    return { label: 'Active', color: 'emerald', days };
  };

  const getStatusBadge = (expiry) => {
    const { label, color } = getStatusInfo(expiry);
    const colorMap = {
      slate: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
      rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
      amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colorMap[color]}`}>
        {label}
      </span>
    );
  };

  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Premium Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Revenue Licenses</h1>
        </div>
        <div className="flex gap-3 relative">
          <button
            id="btn-new-license"
            onClick={() => { setSelectedRecord(null); resetForm(); setShowAddModal(true); }}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2"
          >
            <Plus size={16} /> New License
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Fleet',
            value: stats.total || 0,
            icon: Car,
            gradient: 'from-blue-500 to-indigo-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            iconColor: 'text-blue-600 dark:text-blue-400',
            textColor: 'text-blue-600 dark:text-blue-400',
          },
          {
            title: 'Valid Licenses',
            value: stats.insured || 0,
            icon: BadgeCheck,
            gradient: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            textColor: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            title: 'Expiring Soon',
            value: stats.expiring || 0,
            icon: AlertTriangle,
            gradient: 'from-amber-500 to-orange-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            iconColor: 'text-amber-600 dark:text-amber-400',
            textColor: 'text-amber-600 dark:text-amber-400',
          },
          {
            title: 'Expired',
            value: stats.expired || 0,
            icon: AlertOctagon,
            gradient: 'from-rose-500 to-pink-600',
            bg: 'bg-rose-50 dark:bg-rose-900/20',
            iconColor: 'text-rose-600 dark:text-rose-400',
            textColor: 'text-rose-600 dark:text-rose-400',
          },
        ].map((s, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${s.bg} shrink-0`}>
                <s.icon size={22} className={s.iconColor} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.title}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="search-licenses"
              type="text"
              placeholder="Search license plate or fleet ID..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all"
            />
          </div>

          {isUserAdmin && (
            <div className="relative min-w-[180px]">
              <select
                id="filter-estate"
                value={estateFilter}
                onChange={(e) => { setEstateFilter(e.target.value); setCurrentPage(1); }}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer"
              >
                <option value="all">All Estates</option>
                {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          )}

          <div className="relative min-w-[200px]">
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 appearance-none transition-all cursor-pointer"
            >
              <option value="all">All Licenses</option>
              <option value="valid">Active Only</option>
              <option value="expiring">Expiring (30 days)</option>
              <option value="expired">Expired</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
          </div>
        </div>


      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-blue-500" />
            <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
              License Registry
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {filtered.length} Record{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <DataTable
          columns={[
            {
              header: "Vehicle",
              cell: (item: any) => (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-900/40 flex-shrink-0">
                    <Car size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">
                      {item.license_number || '—'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                      <Truck size={9} className="opacity-60" />
                      {item.fleet_id || 'No Fleet ID'}
                    </p>
                  </div>
                </div>
              )
            },
            {
              header: "License Details",
              cell: (item: any) => (
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={12} className="text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      {item.policy_number || 'PENDING'}
                    </span>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {item.insurance_company || 'Authority Not Set'}
                  </p>
                </div>
              )
            },
            {
              header: "Fee (LKR)",
              cell: (item: any) => (
                <div>
                  <div className="flex items-center gap-1.5">
                    <Receipt size={13} className="text-emerald-500" />
                    <span className="text-sm font-black text-slate-800 dark:text-white">
                      {parseFloat(item.premium_amount || '0').toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5 ml-5">LKR</p>
                </div>
              )
            },
            {
              header: "Status",
              cell: (item: any) => {
                const statusInfo = getStatusInfo(item.expiry_date);
                const days = statusInfo.days;
                return (
                  <div className="text-center">
                    {getStatusBadge(item.expiry_date)}
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <Calendar size={9} className="text-slate-400" />
                      <span className="text-[9px] font-semibold text-slate-400">
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : 'N/A'}
                      </span>
                    </div>
                    {days !== null && days >= 0 && days <= 60 && (
                      <p className={`text-[9px] font-black mt-0.5 ${days <= 30 ? 'text-amber-500' : 'text-slate-400'}`}>
                        {days} day{days !== 1 ? 's' : ''} left
                      </p>
                    )}
                  </div>
                );
              }
            },
            {
              header: "Actions",
              cell: (item: any) => (
                <div className="flex justify-end gap-1.5">
                  <button
                    id={`btn-edit-${item.id}`}
                    onClick={() => handleUpdate(item)}
                    title="Edit License"
                    className="p-2 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all border border-transparent hover:border-blue-200/50 dark:hover:border-blue-700/50"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    id={`btn-delete-${item.id}`}
                    onClick={() => confirmDelete(item)}
                    title="Delete License"
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-all border border-transparent hover:border-rose-200/50 dark:hover:border-rose-700/50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            }
          ]}
          data={paginated}
          loading={loading}
          emptyMessage="No records found"
          pagination={{
            page: currentPage,
            pageSize: itemsPerPage,
            totalCount: filtered.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: () => {},
          }}
        />
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
            {/* Modal Header */}
            <div className="relative overflow-hidden px-7 py-6 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="relative flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt size={16} className="text-blue-200" />
                    <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest">
                      {selectedRecord ? 'Edit License' : 'New License'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {selectedRecord ? 'Update License' : 'Register License'}
                  </h2>
                </div>
                <button
                  onClick={() => { setShowAddModal(false); setSelectedRecord(null); resetForm(); }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white border border-white/15"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddSubmit} className="p-7 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-0.5">
                  Source from Inventory (optional)
                </label>
                <div className="relative">
                  <select
                    onChange={handleAssetSelect}
                    className="w-full px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none appearance-none transition-all"
                  >
                    <option value="">— Select Existing Vehicle —</option>
                    {inventoryAssets
                      .filter(a => a.asset_type === 'Vehicles')
                      .map(asset => (
                        <option key={asset.id} value={asset.id}>
                          {asset.asset_name} ({asset.serial_number || 'No Serial'})
                        </option>
                      ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'License Plate', name: 'license_number', placeholder: 'WP CAT-1234' },
                  { label: 'Fleet ID', name: 'fleet_id', placeholder: 'FL-9902' },
                ].map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      required
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'License No.', name: 'policy_number', placeholder: 'LIC-0001' },
                  { label: 'Issuing Authority', name: 'insurance_company', placeholder: 'Provincial Council' },
                ].map(field => (
                  <div key={field.name} className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">{field.label}</label>
                    <input
                      type="text"
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleInputChange}
                      required
                      placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">License Fee (LKR)</label>
                  <input
                    type="number"
                    name="premium_amount"
                    value={formData.premium_amount}
                    onChange={handleInputChange}
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Expiry Date</label>
                  <div className="relative">
                    <Clock size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:border-blue-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-submit-license"
                  className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {selectedRecord ? 'Update License' : 'Save License'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setSelectedRecord(null); resetForm(); }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-5">
                <Trash2 size={26} className="text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Remove License?</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 mb-7 leading-relaxed">
                Permanently remove license{' '}
                <span className="font-bold text-slate-800 dark:text-white">"{recordToDelete?.policy_number}"</span>{' '}
                from the registry?
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : null}
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
