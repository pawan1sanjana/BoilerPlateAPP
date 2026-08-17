import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Users,
  ClipboardList,
  Leaf,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Banknote,
  Weight,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Search,
  Edit3,
  SlidersHorizontal,
  Coins,
  Unlock,
  ShieldCheck
} from "lucide-react";
import { apiClient } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { isAdmin } from '@/lib/roleUtils';
import type { AppRole } from '@/store/useModulePermissionsStore';

function TaskDropdown({ value, onChange, tasks }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 cursor-pointer min-w-[150px]"
    >
      {tasks.map((t: any) => (
        <option key={t.id} value={t.id}>
          {t.id}
        </option>
      ))}
    </select>
  );
}

export default function Payrall() {
  const { profile, user } = useAuthStore();
  const role = profile?.role as AppRole | null;
  const isUserAdmin = isAdmin(role);
  // Auth is ready when: user exists AND profile has loaded (non-null)
  const profileReady = !!user && profile !== null;
  const [estateFilter, setEstateFilter] = useState('all');
  const [estates, setEstates] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from('estates').select('id, name').eq('status', 'active').then(({ data }) => {
      if (data) setEstates(data);
    });
    if (!isUserAdmin && profile?.estate_id) {
      setEstateFilter(profile.estate_id);
    }
  }, [isUserAdmin, profile]);

  const tasks = [
    { id: 'Plucking', icon: Leaf, color: 'tea' },
    { id: 'Pruning', icon: Activity, color: 'emerald' },
    { id: 'Weeding', icon: TrendingUp, color: 'sky' },
    { id: 'Manure', icon: Banknote, color: 'amber' },
    { id: 'Lopping', icon: Weight, color: 'violet' },
    { id: 'Foliar', icon: Droplets, color: 'cyan' },
    { id: 'Other Works', icon: ClipboardList, color: 'indigo' }
  ];

  const DEFAULT_TASK_CONFIGS: Record<string, { baseWage: number; target: number; rate: number }> = {
    Plucking: { baseWage: 1400, target: 18, rate: 65 },
    Pruning: { baseWage: 1400, target: 120, rate: 5 },
    Weeding: { baseWage: 1400, target: 0.5, rate: 500 },
    Manure: { baseWage: 1400, target: 50, rate: 10 },
    Lopping: { baseWage: 1400, target: 0.5, rate: 500 },
    Foliar: { baseWage: 1400, target: 0.5, rate: 500 },
    'Other Works': { baseWage: 1400, target: 1, rate: 0 }
  };

  const currentEstateName = useMemo(() => {
    if (estateFilter !== 'all') {
      const found = estates.find(e => e.id === estateFilter);
      if (found) return found.name;
    }
    if (profile?.estate_id) {
      const found = estates.find(e => e.id === profile.estate_id);
      if (found) return found.name;
    }
    return "All Estates (Default)";
  }, [estateFilter, estates, profile]);

  const [taskConfigs, setTaskConfigs] = useState<any>(DEFAULT_TASK_CONFIGS);

  const fetchEstateTaskConfigs = useCallback(async (estId: string) => {
    const storageKey = `estate_payroll_configs_${estId}`;
    let localData: any = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) localData = JSON.parse(raw);
    } catch (e) { console.error(e); }

    if (localData) {
      setTaskConfigs((prev: any) => ({ ...DEFAULT_TASK_CONFIGS, ...prev, ...localData }));
    }

    try {
      // 1. Try dedicated database table public.payroll_wage_settings
      let query = supabase.from('payroll_wage_settings').select('*');
      if (estId !== 'all') {
        query = query.eq('estate_id', estId);
      } else {
        query = query.is('estate_id', null);
      }

      const { data: dbRows, error: dbErr } = await query;

      if (!dbErr && dbRows && dbRows.length > 0) {
        const dbConfigs: any = {};
        dbRows.forEach((r: any) => {
          if (r.task_type) {
            dbConfigs[r.task_type] = {
              baseWage: parseFloat(r.base_wage) || 1400,
              target: parseFloat(r.target_qty) || 1,
              rate: parseFloat(r.bonus_rate) || 0
            };
          }
        });
        const merged = { ...DEFAULT_TASK_CONFIGS, ...dbConfigs };
        setTaskConfigs((prev: any) => ({ ...prev, ...merged }));
        try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch(e) {}
        return;
      }

      // 2. Fallback to system_settings
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', storageKey)
        .maybeSingle();

      if (data?.value) {
        const parsed = JSON.parse(data.value);
        const merged = { ...DEFAULT_TASK_CONFIGS, ...parsed };
        setTaskConfigs((prev: any) => ({ ...prev, ...merged }));
        try { localStorage.setItem(storageKey, JSON.stringify(merged)); } catch(e) {}
      } else if (!localData) {
        setTaskConfigs(DEFAULT_TASK_CONFIGS);
      }
    } catch (err) {
      console.error('Failed to load estate wage parameters:', err);
    }
  }, []);

  const saveEstateTaskConfigs = async (newConfigs: any) => {
    const estId = (!isUserAdmin || estateFilter !== 'all') ? (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || 'all')) : 'all';
    const storageKey = `estate_payroll_configs_${estId}`;
    const dbEstateId = estId !== 'all' ? estId : null;

    try {
      try { localStorage.setItem(storageKey, JSON.stringify(newConfigs)); } catch(e) {}

      // 1. Save to dedicated table public.payroll_wage_settings
      const rowsToUpsert = Object.entries(newConfigs).map(([task, cfg]: [string, any]) => ({
        estate_id: dbEstateId,
        task_type: task,
        base_wage: cfg.baseWage,
        target_qty: cfg.target,
        bonus_rate: cfg.rate,
        updated_at: new Date().toISOString()
      }));

      await supabase
        .from('payroll_wage_settings')
        .upsert(rowsToUpsert);

      // 2. Also save to system_settings for redundancy
      await supabase
        .from('system_settings')
        .upsert({
          key: storageKey,
          value: JSON.stringify(newConfigs)
        });
    } catch (err) {
      console.error('Failed to save estate wage parameters to DB:', err);
    }
  };

  useEffect(() => {
    if (!profileReady) return;
    const targetEstId = (!isUserAdmin || estateFilter !== 'all') ? (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || 'all')) : 'all';
    fetchEstateTaskConfigs(targetEstId);
  }, [estateFilter, profileReady, isUserAdmin, profile?.estate_id, fetchEstateTaskConfigs]);

  const [taskType, setTaskType] = useState('Plucking');
  const [searchQuery, setSearchQuery] = useState('');

  const [taskData, setTaskData] = useState<any>({
    Plucking: { workers: [], results: null },
    Pruning: { workers: [], results: null },
    Weeding: { workers: [], results: null },
    Manure: { workers: [], results: null },
    Lopping: { workers: [], results: null },
    Foliar: { workers: [], results: null },
    'Other Works': { workers: [], results: null }
  });

  const [isCalculating, setIsCalculating] = useState(false);
  const [showWageParams, setShowWageParams] = useState(false);
  const [loading, setLoading] = useState(true);

  const [payOverrides, setPayOverrides] = useState<any>({});
  const [payOverrideModal, setPayOverrideModal] = useState<any>(null);
  const [payOverrideSaving, setPayOverrideSaving] = useState(false);
  const [payOverrideMsg, setPayOverrideMsg] = useState<any>(null);
  const [manualSalaryInput, setManualSalaryInput] = useState('');

  const [batchStatus, setBatchStatus] = useState<'draft' | 'approved' | 'confirmed'>('draft');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [, setBatchInfo] = useState<any>(null);
  const [realtimeMsg, setRealtimeMsg] = useState<{text: string; type: string} | null>(null);
  const epfToUuidMapRef = useRef<Map<string, string>>(new Map());

  const requestPayOverride = (worker: any) => {
    if (batchStatus === 'confirmed' && !isUserAdmin) {
      setPayOverrideMsg({ type: 'error', text: 'Payroll batch is Confirmed & Locked. Only Super Admin can modify rate multipliers.' });
      return;
    }
    setPayOverrideModal({ worker });
    setManualSalaryInput('');
  };

  const currentConfig = taskConfigs[taskType];
  const currentData = taskData[taskType];

  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toLocaleDateString('sv-SE');
  });
  const [isHistorical, setIsHistorical] = useState(false);

  const [resyncMsg, setResyncMsg] = useState<any>(null);

  const setMultiplier = async (workerId: string, multiplier: any) => {
    if (batchStatus === 'confirmed' && !isUserAdmin) {
      setPayOverrideMsg({ type: 'error', text: 'Payroll batch is Confirmed & Locked. Only Super Admin can modify rate multipliers.' });
      return;
    }
    setPayOverrideSaving(true);
    setPayOverrideMsg(null);
    setPayOverrideModal(null);

    try {
      const dataToUse = currentData.workers;
      if (dataToUse.length === 0) { setPayOverrideSaving(false); return; }

      const updatedOverrides = { ...payOverrides };
      if (multiplier === 1.0) delete updatedOverrides[workerId];
      else updatedOverrides[workerId] = multiplier;

      const computed = dataToUse.map((w: any) => {
        let value = 0;
        if (taskType === 'Plucking') value = w.kg || 0;
        else if (taskType === 'Pruning') value = w.bushes || 0;
        else if (taskType === 'Weeding') value = w.area || 0;
        else if (taskType === 'Manure') value = w.qty || 0;
        else if (taskType === 'Lopping') value = w.area || 0;
        else if (taskType === 'Foliar') value = w.area || 0;
        else if (taskType === 'Other Works') value = w.units || 0;

        const { target, rate, baseWage } = currentConfig;
        const currentMult = updatedOverrides[w.id] || 1.0;
        const isOverride = typeof currentMult === 'object' ? true : currentMult !== 1.0;

        const over = Math.max(0, value - target);
        const bonus = over * rate;
        const eligible = value >= target;

        let wage;
        if (isOverride) {
          if (typeof currentMult === 'object' && currentMult.manualSalary) {
            wage = parseInt(currentMult.manualSalary);
          } else if (typeof currentMult === 'object') {
            wage = Math.round(baseWage * currentMult.multiplier);
          } else {
            wage = Math.round(baseWage * currentMult);
          }
        } else {
          wage = eligible ? baseWage + bonus : Math.round((value / target) * baseWage);
        }

        return {
          ...w,
          over,
          bonus: isOverride ? 0 : bonus,
          wage,
          eligible: isOverride ? (typeof currentMult === 'object' ? true : currentMult >= 1.0) : eligible,
          performanceValue: value,
          payMultiplier: currentMult
        };
      });

      const totalValue = computed.reduce((s: number, r: any) => s + r.performanceValue, 0);
      const totalWage = computed.reduce((s: number, r: any) => s + r.wage, 0);
      const qualified = computed.filter((r: any) => r.eligible).length;



      setPayOverrides(updatedOverrides);
      setTaskData((prev: any) => ({
        ...prev,
        [taskType]: {
          ...prev[taskType],
          results: { rows: computed, totalValue, totalWage, qualified }
        }
      }));

      if (batchStatus === 'confirmed' || batchStatus === 'approved') {
        await saveBatch(computed, totalValue, totalWage, qualified, true, batchStatus);
      }

      const targetWorker = computed.find((w: any) => w.id === workerId);
      const isManual = typeof multiplier === 'object' && multiplier.manualSalary;
      const displayText = isManual 
        ? `Pay rate updated for ${targetWorker?.name || 'worker'} — Salary: LKR ${multiplier.manualSalary}`
        : `Pay rate updated for ${targetWorker?.name || 'worker'} — Multiplier: ${multiplier}x`;
      setPayOverrideMsg({
        type: 'success',
        text: displayText
      });
    } catch (err) {
      console.error('Pay override save failed:', err);
      setPayOverrideMsg({ type: 'error', text: 'Save failed — please try again.' });
    } finally {
      setPayOverrideSaving(false);
    }
  };

  const saveBatch = async (calculatedRows: any, totalValue: number, totalWage: number, qualified: number, forceSave = false, statusOverride?: string) => {
    if ((isHistorical && !forceSave) || calculatedRows.length === 0 || (batchStatus === 'confirmed' && !forceSave && !isUserAdmin)) return;
    try {
      const effectiveEstId = (!isUserAdmin || estateFilter !== 'all')
        ? (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || null))
        : (calculatedRows.find((r: any) => r.estate_id)?.estate_id || profile?.estate_id || null);

      let batchQuery = supabase
        .from('payroll_batches')
        .select('*')
        .eq('batch_date', selectedDate)
        .eq('task_type', taskType);
      
      if (effectiveEstId) {
        batchQuery = batchQuery.eq('estate_id', effectiveEstId);
      }

      const { data: existingBatch } = await batchQuery.maybeSingle();

      const batchPayload = {
        estate_id: effectiveEstId,
        batch_date: selectedDate,
        task_type: taskType,
        base_wage: currentConfig.baseWage,
        bonus_rate: currentConfig.rate,
        target_qty: currentConfig.target,
        total_qty: totalValue,
        total_wage: totalWage,
        qualified_workers: qualified,
        status: statusOverride || batchStatus || 'draft'
      };

      let batchData;
      if (existingBatch) {
        const { data: updated, error: batchError } = await supabase
          .from('payroll_batches')
          .update(batchPayload)
          .eq('id', existingBatch.id)
          .select()
          .single();
        if (batchError) throw batchError;
        batchData = updated;
      } else {
        const { data: inserted, error: batchError } = await supabase
          .from('payroll_batches')
          .insert(batchPayload)
          .select()
          .single();
        if (batchError) throw batchError;
        batchData = inserted;
      }

      const batchId = batchData.id;

      await supabase.from('payroll_entries').delete().eq('batch_id', batchId);

      const isUuid = (val: any) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

      const entriesMap = new Map<string, any>();
      calculatedRows.forEach((r: any) => {
        let pm = 1.0;
        if (typeof r.payMultiplier === 'object') {
          pm = 0;
        } else {
          pm = r.payMultiplier || 1.0;
        }

        const validWorkerUuid = isUuid(r.id) ? r.id : (isUuid(r.worker_id) ? r.worker_id : (epfToUuidMapRef.current.get(r.worker_id) || epfToUuidMapRef.current.get(r.id) || null));
        const epfCode = r.worker_id || r.id;
        const entryKey = validWorkerUuid || epfCode;

        if (!entriesMap.has(entryKey)) {
          entriesMap.set(entryKey, {
            batch_id: batchId,
            worker_id: validWorkerUuid,
            worker_epf: epfCode,
            worker_name: r.name,
            task: r.task || taskType,
            performance_value: r.performanceValue,
            over_target: r.over,
            bonus: r.bonus,
            wage: r.wage,
            eligible: r.eligible,
            pay_multiplier: pm
          });
        }
      });

      const entriesPayload = Array.from(entriesMap.values());
      if (entriesPayload.length > 0) {
        const { error: entriesError } = await supabase.from('payroll_entries').insert(entriesPayload);
        if (entriesError) throw entriesError;
      }
    } catch (error) {
      console.error('Save batch failed:', error);
      throw error;
    }
  };

  const calculateWages = useCallback((workerData: any, forceSave = false) => {
    const dataToUse = workerData || currentData.workers;
    if (dataToUse.length === 0) return;
    setIsCalculating(true);

    setTimeout(() => {
      const computed = dataToUse.map((w: any) => {
        let value = 0;
        if (taskType === 'Plucking') value = w.kg || 0;
        else if (taskType === 'Pruning') value = w.bushes || 0;
        else if (taskType === 'Weeding') value = w.area || 0;
        else if (taskType === 'Manure') value = w.qty || 0;
        else if (taskType === 'Lopping') value = w.area || 0;
        else if (taskType === 'Foliar') value = w.area || 0;
        else if (taskType === 'Other Works') value = w.units || 0;

        const target = currentConfig.target;
        const rate = currentConfig.rate;
        const baseWage = currentConfig.baseWage;
        const multiplier = payOverrides[w.id] || 1.0;
        const isOverride = typeof multiplier === 'object' ? true : multiplier !== 1.0;

        const over = Math.max(0, value - target);
        const bonus = over * rate;
        const eligible = value >= target;

        let wage;
        if (isOverride) {
          if (typeof multiplier === 'object' && multiplier.manualSalary) {
            wage = parseInt(multiplier.manualSalary);
          } else if (typeof multiplier === 'object') {
            wage = Math.round(baseWage * multiplier.multiplier);
          } else {
            wage = Math.round(baseWage * multiplier);
          }
        } else if (eligible) {
          wage = baseWage + bonus;
        } else {
          wage = Math.round((value / target) * baseWage);
        }

        return {
          ...w,
          over,
          bonus: isOverride ? 0 : bonus,
          wage,
          eligible: isOverride ? (typeof multiplier === 'object' ? true : multiplier >= 1.0) : eligible,
          performanceValue: value,
          payMultiplier: multiplier
        };
      });

      const totalValue = computed.reduce((s: number, r: any) => s + r.performanceValue, 0);
      const totalWage = computed.reduce((s: number, r: any) => s + r.wage, 0);
      const qualified = computed.filter((r: any) => r.eligible).length;

      setTaskData((prev: any) => ({
        ...prev,
        [taskType]: { ...prev[taskType], results: { rows: computed, totalValue, totalWage, qualified } }
      }));
      setIsCalculating(false);

      if (forceSave) {
        saveBatch(computed, totalValue, totalWage, qualified, forceSave, batchStatus);
      }
    }, 200);
  }, [currentData.workers, currentConfig, taskType, selectedDate, isHistorical, payOverrides]);

  const loadData = useCallback(async (dateStr: string) => {
    try {
      setLoading(true);
      const today = new Date().toLocaleDateString('sv-SE');
      const isToday = dateStr === today;
      const effectiveEstId = !isUserAdmin ? profile?.estate_id : (estateFilter !== 'all' ? estateFilter : null);

      let batchQuery = supabase.from('payroll_batches').select('*, payroll_entries(*)').eq('batch_date', dateStr).eq('task_type', taskType);
      if (effectiveEstId) {
         batchQuery = batchQuery.eq('estate_id', effectiveEstId);
      }

      const { data: batchResData } = await batchQuery.maybeSingle();

      if (batchResData) {
        setBatchStatus(batchResData.status || 'draft');
        setBatchId(batchResData.id || null);
        setBatchInfo(batchResData);
        if (batchResData.base_wage && batchResData.target_qty) {
          setTaskConfigs((prev: any) => ({
            ...prev,
            [taskType]: {
              baseWage: parseFloat(batchResData.base_wage) || prev[taskType]?.baseWage || 1400,
              target: parseFloat(batchResData.target_qty) || prev[taskType]?.target || 1,
              rate: parseFloat(batchResData.bonus_rate) || prev[taskType]?.rate || 0
            }
          }));
        }
      } else {
        setBatchStatus('draft');
        setBatchId(null);
        setBatchInfo(null);
      }

      const savedOverrides: any = {};
      if (batchResData && Array.isArray(batchResData.payroll_entries)) {
        batchResData.payroll_entries.forEach((e: any) => {
          const pm = parseFloat(e.pay_multiplier);
          if (!isNaN(pm) && pm !== 1.0) {
            if (pm === 0) {
              savedOverrides[e.worker_id] = { manualSalary: parseFloat(e.wage) };
            } else {
              savedOverrides[e.worker_id] = pm;
            }
          }
        });
      }

      const isSavedBatch = !!batchResData && Array.isArray(batchResData.payroll_entries) && batchResData.payroll_entries.length > 0;

      if (isSavedBatch && !isToday) {
        setIsHistorical(true);

        const batch = batchResData;
        const uniqueEntriesMap = new Map<string, any>();
        (batch.payroll_entries || []).forEach((e: any) => {
          const key = e.worker_epf || e.worker_id || e.id;
          if (!uniqueEntriesMap.has(key)) {
            uniqueEntriesMap.set(key, e);
          }
        });
        const entriesList = Array.from(uniqueEntriesMap.values());

        setPayOverrides(savedOverrides);

        const historicalWorkers = entriesList.map((e: any) => {
          return {
            id: e.worker_id,
            worker_id: e.worker_epf || e.worker_id,
            name: e.worker_name,
            estate_id: batch.estate_id,
            kg: parseFloat(e.performance_value),
            morning_kg: 0,
            midday_kg: 0,
            afternoon_kg: 0,
            evening_kg: 0,
            bushes: parseFloat(e.performance_value),
            area: parseFloat(e.performance_value),
            qty: parseFloat(e.performance_value),
            trees: parseFloat(e.performance_value),
            liters: parseFloat(e.performance_value),
            units: parseFloat(e.performance_value)
          };
        });

        const historicalResults = {
          rows: entriesList.map((e: any) => {
            const parsedPM = parseFloat(e.pay_multiplier);
            const multiplier = (!isNaN(parsedPM) && parsedPM !== 1.0) ? (parsedPM === 0 ? { manualSalary: parseFloat(e.wage) } : parsedPM) : 1.0;
            return {
              id: e.worker_id,
              worker_id: e.worker_epf || e.worker_id,
              name: e.worker_name,
              estate_id: batch.estate_id,
              performanceValue: parseFloat(e.performance_value),
              morning_kg: 0,
              midday_kg: 0,
              afternoon_kg: 0,
              evening_kg: 0,
              over: parseFloat(e.over_target),
              bonus: parseFloat(e.bonus),
              wage: parseFloat(e.wage),
              eligible: Boolean(e.eligible),
              payMultiplier: multiplier
            };
          }),
          totalValue: parseFloat(batch.total_qty || 0),
          totalWage: parseFloat(batch.total_wage || 0),
          qualified: batch.qualified_workers || 0
        };

        setTaskData((prev: any) => ({
          ...prev,
          [taskType]: { workers: historicalWorkers, results: historicalResults }
        }));

      } else {
        setIsHistorical(!isToday);
        const y = parseInt(dateStr.split('-')[0]);
        const m = parseInt(dateStr.split('-')[1]);
        const d = parseInt(dateStr.split('-')[2]);

        let perfEndpoint = '';
        if (taskType === 'Plucking') perfEndpoint = `/crop/plucker-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Pruning') perfEndpoint = `/crop/pruning-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Weeding') perfEndpoint = `/crop/weeding-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Manure') perfEndpoint = `/crop/manure-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Lopping') perfEndpoint = `/crop/lopping-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Foliar') perfEndpoint = `/crop/foliar-performance?year=${y}&month=${m}&day=${d}`;
        else if (taskType === 'Other Works') perfEndpoint = `/crop/other-works-performance?year=${y}&month=${m}&day=${d}`;

        const [resMuster, resPerf, dbMusterRes, dbPluckRes, dbPruneRes, dbWeedRes, dbManureRes, dbFoliarRes, dbLopRes, dbOtherRes, dbWfRes] = await Promise.all([
          apiClient.get(`/workforce/attendance-today?date=${dateStr}`),
          apiClient.get(perfEndpoint),
          supabase.from('daily_muster').select('*, workforce(*)').eq('muster_date', dateStr).eq('task', taskType),
          supabase.from('plucking_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('pruning_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('weeding_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('manure_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('foliar_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('lopping_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('other_works_logs').select('*, workforce(*)').eq('date', dateStr),
          supabase.from('workforce').select('id, worker_id, first_name, last_name, photo, estate_id')
        ]);

        const uuidToEpfMap = new Map<string, string>();
        const epfToUuidMap = new Map<string, string>();
        if (dbWfRes.data) {
          dbWfRes.data.forEach((w: any) => {
            if (w.id && w.worker_id) {
              uuidToEpfMap.set(w.id, w.worker_id);
              epfToUuidMap.set(w.worker_id, w.id);
            }
          });
        }
        epfToUuidMapRef.current = epfToUuidMap;

        const isWorkerMatch = (w: any, targetId: string, targetWf?: any) => {
          if (!targetId && !targetWf) return false;
          const targetUuid = epfToUuidMap.get(targetId) || targetId;
          const targetEpf = uuidToEpfMap.get(targetId) || targetId;
          const wfUuid = targetWf?.id || (targetWf?.worker_id ? epfToUuidMap.get(targetWf.worker_id) : null);
          const wfEpf = targetWf?.worker_id || (targetWf?.id ? uuidToEpfMap.get(targetWf.id) : null);

          return (
            w.id === targetId ||
            w.worker_id === targetId ||
            w.id === targetUuid ||
            w.worker_id === targetEpf ||
            (wfUuid && (w.id === wfUuid || w.worker_id === wfUuid)) ||
            (wfEpf && (w.id === wfEpf || w.worker_id === wfEpf))
          );
        };

        const perfMap: any = {};
        if (resPerf.success && resPerf.data) {
          resPerf.data.forEach((p: any) => {
            if (taskType === 'Plucking') {
              perfMap[p.id] = {
                total: parseFloat(p.total_kg || p.kg) || 0,
                morning: parseFloat(p.morning_kg) || 0,
                midday: parseFloat(p.midday_kg) || 0,
                afternoon: parseFloat(p.afternoon_kg) || 0,
                evening: parseFloat(p.evening_kg) || 0
              };
            } else if (taskType === 'Pruning') perfMap[p.id] = parseFloat(p.total_bushes || p.bushes_pruned || p.bushes || p.value) || 0;
            else if (taskType === 'Weeding') perfMap[p.id] = parseFloat(p.total_area || p.area_covered || p.acres) || 0;
            else if (taskType === 'Manure') perfMap[p.id] = parseFloat(p.total_qty || p.total_kg || p.qty || p.area_covered) || 0;
            else if (taskType === 'Lopping') {
              perfMap[p.id] = {
                value: parseFloat(p.total_area || p.trees_lopped || p.area_covered) || 0,
                payMultiplier: parseFloat(p.pay_multiplier) || 1.0
              };
            }
            else if (taskType === 'Foliar') perfMap[p.id] = parseFloat(p.total_area || p.area_covered || p.acres) || 0;
            else if (taskType === 'Other Works') perfMap[p.id] = parseFloat(p.total_units || p.units_completed || p.units) || 0;
          });
        }

        const unifiedWorkersMap = new Map();

        // 1. Map API attendance records
        if (resMuster.success && Array.isArray(resMuster.data)) {
          const musterTaskWorkers = resMuster.data.filter((w: any) => w.task === taskType);
          musterTaskWorkers.forEach((w: any) => {
            const photoUrl = w.photo
              ? (w.photo.startsWith('data:') ? w.photo : `/api/uploads/${w.photo}`)
              : null;
            const wKey = w.worker_internal_id || w.worker_id || w.id;
            const perfVal = perfMap[wKey] || perfMap[w.worker_internal_id] || perfMap[w.worker_id] || perfMap[w.id];
            unifiedWorkersMap.set(wKey, {
              id: wKey,
              name: `${w.first_name} ${w.last_name}`,
              photo: photoUrl,
              estate_id: w.estate_id,
              kg: taskType === 'Plucking' ? (perfVal?.total || (typeof perfVal === 'number' ? perfVal : 0)) : 0,
              morning_kg: taskType === 'Plucking' ? (perfVal?.morning || 0) : 0,
              midday_kg: taskType === 'Plucking' ? (perfVal?.midday || 0) : 0,
              afternoon_kg: taskType === 'Plucking' ? (perfVal?.afternoon || 0) : 0,
              evening_kg: taskType === 'Plucking' ? (perfVal?.evening || 0) : 0,
              bushes: taskType === 'Pruning' ? (typeof perfVal === 'number' ? perfVal : (perfVal?.bushes || perfVal?.total || 0)) : 0,
              area: (taskType === 'Weeding' || taskType === 'Lopping' || taskType === 'Foliar') ? (
                taskType === 'Lopping' ? (perfVal?.value || (typeof perfVal === 'number' ? perfVal : 0)) : (typeof perfVal === 'number' ? perfVal : (perfVal?.area || 0))
              ) : 0,
              qty: taskType === 'Manure' ? (typeof perfVal === 'number' ? perfVal : (perfVal?.qty || 0)) : 0,
              units: taskType === 'Other Works' ? (typeof perfVal === 'number' ? perfVal : (perfVal?.units || 0)) : 0,
              worker_id: w.worker_id,
              task: w.task
            });
          });

          const perfTaskWorkers = resPerf.data || [];
          perfTaskWorkers.forEach((p: any) => {
            const pId = p.id || p.worker_code;
            const existingPerf = Array.from(unifiedWorkersMap.values()).find(
              (w: any) => isWorkerMatch(w, pId)
            );

            if (!existingPerf) {
              const photoUrl = p.photo
                ? (p.photo.startsWith('data:') ? p.photo : `/api/uploads/${p.photo}`)
                : null;
              unifiedWorkersMap.set(pId, {
                id: pId,
                name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || `Worker ${pId}`,
                photo: photoUrl,
                estate_id: p.estate_id,
                kg: taskType === 'Plucking' ? (parseFloat(p.total_kg || p.kg) || 0) : 0,
                morning_kg: taskType === 'Plucking' ? (parseFloat(p.morning_kg) || 0) : 0,
                midday_kg: taskType === 'Plucking' ? (parseFloat(p.midday_kg) || 0) : 0,
                afternoon_kg: taskType === 'Plucking' ? (parseFloat(p.afternoon_kg) || 0) : 0,
                evening_kg: taskType === 'Plucking' ? (parseFloat(p.evening_kg) || 0) : 0,
                bushes: taskType === 'Pruning' ? (parseFloat(p.total_bushes || p.bushes_pruned || p.bushes) || 0) : 0,
                area: (taskType === 'Weeding' || taskType === 'Lopping' || taskType === 'Foliar') ? (
                  taskType === 'Lopping' ? (parseFloat(p.total_area || p.trees_lopped || p.area_covered) || 0) : (parseFloat(p.total_area || p.area_covered || p.acres) || 0)
                ) : 0,
                qty: taskType === 'Manure' ? (parseFloat(p.total_qty || p.total_kg || p.qty || p.area_covered) || 0) : 0,
                units: taskType === 'Other Works' ? (parseFloat(p.total_units || p.units_completed || p.units) || 0) : 0,
                worker_id: p.worker_code || pId,
                task: taskType
              });
            }
          });
        }

        // 2. Map Supabase daily muster logs
        if (dbMusterRes.data && dbMusterRes.data.length > 0) {
          dbMusterRes.data.forEach((dm: any) => {
            const wf = dm.workforce || {};
            const wId = dm.worker_id || wf.id || wf.worker_id;
            if (!wId) return;

            const existing = Array.from(unifiedWorkersMap.values()).find(
              (w: any) => isWorkerMatch(w, wId, wf)
            );

            if (!existing) {
              const workerName = wf.first_name
                ? `${wf.first_name} ${wf.last_name || ''}`.trim()
                : (dm.worker_name || `Worker ${wId}`);

              unifiedWorkersMap.set(wId, {
                id: wf.id || wId,
                name: workerName,
                photo: wf.photo ? (wf.photo.startsWith('data:') ? wf.photo : `/api/uploads/${wf.photo}`) : null,
                estate_id: dm.estate_id || wf.estate_id,
                kg: 0, bushes: 0, area: 0, qty: 0, units: 0,
                worker_id: wf.worker_id || dm.worker_code || wId,
                task: dm.task || taskType
              });
            }
          });
        }

        // 3. Overlay Supabase Crop Intelligence logs (plucking_logs, pruning_logs, etc.)
        const activeCropLogs = taskType === 'Plucking' ? dbPluckRes.data :
          taskType === 'Pruning' ? dbPruneRes.data :
          taskType === 'Weeding' ? dbWeedRes.data :
          taskType === 'Manure' ? dbManureRes.data :
          taskType === 'Foliar' ? dbFoliarRes.data :
          taskType === 'Lopping' ? dbLopRes.data :
          taskType === 'Other Works' ? dbOtherRes.data : [];

        if (activeCropLogs && activeCropLogs.length > 0) {
          activeCropLogs.forEach((log: any) => {
            const wf = log.workforce || {};
            const wId = log.worker_id || wf.id || wf.worker_id;
            if (!wId) return;

            let workerObj: any = Array.from(unifiedWorkersMap.values()).find(
              (w: any) => isWorkerMatch(w, wId, wf)
            );

            if (!workerObj) {
              const workerName = wf.first_name
                ? `${wf.first_name} ${wf.last_name || ''}`.trim()
                : `Worker ${wId}`;

              workerObj = {
                id: wf.id || wId,
                name: workerName,
                photo: wf.photo ? (wf.photo.startsWith('data:') ? wf.photo : `/api/uploads/${wf.photo}`) : null,
                estate_id: wf.estate_id,
                kg: 0, bushes: 0, area: 0, qty: 0, units: 0,
                worker_id: wf.worker_id || wId,
                task: taskType
              };
              unifiedWorkersMap.set(workerObj.id, workerObj);
            }

            let logVal = 0;
            if (taskType === 'Plucking') {
              logVal = parseFloat(log.total_kg || log.kg || log.qty) || 0;
              if (!logVal && log.interval_weights) {
                logVal = (Object.values(log.interval_weights) as any[]).reduce((s: number, v: any) => s + (parseFloat(v) || 0), 0);
              }
            } else if (taskType === 'Pruning') {
              logVal = parseFloat(log.bushes_pruned || log.total_bushes || log.bushes || log.area_covered || log.qty) || 0;
            } else if (taskType === 'Weeding') {
              logVal = parseFloat(log.area_covered || log.total_area || log.acres || log.qty) || 0;
            } else if (taskType === 'Manure') {
              logVal = parseFloat(log.total_kg || log.total_qty || log.qty || log.area_covered) || 0;
            } else if (taskType === 'Lopping') {
              logVal = parseFloat(log.trees_lopped || log.area_covered || log.total_area || log.acres) || 0;
            } else if (taskType === 'Foliar') {
              logVal = parseFloat(log.area_covered || log.total_area || log.liters_sprayed || log.acres) || 0;
            } else if (taskType === 'Other Works') {
              logVal = parseFloat(log.units_completed || log.total_units || log.units || log.area_covered || log.qty) || 0;
            }

            if (logVal > 0) {
              if (taskType === 'Plucking') workerObj.kg = (workerObj.kg || 0) + logVal;
              else if (taskType === 'Pruning') workerObj.bushes = (workerObj.bushes || 0) + logVal;
              else if (taskType === 'Weeding' || taskType === 'Lopping' || taskType === 'Foliar') workerObj.area = (workerObj.area || 0) + logVal;
              else if (taskType === 'Manure') workerObj.qty = (workerObj.qty || 0) + logVal;
              else if (taskType === 'Other Works') workerObj.units = (workerObj.units || 0) + logVal;
            }
          });
        }

        const uniqueWorkersMap = new Map<string, any>();
        Array.from(unifiedWorkersMap.values()).forEach((w: any) => {
          const primaryId = (w.id && epfToUuidMap.get(w.id)) || (w.worker_id && epfToUuidMap.get(w.worker_id)) || w.id || w.worker_id;
          if (!uniqueWorkersMap.has(primaryId)) {
            uniqueWorkersMap.set(primaryId, { ...w, id: primaryId });
          } else {
            const existing = uniqueWorkersMap.get(primaryId);
            existing.kg = (existing.kg || 0) + (w.kg || 0);
            existing.morning_kg = (existing.morning_kg || 0) + (w.morning_kg || 0);
            existing.midday_kg = (existing.midday_kg || 0) + (w.midday_kg || 0);
            existing.afternoon_kg = (existing.afternoon_kg || 0) + (w.afternoon_kg || 0);
            existing.evening_kg = (existing.evening_kg || 0) + (w.evening_kg || 0);
            existing.bushes = (existing.bushes || 0) + (w.bushes || 0);
            existing.area = (existing.area || 0) + (w.area || 0);
            existing.qty = (existing.qty || 0) + (w.qty || 0);
            existing.units = (existing.units || 0) + (w.units || 0);
          }
        });

        const presentWorkers = Array.from(uniqueWorkersMap.values());

        const freshOverrides = { ...savedOverrides };
        presentWorkers.forEach((w: any) => {
          const pData = perfMap[w.id];
          if (pData && typeof pData === 'object' && pData.payMultiplier && pData.payMultiplier !== 1.0) {
            freshOverrides[w.id] = pData.payMultiplier;
          }
        });
        setPayOverrides(freshOverrides);

        setTaskData((prev: any) => ({
          ...prev,
          [taskType]: { ...prev[taskType], workers: presentWorkers }
        }));

        if (presentWorkers.length > 0) {
          calculateWages(presentWorkers, false);
        } else {
          setTaskData((prev: any) => ({
            ...prev,
            [taskType]: { ...prev[taskType], results: null }
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setLoading(false);
    }
  }, [isUserAdmin, profileReady, estateFilter, taskType]);

  useEffect(() => {
    // Only load payroll data once auth profile is fully resolved
    // This prevents a premature query with null estate_id that resets batchStatus to 'draft'
    if (!profileReady) return;
    // For non-admin users, wait until estateFilter has been set from profile
    if (!isUserAdmin && estateFilter === 'all') return;
    loadData(selectedDate);
  }, [selectedDate, taskType, estateFilter, profileReady, loadData, isUserAdmin]);

  // Supabase Realtime: watch payroll_batches for status changes
  useEffect(() => {
    if (!batchId) return;

    const channel = supabase
      .channel(`payroll_batch_${batchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payroll_batches',
          filter: `id=eq.${batchId}`
        },
        (payload: any) => {
          const newStatus = payload.new?.status;
          if (newStatus && newStatus !== batchStatus) {
            setBatchStatus(newStatus);
            const statusLabels: Record<string, string> = {
              approved: '✅ Payroll has been Approved.',
              confirmed: '🔒 Payroll has been Confirmed & Locked.',
              draft: '🔓 Payroll has been Unlocked and reset to Draft.'
            };
            setRealtimeMsg({
              type: newStatus === 'draft' ? 'warn' : 'success',
              text: statusLabels[newStatus] || `Payroll status updated to: ${newStatus}`
            });
            setTimeout(() => setRealtimeMsg(null), 6000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [batchId]);

  useEffect(() => {
    if (currentData.workers.length > 0) {
      calculateWages(currentData.workers, false);
    }
  }, [taskConfigs, taskType, payOverrides]);

  const filteredWorkers = useMemo(() => {
    let list = currentData.results?.rows || [];
    if (estateFilter !== 'all') {
      list = list.filter((w: any) => !w.estate_id || String(w.estate_id) === String(estateFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((w: any) =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.worker_id && String(w.worker_id).toLowerCase().includes(q))
      );
    }
    return list;
  }, [currentData.results, searchQuery, estateFilter]);

  const filteredTotalValue = useMemo(() => {
    return filteredWorkers.reduce((acc: number, r: any) => acc + (r.performanceValue || 0), 0);
  }, [filteredWorkers]);

  const filteredTotalWage = useMemo(() => {
    return filteredWorkers.reduce((acc: number, r: any) => acc + (r.wage || 0), 0);
  }, [filteredWorkers]);

  const filteredQualifiedCount = useMemo(() => {
    return filteredWorkers.filter((r: any) => r.eligible).length;
  }, [filteredWorkers]);

  const unitLabel = (short = false) => {
    const map: any = {
      Plucking: short ? 'kg' : 'Harvest (KG)',
      Pruning: short ? 'bushes' : 'Output (Bushes)',
      Weeding: short ? 'acres' : 'Area (Acres)',
      Lopping: short ? 'acres' : 'Area (Acres)',
      Foliar: short ? 'acres' : 'Area (Acres)',
      Manure: short ? 'units' : 'Output (Units)',
      'Other Works': short ? 'units' : 'Output (Units)',
    };
    return map[taskType] || (short ? 'units' : 'Output');
  };

  const totalLabel = () => {
    const map: any = { Plucking: 'Harvest', Pruning: 'Output', Weeding: 'Area', Lopping: 'Area', Foliar: 'Area' };
    return map[taskType] || 'Output';
  };



  const handleUpdateStatus = async (newStatus: 'approved' | 'confirmed' | 'draft') => {
    try {
      setLoading(true);
      const rows = currentData.results?.rows || [];
      const effectiveEstId = (!isUserAdmin || estateFilter !== 'all')
        ? (estateFilter !== 'all' ? estateFilter : (profile?.estate_id || null))
        : (rows.find((r: any) => r.estate_id)?.estate_id || profile?.estate_id || null);

      let batchQuery = supabase
        .from('payroll_batches')
        .select('*')
        .eq('batch_date', selectedDate)
        .eq('task_type', taskType);

      if (effectiveEstId) {
        batchQuery = batchQuery.eq('estate_id', effectiveEstId);
      }

      const { data: existingBatch } = await batchQuery.maybeSingle();

      const updateDataPayload: any = {
        estate_id: effectiveEstId,
        batch_date: selectedDate,
        task_type: taskType,
        base_wage: currentConfig.baseWage,
        bonus_rate: currentConfig.rate,
        target_qty: currentConfig.target,
        total_qty: currentData.results?.totalValue || 0,
        total_wage: currentData.results?.totalWage || 0,
        qualified_workers: currentData.results?.qualified || 0,
        status: newStatus
      };

      if (newStatus === 'approved') {
        updateDataPayload.approved_at = new Date().toISOString();
        updateDataPayload.approved_by = profile?.id || null;
      } else if (newStatus === 'confirmed') {
        updateDataPayload.confirmed_at = new Date().toISOString();
        updateDataPayload.confirmed_by = profile?.id || null;
      }

      let batchData;
      if (existingBatch) {
        const { data: updated, error } = await supabase
          .from('payroll_batches')
          .update(updateDataPayload)
          .eq('id', existingBatch.id)
          .select()
          .single();
        if (error) throw error;
        batchData = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from('payroll_batches')
          .insert(updateDataPayload)
          .select()
          .single();
        if (error) throw error;
        batchData = inserted;
      }

      setBatchStatus(newStatus);
      setBatchId(batchData?.id || null);
      setBatchInfo(batchData);

      if ((newStatus === 'approved' || newStatus === 'confirmed') && currentData.results?.rows) {
        await saveBatch(currentData.results.rows, currentData.results.totalValue, currentData.results.totalWage, currentData.results.qualified, true, newStatus);
      }

      setResyncMsg({
        type: 'success',
        text: newStatus === 'approved' 
          ? 'Payroll successfully Approved!' 
          : newStatus === 'confirmed' 
            ? 'Salary Confirmed & Financial Payout Locked!' 
            : 'Payroll Unlocked & Reset to Draft.'
      });
    } catch (err: any) {
      console.error('Status update failed:', err);
      setResyncMsg({ type: 'error', text: err.message || 'Status update failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-16 space-y-4">

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Payroll Detail</h1>
          {batchStatus === 'approved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 size={13} />
              Payroll Approved
            </span>
          )}
          {batchStatus === 'confirmed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={13} />
              {isUserAdmin ? 'Salary Confirmed & Locked (Super Admin Access)' : 'Salary Confirmed & Locked'}
            </span>
          )}
          {batchStatus === 'draft' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Draft
            </span>
          )}
        </div>
      </div>

      {/* Status Messages Banners */}
      {resyncMsg && (
        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all ${
          resyncMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {resyncMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{resyncMsg.text}</span>
          </div>
          <button onClick={() => setResyncMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Realtime status change notification banner */}
      {realtimeMsg && (
        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold animate-pulse-once transition-all ${
          realtimeMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-center gap-2">
            {realtimeMsg.type === 'success'
              ? <ShieldCheck size={16} />
              : <AlertCircle size={16} />}
            <span>🔔 Live Update: {realtimeMsg.text}</span>
          </div>
          <button onClick={() => setRealtimeMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {payOverrideMsg && (
        <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-semibold transition-all ${
          payOverrideMsg.type === 'success'
            ? 'bg-tea-50 dark:bg-tea-950/30 text-tea-700 dark:text-tea-400 border-tea-200 dark:border-tea-800'
            : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {payOverrideMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{payOverrideMsg.text}</span>
          </div>
          <button onClick={() => setPayOverrideMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ANALYTICS SUMMARY CARDS (Daily Operations Style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Active Workers",
            val: filteredWorkers.length,
            unit: "PAX",
            icon: Users,
            color: "text-tea-600 dark:text-tea-400",
            bg: "bg-tea-50 dark:bg-tea-900/20"
          },
          {
            label: `Total ${totalLabel()}`,
            val: filteredTotalValue.toFixed(1),
            unit: unitLabel(true),
            icon: Weight,
            color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-900/20"
          },
          {
            label: "Target Met",
            val: `${filteredQualifiedCount}/${filteredWorkers.length}`,
            unit: "workers",
            icon: CheckCircle2,
            color: "text-sky-600 dark:text-sky-400",
            bg: "bg-sky-50 dark:bg-sky-900/20"
          },
          {
            label: "Total Payroll",
            val: `Rs ${filteredTotalWage.toLocaleString()}`,
            unit: "",
            icon: Banknote,
            color: "text-amber-600 dark:text-amber-400",
            bg: "bg-amber-50 dark:bg-amber-900/20"
          },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${s.bg}`}>
              <s.icon className={s.color} size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
              <h4 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                {s.val}{s.unit && <span className="text-xs font-normal text-slate-500 ml-1">{s.unit}</span>}
              </h4>
            </div>
          </div>
        ))}
      </div>

      {/* Top Bar (Daily Operations Control Bar Style) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Estate Filter Selector */}
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

          {/* Task Dropdown */}
          <TaskDropdown value={taskType} onChange={setTaskType} tasks={tasks} />

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search worker name or EPF..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-tea-500 placeholder:text-slate-400"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 px-3 h-9 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <button
              onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}
              className="text-slate-400 hover:text-tea-600 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
            />
            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('sv-SE');
                if (selectedDate < today) {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }
              }}
              disabled={selectedDate >= new Date().toLocaleDateString('sv-SE')}
              className="text-slate-400 hover:text-tea-600 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            {isHistorical && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                Historical
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wage Parameters Button - hidden for non-admin when confirmed */}
          {!(batchStatus === 'confirmed' && !isUserAdmin) && (
          <button
            onClick={() => {
              if (batchStatus === 'confirmed' && !isUserAdmin) return;
              setShowWageParams(true);
            }}
            className="flex items-center gap-1.5 h-9 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Configure ${taskType} wage parameters for ${currentEstateName}`}
          >
            <SlidersHorizontal size={14} className="text-tea-500 flex-shrink-0" />
            <span>Wage Parameters</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-tea-100 dark:bg-tea-900/40 text-tea-700 dark:text-tea-300 font-bold ml-0.5">
              {currentEstateName}
            </span>
          </button>
          )}
        </div>
      </div>

      {/* Main Data Section / Register Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {taskType} Payroll Register
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {filteredWorkers.length} Records
          </span>
        </div>

        {/* Worker Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-5 py-3 text-left font-semibold">Worker Profile</th>
                <th className="px-5 py-3 text-center font-semibold">{unitLabel()}</th>
                <th className="px-5 py-3 text-center font-semibold">Target Status</th>
                <th className="px-5 py-3 text-right font-semibold">Bonus (LKR)</th>
                <th className="px-5 py-3 text-center font-semibold">Pay Rate / Override</th>
                <th className="px-5 py-3 text-right font-semibold">Total Wage (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading || isCalculating ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Activity size={20} className="animate-spin text-tea-500" />
                      <span>Computing daily wage records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredWorkers.length > 0 ? (
                filteredWorkers.map((row: any) => {
                  const isOverride = typeof row.payMultiplier === 'object' ? true : row.payMultiplier !== 1.0;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Worker Profile */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {row.photo ? (
                            <img
                              src={row.photo}
                              alt={row.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-tea-100 dark:bg-tea-950 text-tea-700 dark:text-tea-300 flex items-center justify-center font-bold text-xs uppercase border border-tea-200 dark:border-tea-800">
                              {row.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white uppercase">
                              {row.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              EPF: {row.worker_id || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Performance / Task Metrics */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {row.performanceValue}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {unitLabel(true)}
                            </span>
                            {row.block_ids && (
                              <span className="text-[9px] font-semibold text-tea-600 dark:text-tea-400 border border-tea-200 dark:border-tea-800/50 bg-tea-50 dark:bg-tea-900/30 px-1.5 py-0.5 rounded ml-1 truncate max-w-[80px]" title={row.block_ids}>
                                Block: {row.block_ids}
                              </span>
                            )}
                          </div>
                          
                          {taskType === 'Plucking' && (row.morning_kg > 0 || row.midday_kg > 0 || row.afternoon_kg > 0 || row.evening_kg > 0) && (
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {row.morning_kg > 0 && (
                                <span className="inline-flex items-center text-[8px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-1.5 py-0.5 rounded">
                                  M: {row.morning_kg}
                                </span>
                              )}
                              {row.midday_kg > 0 && (
                                <span className="inline-flex items-center text-[8px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                                  Mid: {row.midday_kg}
                                </span>
                              )}
                              {row.afternoon_kg > 0 && (
                                <span className="inline-flex items-center text-[8px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/40 px-1.5 py-0.5 rounded">
                                  A: {row.afternoon_kg}
                                </span>
                              )}
                              {row.evening_kg > 0 && (
                                <span className="inline-flex items-center text-[8px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 px-1.5 py-0.5 rounded">
                                  E: {row.evening_kg}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Target Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {row.eligible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={11} />
                            Target Met
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            Below Target
                          </span>
                        )}
                      </td>

                      {/* Bonus */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-semibold text-emerald-600 dark:text-emerald-400">
                        {row.bonus > 0 ? `+Rs ${row.bonus.toLocaleString()}` : '-'}
                      </td>

                      {/* Pay Rate / Multiplier Button - hidden for non-admin when confirmed */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {batchStatus === 'confirmed' && !isUserAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                            {typeof row.payMultiplier === 'object'
                              ? `Rs ${row.payMultiplier.manualSalary}`
                              : `${row.payMultiplier}x`}
                          </span>
                        ) : (
                        <button
                          onClick={() => requestPayOverride(row)}
                          disabled={batchStatus === 'confirmed' && !isUserAdmin}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                            isOverride
                              ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 hover:bg-violet-100'
                              : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Edit3 size={12} className={isOverride ? 'text-violet-500' : 'text-slate-400'} />
                          <span>
                            {typeof row.payMultiplier === 'object'
                              ? `Rs ${row.payMultiplier.manualSalary}`
                              : `${row.payMultiplier}x`}
                          </span>
                        </button>
                        )}
                      </td>

                      {/* Wage */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        Rs {row.wage.toLocaleString()}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} className="text-slate-300" />
                      <p className="font-semibold text-slate-600 dark:text-slate-400">No payroll entries found for this date.</p>
                      <p className="text-slate-400">Try changing the date, estate filter, or clicking "Re-sync Performance".</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Approval & Confirmation Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payroll Status:</span>
          {batchStatus === 'approved' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              <CheckCircle2 size={13} />
              Approved
            </span>
          )}
          {batchStatus === 'confirmed' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={13} />
              {isUserAdmin ? 'Confirmed & Locked (Super Admin Access)' : 'Confirmed & Locked'}
            </span>
          )}
          {batchStatus === 'draft' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              Draft
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* While auth/data is loading — show skeleton, never show draft buttons prematurely */}
          {(!profileReady || loading) ? (
            <div className="h-10 w-40 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ) : (
            <>
              {/* Approve button: only show when draft */}
              {batchStatus === 'draft' && (
                <button
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={filteredWorkers.length === 0}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <CheckCircle2 size={15} />
                  <span>Approve Payroll</span>
                </button>
              )}

              {/* Confirm & Lock: show when draft or approved */}
              {(batchStatus === 'draft' || batchStatus === 'approved') && (
                <button
                  onClick={() => handleUpdateStatus('confirmed')}
                  disabled={filteredWorkers.length === 0}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <ShieldCheck size={15} />
                  <span>Confirm & Lock Salary</span>
                </button>
              )}

              {/* Unlock: only Super Admin sees this when confirmed */}
              {batchStatus === 'confirmed' && isUserAdmin && (
                <button
                  onClick={() => handleUpdateStatus('draft')}
                  className="flex items-center justify-center gap-2 h-10 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm w-full sm:w-auto"
                >
                  <Unlock size={15} />
                  <span>Unlock Batch</span>
                </button>
              )}

              {/* For non-admins: read-only lock indicator when confirmed */}
              {batchStatus === 'confirmed' && !isUserAdmin && (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck size={14} />
                  Payroll Finalized & Locked
                </span>
              )}
            </>
          )}
        </div>
      </div>


      {/* Wage Parameters Settings Modal */}
      {showWageParams && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowWageParams(false)}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 relative z-10 animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-tea-50 dark:bg-tea-900/30 rounded-lg">
                  <SlidersHorizontal size={18} className="text-tea-600 dark:text-tea-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{taskType} Wage Parameters</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tea-100 text-tea-800 dark:bg-tea-900/40 dark:text-tea-300">
                      {currentEstateName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Configure daily rates &amp; bonus rules for {currentEstateName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowWageParams(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Base Daily Wage (LKR)
                </label>
                <input
                  type="number"
                  value={currentConfig.baseWage}
                  onChange={e => setTaskConfigs((prev: any) => ({
                    ...prev,
                    [taskType]: { ...prev[taskType], baseWage: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-tea-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Target Performance ({unitLabel(true)})
                </label>
                <input
                  type="number"
                  value={currentConfig.target}
                  onChange={e => setTaskConfigs((prev: any) => ({
                    ...prev,
                    [taskType]: { ...prev[taskType], target: Math.max(0.1, parseFloat(e.target.value) || 0) }
                  }))}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-tea-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Surplus Bonus Rate (LKR / {unitLabel(true)})
                </label>
                <input
                  type="number"
                  value={currentConfig.rate}
                  onChange={e => setTaskConfigs((prev: any) => ({
                    ...prev,
                    [taskType]: { ...prev[taskType], rate: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-tea-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={async () => {
                  setShowWageParams(false);
                  await saveEstateTaskConfigs(taskConfigs);
                  if (currentData.workers.length > 0) {
                    calculateWages(currentData.workers, true);
                  }
                }}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Override Modal */}
      {payOverrideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPayOverrideModal(null)}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 relative z-10 animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                  <Coins size={18} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pay Rate Override
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Worker: <span className="text-slate-700 dark:text-slate-300 font-semibold">{payOverrideModal.worker.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPayOverrideModal(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Select a multiplier preset or set a custom manual daily wage amount:
              </p>

              {/* Multiplier Presets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Full Day (1.0x)', val: 1.0 },
                  { label: 'Half Day (0.5x)', val: 0.5 },
                  { label: '1.5x Overtime', val: 1.5 },
                  { label: 'Double (2.0x)', val: 2.0 },
                  { label: 'Zero (0.0x)', val: 0.0 }
                ].map((preset) => (
                  <button
                    key={preset.val}
                    disabled={payOverrideSaving}
                    onClick={() => setMultiplier(payOverrideModal.worker.id, preset.val)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-all text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Fixed Wage Input */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                  Custom Fixed Daily Wage (LKR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 2500"
                    value={manualSalaryInput}
                    onChange={e => setManualSalaryInput(e.target.value)}
                    className="flex-1 h-9 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-violet-500"
                  />
                  <button
                    disabled={payOverrideSaving || !manualSalaryInput}
                    onClick={() => {
                      if (manualSalaryInput) {
                        setMultiplier(payOverrideModal.worker.id, { manualSalary: manualSalaryInput });
                      }
                    }}
                    className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    Set Wage
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
