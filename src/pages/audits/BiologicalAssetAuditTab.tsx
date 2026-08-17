import { useState, useEffect, useRef } from 'react';
import {
  Camera, Image as ImageIcon, ClipboardCheck, AlertCircle, Loader2, Save, X, History, Search, Leaf, RefreshCw, Keyboard
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'diseased', label: 'Diseased' },
  { value: 'pest_infested', label: 'Pest Infested' },
  { value: 'damaged', label: 'Damaged / Broken' },
  { value: 'dead', label: 'Dead / Felled' },
  { value: 'recovering', label: 'Recovering' },
];

const playSuccessBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (err) {
    console.error('Beep failed:', err);
  }
};

export default function BiologicalAssetAuditTab() {
  const { profile } = useAuthStore();

  const [scanMode, setScanMode] = useState<boolean>(false);
  const [manualMode, setManualMode] = useState<boolean>(false);
  const [scanError, setScanError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  const [scannedAsset, setScannedAsset] = useState<any>(null);
  const [auditData, setAuditData] = useState({
    health_status: 'healthy',
    height_ft: '',
    girth_in: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recentAudits, setRecentAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecentAudits();
    fetchAvailableAssets();
  }, [profile?.estate_id]);

  const fetchAvailableAssets = async () => {
    try {
      let query = supabase.from('biological_assets').select('id, tree_species');
      if (profile?.estate_id) {
        query = query.eq('estate_id', profile.estate_id);
      }
      const { data } = await query;
      if (data) setAvailableAssets(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentAudits = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_audits')
        .select('*')
        .eq('asset_type', 'biological')
        .order('audit_date', { ascending: false })
        .limit(50);

      if (!error && data) {
        const userIds = [...new Set(data.map((a: any) => a.audited_by).filter(Boolean))];
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, name')
            .in('id', userIds);
          if (usersData) usersData.forEach((u: any) => { usersMap[u.id] = u; });
        }

        const assetIds = [...new Set(data.map((a: any) => a.asset_id).filter(Boolean))];
        let assetsMap: Record<string, any> = {};
        if (assetIds.length > 0) {
          const { data: assetsData } = await supabase
            .from('biological_assets')
            .select('id, tree_species, estates(name)')
            .in('id', assetIds);
          if (assetsData) assetsData.forEach((a: any) => { assetsMap[a.id] = a; });
        }

        const mappedData = data.map((audit: any) => ({
          ...audit,
          users: audit.audited_by ? { full_name: usersMap[audit.audited_by]?.name } : null,
          biological_asset: assetsMap[audit.asset_id] || null,
        }));

        setRecentAudits(mappedData);
      }
    } catch (err) {
      console.error('Failed to load biological audits', err);
    } finally {
      setLoading(false);
    }
  };

  const pickBestCamera = (cameras: { id: string; label: string }[]) => {
    if (cameras.length === 0) return null;
    if (cameras.length === 1) return cameras[0];
    const label = (c: { label: string }) => c.label.toLowerCase();
    const backCam = cameras.find(c => label(c).includes('back') || label(c).includes('rear') || label(c).includes('environment'));
    if (backCam) return backCam;
    const builtIn = cameras.find(c => label(c).includes('integrated') || label(c).includes('built-in') || label(c).includes('facetime') || label(c).includes('internal') || label(c).includes('hd camera'));
    if (builtIn) return builtIn;
    const notExternal = cameras.find(c => !label(c).includes('usb') && !label(c).includes('external') && !label(c).includes('obs') && !label(c).includes('virtual') && !label(c).includes('manycam') && !label(c).includes('snap'));
    if (notExternal) return notExternal;
    return cameras[0];
  };

  const startScanner = async () => {
    try {
      setScanError('');
      setScanMode(true);
      
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        setScanError('No cameras found.');
        setScanMode(false);
        return;
      }
      
      const chosen = pickBestCamera(cameras);
      if (!chosen) {
        setScanError('No suitable camera found.');
        setScanMode(false);
        return;
      }

      setTimeout(async () => {
        if (!document.getElementById('bio-qr-reader')) return;
        scannerRef.current = new Html5Qrcode('bio-qr-reader');
        await scannerRef.current.start(
          { deviceId: { exact: chosen.id } },
          { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return { width: Math.floor(minEdge * 0.7), height: Math.floor(minEdge * 0.7) };
            }
          },
          async (decodedText) => {
            stopScanner();
            handleQRScanned(decodedText);
          },
          () => {}
        );
      }, 100);
    } catch (err: any) {
      setScanError(err?.message || 'Failed to start camera. Please check permissions.');
      setScanMode(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        scannerRef.current?.clear();
        scannerRef.current = null;
      }).catch(console.error);
    }
    setScanMode(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setScanError('');
      const reader = new Html5Qrcode('bio-qr-file-reader');
      const decodedText = await reader.scanFile(file, true);
      handleQRScanned(decodedText);
    } catch (err) {
      setScanError('Could not read a QR code from this image.');
    }
  };

  const handleQRScanned = async (text: string) => {
    try {
      const data = JSON.parse(text);
      if (!data.type || !data.id) throw new Error('Invalid format');

      if (data.type !== 'biological') {
        toast.error('This QR code is not for a biological asset');
        return;
      }

      const { data: asset } = await supabase
        .from('biological_assets')
        .select('*, estates(name)')
        .eq('id', data.id)
        .single();

      if (asset) {
        setScannedAsset({
          ...asset,
          auditType: 'biological',
          displayName: asset.tree_species,
          estate_name: (asset.estates as any)?.name || 'Unknown Estate',
        });
        setAuditData({
          health_status: 'healthy',
          height_ft: asset.height_ft?.toString() || '',
          girth_in: asset.girth_in?.toString() || '',
          notes: ''
        });
        playSuccessBeep();
      } else {
        toast.error('Biological asset not found in database');
      }
    } catch (err) {
      toast.error('Invalid QR Code or asset not found');
    }
  };

  const submitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    setIsSubmitting(true);
    try {
      // 1. Log audit record
      const noteParts = [auditData.notes, auditData.height_ft ? `Height: ${auditData.height_ft} ft` : '', auditData.girth_in ? `Girth: ${auditData.girth_in} in` : ''].filter(Boolean);
      const { error: auditError } = await supabase.from('asset_audits').insert({
        asset_id: scannedAsset.id,
        asset_type: 'biological',
        estate_id: scannedAsset.estate_id || profile?.estate_id || null,
        audited_by: profile?.id,
        condition_status: auditData.health_status,
        notes: noteParts.join(' | ')
      });
      if (auditError) throw auditError;

      // 2. Update biological_assets inventory
      const updatePayload: Record<string, any> = {
        census_date: new Date().toISOString().split('T')[0],
      };
      if (auditData.height_ft) {
        const h = Number(auditData.height_ft);
        updatePayload.height_ft = h;
        updatePayload.height_category = h > 30 ? 'Mature' : h > 15 ? 'Tall' : 'Sapling';
      }
      if (auditData.girth_in) {
        const g = Number(auditData.girth_in);
        updatePayload.girth_in = g;
        updatePayload.girth_category = g > 30 ? 'Large' : g > 15 ? 'Medium' : 'Small';
      }
      await supabase.from('biological_assets').update(updatePayload).eq('id', scannedAsset.id);

      toast.success('Audit logged & inventory updated!');
      setScannedAsset(null);
      setAuditData({ health_status: 'healthy', height_ft: '', girth_in: '', notes: '' });
      fetchRecentAudits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit audit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAudits = recentAudits.filter(a => {
    const s = searchTerm.toLowerCase();
    return (
      a.biological_asset?.tree_species?.toLowerCase().includes(s) ||
      a.condition_status?.toLowerCase().includes(s) ||
      a.users?.full_name?.toLowerCase().includes(s) ||
      a.notes?.toLowerCase().includes(s)
    );
  });

  const columns: ColumnDef<any>[] = [
    {
      header: "Date",
      cell: (log) => (
        <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
          {new Date(log.audit_date).toLocaleDateString()}
        </span>
      )
    },
    {
      header: "Species",
      cell: (log) => (
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {log.biological_asset?.tree_species || <span className="text-slate-400 italic">Unknown</span>}
        </span>
      )
    },
    {
      header: "Health Status",
      cell: (log) => {
        let color = "text-slate-500 bg-slate-100 dark:bg-slate-800";
        if (log.condition_status === 'healthy') color = "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20";
        if (log.condition_status === 'recovering') color = "text-sky-600 bg-sky-50 dark:bg-sky-900/20";
        if (['diseased', 'pest_infested', 'damaged', 'dead'].includes(log.condition_status)) color = "text-red-600 bg-red-50 dark:bg-red-900/20";
        return (
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${color}`}>
            {log.condition_status?.replace(/_/g, ' ')}
          </span>
        );
      }
    },
    {
      header: "Auditor",
      cell: (log) => <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.users?.full_name || 'System'}</span>
    },
    {
      header: "Notes",
      cell: (log) => <p className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">{log.notes || '—'}</p>
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit flex items-center gap-2">
            <Leaf className="text-emerald-500" size={24} />
            Biological Asset Audit
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Scan QR codes to audit biological assets and automatically update inventory measurements
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner / Audit Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">

            {!scannedAsset && !scanMode && !manualMode && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-800">
                  <Leaf size={32} />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-1">Scan Biological Asset QR</h3>
                <p className="text-xs text-slate-500 mb-6 px-4">Scan a biological asset QR label to record an audit and update the inventory.</p>

                <div className="space-y-3">
                  <Button onClick={startScanner} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2">
                    <Camera size={18} /> Start Camera Scanner
                  </Button>

                  <div className="relative flex justify-center items-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
                    <span className="relative bg-white dark:bg-slate-900 px-3 text-[10px] font-bold text-slate-400 uppercase">OR</span>
                  </div>

                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <Button variant="outline" className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700">
                      <ImageIcon size={18} /> Upload QR Image
                    </Button>
                  </div>
                  
                  <Button variant="outline" onClick={() => { setManualMode(true); setScanError(''); }} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 border-slate-200 dark:border-slate-700">
                    <Keyboard size={18} /> Enter Manually
                  </Button>
                </div>

                {scanError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-2 border border-red-100 dark:border-red-900/50">
                    <AlertCircle size={14} /> {scanError}
                  </div>
                )}
                <div id="bio-qr-file-reader" className="hidden" />
              </div>
            )}

            {scanMode && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Scanning...</h3>
                  <button onClick={stopScanner} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div id="bio-qr-reader" className="w-full rounded-2xl overflow-hidden border-2 border-emerald-500/30" />
              </div>
            )}

            {manualMode && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">Manual Asset Selection</h3>
                  <button onClick={() => setManualMode(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={16}/></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Asset</label>
                    <select 
                      value={selectedAssetId}
                      onChange={(e) => setSelectedAssetId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none transition-all appearance-none"
                    >
                      <option value="">-- Choose an asset --</option>
                      {availableAssets.map(a => (
                        <option key={a.id} value={a.id}>{a.tree_species}</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    onClick={() => {
                      if (selectedAssetId) {
                        setManualMode(false);
                        handleQRScanned(JSON.stringify({ type: 'biological', id: selectedAssetId }));
                      } else {
                        toast.error('Please select an asset first');
                      }
                    }} 
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                  >
                    Start Audit
                  </Button>
                </div>
              </div>
            )}

            {scannedAsset && (
              <form onSubmit={submitAudit} className="animate-in fade-in duration-300">
                <div className="flex justify-between items-start mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
                      <ClipboardCheck size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Asset Verified</p>
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">{scannedAsset.displayName}</h3>
                      <p className="text-xs font-bold text-slate-500">{scannedAsset.estate_name}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setScannedAsset(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Health Status</label>
                    <select
                      value={auditData.health_status}
                      onChange={(e) => setAuditData({ ...auditData, health_status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none transition-all appearance-none"
                    >
                      {HEALTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Height (ft)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={scannedAsset.height_ft?.toString() || '0.0'}
                        value={auditData.height_ft}
                        onChange={(e) => setAuditData({ ...auditData, height_ft: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Girth (in)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder={scannedAsset.girth_in?.toString() || '0.0'}
                        value={auditData.girth_in}
                        onChange={(e) => setAuditData({ ...auditData, girth_in: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Last Recorded Values</p>
                    <div className="flex gap-4">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Height: <span className="text-slate-900 dark:text-white">{scannedAsset.height_ft ? `${scannedAsset.height_ft} ft` : 'N/A'}</span>
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Girth: <span className="text-slate-900 dark:text-white">{scannedAsset.girth_in ? `${scannedAsset.girth_in} in` : 'N/A'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Field Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Observations, pest signs, damage details, location notes..."
                      value={auditData.notes}
                      onChange={(e) => setAuditData({ ...auditData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium focus:border-emerald-500 outline-none transition-all resize-none"
                    />
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-2">
                    <RefreshCw size={13} className="text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      Submitting will log an audit record <strong>and</strong> update the Biological Assets inventory with the new measurements and today's census date.
                    </p>
                  </div>

                  <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold shadow-sm">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Submit Audit & Update Inventory
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Recent Biological Audits Table */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                <History size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Recent Biological Audits</h3>
              </div>
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <Input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex-1 p-0">
              <DataTable
                columns={columns}
                data={filteredAudits}
                loading={loading}
                emptyMessage="No biological asset audit logs found"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
