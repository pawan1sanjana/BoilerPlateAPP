import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Search, Mail, Phone, 
  Edit2, Trash2, Loader2, Info,
  X, Save
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SuppliersPage() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const initialEstateId = (!isUserAdmin && profile?.estate_id) ? profile.estate_id : '';

  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstateFilter, setSelectedEstateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage] = useState(10);

  // Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_name: '', contact_person: '', email: '', phone: '', address: '', estate_id: initialEstateId });
  const [editForm, setEditForm] = useState<any>({});
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  useEffect(() => {
    fetchSuppliers();
    fetchEstates();
  }, []);

  useEffect(() => {
    if (!isUserAdmin && profile?.estate_id) {
      setSelectedEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const fetchEstates = async () => {
    try {
      const { data, error } = await supabase.from('estates').select('id, name').eq('status', 'active');
      if (!error && data) setEstates(data);
    } catch (err) {
      console.error('Failed to load estates:', err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (!error && data) setSuppliers(data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const { error } = await supabase.from('suppliers').insert(form);
      if (!error) {
        setShowAddModal(false);
        setForm({ supplier_name: '', contact_person: '', email: '', phone: '', address: '', estate_id: initialEstateId });
        fetchSuppliers();
      } else {
        console.error('Failed to add supplier:', error);
      }
    } catch (error) {
      console.error('Failed to add supplier:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Remove id from payload
      const { id, created_at, updated_at, ...payload } = editForm;
      const { error } = await supabase.from('suppliers').update(payload).eq('id', id);
      if (!error) {
        setShowEditModal(false);
        fetchSuppliers();
      } else {
        console.error("Update failed:", error);
      }
    } catch (error) {
       console.error("Update failed:", error);
    } finally {
       setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedSupplier) return;
    try {
      setSaving(true);
      const { error } = await supabase.from('suppliers').delete().eq('id', selectedSupplier.id);
      if (!error) {
        setShowDeleteModal(false);
        fetchSuppliers();
      } else {
        console.error("Delete failed:", error);
      }
    } catch (error) {
       console.error("Delete failed:", error);
    } finally {
       setSaving(false);
    }
  };

  const filteredData = suppliers.filter(s => {
    const matchesSearch = s.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEstate = selectedEstateFilter === 'all' || s.estate_id === selectedEstateFilter;

    return matchesSearch && matchesEstate;
  });

  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredData.slice(indexOfFirstEntry, indexOfLastEntry);

  const columns: ColumnDef<any>[] = [
    {
      header: "Supplier Name",
      cell: (sup) => (
        <div className="font-bold text-slate-900 dark:text-white tracking-tight text-xs uppercase">{sup.supplier_name}</div>
      )
    },
    {
      header: "Contact Person",
      cell: (sup) => <span className="text-slate-600 dark:text-slate-300 font-bold text-xs uppercase">{sup.contact_person || '—'}</span>
    },
    {
      header: "Contact Details",
      cell: (sup) => (
        <div className="flex flex-col gap-1.5 font-bold">
          {sup.email && (<div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><Mail size={12} className="text-blue-500" /> {sup.email}</div>)}
          {sup.phone && (<div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400"><Phone size={12} className="text-blue-500" /> {sup.phone}</div>)}
        </div>
      )
    },
    {
      header: "Address",
      cell: (sup) => <span className="text-slate-500 dark:text-slate-400 max-w-[200px] truncate text-[10px] font-bold uppercase tracking-tight block">{sup.address || '—'}</span>
    },
    {
      header: "Status",
      cellClassName: "text-center",
      headerClassName: "text-center",
      cell: (sup) => (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${sup.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
          {sup.status || 'Active'}
        </span>
      )
    },
    {
      header: "Actions",
      cellClassName: "text-right",
      headerClassName: "text-right",
      cell: (sup) => (
        <div className="flex justify-end gap-2">
          {isUserAdmin ? (
            <>
              <button onClick={() => { setEditForm(sup); setShowEditModal(true); }} className="p-2.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-transparent hover:border-blue-200/50 transition-all shadow-sm"><Edit2 size={16} /></button>
              <button onClick={() => { setSelectedSupplier(sup); setShowDeleteModal(true); }} className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/40 border border-transparent hover:border-rose-200/50 transition-all shadow-sm"><Trash2 size={16} /></button>
            </>
          ) : (
            <span className="text-slate-300 dark:text-slate-600 font-black tracking-widest text-[10px] uppercase">Restricted</span>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white font-outfit tracking-tight">Suppliers</h1>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shadow-sm flex items-center gap-2"
        >
          <UserPlus size={18} /> Add Supplier
        </Button>
      </div>

      {/* Suppliers Table Card */}
      <Card className="p-0 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input
                type="text"
                placeholder="Search suppliers..."
                className="pl-9 h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            {isUserAdmin ? (
              <select
                value={selectedEstateFilter}
                onChange={(e) => { setSelectedEstateFilter(e.target.value); setCurrentPage(1); }}
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500 transition-all min-w-[200px]"
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
                className="h-11 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 outline-none transition-all min-w-[200px] opacity-70 cursor-not-allowed"
              >
                {estates.filter(e => e.id === profile?.estate_id).map(estate => (
                  <option key={estate.id} value={estate.id}>{estate.name}</option>
                ))}
                {!estates.find(e => e.id === profile?.estate_id) && (
                  <option value={profile?.estate_id || ''}>Assigned Estate</option>
                )}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900/40 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0">
             <Info size={14} className="text-blue-500" /> Verified Partners Only
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentEntries}
          loading={loading}
          emptyMessage="No suppliers found"
          pagination={{
            page: currentPage,
            pageSize: entriesPerPage,
            totalCount: filteredData.length,
            onPageChange: setCurrentPage,
            onPageSizeChange: () => {},
          }}
        />
      </Card>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowEditModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8 text-slate-900 dark:text-white text-2xl font-black uppercase tracking-tight">Edit Supplier<button type="button" onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} className="text-slate-400" /></button></div>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {['supplier_name', 'contact_person', 'email', 'phone'].map(field => (
                    <div key={field} className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.replace('_', ' ')}</label>
                    <input type={field === 'email' ? 'email' : 'text'} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editForm[field] || ''} onChange={(e)=>setEditForm({...editForm, [field]: e.target.value})} /></div>
                  ))}
                  <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                  <input type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={editForm.address || ''} onChange={(e)=>setEditForm({...editForm, address: e.target.value})} /></div>
                  
                  {isUserAdmin && (
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Estate</label>
                      <select value={editForm.estate_id || ''} onChange={(e) => setEditForm({ ...editForm, estate_id: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all">
                        <option value="" disabled>Select Estate</option>
                        {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4"><button type="button" onClick={()=>setShowEditModal(false)} className="py-4 border-2 border-slate-100 dark:border-slate-800 text-slate-400 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowDeleteModal(false)} />
          <div className="glass-panel w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 animate-in zoom-in-95 duration-200 relative z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-red-200/50">
                <Trash2 size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Delete Supplier?</h2>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-3 mb-8 uppercase tracking-wider leading-relaxed">
                Are you sure you want to delete <span className="text-red-500">"{selectedSupplier?.supplier_name}"</span>?
              </p>
              <div className="flex w-full gap-4">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-3.5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={confirmDelete} disabled={saving} className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2 w-full">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowAddModal(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
            <div className="p-8">
              <div className="flex justify-between items-start mb-8"><h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Add Supplier</h3><button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={24} className="text-slate-400" /></button></div>
              <form onSubmit={handleAddSupplier} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {(['supplier_name', 'contact_person', 'email', 'phone'] as const).map(field => (
                     <div key={field} className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.replace('_', ' ')}</label>
                     <input type={field === 'email' ? 'email' : 'text'} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={form[field]} onChange={(e)=>setForm({...form, [field]: e.target.value})} /></div>
                   ))}
                   <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                   <input type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all" value={form.address} onChange={(e)=>setForm({...form, address: e.target.value})} /></div>
                   
                   {isUserAdmin && (
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Estate <span className="text-red-500">*</span></label>
                      <select required value={form.estate_id || ''} onChange={(e) => setForm({ ...form, estate_id: e.target.value })} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-blue-500 rounded-2xl text-sm font-bold outline-none transition-all">
                        <option value="" disabled>Select Estate</option>
                        {estates.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex justify-center items-center gap-2">{saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Save Supplier</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
