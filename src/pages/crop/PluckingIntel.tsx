import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Loader2, Save, CheckCircle2,
  Layers, ChevronDown, ChevronUp, Settings, X, Lock, LockOpen,
  ShieldAlert, Flag, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import { usePayrollLock } from '@/lib/payrollLockUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

const DEFAULT_INTERVALS = [
  { id: 'morning', label: 'Morning', time: '06:00-09:00', active: true },
  { id: 'midday', label: 'Midday', time: '09:00-12:00', active: true },
  { id: 'afternoon', label: 'Afternoon', time: '12:00-15:00', active: true },
  { id: 'evening', label: 'Evening', time: '15:00-18:00', active: true },
];

function pad(n: number) { return String(n).padStart(2, '0'); }
function fmtDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// localStorage helpers
function getLocks(dateStr: string): Record<string, { sessions: string[]; dayFinalized: boolean }> {
  try {
    const raw = localStorage.getItem(`plucking_locks_${dateStr}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function persistLock(dateStr: string, blockId: string, sessions: string[], dayFinalized: boolean) {
  const all = getLocks(dateStr);
  all[blockId] = { sessions, dayFinalized };
  localStorage.setItem(`plucking_locks_${dateStr}`, JSON.stringify(all));
}

// WorkerRow
const WorkerRow = React.memo(({
  worker, activeIntervals, lockedSessionSet, isDayFinalized,
  adminUnlockedSessions, isToday, blockId, isPayrollLockedForUser, onWeightChange
}: {
  worker: any;
  activeIntervals: any[];
  lockedSessionSet: Set<string>;
  isDayFinalized: boolean;
  adminUnlockedSessions: Set<string>;
  isToday: boolean;
  blockId: string;
  isPayrollLockedForUser?: boolean;
  onWeightChange: (blockId: string, workerId: string, label: string, val: string) => void;
}) => {
  const rowTotal = activeIntervals.reduce(
    (s: number, iv: any) => s + (parseFloat(worker.weights?.[iv.label]) || 0), 0
  );

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
      {activeIntervals.map((iv: any) => {
        const sessionLocked = isDayFinalized || isPayrollLockedForUser || (lockedSessionSet.has(iv.label) && !adminUnlockedSessions.has(iv.label));
        return (
          <td key={iv.id} className={`px-3 py-2 ${sessionLocked ? 'bg-slate-50/70 dark:bg-slate-800/30' : ''}`}>
            <input
              type="text"
              inputMode="decimal"
              value={worker.weights?.[iv.label] ?? ''}
              disabled={!isToday || sessionLocked}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  onWeightChange(blockId, worker.id, iv.label, val);
                }
              }}
              className={`w-20 text-center text-sm border rounded-md px-2 py-1 outline-none transition-all
                ${sessionLocked
                  ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300 cursor-not-allowed font-semibold'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-tea-500 focus:ring-1 focus:ring-tea-200 dark:focus:ring-tea-900/30'
                }`}
              placeholder="0.0"
            />
          </td>
        );
      })}
      <td className="px-4 py-2 text-right">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{rowTotal.toFixed(1)}</span>
        <span className="text-xs text-slate-400 ml-1">kg</span>
      </td>
    </tr>
  );
});

// Main Component
export default function PluckingIntel() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [estateSettings, setEstateSettings] = useState<Record<string, any[]>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsEstateId, setSettingsEstateId] = useState<string>('');
  const [settingsDraft, setSettingsDraft] = useState<any[]>(DEFAULT_INTERVALS);
  const [copyingToAll, setCopyingToAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<any>({});
  const [blockWorkers, setBlockWorkers] = useState<any>({});
  const [lockedSessions, setLockedSessions] = useState<Record<string, Set<string>>>({});
  const [finalizedBlocks, setFinalizedBlocks] = useState<Set<string>>(new Set());
  const [adminUnlockedSessions, setAdminUnlockedSessions] = useState<Record<string, Set<string>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  type ConfirmAction =
    | { type: 'session'; blockId: string; intervalLabel: string }
    | { type: 'finalize'; blockId: string };
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);

  const { profile } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  const fetchSettingsForEstate = useCallback(async (estateId: string) => {
    if (!estateId) return;
    const { data } = await supabase
      .from('plucking_settings')
      .select('intervals')
      .eq('estate_id', estateId)
      .maybeSingle();
    const loaded: any[] = data?.intervals?.length ? data.intervals : DEFAULT_INTERVALS;
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

  useEffect(() => {
    if (isUserAdmin && estateFilter !== 'all') {
      fetchSettingsForEstate(estateFilter);
    }
  }, [isUserAdmin, estateFilter, fetchSettingsForEstate]);

  const dateStr = fmtDate(selectedDate);
  const { isLocked: isPayrollLocked } = usePayrollLock(dateStr, estateFilter !== 'all' ? estateFilter : profile?.estate_id, 'Plucking');
  const isPayrollLockedForUser = isPayrollLocked && !isUserAdmin;
  const isToday = dateStr === fmtDate(new Date());

  const currentEstateId = useMemo(() => {
    if (!isUserAdmin) return profile?.estate_id || '';
    if (estateFilter !== 'all') return estateFilter;
    return '';
  }, [isUserAdmin, profile, estateFilter]);

  const activeIntervals = useMemo(() => {
    const src = currentEstateId && estateSettings[currentEstateId]
      ? estateSettings[currentEstateId]
      : DEFAULT_INTERVALS;
    return src.filter((iv: any) => iv.active);
  }, [currentEstateId, estateSettings]);

  const fetchDayData = useCallback(async (date: string, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      let blocksQ = supabase.from('field_blocks').select('*');
      if (!isUserAdmin && profile?.estate_id) blocksQ = blocksQ.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') blocksQ = blocksQ.eq('estate_id', estateFilter);
      const { data: dbBlocks, error: bErr } = await blocksQ;
      if (bErr) throw bErr;

      let musterQ = supabase.from('daily_muster').select('*, workforce(*)').eq('muster_date', date).eq('task', 'Plucking');
      if (!isUserAdmin && profile?.estate_id) musterQ = musterQ.eq('estate_id', profile.estate_id);
      else if (isUserAdmin && estateFilter !== 'all') musterQ = musterQ.eq('estate_id', estateFilter);
      const { data: dbMuster, error: mErr } = await musterQ;
      if (mErr) throw mErr;

      const { data: dbLogs, error: lErr } = await supabase
        .from('plucking_logs').select('*').eq('date', date);
      if (lErr) throw lErr;

      const logsMap = new Map<string, any>();
      const dbLockedSessions: Record<string, Set<string>> = {};
      (dbLogs || []).forEach(log => {
        logsMap.set(`${log.block_id}_${log.worker_id}`, log);
        if (log.interval_weights) {
          Object.entries(log.interval_weights).forEach(([label, val]) => {
            if (val !== '' && val != null) {
              if (!dbLockedSessions[log.block_id]) dbLockedSessions[log.block_id] = new Set();
              dbLockedSessions[log.block_id].add(label);
            }
          });
        }
      });

      const stored = getLocks(date);
      const mergedLocked: Record<string, Set<string>> = { ...dbLockedSessions };
      const newFinalized = new Set<string>();
      Object.entries(stored).forEach(([blockId, info]) => {
        if (!mergedLocked[blockId]) mergedLocked[blockId] = new Set();
        info.sessions.forEach(s => mergedLocked[blockId].add(s));
        if (info.dayFinalized) newFinalized.add(blockId);
      });

      if (!isBackground) {
        setLockedSessions(mergedLocked);
        setFinalizedBlocks(newFinalized);
        setAdminUnlockedSessions({});
      } else {
        setLockedSessions(prev => {
          const next = { ...prev };
          Object.entries(mergedLocked).forEach(([blockId, sessions]) => {
            if (!next[blockId]) next[blockId] = new Set();
            sessions.forEach(s => next[blockId].add(s));
          });
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
            weights: log ? log.interval_weights : {}
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
            if (ex && Object.keys(ex.weights || {}).length > 0)
              return { ...nw, weights: { ...nw.weights, ...ex.weights } };
            return nw;
          });
        });
        return next;
      });

      const processedBlocks = (dbBlocks || []).map((b: any) => ({
        block_id: b.id, block_name: b.name, assigned_workers: musterCounts[b.id] || 0
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

  const setWorkerWeight = useCallback((blockId: string, workerId: string, label: string, val: string) => {
    setBlockWorkers((p: any) => ({
      ...p,
      [blockId]: (p[blockId] || []).map((w: any) =>
        w.id === workerId ? { ...w, weights: { ...w.weights, [label]: val } } : w
      )
    }));
  }, []);

  const saveInterval = async (blockId: string, intervalLabel: string) => {
    if (isPayrollLockedForUser) {
      alert(`Payroll for ${dateStr} is Confirmed & Locked. Harvest logs cannot be modified except by Super Admin.`);
      return;
    }
    const key = `${blockId}_${intervalLabel}`;
    setSavingKey(key);
    try {
      const workers = blockWorkers[blockId] || [];
      const logsQuery = await supabase
        .from('plucking_logs').select('*')
        .eq('date', dateStr).eq('block_id', blockId);
      const existingLogs = new Map((logsQuery.data || []).map((l: any) => [l.worker_id, l]));

      const payload = workers.map((w: any) => {
        const existing = existingLogs.get(w.id);
        const mergedWeights = { ...(existing?.interval_weights || {}), [intervalLabel]: w.weights?.[intervalLabel] ?? '' };
        const total = Object.values(mergedWeights).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0);
        return {
          date: dateStr, block_id: blockId, worker_id: w.id,
          interval_weights: mergedWeights, total_kg: total
        };
      });

      const { error } = await supabase.from('plucking_logs').upsert(payload, { onConflict: 'date, block_id, worker_id' });
      if (error) throw error;

      setLockedSessions(prev => {
        const next = { ...prev };
        if (!next[blockId]) next[blockId] = new Set();
        next[blockId] = new Set(next[blockId]);
        next[blockId].add(intervalLabel);
        return next;
      });
      setAdminUnlockedSessions(prev => {
        const next = { ...prev };
        if (next[blockId]) {
          next[blockId] = new Set(next[blockId]);
          next[blockId].delete(intervalLabel);
        }
        return next;
      });

      const currentLocked = lockedSessions[blockId] ? [...lockedSessions[blockId]] : [];
      if (!currentLocked.includes(intervalLabel)) currentLocked.push(intervalLabel);
      persistLock(dateStr, blockId, currentLocked, finalizedBlocks.has(blockId));

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
    } catch (e) { console.error(e); }
    finally { setSavingKey(null); }
  };

  // Close Day
  const finalizeDay = async (blockId: string) => {
    if (isPayrollLockedForUser) {
      alert(`Payroll for ${dateStr} is Confirmed & Locked. Harvest logs cannot be modified except by Super Admin.`);
      return;
    }
    const key = `${blockId}_DAY`;
    setSavingKey(key);
    try {
      const workers = blockWorkers[blockId] || [];
      const logsQuery = await supabase
        .from('plucking_logs').select('*')
        .eq('date', dateStr).eq('block_id', blockId);
      const existingLogs = new Map((logsQuery.data || []).map((l: any) => [l.worker_id, l]));

      const payload = workers.map((w: any) => {
        const existing = existingLogs.get(w.id);
        const allWeights = { ...(existing?.interval_weights || {}), ...w.weights };
        const total = Object.values(allWeights).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0);
        return { date: dateStr, block_id: blockId, worker_id: w.id, interval_weights: allWeights, total_kg: total };
      });

      const { error } = await supabase.from('plucking_logs').upsert(payload, { onConflict: 'date, block_id, worker_id' });
      if (error) throw error;

      const allLabels = activeIntervals.map((iv: any) => iv.label);
      setLockedSessions(prev => ({ ...prev, [blockId]: new Set(allLabels) }));
      setFinalizedBlocks(prev => { const n = new Set(prev); n.add(blockId); return n; });
      setAdminUnlockedSessions(prev => { const n = { ...prev }; delete n[blockId]; return n; });
      persistLock(dateStr, blockId, allLabels, true);

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 3000);
    } catch (e) { console.error(e); }
    finally { setSavingKey(null); }
  };

  const toggleBlock = (blockId: string) => {
    setExpandedBlocks((prev: any) => ({ ...prev, [blockId]: !prev[blockId] }));
  };

  const toggleAdminSessionUnlock = (blockId: string, ivLabel: string) => {
    setAdminUnlockedSessions(prev => {
      const next = { ...prev };
      if (!next[blockId]) next[blockId] = new Set();
      else next[blockId] = new Set(next[blockId]);
      if (next[blockId].has(ivLabel)) next[blockId].delete(ivLabel);
      else next[blockId].add(ivLabel);
      return next;
    });
  };

  // ── Settings helpers ──
  const openSettings = async () => {
    const targetId = currentEstateId || (estates.length > 0 ? estates[0].id : '');
    setSettingsEstateId(targetId);
    setSettingsSaved(false);
    if (targetId) {
      setSettingsLoading(true);
      const loaded = await fetchSettingsForEstate(targetId);
      setSettingsDraft(loaded ?? DEFAULT_INTERVALS);
      setSettingsLoading(false);
    } else {
      setSettingsDraft(DEFAULT_INTERVALS);
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
      setSettingsDraft(loaded ?? DEFAULT_INTERVALS);
      setSettingsLoading(false);
    }
  };

  const saveSettingsForEstate = async () => {
    if (!settingsEstateId) return;
    setSettingsSaving(true);
    await supabase.from('plucking_settings').upsert(
      { estate_id: settingsEstateId, intervals: settingsDraft, updated_at: new Date().toISOString() },
      { onConflict: 'estate_id' }
    );
    setEstateSettings(prev => ({ ...prev, [settingsEstateId]: settingsDraft }));
    setSettingsSaving(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const copyToAllEstates = async () => {
    if (!settingsDraft.length || !estates.length) return;
    setCopyingToAll(true);
    const payload = estates.map(e => ({
      estate_id: e.id,
      intervals: settingsDraft,
      updated_at: new Date().toISOString()
    }));
    await supabase.from('plucking_settings').upsert(payload, { onConflict: 'estate_id' });
    const newMap: Record<string, any[]> = {};
    estates.forEach(e => { newMap[e.id] = settingsDraft; });
    setEstateSettings(prev => ({ ...prev, ...newMap }));
    setCopyingToAll(false);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const activeBlocks = blocks.filter(b => (b.assigned_workers || 0) > 0);
  const anyDateLocked = Object.keys(lockedSessions).some(k => lockedSessions[k].size > 0) || finalizedBlocks.size > 0;

  const totalKgToday = blocks.reduce((sum, b) => {
    const workers = blockWorkers[b.block_id] || [];
    return sum + workers.reduce((wSum: number, w: any) => {
      return wSum + activeIntervals.reduce((ivSum: number, s: any) => ivSum + (parseFloat(w.weights?.[s.label]) || 0), 0);
    }, 0);
  }, 0);

  const executeConfirm = () => {
    if (!pendingAction) return;
    if (pendingAction.type === 'session') {
      saveInterval(pendingAction.blockId, pendingAction.intervalLabel);
    } else {
      finalizeDay(pendingAction.blockId);
    }
    setPendingAction(null);
  };

  return (
    <div className="pb-16 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Plucking Registry</h1>
      </div>

      {isPayrollLockedForUser && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs font-semibold">
          <Lock size={16} className="shrink-0 text-amber-600" />
          <span>Daily Payroll for {dateStr} is Confirmed & Locked. Harvest logs cannot be modified except by Super Admin.</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className={`flex items-center gap-1 rounded-lg px-2 py-1.5 shadow-sm border ${anyDateLocked
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
              className={`text-sm font-semibold bg-transparent outline-none cursor-pointer w-32 ${anyDateLocked ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
                }`}
            />
            <Button variant="ghost" size="icon-sm" onClick={() => changeDate(1)} className="text-slate-500 hover:text-slate-900 rounded-full">
              <ChevronRight size={16} />
            </Button>
            {anyDateLocked && (
              <span title="Some sessions are locked for this date">
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
            <span className="text-xs">Total: <strong className="text-tea-800 dark:text-tea-300">{totalKgToday.toFixed(1)} kg</strong></span>
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
          <p className="text-sm">No blocks assigned for plucking on this date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeBlocks.map(block => {
            const workers: any[] = blockWorkers[block.block_id] || [];
            const blockTotal = workers.reduce((sum: number, w: any) =>
              sum + activeIntervals.reduce((iv: number, s: any) => iv + (parseFloat(w.weights?.[s.label]) || 0), 0), 0);
            const isOpen = !!expandedBlocks[block.block_id];
            const isDayFinalized = finalizedBlocks.has(block.block_id);
            const blockLockedSet = lockedSessions[block.block_id] || new Set<string>();
            const adminUnlocked = adminUnlockedSessions[block.block_id] || new Set<string>();
            const lockedCount = activeIntervals.filter((iv: any) => blockLockedSet.has(iv.label)).length;
            const dayKey = `${block.block_id}_DAY`;
            const isSavingDay = savingKey === dayKey;
            const isSavedDay = savedKey === dayKey;

            return (
              <div
                key={block.block_id}
                className={`border rounded-xl overflow-hidden bg-white dark:bg-slate-900 ${isDayFinalized
                    ? 'border-emerald-200 dark:border-emerald-800'
                    : lockedCount > 0
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
                    <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">{block.block_name}</span>
                    <span className="text-xs text-slate-400 shrink-0">{block.assigned_workers} pax</span>

                    {isDayFinalized && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        <Flag size={9} />
                        Day Closed
                      </span>
                    )}

                    {!isDayFinalized && activeIntervals.map((iv: any) => {
                      if (!blockLockedSet.has(iv.label)) return null;
                      const isUnlocked = adminUnlocked.has(iv.label);
                      return (
                        <span key={iv.id} className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${isUnlocked
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          }`}>
                          {isUnlocked ? <LockOpen size={9} /> : <Lock size={9} />}
                          {iv.label}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-bold text-tea-600 dark:text-tea-400">{blockTotal.toFixed(1)} kg</span>
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
                          Day closed - all sessions finalized and locked.
                        </span>
                        {isUserAdmin && (
                          <Button
                            variant="link"
                            size="xs"
                            onClick={() => {
                              setFinalizedBlocks(prev => { const n = new Set(prev); n.delete(block.block_id); return n; });
                              setLockedSessions(prev => { const n = { ...prev }; delete n[block.block_id]; return n; });
                              persistLock(dateStr, block.block_id, [], false);
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
                              {activeIntervals.map((iv: any) => {
                                const isLocked = blockLockedSet.has(iv.label) && !isDayFinalized;
                                const isUnlocked = adminUnlocked.has(iv.label);
                                return (
                                  <th key={iv.id} className={`text-center px-3 py-2 font-medium whitespace-nowrap ${isDayFinalized
                                      ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                                      : isLocked && !isUnlocked
                                        ? 'bg-amber-50/80 dark:bg-amber-900/10'
                                        : ''
                                    }`}>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="flex items-center gap-1">
                                        {(isDayFinalized || (isLocked && !isUnlocked)) && <Lock size={9} className="text-amber-400" />}
                                        {isLocked && isUnlocked && <LockOpen size={9} className="text-blue-400" />}
                                        {iv.label}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-normal">{iv.time}</span>
                                    </div>
                                  </th>
                                );
                              })}
                              <th className="text-right px-4 py-2 font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {workers.map((worker: any) => (
                              <WorkerRow
                                key={worker.id}
                                worker={worker}
                                activeIntervals={activeIntervals}
                                lockedSessionSet={blockLockedSet}
                                isDayFinalized={isDayFinalized}
                                adminUnlockedSessions={adminUnlocked}
                                isToday={isToday}
                                blockId={block.block_id}
                                isPayrollLockedForUser={isPayrollLockedForUser}
                                onWeightChange={setWorkerWeight}
                              />
                            ))}
                          </tbody>
                          <tfoot>
                            {/* Totals row */}
                            <tr className="bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
                              <td className="px-4 py-2 sticky left-0 bg-slate-50 dark:bg-slate-800/40 border-r border-slate-100 dark:border-slate-800">Total</td>
                              {activeIntervals.map((iv: any) => {
                                const ivTotal = workers.reduce((s: number, w: any) => s + (parseFloat(w.weights?.[iv.label]) || 0), 0);
                                return <td key={iv.id} className="px-3 py-2 text-center font-semibold">{ivTotal.toFixed(1)}</td>;
                              })}
                              <td className="px-4 py-2 text-right font-bold text-tea-600 dark:text-tea-400">{blockTotal.toFixed(1)} kg</td>
                            </tr>

                            {/* Session save controls - only when today and not day-finalized */}
                            {isToday && !isDayFinalized && (
                              <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/20">
                                <td className="px-4 py-2.5 sticky left-0 bg-slate-50/50 dark:bg-slate-800/20 border-r border-slate-100 dark:border-slate-800">
                                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Session Lock</span>
                                </td>
                                {activeIntervals.map((iv: any) => {
                                  const isLocked = blockLockedSet.has(iv.label);
                                  const isUnlocked = adminUnlocked.has(iv.label);
                                  const sKey = `${block.block_id}_${iv.label}`;
                                  const isSaving = savingKey === sKey;
                                  const isSaved = savedKey === sKey;

                                  return (
                                    <td key={iv.id} className="px-3 py-2 text-center align-top">
                                      {isLocked && !isUnlocked ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                            <Lock size={10} /> Locked
                                          </span>
                                          {isUserAdmin && (
                                            <Button
                                              variant="link"
                                              size="xs"
                                              onClick={() => toggleAdminSessionUnlock(block.block_id, iv.label)}
                                              className="text-[10px] h-auto p-0 text-blue-500 hover:text-blue-600 flex items-center gap-0.5"
                                            >
                                              <ShieldAlert size={9} /> Unlock
                                            </Button>
                                          )}
                                        </div>
                                      ) : isLocked && isUnlocked ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <Button
                                            size="xs"
                                            disabled={isSaving}
                                            onClick={() => setPendingAction({ type: 'session', blockId: block.block_id, intervalLabel: iv.label })}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-6 px-3 flex items-center gap-1 font-semibold rounded-full"
                                          >
                                            {isSaving ? <Loader2 size={9} className="animate-spin" /> : isSaved ? <CheckCircle2 size={9} /> : <Save size={9} />}
                                            {isSaving ? 'Saving...' : 'Re-save'}
                                          </Button>
                                          <Button
                                            variant="link"
                                            size="xs"
                                            onClick={() => toggleAdminSessionUnlock(block.block_id, iv.label)}
                                            className="text-[10px] h-auto p-0 text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                                          >
                                            <Lock size={9} /> Re-lock
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          size="xs"
                                          disabled={isSaving}
                                          onClick={() => setPendingAction({ type: 'session', blockId: block.block_id, intervalLabel: iv.label })}
                                          className={`text-[10px] h-6 px-3 flex items-center gap-1 font-semibold mx-auto rounded-full ${isSaved
                                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                                              : ''
                                            }`}
                                        >
                                          {isSaving ? <Loader2 size={9} className="animate-spin" /> : isSaved ? <CheckCircle2 size={9} /> : <Lock size={9} />}
                                          {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save & Lock'}
                                        </Button>
                                      )}
                                    </td>
                                  );
                                })}
                                {/* Close Day button */}
                                <td className="px-3 py-2 text-right align-top">
                                  <Button
                                    size="sm"
                                    variant={isSavedDay ? 'outline' : lockedCount === 0 ? 'ghost' : 'destructive'}
                                    disabled={isSavingDay || lockedCount === 0}
                                    onClick={() => setPendingAction({ type: 'finalize', blockId: block.block_id })}
                                    title={lockedCount === 0 ? 'Lock at least one session first' : 'Close the day for this block'}
                                    className={`ml-auto rounded-full ${isSavedDay
                                        ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20'
                                        : lockedCount === 0
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
            {pendingAction.type === 'session' ? (
              <>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Lock size={15} className="text-amber-500" />
                  Lock {pendingAction.intervalLabel} Session
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Save and lock the <strong className="text-slate-700 dark:text-slate-200">{pendingAction.intervalLabel}</strong> session?
                  Weights for this session will become <strong className="text-amber-600 dark:text-amber-400">read-only</strong>.
                  {isUserAdmin && <span className="block mt-1 text-xs text-blue-500">As an admin, you can unlock individual sessions later.</span>}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Flag size={15} className="text-red-500" />
                  Close Day for This Block
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Save all remaining open sessions and <strong className="text-red-600 dark:text-red-400">close the day</strong> for this block.
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
                className="flex-1 rounded-full"
              >
                {pendingAction.type === 'session' ? 'Save & Lock' : 'Close Day'}
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
                Interval Settings
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

            {/* Interval list */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Loading settings…</span>
                </div>
              ) : settingsDraft.map((iv: any, idx: number) => (
                <div key={iv.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={iv.active}
                      onChange={e => {
                        const n = [...settingsDraft];
                        n[idx] = { ...n[idx], active: e.target.checked };
                        setSettingsDraft(n);
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    Enable {iv.label || iv.id}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Label</label>
                      <input
                        type="text"
                        value={iv.label}
                        disabled={!iv.active}
                        onChange={e => {
                          const n = [...settingsDraft];
                          n[idx] = { ...n[idx], label: e.target.value };
                          setSettingsDraft(n);
                        }}
                        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Time Range</label>
                      <input
                        type="text"
                        value={iv.time}
                        disabled={!iv.active}
                        onChange={e => {
                          const n = [...settingsDraft];
                          n[idx] = { ...n[idx], time: e.target.value };
                          setSettingsDraft(n);
                        }}
                        className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
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

