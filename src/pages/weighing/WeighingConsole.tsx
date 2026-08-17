import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Scale, Bluetooth, BluetoothOff, Activity,
  CheckCircle2, XCircle, Loader2, Save, Trash2,
  AlertTriangle, ClipboardList, ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useBluetoothScale } from './useBluetoothScale';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
}

interface CapturedReading {
  id: string;
  weight: number;
  unit: string;
  item_name: string;
  notes: string;
  timestamp: Date;
}

// ── Animated Weight Display ────────────────────────────────────────────────────

function WeightDisplay({ weight, unit, isConnected, isConnecting }: {
  weight: number | null;
  unit: string;
  isConnected: boolean;
  isConnecting: boolean;
}) {
  const prevWeight = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (weight !== null && weight !== prevWeight.current) {
      prevWeight.current = weight;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [weight]);

  return (
    <div className="relative flex flex-col items-center justify-center py-10">
      {/* Outer glow ring */}
      <div className={`absolute inset-0 rounded-3xl transition-all duration-500 ${
        isConnected
          ? 'bg-gradient-to-br from-emerald-500/5 to-blue-500/5 ring-1 ring-emerald-400/20'
          : 'bg-gradient-to-br from-slate-500/5 to-slate-500/5 ring-1 ring-slate-300/20 dark:ring-slate-700/30'
      }`} />

      {/* Status indicator */}
      <div className={`flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
        isConnecting
          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          : isConnected
          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
      }`}>
        {isConnecting ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</>
        ) : isConnected ? (
          <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected</>
        ) : (
          <><span className="w-2 h-2 rounded-full bg-slate-400" /> Disconnected</>
        )}
      </div>

      {/* Weight readout */}
      <div className={`transition-all duration-200 ${flash ? 'scale-105' : 'scale-100'}`}>
        <div className={`text-[5rem] sm:text-[7rem] font-black tabular-nums leading-none tracking-tight transition-colors duration-300 ${
          isConnected && weight !== null
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-slate-300 dark:text-slate-700'
        }`}>
          {isConnected && weight !== null ? weight.toFixed(3) : '---'}
        </div>
        <div className={`text-center text-2xl font-bold mt-1 transition-colors duration-300 ${
          isConnected ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-700'
        }`}>
          {unit.toUpperCase()}
        </div>
      </div>

      {isConnected && weight === null && (
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-4 animate-pulse">
          Waiting for scale reading…
        </p>
      )}
    </div>
  );
}

// ── Session Reading Card ──────────────────────────────────────────────────────

function ReadingCard({ reading, onDelete }: { reading: CapturedReading; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 group hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
        <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{reading.weight.toFixed(3)}</span>
          <span className="text-xs text-slate-400">{reading.unit}</span>
          {reading.item_name && <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">– {reading.item_name}</span>}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{reading.timestamp.toLocaleTimeString()}</span>
          {reading.notes && <span className="truncate">• {reading.notes}</span>}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Console ──────────────────────────────────────────────────────────────

export default function WeighingConsole() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const { isConnected, isConnecting, deviceName, weight, unit, error, connect, disconnect, clearError } = useBluetoothScale();

  const [scales, setScales] = useState<WeighingScale[]>([]);
  const [selectedScaleId, setSelectedScaleId] = useState('');
  const [itemName, setItemName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sessionReadings, setSessionReadings] = useState<CapturedReading[]>([]);
  const [loadingScales, setLoadingScales] = useState(true);

  // Fetch scales for this estate
  const fetchScales = useCallback(async () => {
    setLoadingScales(true);
    try {
      let query = supabase
        .from('weighing_scales')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setScales(data ?? []);
      if (data && data.length > 0 && !selectedScaleId) {
        setSelectedScaleId(data[0].id);
      }
    } catch {
      toast.error('Failed to load scales');
    } finally {
      setLoadingScales(false);
    }
  }, [profile?.estate_id, selectedScaleId]);

  useEffect(() => { fetchScales(); }, [fetchScales]);

  const selectedScale = scales.find(s => s.id === selectedScaleId) ?? null;

  const handleConnect = async () => {
    if (!selectedScale) return toast.error('Please select a scale first');
    await connect({
      serviceUuid: selectedScale.bt_service_uuid || undefined,
      characteristicUuid: selectedScale.bt_characteristic_uuid || undefined,
    });
  };

  const handleCapture = async () => {
    if (!isConnected) return toast.error('Not connected to a scale');
    if (weight === null) return toast.error('No reading available yet — place an item on the scale');
    if (!selectedScale) return toast.error('No scale selected');

    // Add to local session immediately for instant feedback
    const reading: CapturedReading = {
      id: crypto.randomUUID(),
      weight: weight!,
      unit: selectedScale.unit,
      item_name: itemName,
      notes,
      timestamp: new Date(),
    };
    setSessionReadings(prev => [reading, ...prev]);

    // Save to Supabase in background
    setSaving(true);
    try {
      const { error: dbErr } = await supabase.from('weighing_sessions').insert({
        scale_id: selectedScale.id,
        estate_id: selectedScale.estate_id,
        item_name: itemName || null,
        weight: weight!,
        unit: selectedScale.unit,
        notes: notes || null,
        weighed_by: profile?.id ?? null,
      });
      if (dbErr) throw dbErr;
      toast.success(`Captured: ${weight!.toFixed(3)} ${selectedScale.unit}`);
      setItemName('');
      setNotes('');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save reading');
      setSessionReadings(prev => prev.filter(r => r.id !== reading.id));
    } finally {
      setSaving(false);
    }
  };

  const sessionTotal = sessionReadings.reduce((sum, r) => sum + r.weight, 0);

  const btSupported = 'bluetooth' in navigator;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/weighing/scales')}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center shadow-sm">
              <Activity className="w-4.5 h-4.5 text-white" />
            </div>
            Weighing Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Connect your Bluetooth scale and capture live weighing readings
          </p>
        </div>
      </div>

      {/* No BT support warning */}
      {!btSupported && (
        <div className="flex flex-col gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300 text-sm">Web Bluetooth Not Available</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Live Bluetooth weighing requires Chrome or Edge on a supported OS. Please switch to Chrome to use this feature.
              </p>
            </div>
          </div>
          <div className="ml-8 mt-2 text-xs text-amber-700/80 dark:text-amber-300/80 p-3 bg-amber-100/50 dark:bg-amber-900/40 rounded-lg">
            <p className="font-medium mb-1">How to enable on supported browsers:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Open a new tab and go to: <code className="bg-amber-200/50 dark:bg-amber-800/50 px-1 py-0.5 rounded select-all">chrome://flags/#enable-web-bluetooth</code></li>
              <li>Set "Web Bluetooth" to <b>Enabled</b></li>
              <li>Restart your browser</li>
            </ol>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Scale + Controls */}
        <div className="space-y-4">
          {/* Scale Selector */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              Select Scale
            </label>
            {loadingScales ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading scales…
              </div>
            ) : scales.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                No active scales found.{' '}
                <button onClick={() => navigate('/weighing/scales')} className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
                  Register a scale first →
                </button>
              </div>
            ) : (
              <select
                value={selectedScaleId}
                onChange={e => setSelectedScaleId(e.target.value)}
                disabled={isConnected}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                {scales.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.model ? ` – ${s.model}` : ''}</option>
                ))}
              </select>
            )}

            {selectedScale && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedScale.bt_device_name && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    <Bluetooth className="w-3 h-3" /> {selectedScale.bt_device_name}
                  </span>
                )}
                <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  Unit: {selectedScale.unit.toUpperCase()}
                </span>
                {selectedScale.bt_service_uuid && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full font-mono">
                    Custom UUID
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Live Weight Display */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <WeightDisplay
              weight={weight}
              unit={selectedScale?.unit ?? unit}
              isConnected={isConnected}
              isConnecting={isConnecting}
            />

            {deviceName && isConnected && (
              <p className="text-center text-xs text-slate-400 dark:text-slate-500 mb-4">
                <Bluetooth className="w-3 h-3 inline mr-1" />
                {deviceName}
              </p>
            )}

            {/* BLE error */}
            {error && (
              <div className="flex flex-col gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-4 text-sm text-red-700 dark:text-red-400">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="flex-1 font-medium">{error}</span>
                  <button onClick={clearError} className="text-red-400 hover:text-red-600">✕</button>
                </div>
                
                <div className="text-xs space-y-2 mt-1 border-t border-red-200/50 dark:border-red-800/50 pt-2">
                  <p className="font-semibold opacity-90">Troubleshooting Steps:</p>
                  <ul className="list-disc pl-4 space-y-1 opacity-80">
                    <li>Ensure your computer's <b>Bluetooth is turned ON</b> in the OS settings.</li>
                    <li>Ensure the scale is powered on and near the computer.</li>
                    <li>If permissions were denied, open: <br/><code className="bg-red-100 dark:bg-red-900/40 px-1 py-0.5 rounded select-all mt-1 inline-block">chrome://settings/content/bluetoothDevices</code><br/> and allow this site to access Bluetooth devices.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Connect / Disconnect */}
            <div className="flex gap-3">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !btSupported || scales.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm hover:shadow-blue-500/30"
                >
                  {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bluetooth className="w-5 h-5" />}
                  {isConnecting ? 'Connecting…' : 'Connect Scale'}
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 active:scale-95 transition-all"
                >
                  <BluetoothOff className="w-5 h-5" /> Disconnect
                </button>
              )}
            </div>
          </div>

          {/* Capture Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Save className="w-4 h-4 text-blue-500" /> Capture Reading
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Item Name</label>
              <input
                type="text"
                value={itemName}
                onChange={e => setItemName(e.target.value)}
                placeholder="e.g. Tea Leaf Bag #12"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional notes…"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleCapture}
              disabled={!isConnected || weight === null || saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-sm hover:shadow-emerald-500/30"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {saving ? 'Saving…' : 'Capture Reading'}
            </button>
          </div>
        </div>

        {/* Right — Session Readings */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col min-h-[520px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-500" /> Current Session
            </h3>
            {sessionReadings.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {sessionReadings.length} reading{sessionReadings.length !== 1 ? 's' : ''}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg">
                  Total: {sessionTotal.toFixed(3)} {selectedScale?.unit ?? unit}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {sessionReadings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Scale className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-sm">No readings captured yet</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs">Connect a scale and press "Capture Reading"</p>
              </div>
            ) : (
              sessionReadings.map(reading => (
                <ReadingCard
                  key={reading.id}
                  reading={reading}
                  onDelete={() => setSessionReadings(prev => prev.filter(r => r.id !== reading.id))}
                />
              ))
            )}
          </div>

          {sessionReadings.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <button
                onClick={() => setSessionReadings([])}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Clear Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
