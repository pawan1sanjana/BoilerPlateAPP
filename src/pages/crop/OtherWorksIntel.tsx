import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Save, CheckCircle2,
  Layers, ChevronDown, ChevronUp, Lock, LockOpen,
  ShieldAlert, Flag, Briefcase, Settings, X, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import { usePayrollLock } from '@/lib/payrollLockUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WORK_TYPES = [
  'Draining', 'Fencing', 'Mossing', 'Terracing', 'Road Maintenance', 'General Field Work'
];

const PAYMENT_METHODS = [
  'Daily Wage', 'Task Rate', 'Piece Rate'
];

// localStorage helpers
function getLocks(dateStr: string): Record<string, { isLocked: boolean; dayFinalized: boolean }> {
  try {
    const raw = localStorage.getItem(`other_works_locks_${dateStr}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function persistLock(dateStr: string, blockId: string, isLocked: boolean, dayFinalized: boolean) {
  const all = getLocks(dateStr);
  all[blockId] = { isLocked, dayFinalized };
  localStorage.setItem(`other_works_locks_${dateStr}`, JSON.stringify(all));
}

const DEFAULT_OTHER_WORKS_SETTINGS = {
  target_units_per_pax: 1.0,
  target_acres_per_pax: 0.50,
  default_payment_method: 'Daily Wage',
  types: WORK_TYPES.map(t => ({ id: t.toLowerCase().replace(/\s+/g, '_'), label: t, active: true }))
};

// WorkerRow
const WorkerRow = React.memo(({
  worker,
  isBlockLocked,
  isDayFinalized,
  isAdminUnlocked,
  isToday,
  blockId,
  isPayrollLockedForUser,
  onFieldChange
}: {
  worker: any;
  isBlockLocked: boolean;
  isDayFinalized: boolean;
  isAdminUnlocked: boolean;
  isToday: boolean;
  blockId: string;
  isPayrollLockedForUser?: boolean;
  onFieldChange: (blockId: string, workerId: string, field: string, val: any) => void;
}) => {
  const isDisabled = !isToday || isDayFinalized || isPayrollLockedForUser || (isBlockLocked && !isAdminUnlocked);

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-2 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden text-[10px] font-bold text-slate-500 shrink-0">
            {worker.photo
              ? <img src={worker.photo.startsWith('data:') ? worker.photo : `/api/uploads/${worker.photo}`} alt="" className="w-full h-full object-cover" />
              : `${worker.first_name?.[0] || ''}${worker.last_name?.[0] || ''}`
            }
          </div>
          <div>
            <p className={`text-sm font-medium leading-none ${worker.is_released ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
              {worker.first_name} {worker.last_name}
            </p>
            {worker.is_released && (
              <span className="text-[9px] text-red-500 font-semibold uppercase">Released</span>
            )}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        <select
          value={worker.work_type || WORK_TYPES[0]}
          disabled={isDisabled}
          onChange={e => onFieldChange(blockId, worker.id, 'work_type', e.target.value)}
          className={`h-8 text-xs border rounded-md px-2 bg-white dark:bg-slate-900 outline-none transition-all ${
            isDisabled
              ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300 cursor-not-allowed font-semibold'
              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-tea-500'
          }`}
        >
          {WORK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="text"
          inputMode="decimal"
          value={worker.units_completed ?? ''}
          disabled={isDisabled}
          onChange={e => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              onFieldChange(blockId, worker.id, 'units_completed', val);
            }
          }}
          className={`w-24 mx-auto block text-center text-sm border rounded-md px-2 py-1 outline-none transition-all ${
            isDisabled
              ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300 cursor-not-allowed font-semibold'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-tea-500 focus:ring-1 focus:ring-tea-200 dark:focus:ring-tea-900/30'
          }`}
          placeholder="0.0"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input
          type="text"
          inputMode="decimal"
          value={worker.area_covered ?? ''}
          disabled={isDisabled}
          onChange={e => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d*$/.test(val)) {
              onFieldChange(blockId, worker.id, 'area_covered', val);
            }
          }}
          className={`w-24 mx-auto block text-center text-sm border rounded-md px-2 py-1 outline-none transition-all ${
            isDisabled
              ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300 cursor-not-allowed font-semibold'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-tea-500 focus:ring-1 focus:ring-tea-200 dark:focus:ring-tea-900/30'
          }`}
          placeholder="0.00"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <select
          value={worker.payment_method || 'Daily Wage'}
          disabled={isDisabled}
          onChange={e => onFieldChange(blockId, worker.id, 'payment_method', e.target.value)}
          className={`h-8 text-xs border rounded-md px-2 bg-white dark:bg-slate-900 outline-none transition-all ${
            isDisabled
              ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300 cursor-not-allowed font-semibold'
              : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:border-tea-500'
          }`}
        >
          {PAYMENT_METHODS.map(pm => <option key={pm} value={pm}>{pm}</option>)}
        </select>
      </td>
      <td className="px-4 py-2 text-right">
        {isDayFinalized || (isBlockLocked && !isAdminUnlocked) ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
            <Lock size={10} /> Locked
          </span>
        ) : isBlockLocked && isAdminUnlocked ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
            <LockOpen size={10} /> Unlocked
          </span>
        ) : (parseFloat(worker.units_completed) > 0 || parseFloat(worker.area_covered) > 0) ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={10} /> Saved
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Pending</span>
        )}
      </td>
    </tr>
  );
});

export default function OtherWorksIntel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [expandedBlocks, setExpandedBlocks] = useState<Record<string, boolean>>({});
  const [blockWorkers, setBlockWorkers] = useState<Record<string, any[]>>({});

  // Lock state
  const [lockedBlocks, setLockedBlocks] = useState<Set<string>>(new Set());
  const [finalizedBlocks, setFinalizedBlocks] = useState<Set<string>>(new Set());
  const [adminUnlockedBlocks, setAdminUnlockedBlocks] = useState<Set<string>>(new Set());

  // Per-estate settings: keyed by estate_id -> settings object
  const [estateSettings, setEstateSettings] = useState<Record<string, any>>({});

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsEstateId, setSettingsEstateId] = useState<string>('');
  const [settingsDraft, setSettingsDraft] = useState<any>(DEFAULT_OTHER_WORKS_SETTINGS);
  const [copyingToAll, setCopyingToAll] = useState(false);

  // Feedback state
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Confirm dialog state
  type ConfirmAction =
    | { type: 'save'; blockId: string }
    | { type: 'finalize'; blockId: string };
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  // Load estate settings from Supabase
  const fetchSettingsForEstate = useCallback(async (estateId: string) => {
    if (!estateId) return;
    const { data } = await supabase
      .from('other_works_settings')
      .select('settings')
      .eq('estate_id', estateId)
      .maybeSingle();
    const loaded = data?.settings && Object.keys(data.settings).length > 0 ? data.settings : DEFAULT_OTHER_WORKS_SETTINGS;
    setEstateSettings(prev => ({ ...prev, [estateId]: loaded }));
    return loaded;
  }, []);

  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
      fetchSettingsForEstate(profile.estate_id);
    }
  }, [isUserAdmin, profile, fetchSettingsForEstate]);

  // Reload settings when estate filter changes (admin)
  useEffect(() => {
    if (isUserAdmin && estateFilter !== 'all') {
      fetchSettingsForEstate(estateFilter);
    }
  }, [isUserAdmin, estateFilter, fetchSettingsForEstate]);

  const dateStr = fmtDate(selectedDate);
  const { isLocked: isPayrollLocked } = usePayrollLock(dateStr, estateFilter !== 'all' ? estateFilter : profile?.estate_id, 'Other Works');
  const isPayrollLockedForUser = isPayrollLocked && !isUserAdmin;
  const isToday = dateStr === fmtDate(new Date());

  // Which estate's settings are active for the current view
  const currentEstateId = useMemo(() => {
    if (!isUserAdmin) return profile?.estate_id || '';
    if (estateFilter !== 'all') return estateFilter;
    return '';
  }, [isUserAdmin, profile, estateFilter]);

  const openSettings = async () => {
    const targetId = currentEstateId || (estates.length > 0 ? estates[0].id : '');
    setSettingsEstateId(targetId);
    setSettingsSaved(false);
    if (targetId) {
      setSettingsLoading(true);
      const loaded = await fetchSettingsForEstate(targetId);
      setSettingsDraft(loaded ?? DEFAULT_OTHER_WORKS_SETTINGS);
      setSettingsLoading(false);
    } else {
      setSettingsDraft(DEFAULT_OTHER_WORKS_SETTINGS);
    }
    setShowSettings(true);
  };

  const switchSettingsEstate = async (estateId: string) => {
    setSettingsEstateId(estateId);
    setSettingsSaved(false);
    setSettingsLoading(true);
    const cached = estateSettings[estateId];
    if (cached) {
      setSettingsDraft(cached);
      setSettingsLoading(false);
    } else {
      const loaded = await fetchSettingsForEstate(estateId);
      setSettingsDraft(loaded ?? DEFAULT_OTHER_WORKS_SETTINGS);
      setSettingsLoading(false);
    }
  };

  const saveSettingsForEstate = async () => {
    if (!settingsEstateId) return;
    setSettingsSaving(true);
    await supabase.from('other_works_settings').upsert(
      { estate_id: settingsEstateId, settings: settingsDraft, updated_at: new Date().toISOString() },
      { onConflict: 'estate_id' }
    );
    setEstateSettings(prev => ({ ...prev, [settingsEstateId]: settingsDraft }));
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const copyToAllEstates = async () => {
    if (!settingsDraft || !estates.length) return;
    setCopyingToAll(true);
    const payload = estates.map(e => ({
      estate_id: e.id,
      settings: settingsDraft,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('other_works_settings').upsert(payload, { onConflict: 'estate_id' });
    const newMap: Record<string, any> = {};
    estates.forEach(e => { newMap[e.id] = settingsDraft; });
    setEstateSettings(prev => ({ ...prev, ...newMap }));
    setCopyingToAll(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  // Fetch day data
  const fetchDayData = useCallback(async (date: string, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let blocksQ = supabase.from('field_blocks').select('*');
      if (!isUserAdmin && profile?.estate_id) blocksQ = blocksQ.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') blocksQ = blocksQ.eq('estate_id', estateFilter);
      const { data: dbBlocks, error: bErr } = await blocksQ;
      if (bErr) throw bErr;

      let musterQ = supabase.from('daily_muster').select('*, workforce(*)').eq('muster_date', date).eq('task', 'Other Works');
      if (!isUserAdmin && profile?.estate_id) musterQ = musterQ.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') musterQ = musterQ.eq('estate_id', estateFilter);
      const { data: dbMuster, error: mErr } = await musterQ;
      if (mErr) throw mErr;

      const { data: dbLogs, error: lErr } = await supabase
        .from('other_works_logs').select('*').eq('date', date);
      if (lErr) throw lErr;

      const logsMap = new Map<string, any>();
      const dbLockedBlocks = new Set<string>();
      (dbLogs || []).forEach(log => {
        logsMap.set(`${log.block_id}_${log.worker_id}`, log);
        if ((log.units_completed && log.units_completed > 0) || (log.area_covered && log.area_covered > 0)) {
          dbLockedBlocks.add(log.block_id);
        }
      });

      // Merge localStorage locks
      const stored = getLocks(date);
      const mergedLocked = new Set<string>(dbLockedBlocks);
      const newFinalized = new Set<string>();
      Object.entries(stored).forEach(([blockId, info]) => {
        if (info.isLocked) mergedLocked.add(blockId);
        if (info.dayFinalized) newFinalized.add(blockId);
      });

      if (!isBackground) {
        setLockedBlocks(mergedLocked);
        setFinalizedBlocks(newFinalized);
        setAdminUnlockedBlocks(new Set());
      } else {
        setLockedBlocks(prev => {
          const next = new Set(prev);
          mergedLocked.forEach(id => next.add(id));
          return next;
        });
        setFinalizedBlocks(prev => {
          const next = new Set(prev);
          newFinalized.forEach(id => next.add(id));
          return next;
        });
      }

      const musterCounts: Record<string, number> = {};
      const newBlockWorkers: Record<string, any[]> = {};
      (dbMuster || []).forEach((m: any) => {
        musterCounts[m.block_id] = (musterCounts[m.block_id] || 0) + 1;
        if (!newBlockWorkers[m.block_id]) newBlockWorkers[m.block_id] = [];
        if (m.workforce) {
          const w = m.workforce;
          const log = logsMap.get(`${m.block_id}_${w.id}`);
          newBlockWorkers[m.block_id].push({
            id: w.id, first_name: w.first_name, last_name: w.last_name,
            photo: w.photo, is_released: w.status === 'archived',
            work_type: log?.work_type ?? WORK_TYPES[0],
            units_completed: log?.units_completed ?? '',
            area_covered: log?.area_covered ?? '',
            payment_method: log?.payment_method ?? 'Daily Wage'
          });
        }
      });

      setBlockWorkers((prev: any) => {
        if (!isBackground) return newBlockWorkers;
        const next = { ...prev };
        Object.keys(newBlockWorkers).forEach(blockId => {
          const existingMap = new Map<string, any>((prev[blockId] || []).map((ew: any) => [ew.id, ew]));
          next[blockId] = newBlockWorkers[blockId].map((nw: any) => {
            const ex = existingMap.get(nw.id);
            if (ex && (ex.units_completed !== '' || ex.area_covered !== '')) {
              return { ...nw, work_type: ex.work_type, units_completed: ex.units_completed, area_covered: ex.area_covered, payment_method: ex.payment_method };
            }
            return nw;
          });
        });
        return next;
      });

      const processedBlocks = (dbBlocks || []).map((b: any) => ({
        block_id: b.id,
        block_name: b.name,
        area_acres: b.area_acres || '—',
        assigned_workers: musterCounts[b.id] || 0
      }));
      setBlocks(processedBlocks);

    } catch (e) { console.error(e); }
    finally { if (!isBackground) setLoading(false); }
  }, [isUserAdmin, profile, estateFilter]);

  useEffect(() => {
    fetchDayData(dateStr);
    const t = setInterval(() => fetchDayData(dateStr, true), 30000);
    return () => clearInterval(t);
  }, [dateStr, fetchDayData]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  const toggleBlock = (blockId: string) =>
    setExpandedBlocks((p: any) => ({ ...p, [blockId]: !p[blockId] }));

  const setWorkerField = useCallback((blockId: string, workerId: string, field: string, val: any) => {
    setBlockWorkers((p: any) => ({
      ...p,
      [blockId]: (p[blockId] || []).map((w: any) =>
        w.id === workerId ? { ...w, [field]: val } : w
      )
    }));
  }, []);

  // Save block records
  const saveBlockLogs = async (blockId: string) => {
    if (isPayrollLockedForUser) {
      alert(`Payroll for ${dateStr} is Confirmed & Locked. Other Works logs cannot be modified except by Super Admin.`);
      return;
    }
    const key = `${blockId}_SAVE`;
    setSavingKey(key);
    try {
      const workers = blockWorkers[blockId] || [];
      const payload = workers.map((w: any) => ({
        date: dateStr,
        block_id: blockId,
        worker_id: w.id,
        work_type: w.work_type || WORK_TYPES[0],
        units_completed: parseFloat(w.units_completed) || 0,
        area_covered: parseFloat(w.area_covered) || 0,
        payment_method: w.payment_method || 'Daily Wage'
      }));

      const { error } = await supabase
        .from('other_works_logs')
        .upsert(payload, { onConflict: 'date, block_id, worker_id' });
      if (error) throw error;

      setLockedBlocks(prev => { const n = new Set(prev); n.add(blockId); return n; });
      setAdminUnlockedBlocks(prev => { const n = new Set(prev); n.delete(blockId); return n; });
      persistLock(dateStr, blockId, true, finalizedBlocks.has(blockId));

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch (e) { console.error(e); }
    finally { setSavingKey(null); }
  };

  // Close Day
  const finalizeDay = async (blockId: string) => {
    if (isPayrollLockedForUser) {
      alert(`Payroll for ${dateStr} is Confirmed & Locked. Other Works logs cannot be modified except by Super Admin.`);
      return;
    }
    const key = `${blockId}_DAY`;
    setSavingKey(key);
    try {
      const workers = blockWorkers[blockId] || [];
      const payload = workers.map((w: any) => ({
        date: dateStr,
        block_id: blockId,
        worker_id: w.id,
        work_type: w.work_type || WORK_TYPES[0],
        units_completed: parseFloat(w.units_completed) || 0,
        area_covered: parseFloat(w.area_covered) || 0,
        payment_method: w.payment_method || 'Daily Wage'
      }));

      const { error } = await supabase
        .from('other_works_logs')
        .upsert(payload, { onConflict: 'date, block_id, worker_id' });
      if (error) throw error;

      setLockedBlocks(prev => { const n = new Set(prev); n.add(blockId); return n; });
      setFinalizedBlocks(prev => { const n = new Set(prev); n.add(blockId); return n; });
      setAdminUnlockedBlocks(prev => { const n = new Set(prev); n.delete(blockId); return n; });
      persistLock(dateStr, blockId, true, true);

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (e) { console.error(e); }
    finally { setSavingKey(null); }
  };

  const toggleAdminBlockUnlock = (blockId: string) => {
    setAdminUnlockedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const activeBlocks = blocks.filter(b => (b.assigned_workers || 0) > 0);
  const anyDateLocked = lockedBlocks.size > 0 || finalizedBlocks.size > 0;

  const totalUnitsToday = blocks.reduce((sum, b) => {
    const workers = blockWorkers[b.block_id] || [];
    return sum + workers.reduce((wSum: number, w: any) => wSum + (parseFloat(w.units_completed) || 0), 0);
  }, 0);

  const totalAreaToday = blocks.reduce((sum, b) => {
    const workers = blockWorkers[b.block_id] || [];
    return sum + workers.reduce((wSum: number, w: any) => wSum + (parseFloat(w.area_covered) || 0), 0);
  }, 0);

  const executeConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'save') {
      saveBlockLogs(pendingAction.blockId);
    } else {
      finalizeDay(pendingAction.blockId);
    }
    setPendingAction(null);
  };

  return (
    <div className="pb-16 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Other Works Monitor</h1>
      </div>

      {isPayrollLockedForUser && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <Lock size={16} className="shrink-0 text-amber-600" />
          <span>Daily Payroll for {dateStr} is Confirmed & Locked. Other Works logs cannot be modified except by Super Admin.</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className={`flex items-center gap-1 rounded-lg px-2 py-1.5 shadow-sm border ${
            anyDateLocked
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
          }`}>
            <Button variant="ghost" size="icon-sm" onClick={() => changeDate(-1)} className="text-slate-500 hover:text-slate-900 rounded-full">
              <ChevronLeft size={16} />
            </Button>
            <input
              type="date"
              value={dateStr}
              onChange={e => setSelectedDate(new Date(e.target.value))}
              className={`text-sm font-semibold bg-transparent outline-none cursor-pointer w-32 ${
                anyDateLocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
              }`}
            />
            <Button variant="ghost" size="icon-sm" onClick={() => changeDate(1)} className="text-slate-500 hover:text-slate-900 rounded-full">
              <ChevronRight size={16} />
            </Button>
            {anyDateLocked && (
              <span title="Some entries are locked for this date">
                <Lock size={13} className="text-amber-500 dark:text-amber-400 mr-1" />
              </span>
            )}
          </div>

          {isUserAdmin && (
            <select
              value={estateFilter}
              onChange={e => setEstateFilter(e.target.value)}
              className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 min-w-[140px]"
            >
              <option value="all">All Estates</option>
              {estates.map(est => <option key={est.id} value={est.id}>{est.name}</option>)}
            </select>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-4 px-3 py-1.5 bg-tea-50 dark:bg-tea-900/20 text-tea-700 dark:text-tea-400 rounded-lg border border-tea-100 dark:border-tea-800 mr-2">
            <span className="text-xs">Units: <strong className="text-tea-800 dark:text-tea-300">{totalUnitsToday.toFixed(1)}</strong></span>
            <span className="text-xs">Area: <strong className="text-tea-800 dark:text-tea-300">{totalAreaToday.toFixed(2)} ac</strong></span>
            <span className="text-xs">Blocks: <strong className="text-tea-800 dark:text-tea-300">{activeBlocks.length}</strong></span>
          </div>
          <Button variant="outline" className="h-9 gap-1.5 rounded-full" onClick={openSettings}>
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>

      {/* Block List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : activeBlocks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Layers size={28} />
          <p className="text-sm">No blocks assigned for other field operations on this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBlocks.map(block => {
            const workers: any[] = blockWorkers[block.block_id] || [];
            const blockUnits = workers.reduce((s: number, w: any) => s + (parseFloat(w.units_completed) || 0), 0);
            const blockArea = workers.reduce((s: number, w: any) => s + (parseFloat(w.area_covered) || 0), 0);

            const isOpen = !!expandedBlocks[block.block_id];
            const isDayFinalized = finalizedBlocks.has(block.block_id);
            const isBlockLocked = lockedBlocks.has(block.block_id);
            const isAdminUnlocked = adminUnlockedBlocks.has(block.block_id);

            const saveKey = `${block.block_id}_SAVE`;
            const dayKey = `${block.block_id}_DAY`;
            const isSaving = savingKey === saveKey || savingKey === dayKey;
            const isSaved = savedKey === saveKey || savedKey === dayKey;
            const isSavingDay = savingKey === dayKey;
            const isSavedDay = savedKey === dayKey;

            return (
              <div
                key={block.block_id}
                className={`border rounded-xl overflow-hidden bg-white dark:bg-slate-900 ${
                  isDayFinalized
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : isBlockLocked
                      ? 'border-amber-200 dark:border-amber-700'
                      : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Block header */}
                <button
                  onClick={() => toggleBlock(block.block_id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <Briefcase size={15} className="text-tea-500 shrink-0" />
                    <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">{block.block_name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{block.assigned_workers} pax</span>
                    {block.area_acres && (
                      <span className="text-xs text-slate-400 shrink-0">{block.area_acres} ac</span>
                    )}

                    {isDayFinalized && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        <Flag size={9} />
                        Day Closed
                      </span>
                    )}

                    {!isDayFinalized && isBlockLocked && (
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                        isAdminUnlocked
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                      }`}>
                        {isAdminUnlocked ? <LockOpen size={9} /> : <Lock size={9} />}
                        {isAdminUnlocked ? 'Unlocked' : 'Locked'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      <strong className="text-tea-600 dark:text-tea-400 font-bold">{blockUnits.toFixed(1)}</strong> units
                      {' · '}
                      <strong className="text-slate-700 dark:text-slate-200 font-bold">{blockArea.toFixed(2)}</strong> ac
                    </span>
                    {isOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t border-slate-100 dark:border-slate-800">
                    {/* Day-finalized banner */}
                    {isDayFinalized && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800">
                        <Flag size={13} className="text-emerald-500 shrink-0" />
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex-1">
                          Day closed - all entries finalized and locked.
                        </span>
                        {isUserAdmin && (
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => {
                              setFinalizedBlocks(prev => { const n = new Set(prev); n.delete(block.block_id); return n; });
                              setLockedBlocks(prev => { const n = new Set(prev); n.delete(block.block_id); return n; });
                              persistLock(dateStr, block.block_id, false, false);
                            }}
                            className="h-auto p-0 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
                          >
                            <ShieldAlert size={11} /> Admin Reopen
                          </Button>
                        )}
                      </div>
                    )}

                    {!workers.length ? (
                      <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs">Loading workers...</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                              <th className="text-left px-4 py-2 font-medium sticky left-0 bg-slate-50 dark:bg-slate-800/60 border-r border-slate-100 dark:border-slate-800">Worker</th>
                              <th className="text-center px-3 py-2 font-medium">Work Type</th>
                              <th className="text-center px-3 py-2 font-medium">Units Completed</th>
                              <th className="text-center px-3 py-2 font-medium">Area Covered (ac)</th>
                              <th className="text-center px-3 py-2 font-medium">Payment Method</th>
                              <th className="text-right px-4 py-2 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {workers.map((worker: any) => (
                              <WorkerRow
                                key={worker.id}
                                worker={worker}
                                isBlockLocked={isBlockLocked}
                                isDayFinalized={isDayFinalized}
                                isAdminUnlocked={isAdminUnlocked}
                                isToday={isToday}
                                blockId={block.block_id}
                                onFieldChange={setWorkerField}
                              />
                            ))}
                          </tbody>
                          <tfoot>
                            {/* Totals row */}
                            <tr className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              <td className="px-4 py-2 sticky left-0 bg-slate-50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800">Total</td>
                              <td className="px-3 py-2 text-center">—</td>
                              <td className="px-3 py-2 text-center font-bold text-tea-600 dark:text-tea-400">{blockUnits.toFixed(1)}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200">{blockArea.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">—</td>
                              <td className="px-4 py-2 text-right" />
                            </tr>

                            {/* Save controls row */}
                            {isToday && !isDayFinalized && (
                              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
                                <td className="px-4 py-2.5 sticky left-0 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Block Actions</span>
                                </td>
                                <td colSpan={4} className="px-3 py-2 text-center align-middle">
                                  {isBlockLocked && !isAdminUnlocked ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                        <Lock size={11} /> Block Locked
                                      </span>
                                      {isUserAdmin && (
                                        <Button
                                          variant="link"
                                          size="xs"
                                          onClick={() => toggleAdminBlockUnlock(block.block_id)}
                                          className="text-[11px] h-auto p-0 text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                        >
                                          <ShieldAlert size={10} /> Unlock
                                        </Button>
                                      )}
                                    </div>
                                  ) : isBlockLocked && isAdminUnlocked ? (
                                    <div className="flex items-center justify-center gap-3">
                                      <Button
                                        size="xs"
                                        disabled={isSaving}
                                        onClick={() => setPendingAction({ type: 'save', blockId: block.block_id })}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 px-3 flex items-center gap-1 font-semibold rounded-full"
                                      >
                                        {isSaving ? <Loader2 size={10} className="animate-spin" /> : isSaved ? <CheckCircle2 size={10} /> : <Save size={10} />}
                                        {isSaving ? 'Saving...' : 'Re-save'}
                                      </Button>
                                      <Button
                                        variant="link"
                                        size="xs"
                                        onClick={() => toggleAdminBlockUnlock(block.block_id)}
                                        className="text-[11px] h-auto p-0 text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                                      >
                                        <Lock size={10} /> Re-lock
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="xs"
                                      disabled={isSaving}
                                      onClick={() => setPendingAction({ type: 'save', blockId: block.block_id })}
                                      className={`text-[11px] h-7 px-4 flex items-center gap-1.5 font-semibold mx-auto rounded-full ${
                                        isSaved
                                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                          : 'bg-tea-600 hover:bg-tea-700 text-white'
                                      }`}
                                    >
                                      {isSaving ? <Loader2 size={10} className="animate-spin" /> : isSaved ? <CheckCircle2 size={10} /> : <Save size={10} />}
                                      {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save & Lock'}
                                    </Button>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right align-middle">
                                  <Button
                                    size="sm"
                                    variant={isSavedDay ? 'outline' : !isBlockLocked ? 'ghost' : 'destructive'}
                                    disabled={isSavingDay || !isBlockLocked}
                                    onClick={() => setPendingAction({ type: 'finalize', blockId: block.block_id })}
                                    title={!isBlockLocked ? 'Save records first' : 'Close the day for this block'}
                                    className={`ml-auto rounded-full ${
                                      isSavedDay
                                        ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20'
                                        : !isBlockLocked
                                          ? 'text-slate-300 cursor-not-allowed'
                                          : ''
                                    }`}
                                  >
                                    {isSavingDay
                                      ? <><Loader2 size={10} className="animate-spin" /> Closing...</>
                                      : isSavedDay
                                        ? <><CheckCircle2 size={10} /> Closed</>
                                        : <><Flag size={10} /> Close Day</>
                                    }
                                  </Button>
                                </td>
                              </tr>
                            )}
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm Dialog */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-xs p-6 space-y-4">
            {pendingAction.type === 'save' ? (
              <>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Lock size={15} className="text-amber-500" />
                  Save & Lock Block
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Save other works records for this block?
                  Inputs will become <strong className="text-amber-600 dark:text-amber-400">read-only</strong>.
                  {isUserAdmin && <span className="block mt-1 text-xs text-blue-500">As an admin, you can unlock later if needed.</span>}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Flag size={15} className="text-red-500" />
                  Close Day for This Block
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Save all remaining open entries and <strong className="text-red-600 dark:text-red-400">close the day</strong> for this block.
                  All inputs will be permanently locked.
                  {isUserAdmin && <span className="block mt-1 text-xs text-blue-500">As an admin, you can reopen later if needed.</span>}
                </p>
              </>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setPendingAction(null)} className="flex-1 rounded-full">Cancel</Button>
              <Button
                onClick={executeConfirm}
                variant={pendingAction.type === 'finalize' ? 'destructive' : 'default'}
                className={`flex-1 rounded-full ${pendingAction.type === 'save' ? 'bg-tea-600 hover:bg-tea-700 text-white' : ''}`}
              >
                {pendingAction.type === 'save' ? 'Save & Lock' : 'Close Day'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
                <Settings size={18} className="text-slate-500" />
                Other Works Settings
              </h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowSettings(false)} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <X size={18} />
              </Button>
            </div>

            {/* Estate selector (admin sees a picker; non-admin sees estate name badge) */}
            <div className="px-4 pt-3 pb-1">
              {isUserAdmin ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Editing estate</label>
                  <select
                    value={settingsEstateId}
                    onChange={e => switchSettingsEstate(e.target.value)}
                    disabled={settingsLoading}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-primary disabled:opacity-60"
                  >
                    {estates.length === 0 && <option value="">No estates</option>}
                    {estates.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estate:</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {estates.find(e => e.id === settingsEstateId)?.name ?? '—'}
                  </span>
                </div>
              )}
            </div>

            {/* Settings content */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading settings…</span>
                </div>
              ) : (
                <>
                  {/* General Agronomic Config */}
                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Units / Pax Target</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            value={settingsDraft?.target_units_per_pax ?? 1.0}
                            onChange={e => setSettingsDraft({ ...settingsDraft, target_units_per_pax: parseFloat(e.target.value) || 0 })}
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">Units</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Daily Area Target</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.05"
                            value={settingsDraft?.target_acres_per_pax ?? 0.50}
                            onChange={e => setSettingsDraft({ ...settingsDraft, target_acres_per_pax: parseFloat(e.target.value) || 0 })}
                            className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">Ac/Pax</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Work Types List */}
                  <div className="space-y-2.5">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Field Operation Work Types</label>
                    {(settingsDraft?.types || []).map((t: any, idx: number) => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={t.active}
                            onChange={e => {
                              const nTypes = [...(settingsDraft.types || [])];
                              nTypes[idx] = { ...nTypes[idx], active: e.target.checked };
                              setSettingsDraft({ ...settingsDraft, types: nTypes });
                            }}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          Enable {t.label || t.id}
                        </label>
                        <input
                          type="text"
                          value={t.label}
                          disabled={!t.active}
                          onChange={e => {
                            const nTypes = [...(settingsDraft.types || [])];
                            nTypes[idx] = { ...nTypes[idx], label: e.target.value };
                            setSettingsDraft({ ...settingsDraft, types: nTypes });
                          }}
                          className="w-48 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary transition-all disabled:opacity-50"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 space-y-2">
              {/* Copy to all estates — admin only */}
              {isUserAdmin && estates.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={copyingToAll || settingsLoading}
                  onClick={copyToAllEstates}
                  className="w-full rounded-full gap-1.5 text-slate-600 dark:text-slate-300"
                >
                  {copyingToAll
                    ? <><Loader2 size={12} className="animate-spin" /> Copying…</>
                    : <><Copy size={12} /> Copy to All Estates</>
                  }
                </Button>
              )}
              <Button
                disabled={settingsSaving || settingsLoading || !settingsEstateId}
                onClick={saveSettingsForEstate}
                className={`w-full py-2.5 rounded-full gap-1.5 ${
                  settingsSaved ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''
                }`}
              >
                {settingsSaving
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : settingsSaved
                    ? <><CheckCircle2 size={14} /> Saved</>
                    : 'Save Settings'
                }
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
