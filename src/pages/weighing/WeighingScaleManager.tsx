import { useState, useEffect, useCallback } from 'react';
import {
  Scale, Plus, Edit, Trash2, Settings, Activity,
  Search, ChevronDown, CheckCircle2, XCircle, Loader2,
  Bluetooth, Info, Filter, FileDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin, canManageEstate } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeighingScale {
  id: string;
  estate_id: string;
  name: string;
  model: string | null;
  bt_device_name: string | null;
  bt_service_uuid: string | null;
  bt_characteristic_uuid: string | null;
  unit: 'kg' | 'g' | 'lb';
  status: 'active' | 'inactive';
  created_at: string;
  estates?: { name: string; estate_code: string };
}

interface WeighingSession {
  id: string;
  scale_id: string;
  estate_id: string;
  item_name: string;
  weight: number;
  unit: string;
  notes: string | null;
  created_at: string;
  weighing_scales?: { name: string };
  users?: { full_name: string };
}

// ── Scale Form Modal ──────────────────────────────────────────────────────────

function ScaleFormModal({
  scale,
  estateId,
  estates,
  onClose,
  onSaved,
  currentRole,
}: {
  scale: WeighingScale | null;
  estateId: string | null;
  estates: any[];
  onClose: () => void;
  onSaved: () => void;
  currentRole: AppRole | null;
}) {
  const [form, setForm] = useState({
    estate_id: scale?.estate_id ?? estateId ?? '',
    name: scale?.name ?? '',
    model: scale?.model ?? '',
    bt_device_name: scale?.bt_device_name ?? '',
    bt_service_uuid: scale?.bt_service_uuid ?? '',
    bt_characteristic_uuid: scale?.bt_characteristic_uuid ?? '',
    unit: scale?.unit ?? 'kg',
    status: scale?.status ?? 'active',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Scale name is required');
    if (!form.estate_id) return toast.error('Please select an estate');
    setSaving(true);
    try {
      const payload = {
        estate_id: form.estate_id,
        name: form.name.trim(),
        model: form.model.trim() || null,
        bt_device_name: form.bt_device_name.trim() || null,
        bt_service_uuid: form.bt_service_uuid.trim() || null,
        bt_characteristic_uuid: form.bt_characteristic_uuid.trim() || null,
        unit: form.unit,
        status: form.status,
      };
      if (scale) {
        const { error } = await supabase.from('weighing_scales').update(payload).eq('id', scale.id);
        if (error) throw error;
        toast.success('Scale updated');
      } else {
        const { error } = await supabase.from('weighing_scales').insert(payload);
        if (error) throw error;
        toast.success('Scale registered');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save scale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {scale ? 'Edit Scale' : 'Register New Scale'}
              </h2>
              <p className="text-xs text-slate-500">Assign a Bluetooth scale to an estate</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Estate selector — only for admins */}
          {isAdmin(currentRole) && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Estate *</label>
              <select
                value={form.estate_id}
                onChange={e => setForm(f => ({ ...f, estate_id: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Estate…</option>
                {estates.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.estate_code})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Scale Name *</label>
              <input
                type="text" value={form.name} placeholder="e.g. Gate Scale 1"
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Model / Brand</label>
              <input
                type="text" value={form.model} placeholder="e.g. AND FW-500i"
                onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">BT Device Name</label>
            <input
              type="text" value={form.bt_device_name} placeholder="Bluetooth device name (as seen in your OS)"
              onChange={e => setForm(f => ({ ...f, bt_device_name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Advanced BLE config — collapsible */}
          <details className="group">
            <summary className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 select-none">
              <Settings className="w-3.5 h-3.5" />
              Advanced BLE Configuration (optional)
              <ChevronDown className="w-3.5 h-3.5 ml-auto group-open:rotate-180 transition-transform" />
            </summary>
            <div className="mt-3 space-y-3 pl-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Custom Service UUID</label>
                <input
                  type="text" value={form.bt_service_uuid} placeholder="Leave blank to use standard 0x181D"
                  onChange={e => setForm(f => ({ ...f, bt_service_uuid: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Custom Characteristic UUID</label>
                <input
                  type="text" value={form.bt_characteristic_uuid} placeholder="Leave blank to use standard 0x2A9D"
                  onChange={e => setForm(f => ({ ...f, bt_characteristic_uuid: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </details>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="g">Grams (g)</option>
                <option value="lb">Pounds (lb)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {scale ? 'Save Changes' : 'Register Scale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Scales Tab ────────────────────────────────────────────────────────────────

function ScalesTab({ profile, role }: { profile: any; role: AppRole | null }) {
  const [scales, setScales] = useState<WeighingScale[]>([]);
  const [estates, setEstates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingScale, setEditingScale] = useState<WeighingScale | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('weighing_scales')
        .select('*, estates(name, estate_code)')
        .order('created_at', { ascending: false });

      if (!isAdmin(role) && profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }

      const [scalesRes, estatesRes] = await Promise.all([
        query,
        isAdmin(role)
          ? supabase.from('estates').select('id, name, estate_code').eq('status', 'active').order('name')
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (scalesRes.error) throw scalesRes.error;
      setScales(scalesRes.data ?? []);
      setEstates(estatesRes.data ?? []);
    } catch (err: any) {
      toast.error('Failed to load scales');
    } finally {
      setLoading(false);
    }
  }, [role, profile?.estate_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (scale: WeighingScale) => {
    if (!confirm(`Delete "${scale.name}"? This cannot be undone.`)) return;
    setDeletingId(scale.id);
    try {
      const { error } = await supabase.from('weighing_scales').delete().eq('id', scale.id);
      if (error) throw error;
      toast.success('Scale removed');
      fetchData();
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = scales.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.model ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.estates?.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text" placeholder="Search scales…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {canManageEstate(role) && (
          <button
            onClick={() => { setEditingScale(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-sm hover:shadow-blue-500/30"
          >
            <Plus className="w-4 h-4" /> Register Scale
          </button>
        )}
      </div>

      {/* Scales Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Scale className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">No scales found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {search ? 'Try a different search term' : 'Register your first Bluetooth scale to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(scale => (
            <div
              key={scale.id}
              className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scale.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Scale className={`w-5 h-5 ${scale.status === 'active' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{scale.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{scale.model ?? 'Generic Scale'}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${scale.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  {scale.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {scale.status}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {isAdmin(role) && scale.estates && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{scale.estates.name}</span>
                    <span className="font-mono text-[10px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">{scale.estates.estate_code}</span>
                  </div>
                )}
                {scale.bt_device_name && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Bluetooth className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                    <span className="truncate font-mono">{scale.bt_device_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Unit: <strong className="text-slate-700 dark:text-slate-200">{scale.unit.toUpperCase()}</strong></span>
                  {(scale.bt_service_uuid || scale.bt_characteristic_uuid) && (
                    <span className="ml-auto text-[10px] font-mono bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">Custom UUID</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {canManageEstate(role) && (
                <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => { setEditingScale(scale); setShowModal(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(scale)}
                    disabled={deletingId === scale.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === scale.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <ScaleFormModal
          scale={editingScale}
          estateId={profile?.estate_id ?? null}
          estates={estates}
          onClose={() => { setShowModal(false); setEditingScale(null); }}
          onSaved={fetchData}
          currentRole={role}
        />
      )}
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────

function SessionsTab({ profile, role }: { profile: any; role: AppRole | null }) {
  const [sessions, setSessions] = useState<WeighingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('weighing_sessions')
        .select('*, weighing_scales(name), users(full_name)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!isAdmin(role) && profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;
      setSessions(data ?? []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [role, profile?.estate_id, dateFrom, dateTo]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const filtered = sessions.filter(s =>
    (s.item_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.weighing_scales?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.users?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalWeight = filtered.reduce((sum, s) => sum + s.weight, 0);

  const exportCsv = () => {
    const headers = ['Date/Time', 'Item', 'Weight', 'Unit', 'Scale', 'Weighed By', 'Notes'];
    const rows = filtered.map(s => [
      new Date(s.created_at).toLocaleString(),
      s.item_name,
      s.weight.toFixed(3),
      s.unit,
      s.weighing_scales?.name ?? '',
      s.users?.full_name ?? '',
      s.notes ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weighing-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" placeholder="Search sessions…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm">
          <FileDown className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Summary Card */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sessions', value: filtered.length.toString(), icon: Activity, color: 'blue' },
            { label: 'Total Weight', value: `${totalWeight.toFixed(2)} ${filtered[0]?.unit ?? 'kg'}`, icon: Scale, color: 'emerald' },
            { label: 'Avg Weight', value: `${(totalWeight / filtered.length).toFixed(2)} ${filtered[0]?.unit ?? 'kg'}`, icon: Filter, color: 'violet' },
            { label: 'Scales Used', value: new Set(filtered.map(s => s.scale_id)).size.toString(), icon: Bluetooth, color: 'amber' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`bg-${color}-50 dark:bg-${color}-900/10 rounded-xl p-3 border border-${color}-100 dark:border-${color}-900/30`}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold text-${color}-600 dark:text-${color}-400 mb-1`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </div>
              <p className={`text-lg font-bold text-${color}-700 dark:text-${color}-300`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <Card className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Scale className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">No weighing sessions recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  {['Date / Time', 'Item Name', 'Weight', 'Scale', 'Weighed By', 'Notes'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                      {new Date(session.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{session.item_name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        {session.weight.toFixed(3)} <span className="text-xs font-normal opacity-70">{session.unit}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{session.weighing_scales?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{session.users?.full_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs max-w-[180px] truncate">{session.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'scales', label: 'Scale Management', icon: Scale },
  { id: 'sessions', label: 'Weighing Sessions', icon: Activity },
] as const;
type Tab = typeof TABS[number]['id'];

export default function WeighingScaleManager() {
  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const [tab, setTab] = useState<Tab>('scales');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-sm">
              <Scale className="w-4.5 h-4.5 text-white" />
            </div>
            Weighing Scale
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage Bluetooth scales and review weighing sessions per estate
          </p>
        </div>
        {/* BLE browser compatibility hint */}
        {!('bluetooth' in navigator) && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400">
            <BluetoothOff className="w-4 h-4 flex-shrink-0" />
            <span>Web Bluetooth not supported. Use Chrome or Edge for live weighing.</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
              tab === t.id
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'scales' && <ScalesTab profile={profile} role={role} />}
      {tab === 'sessions' && <SessionsTab profile={profile} role={role} />}
    </div>
  );
}
